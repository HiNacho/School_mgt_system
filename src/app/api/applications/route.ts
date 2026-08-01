import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

function generateReferenceNumber(type: string) {
  const prefixMap: Record<string, string> = {
    STUDENT: 'APP-STU',
    TEACHER: 'APP-TCH',
    STAFF: 'APP-STF'
  };
  const prefix = prefixMap[type] || 'APP';
  const year = new Date().getFullYear();
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${year}-${randomNum}`;
}

// 1. POST: Submit a new application or save draft (Public / Unauthenticated)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      schoolId,
      type,
      applicantName,
      applicantEmail,
      applicantPhone,
      applyingClass,
      department,
      applicationData,
      uploadedDocuments,
      isDraft,
      referenceNumber: existingRef
    } = body;

    if (!schoolId || !type || !applicantName) {
      return NextResponse.json({ error: 'Missing required application fields (School, Type, Applicant Name)' }, { status: 400 });
    }

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    const cleanEmail = applicantEmail ? applicantEmail.trim().toLowerCase() : null;
    const cleanPhone = applicantPhone ? applicantPhone.trim() : null;

    // Check duplicate applications if submitting (not draft)
    if (!isDraft && cleanEmail) {
      const existingPending = await prisma.pendingApplication.findFirst({
        where: {
          schoolId,
          applicantEmail: cleanEmail,
          status: { in: ['PENDING', 'UNDER_REVIEW', 'APPROVED'] }
        }
      });

      if (existingPending) {
        return NextResponse.json({
          error: `An active application (${existingPending.referenceNumber}) already exists for email ${cleanEmail}. Please use the Application Tracker to view progress.`
        }, { status: 409 });
      }
    }

    let application;
    const refNo = existingRef || generateReferenceNumber(type.toUpperCase());
    const status = isDraft ? 'DRAFT' : 'PENDING';

    if (existingRef) {
      application = await prisma.pendingApplication.upsert({
        where: { referenceNumber: existingRef },
        create: {
          schoolId,
          referenceNumber: refNo,
          type: type.toUpperCase(),
          status,
          applicantName: applicantName.trim(),
          applicantEmail: cleanEmail,
          applicantPhone: cleanPhone,
          applyingClass: applyingClass || null,
          department: department || null,
          applicationData: typeof applicationData === 'object' ? JSON.stringify(applicationData) : (applicationData || '{}'),
          uploadedDocuments: typeof uploadedDocuments === 'object' ? JSON.stringify(uploadedDocuments) : (uploadedDocuments || '[]'),
          submittedAt: new Date()
        },
        update: {
          status: isDraft ? 'DRAFT' : 'PENDING',
          applicantName: applicantName.trim(),
          applicantEmail: cleanEmail,
          applicantPhone: cleanPhone,
          applyingClass: applyingClass || null,
          department: department || null,
          applicationData: typeof applicationData === 'object' ? JSON.stringify(applicationData) : (applicationData || '{}'),
          uploadedDocuments: typeof uploadedDocuments === 'object' ? JSON.stringify(uploadedDocuments) : (uploadedDocuments || '[]'),
          updatedAt: new Date()
        }
      });
    } else {
      application = await prisma.pendingApplication.create({
        data: {
          schoolId,
          referenceNumber: refNo,
          type: type.toUpperCase(),
          status,
          applicantName: applicantName.trim(),
          applicantEmail: cleanEmail,
          applicantPhone: cleanPhone,
          applyingClass: applyingClass || null,
          department: department || null,
          applicationData: typeof applicationData === 'object' ? JSON.stringify(applicationData) : (applicationData || '{}'),
          uploadedDocuments: typeof uploadedDocuments === 'object' ? JSON.stringify(uploadedDocuments) : (uploadedDocuments || '[]'),
          submittedAt: new Date()
        }
      });
    }

    // Create In-App Notification for School Admin if submitted (not draft)
    if (!isDraft) {
      const admins = await prisma.user.findMany({
        where: { schoolId, role: { in: ['SUPER_ADMIN', 'SCHOOL_ADMIN'] }, isActive: true }
      });

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            schoolId,
            userId: admin.id,
            message: `New ${type} Application Submitted: ${applicantName} (${refNo}).`
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: isDraft ? 'Application draft saved successfully' : 'Application submitted successfully',
      data: {
        id: application.id,
        referenceNumber: application.referenceNumber,
        status: application.status,
        submittedAt: application.submittedAt
      }
    });

  } catch (error: any) {
    console.error('Applications POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit application' }, { status: 500 });
  }
}

// 2. GET: List pending applications for school admin
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const search = searchParams.get('search');

    const query: any = { schoolId };

    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (type && type !== 'ALL') {
      query.type = type.toUpperCase();
    }
    if (search) {
      query.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { applicantName: { contains: search, mode: 'insensitive' } },
        { applicantEmail: { contains: search, mode: 'insensitive' } },
        { applicantPhone: { contains: search, mode: 'insensitive' } }
      ];
    }

    const applications = await prisma.pendingApplication.findMany({
      where: query,
      orderBy: { submittedAt: 'desc' }
    });

    // Counts for stats cards
    const allApps = await prisma.pendingApplication.findMany({ where: { schoolId } });
    const stats = {
      total: allApps.length,
      pending: allApps.filter(a => a.status === 'PENDING').length,
      underReview: allApps.filter(a => a.status === 'UNDER_REVIEW').length,
      approved: allApps.filter(a => a.status === 'APPROVED').length,
      rejected: allApps.filter(a => a.status === 'REJECTED').length,
      correctionRequested: allApps.filter(a => a.status === 'CORRECTION_REQUESTED').length,
      studentCount: allApps.filter(a => a.type === 'STUDENT').length,
      teacherCount: allApps.filter(a => a.type === 'TEACHER').length,
      staffCount: allApps.filter(a => a.type === 'STAFF').length,
    };

    return NextResponse.json({
      success: true,
      data: applications,
      stats
    });

  } catch (error: any) {
    console.error('Applications GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch applications' }, { status: error.status || 500 });
  }
}
