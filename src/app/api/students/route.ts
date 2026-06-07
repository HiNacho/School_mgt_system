// Student Registry API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch list of students with filter options
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const status = searchParams.get('status') || 'ACTIVE'; // ACTIVE, ARCHIVED, GRADUATED, etc., or 'ALL'

    if (studentId) {
      const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          arm: true,
          parent: true,
          scores: {
            include: {
              subject: true,
              term: true,
              class: true,
              arm: true,
            }
          },
          attendance: {
            include: {
              term: true,
            }
          },
          reportComments: {
            include: {
              term: true,
            }
          }
        }
      });
      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: student });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    const whereClause: any = { schoolId };

    if (classId) whereClause.classId = classId;
    if (armId) whereClause.armId = armId;
    
    const feesPaidParam = searchParams.get('feesPaid');
    if (feesPaidParam !== null) {
      whereClause.feesPaid = feesPaidParam === 'true';
    }

    if (status !== 'ALL') {
      whereClause.status = status;
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        class: true,
        arm: true,
        parent: true,
        user: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return NextResponse.json({ success: true, data: students });
  } catch (error: any) {
    console.error('Students GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch student registry' }, { status: 500 });
  }
}

// 2. POST: Create a new student profile
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, firstName, lastName, middleName, admissionNumber, gender, dateOfBirth, classId, armId, passportPhoto } = body;

    // Validation
    if (!schoolId || !firstName || !lastName || !admissionNumber || !gender || !classId || !armId) {
      return NextResponse.json({ error: 'Missing required student details' }, { status: 400 });
    }

    // Check unique admission number within the school
    const existingStudent = await prisma.student.findUnique({
      where: {
        schoolId_admissionNumber: {
          schoolId,
          admissionNumber: admissionNumber.trim(),
        },
      },
    });

    if (existingStudent) {
      return NextResponse.json({
        error: `Admission Number '${admissionNumber}' is already registered in this school`,
      }, { status: 409 });
    }

    const student = await prisma.student.create({
      data: {
        schoolId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        middleName: middleName?.trim() || null,
        admissionNumber: admissionNumber.trim(),
        gender,
        dateOfBirth: dateOfBirth || null,
        classId,
        armId,
        passportPhoto: passportPhoto || null,
        status: 'ACTIVE',
      },
    });

    return NextResponse.json({ success: true, data: student });
  } catch (error: any) {
    console.error('Student POST Error:', error);
    return NextResponse.json({ error: 'Failed to register student profile' }, { status: 500 });
  }
}

// 3. PUT: Update student profile or change status
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, firstName, lastName, middleName, admissionNumber, gender, dateOfBirth, classId, armId, status, passportPhoto } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required for updates' }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Check admission number conflict if changed
    if (admissionNumber && admissionNumber !== existing.admissionNumber) {
      const conflict = await prisma.student.findUnique({
        where: {
          schoolId_admissionNumber: {
            schoolId: existing.schoolId,
            admissionNumber: admissionNumber.trim(),
          },
        },
      });
      if (conflict) {
        return NextResponse.json({
          error: `Admission number '${admissionNumber}' is already assigned to another student`,
        }, { status: 409 });
      }
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        firstName: firstName ? firstName.trim() : undefined,
        lastName: lastName ? lastName.trim() : undefined,
        middleName: middleName !== undefined ? middleName?.trim() || null : undefined,
        admissionNumber: admissionNumber ? admissionNumber.trim() : undefined,
        gender: gender || undefined,
        dateOfBirth: dateOfBirth !== undefined ? dateOfBirth : undefined,
        classId: classId || undefined,
        armId: armId || undefined,
        status: status || undefined,
        passportPhoto: passportPhoto !== undefined ? passportPhoto : undefined,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Student PUT Error:', error);
    return NextResponse.json({ error: 'Failed to update student profile' }, { status: 500 });
  }
}

// 4. DELETE: Safe hard deletion (Only allowed if no scores/records exist)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required for deletion' }, { status: 400 });
    }

    // 1. Check if student has scores
    const scoresCount = await prisma.score.count({
      where: { studentId: id },
    });

    // 2. Check if student has attendance records
    const attendanceCount = await prisma.attendance.count({
      where: { studentId: id },
    });

    // 3. Check if student has report comments
    const commentsCount = await prisma.reportCardComment.count({
      where: { studentId: id },
    });

    const hasAcademicRecords = scoresCount > 0 || attendanceCount > 0 || commentsCount > 0;

    if (hasAcademicRecords) {
      return NextResponse.json({
        error: 'Deletion Blocked: This student has active academic records. Hard-deleting is prohibited to preserve academic history. Please change student status to "ARCHIVED" or "WITHDRAWN" instead.',
        canArchive: true,
      }, { status: 403 });
    }

    // If no records, allow permanent delete (e.g. created by mistake)
    await prisma.student.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Student profile permanently deleted' });
  } catch (error: any) {
    console.error('Student DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete student profile' }, { status: 500 });
  }
}
