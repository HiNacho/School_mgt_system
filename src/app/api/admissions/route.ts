// Admission Application Pipeline API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch list of admissions applications with status filter
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const status = searchParams.get('status') || 'PENDING'; // PENDING, APPROVED, REJECTED, or ALL

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    const whereClause: any = { schoolId };
    if (status !== 'ALL') {
      whereClause.status = status;
    }

    const admissions = await prisma.admissionApplication.findMany({
      where: whereClause,
      include: {
        class: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({ success: true, data: admissions });
  } catch (error: any) {
    console.error('Admissions GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch admission queue' }, { status: 500 });
  }
}

// 2. POST: Submit a new student admission application (public/admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, firstName, lastName, middleName, email, phone, 
      gender, dateOfBirth, classId, passportPhoto 
    } = body;

    if (!schoolId || !firstName || !lastName || !gender || !classId) {
      return NextResponse.json({ error: 'Missing required admission fields' }, { status: 400 });
    }

    const application = await prisma.admissionApplication.create({
      data: {
        schoolId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        gender,
        dateOfBirth: dateOfBirth || null,
        classId,
        passportPhoto: passportPhoto || null,
        status: 'PENDING'
      },
      include: {
        class: true
      }
    });

    return NextResponse.json({ success: true, data: application });
  } catch (error: any) {
    console.error('Admissions POST Error:', error);
    return NextResponse.json({ error: 'Failed to submit admission application' }, { status: 500 });
  }
}

// 3. PATCH: Approve or Reject an admission application.
// If approved, create Student and provision User login credentials.
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, status, armId, schoolId } = body;

    if (!applicationId || !status || !schoolId) {
      return NextResponse.json({ error: 'Missing required evaluation fields' }, { status: 400 });
    }

    const application = await prisma.admissionApplication.findFirst({
      where: { id: applicationId, schoolId },
      include: { class: true }
    });

    if (!application) {
      return NextResponse.json({ error: 'Admission application not found' }, { status: 404 });
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json({ error: 'Application has already been processed' }, { status: 400 });
    }

    if (status === 'REJECTED') {
      const updated = await prisma.admissionApplication.update({
        where: { id: applicationId },
        data: { status: 'REJECTED' }
      });
      return NextResponse.json({ success: true, data: updated });
    }

    if (status === 'APPROVED') {
      if (!armId) {
        return NextResponse.json({ error: 'Class arm allocation is required for approval' }, { status: 400 });
      }

      // Verify arm exists
      const arm = await prisma.arm.findFirst({
        where: { id: armId, classId: application.classId, schoolId }
      });

      if (!arm) {
        return NextResponse.json({ error: 'Class arm is invalid or does not belong to chosen class' }, { status: 400 });
      }

      // Load school for email slug generation
      const school = await prisma.school.findUnique({ where: { id: schoolId } });
      const schoolSlug = school?.slug || 'school';

      // 1. Generate sequential/unique admission number
      const currentYear = new Date().getFullYear();
      const count = await prisma.student.count({ where: { schoolId } });
      const formattedNum = `${schoolSlug.replace('-secondary', '').replace('-primary', '').toUpperCase()}-${currentYear}-${1000 + count + 1}`;

      // 2. Perform transactional insertions
      const studentProfile = await prisma.$transaction(async (tx) => {
        // A. Update application status
        await tx.admissionApplication.update({
          where: { id: applicationId },
          data: { status: 'APPROVED' }
        });

        // B. Create Student profile
        const student = await tx.student.create({
          data: {
            schoolId,
            firstName: application.firstName,
            lastName: application.lastName,
            middleName: application.middleName,
            admissionNumber: formattedNum,
            gender: application.gender,
            dateOfBirth: application.dateOfBirth,
            passportPhoto: application.passportPhoto,
            classId: application.classId,
            armId: armId,
            status: 'ACTIVE',
            feesPaid: false
          }
        });

        // C. Create linked User credentials
        // Use generated format e.g., stud.GW-2026-1001@greenwood.com
        const studentEmail = `stud.${formattedNum.toLowerCase()}@${schoolSlug}.com`;
        await tx.user.create({
          data: {
            schoolId,
            email: studentEmail,
            firstName: application.firstName,
            lastName: application.lastName,
            role: 'STUDENT',
            passwordHash: 'password', // Default bypass password
            studentId: student.id,
            status: 'ACTIVE'
          }
        });

        return student;
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Admission approved successfully',
        data: {
          student: studentProfile,
          admissionNumber: formattedNum
        }
      });
    }

    return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
  } catch (error: any) {
    console.error('Admissions PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to evaluate admission application' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
