import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { generateUniqueUsername, generateTempPassword } from '@/lib/auth-utils';
import { syncGuardiansToParents } from '@/lib/parent-sync';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json().catch(() => ({}));
    const { schoolId, classId, armId, students } = body;

    if (!schoolId || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Missing required upload parameters (schoolId and students array)' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Pre-fetch all classes and arms for the school
    const allClasses = await prisma.class.findMany({
      where: { schoolId },
      include: { arms: true }
    });

    const classMapByName = new Map<string, any>();
    const classMapById = new Map<string, any>();
    allClasses.forEach(c => {
      classMapByName.set(c.name.trim().toLowerCase(), c);
      classMapById.set(c.id, c);
    });

    // Check capacity limits
    const existingStudents = await prisma.student.findMany({
      where: { schoolId },
      select: { admissionNumber: true, status: true }
    });
    const existingMap = new Map<string, string>();
    for (const est of existingStudents) {
      existingMap.set(est.admissionNumber, est.status);
    }

    let activeIncreaseCount = 0;
    const uniqueUploadedAdmissions = new Set<string>();
    for (const s of students) {
      const cleanAdmissionNumber = String(s.admissionNumber || '').trim();
      if (!cleanAdmissionNumber) continue;
      if (uniqueUploadedAdmissions.has(cleanAdmissionNumber)) continue;
      uniqueUploadedAdmissions.add(cleanAdmissionNumber);

      const existingStatus = existingMap.get(cleanAdmissionNumber);
      if (!existingStatus || existingStatus !== 'ACTIVE') {
        activeIncreaseCount++;
      }
    }

    const schoolObj = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { maxStudents: true }
    });
    const currentActiveCount = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    });
    const studentLimit = schoolObj?.maxStudents ?? 500;

    if (currentActiveCount + activeIncreaseCount > studentLimit) {
      return NextResponse.json({
        error: `Prepaid student limit reached. Uploading would register/activate ${activeIncreaseCount} new students, exceeding your capacity of ${studentLimit} (current active: ${currentActiveCount}). Please upgrade your subscription plan.`,
      }, { status: 403 });
    }

    const defaultPasswordHash = await bcrypt.hash('Student123', 10);

    const results = {
      successCount: 0,
      failCount: 0,
      failures: [] as { name: string; admissionNumber: string; error: string }[],
      createdStudents: [] as any[]
    };

    for (const s of students) {
      const { firstName, lastName, middleName, admissionNumber, gender } = s;

      const cleanFirstName = String(firstName || '').trim();
      const cleanLastName = String(lastName || '').trim();
      const cleanMiddleName = middleName ? String(middleName).trim() : null;
      const cleanAdmissionNumber = String(admissionNumber || '').trim();
      let cleanGender = String(gender || 'MALE').trim().toUpperCase();
      if (cleanGender !== 'MALE' && cleanGender !== 'FEMALE') {
        cleanGender = 'MALE';
      }

      const displayName = cleanLastName ? `${cleanLastName}, ${cleanFirstName}` : cleanFirstName;

      if (!cleanFirstName || !cleanAdmissionNumber) {
        results.failCount++;
        results.failures.push({
          name: displayName || 'Unknown Student',
          admissionNumber: cleanAdmissionNumber || 'MISSING',
          error: 'First name and Admission number are required fields.'
        });
        continue;
      }

      // Resolve Target Class
      let targetClass = null;
      if (s.className) {
        targetClass = classMapByName.get(String(s.className).trim().toLowerCase());
      }
      if (!targetClass && classId) {
        targetClass = classMapById.get(classId);
      }
      if (!targetClass && allClasses.length > 0) {
        targetClass = allClasses[0];
      }

      if (!targetClass) {
        results.failCount++;
        results.failures.push({
          name: displayName,
          admissionNumber: cleanAdmissionNumber,
          error: `Class level '${s.className || 'default'}' not found in school registry.`
        });
        continue;
      }

      // Resolve Target Arm
      let targetArm = null;
      if (s.armName && targetClass.arms) {
        targetArm = targetClass.arms.find((a: any) => a.name.trim().toLowerCase() === String(s.armName).trim().toLowerCase());
      }
      if (!targetArm && armId && targetClass.arms) {
        targetArm = targetClass.arms.find((a: any) => a.id === armId);
      }
      if (!targetArm && targetClass) {
        let defaultArm = await prisma.arm.findFirst({
          where: { classId: targetClass.id }
        });
        if (!defaultArm) {
          defaultArm = await prisma.arm.create({
            data: {
              name: 'A',
              classId: targetClass.id,
              schoolId,
            }
          });
        }
        targetArm = defaultArm;
        if (!targetClass.arms) targetClass.arms = [];
        targetClass.arms.push(defaultArm);
      }

      if (!targetArm) {
        results.failCount++;
        results.failures.push({
          name: displayName,
          admissionNumber: cleanAdmissionNumber,
          error: `Arm stream '${s.armName || 'default'}' not found for class '${targetClass.name}'.`
        });
        continue;
      }

      try {
        const conflict = await prisma.student.findUnique({
          where: {
            schoolId_admissionNumber: {
              schoolId,
              admissionNumber: cleanAdmissionNumber
            }
          }
        });

        let resultStudent;
        let username = '';
        let tempPassword = '';

        const studentData = {
          schoolId,
          firstName: cleanFirstName,
          lastName: cleanLastName || 'Student',
          middleName: cleanMiddleName,
          preferredName: s.preferredName ? String(s.preferredName).trim() : null,
          admissionNumber: cleanAdmissionNumber,
          gender: cleanGender,
          dateOfBirth: s.dateOfBirth ? String(s.dateOfBirth).trim() : null,
          classId: targetClass.id,
          armId: targetArm.id,
          status: 'ACTIVE',
          category: s.category ? String(s.category).trim() : null,
          house: s.house ? String(s.house).trim() : null,
          nationality: s.nationality ? String(s.nationality).trim() : null,
          stateOfOrigin: s.stateOfOrigin ? String(s.stateOfOrigin).trim() : null,
          lga: s.lga ? String(s.lga).trim() : null,
          religion: s.religion ? String(s.religion).trim() : null,
          bloodGroup: s.bloodGroup ? String(s.bloodGroup).trim() : null,
          genotype: s.genotype ? String(s.genotype).trim() : null,
          address: s.address ? String(s.address).trim() : null,
          town: s.town ? String(s.town).trim() : null,
          state: s.state ? String(s.state).trim() : null,
          country: s.country ? String(s.country).trim() : null,
          phone: s.phone ? String(s.phone).trim() : null,
          email: s.email ? String(s.email).trim() : null,
          languages: s.languages ? String(s.languages).trim() : null,
          studentNotes: s.studentNotes ? String(s.studentNotes).trim() : null,
          admissionDate: s.admissionDate ? String(s.admissionDate).trim() : null,
          admissionType: s.admissionType ? String(s.admissionType).trim() : null,
          previousSchool: s.previousSchool ? String(s.previousSchool).trim() : null,
        };

        if (conflict) {
          resultStudent = await prisma.$transaction(async (tx) => {
            const student = await tx.student.update({
              where: { id: conflict.id },
              data: studentData
            });

            const linkedUser = await tx.user.findFirst({
              where: { studentId: conflict.id }
            });
            if (linkedUser) {
              await tx.user.update({
                where: { id: linkedUser.id },
                data: {
                  firstName: cleanFirstName,
                  lastName: cleanLastName || 'Student',
                  status: 'ACTIVE',
                  isActive: true
                }
              });
              username = linkedUser.username;
            }

            // Create or update Guardian info if provided
            if (s.guardianFirstName || s.guardianLastName || s.guardianPhone) {
              const gFirstName = String(s.guardianFirstName || 'Guardian').trim();
              const gLastName = String(s.guardianLastName || cleanLastName || 'Guardian').trim();
              const gRel = String(s.guardianRelationship || 'GUARDIAN').trim().toUpperCase();

              await tx.studentGuardian.create({
                data: {
                  schoolId,
                  studentId: student.id,
                  firstName: gFirstName,
                  lastName: gLastName,
                  relationship: ['FATHER', 'MOTHER', 'GUARDIAN', 'EMERGENCY'].includes(gRel) ? gRel : 'GUARDIAN',
                  phone: s.guardianPhone ? String(s.guardianPhone).trim() : null,
                  email: s.guardianEmail ? String(s.guardianEmail).trim() : null,
                  dateOfBirth: s.guardianDateOfBirth ? String(s.guardianDateOfBirth).trim() : null,
                  occupation: s.guardianOccupation ? String(s.guardianOccupation).trim() : null,
                  address: s.guardianAddress ? String(s.guardianAddress).trim() : null,
                  isPrimary: true,
                  isBillingContact: true,
                  isEmergencyContact: true,
                  isNotificationRecipient: true
                }
              });
            }

            // Upsert Medical record if provided
            if (s.allergies || s.chronicIllnesses || s.disabilities || s.emergencyInstructions || s.medicalNotes || s.immunizationStatus || s.bloodGroup || s.genotype) {
              await tx.studentMedical.upsert({
                where: { studentId: student.id },
                create: {
                  schoolId,
                  studentId: student.id,
                  bloodGroup: s.bloodGroup ? String(s.bloodGroup).trim() : null,
                  genotype: s.genotype ? String(s.genotype).trim() : null,
                  allergies: s.allergies ? String(s.allergies).trim() : null,
                  conditions: s.chronicIllnesses ? String(s.chronicIllnesses).trim() : null,
                  disabilities: s.disabilities ? String(s.disabilities).trim() : null,
                  emergencyNotes: s.emergencyInstructions ? String(s.emergencyInstructions).trim() : null,
                  specialNeeds: s.medicalNotes ? String(s.medicalNotes).trim() : null,
                  vaccinationRecords: s.immunizationStatus ? String(s.immunizationStatus).trim() : null,
                },
                update: {
                  bloodGroup: s.bloodGroup ? String(s.bloodGroup).trim() : undefined,
                  genotype: s.genotype ? String(s.genotype).trim() : undefined,
                  allergies: s.allergies ? String(s.allergies).trim() : undefined,
                  conditions: s.chronicIllnesses ? String(s.chronicIllnesses).trim() : undefined,
                  disabilities: s.disabilities ? String(s.disabilities).trim() : undefined,
                  emergencyNotes: s.emergencyInstructions ? String(s.emergencyInstructions).trim() : undefined,
                  specialNeeds: s.medicalNotes ? String(s.medicalNotes).trim() : undefined,
                  vaccinationRecords: s.immunizationStatus ? String(s.immunizationStatus).trim() : undefined,
                }
              });
            }

            return student;
          });
        } else {
          tempPassword = 'Student123';
          const passwordHash = defaultPasswordHash;
          username = await generateUniqueUsername(cleanLastName || 'student');
          const email = `${username}@student.local`;

          resultStudent = await prisma.$transaction(async (tx) => {
            const student = await tx.student.create({
              data: studentData
            });

            await tx.user.create({
              data: {
                schoolId,
                username,
                email,
                passwordHash,
                firstName: cleanFirstName,
                lastName: cleanLastName || 'Student',
                role: 'STUDENT',
                studentId: student.id,
                isFirstLogin: true,
                status: 'ACTIVE',
                isActive: true
              }
            });

            // Create Guardian info if provided
            if (s.guardianFirstName || s.guardianLastName || s.guardianPhone) {
              const gFirstName = String(s.guardianFirstName || 'Guardian').trim();
              const gLastName = String(s.guardianLastName || cleanLastName || 'Guardian').trim();
              const gRel = String(s.guardianRelationship || 'GUARDIAN').trim().toUpperCase();

              await tx.studentGuardian.create({
                data: {
                  schoolId,
                  studentId: student.id,
                  firstName: gFirstName,
                  lastName: gLastName,
                  relationship: ['FATHER', 'MOTHER', 'GUARDIAN', 'EMERGENCY'].includes(gRel) ? gRel : 'GUARDIAN',
                  phone: s.guardianPhone ? String(s.guardianPhone).trim() : null,
                  email: s.guardianEmail ? String(s.guardianEmail).trim() : null,
                  dateOfBirth: s.guardianDateOfBirth ? String(s.guardianDateOfBirth).trim() : null,
                  occupation: s.guardianOccupation ? String(s.guardianOccupation).trim() : null,
                  address: s.guardianAddress ? String(s.guardianAddress).trim() : null,
                  isPrimary: true,
                  isBillingContact: true,
                  isEmergencyContact: true,
                  isNotificationRecipient: true
                }
              });
            }

            // Create Medical record if provided
            if (s.allergies || s.chronicIllnesses || s.disabilities || s.emergencyInstructions || s.medicalNotes || s.immunizationStatus || s.bloodGroup || s.genotype) {
              await tx.studentMedical.create({
                data: {
                  schoolId,
                  studentId: student.id,
                  bloodGroup: s.bloodGroup ? String(s.bloodGroup).trim() : null,
                  genotype: s.genotype ? String(s.genotype).trim() : null,
                  allergies: s.allergies ? String(s.allergies).trim() : null,
                  conditions: s.chronicIllnesses ? String(s.chronicIllnesses).trim() : null,
                  disabilities: s.disabilities ? String(s.disabilities).trim() : null,
                  emergencyNotes: s.emergencyInstructions ? String(s.emergencyInstructions).trim() : null,
                  specialNeeds: s.medicalNotes ? String(s.medicalNotes).trim() : null,
                  vaccinationRecords: s.immunizationStatus ? String(s.immunizationStatus).trim() : null,
                }
              });
            }

            return student;
          });
        }

        results.successCount++;
        results.createdStudents.push({
          id: resultStudent.id,
          firstName: resultStudent.firstName,
          lastName: resultStudent.lastName,
          admissionNumber: resultStudent.admissionNumber,
          username,
          temporaryPassword: tempPassword || 'Preserved'
        });
      } catch (err: any) {
        console.error('Error inserting uploaded student:', err);
        results.failCount++;
        results.failures.push({
          name: displayName,
          admissionNumber: cleanAdmissionNumber,
          error: err.message || 'Database transaction error.'
        });
      }
    }

    // Auto-sync uploaded student guardians into parent accounts and link wards
    await syncGuardiansToParents(schoolId);

    return NextResponse.json({
      success: true,
      created: results.successCount,
      skipped: results.failCount,
      data: {
        successCount: results.successCount,
        failCount: results.failCount,
        failures: results.failures,
        createdStudents: results.createdStudents,
      }
    });

  } catch (error: any) {
    console.error('Excel Upload Students API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process student roster Excel upload' }, { status: error.status || 500 });
  }
}
export const dynamic = 'force-dynamic';
