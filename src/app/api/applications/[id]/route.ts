import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { generateUniqueUsername, generateTempPassword } from '@/lib/auth-utils';
import { syncGuardiansToParents } from '@/lib/parent-sync';

// 1. GET: Fetch single pending application details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);

    const { id } = await params;
    const application = await prisma.pendingApplication.findUnique({
      where: { id },
      include: { school: true }
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    requireSchoolScope(session, application.schoolId);

    return NextResponse.json({
      success: true,
      data: {
        ...application,
        parsedApplicationData: JSON.parse(application.applicationData || '{}'),
        parsedUploadedDocuments: JSON.parse(application.uploadedDocuments || '[]')
      }
    });

  } catch (error: any) {
    console.error('Single Application GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch application details' }, { status: error.status || 500 });
  }
}

// 2. PATCH: Review Action Handler (APPROVE, REJECT, REQUEST_CORRECTION)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const { id } = await params;
    const application = await prisma.pendingApplication.findUnique({
      where: { id },
      include: { school: true }
    });

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    requireSchoolScope(session, application.schoolId);

    const body = await req.json();
    const { action, reviewNotes, correctionNotes, rejectionReason } = body;

    if (!action || !['APPROVE', 'REJECT', 'REQUEST_CORRECTION', 'UNDER_REVIEW'].includes(action)) {
      return NextResponse.json({ error: 'Invalid review action specified' }, { status: 400 });
    }

    const schoolId = application.schoolId;
    const formData = JSON.parse(application.applicationData || '{}');

    // ── ACTION: REJECT ──────────────────────────────────────────────────────────
    if (action === 'REJECT') {
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Please specify a rejection reason' }, { status: 400 });
      }

      const updated = await prisma.pendingApplication.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: rejectionReason.trim(),
          reviewNotes: reviewNotes ? reviewNotes.trim() : application.reviewNotes,
          reviewerId: session.userId
        }
      });

      // Record System Audit Log
      await prisma.systemAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'APPLICATION_REJECTED',
          details: `Rejected ${application.type} application (${application.referenceNumber}) for ${application.applicantName}. Reason: ${rejectionReason}`
        }
      });

      return NextResponse.json({
        success: true,
        message: `Application ${application.referenceNumber} has been rejected.`,
        data: updated
      });
    }

    // ── ACTION: REQUEST CORRECTION ──────────────────────────────────────────────
    if (action === 'REQUEST_CORRECTION') {
      if (!correctionNotes) {
        return NextResponse.json({ error: 'Please specify the correction details required' }, { status: 400 });
      }

      const updated = await prisma.pendingApplication.update({
        where: { id },
        data: {
          status: 'CORRECTION_REQUESTED',
          correctionNotes: correctionNotes.trim(),
          reviewNotes: reviewNotes ? reviewNotes.trim() : application.reviewNotes,
          reviewerId: session.userId
        }
      });

      // Record System Audit Log
      await prisma.systemAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'APPLICATION_CORRECTION_REQUESTED',
          details: `Requested correction for ${application.type} application (${application.referenceNumber}) for ${application.applicantName}. Notes: ${correctionNotes}`
        }
      });

      return NextResponse.json({
        success: true,
        message: `Correction requested for application ${application.referenceNumber}.`,
        data: updated
      });
    }

    // ── ACTION: UNDER REVIEW ───────────────────────────────────────────────────
    if (action === 'UNDER_REVIEW') {
      const updated = await prisma.pendingApplication.update({
        where: { id },
        data: {
          status: 'UNDER_REVIEW',
          reviewNotes: reviewNotes ? reviewNotes.trim() : application.reviewNotes,
          reviewerId: session.userId
        }
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // ── ACTION: APPROVE (100% AUTOMATED PROVISIONING) ──────────────────────────
    if (action === 'APPROVE') {
      let createdRecord;
      let generatedUsername = '';
      let defaultPassword = '';

      if (application.type === 'STUDENT') {
        // Find matching or default active class & arm (auto-create if none exist)
        let targetClass = await prisma.class.findFirst({
          where: { schoolId, name: { contains: formData.className || application.applyingClass || 'Primary', mode: 'insensitive' } }
        }) || await prisma.class.findFirst({ where: { schoolId } });

        if (!targetClass) {
          const className = formData.className || application.applyingClass || 'Primary 1';
          targetClass = await prisma.class.create({
            data: {
              schoolId,
              name: className
            }
          });
        }

        let targetArm = await prisma.arm.findFirst({
          where: { schoolId, classId: targetClass.id }
        }) || await prisma.arm.findFirst({ where: { schoolId } });

        if (!targetArm) {
          targetArm = await prisma.arm.create({
            data: {
              schoolId,
              classId: targetClass.id,
              name: 'Gold'
            }
          });
        }

        // Generate unique admission number
        const count = await prisma.student.count({ where: { schoolId } });
        const cleanAdmissionNo = formData.admissionNumber || `ADM-${new Date().getFullYear()}-${String(count + 101).padStart(4, '0')}`;

        generatedUsername = await generateUniqueUsername(formData.lastName || 'student');
        defaultPassword = generateTempPassword();

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);
        const email = `${generatedUsername}@student.local`;

        createdRecord = await prisma.$transaction(async (tx) => {
          // 1. Create Student
          const student = await tx.student.create({
            data: {
              schoolId,
              firstName: formData.firstName || application.applicantName.split(' ')[0],
              lastName: formData.lastName || application.applicantName.split(' ').slice(1).join(' ') || 'Student',
              middleName: formData.middleName || null,
              preferredName: formData.preferredName || null,
              admissionNumber: cleanAdmissionNo,
              gender: (formData.gender || 'MALE').toUpperCase(),
              dateOfBirth: formData.dateOfBirth || null,
              classId: targetClass.id,
              armId: targetArm.id,
              status: 'ACTIVE',
              category: formData.category || 'DAY',
              house: formData.house || null,
              nationality: formData.nationality || 'Nigerian',
              stateOfOrigin: formData.stateOfOrigin || null,
              lga: formData.lga || null,
              religion: formData.religion || null,
              address: formData.address || null,
              phone: formData.phone || application.applicantPhone || null,
              email: formData.email || application.applicantEmail || null,
              admissionDate: new Date().toISOString().split('T')[0],
              admissionType: formData.admissionType || 'NEW',
              previousSchool: formData.previousSchool || null,
            }
          });

          // 2. Create User login account for Student
          await tx.user.create({
            data: {
              schoolId,
              username: generatedUsername,
              email,
              passwordHash,
              firstName: student.firstName,
              lastName: student.lastName,
              role: 'STUDENT',
              studentId: student.id,
              isFirstLogin: true,
              status: 'ACTIVE',
              isActive: true
            }
          });

          // 3. Create StudentGuardian if info provided
          if (formData.guardianFirstName || formData.guardianLastName || formData.guardianPhone || formData.fatherName || formData.motherName) {
            const gFirstName = (formData.guardianFirstName || formData.fatherName || formData.motherName || 'Guardian').trim();
            const gLastName = (formData.guardianLastName || student.lastName || 'Parent').trim();

            await tx.studentGuardian.create({
              data: {
                schoolId,
                studentId: student.id,
                firstName: gFirstName,
                lastName: gLastName,
                relationship: formData.guardianRelationship || 'GUARDIAN',
                phone: formData.guardianPhone || formData.fatherPhone || formData.motherPhone || null,
                email: formData.guardianEmail || formData.fatherEmail || formData.motherEmail || null,
                dateOfBirth: formData.guardianDateOfBirth || null,
                occupation: formData.guardianOccupation || null,
                address: formData.guardianAddress || formData.address || null,
                isPrimary: true,
                isBillingContact: true,
                isEmergencyContact: true,
                isNotificationRecipient: true
              }
            });
          }

          // 4. Create StudentMedical if provided
          if (formData.bloodGroup || formData.genotype || formData.allergies || formData.medicalNotes) {
            await tx.studentMedical.create({
              data: {
                schoolId,
                studentId: student.id,
                bloodGroup: formData.bloodGroup || null,
                genotype: formData.genotype || null,
                allergies: formData.allergies || null,
                conditions: formData.chronicIllnesses || null,
                disabilities: formData.disabilities || null,
                emergencyNotes: formData.emergencyInstructions || null,
                specialNeeds: formData.medicalNotes || null,
                vaccinationRecords: formData.immunizationStatus || null,
              }
            });
          }

          return student;
        });

        // Run guardian auto-sync to provision Parent account
        await syncGuardiansToParents(schoolId);

      } else if (application.type === 'TEACHER' || application.type === 'STAFF') {
        const staffRole = application.type === 'TEACHER' ? 'CLASS_TEACHER' : 'SCHOOL_ADMIN';
        const lastName = formData.lastName || application.applicantName.split(' ').slice(1).join(' ') || 'Staff';

        generatedUsername = await generateUniqueUsername(lastName);
        defaultPassword = 'Teacher123456';
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        const email = (formData.email || application.applicantEmail || `${generatedUsername}@staff.local`).toLowerCase().trim();

        createdRecord = await prisma.user.create({
          data: {
            schoolId,
            username: generatedUsername,
            email,
            passwordHash,
            firstName: formData.firstName || application.applicantName.split(' ')[0],
            lastName,
            title: formData.title || null,
            role: staffRole,
            phone: formData.phone || application.applicantPhone || null,
            status: 'ACTIVE',
            isActive: true,
            isFirstLogin: true
          }
        });
      }

      // Update Application status to APPROVED
      const updatedApp = await prisma.pendingApplication.update({
        where: { id },
        data: {
          status: 'APPROVED',
          reviewNotes: reviewNotes ? reviewNotes.trim() : application.reviewNotes,
          reviewerId: session.userId
        }
      });

      // Record System Audit Log
      await prisma.systemAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'APPLICATION_APPROVED',
          details: `Approved ${application.type} application (${application.referenceNumber}) for ${application.applicantName}.`
        }
      });

      return NextResponse.json({
        success: true,
        message: `Application ${application.referenceNumber} approved and provisioned successfully!`,
        data: {
          application: updatedApp,
          provisionedRecord: createdRecord,
          generatedUsername,
          temporaryPassword: defaultPassword || 'Parent123456'
        }
      });
    }

  } catch (error: any) {
    console.error('Application Review PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process application decision' }, { status: 500 });
  }
}
