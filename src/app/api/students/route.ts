// Student Registry API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { generateUniqueUsername, generateTempPassword } from '@/lib/auth-utils';

// 1. GET: Fetch list of students with filter options
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'PARENT', 'STUDENT']);

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
          parent: { include: { user: true } },
          user: true,
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

      // Strict multi-tenant security
      requireSchoolScope(session, student.schoolId);

      // Scoped role boundary checks
      if (session.role === 'STUDENT') {
        if (student.user?.id !== session.userId) {
          return NextResponse.json({ error: 'Access Denied: You are only authorized to view your own student profile.' }, { status: 403 });
        }
      } else if (session.role === 'PARENT') {
        const parentUser = await prisma.user.findUnique({
          where: { id: session.userId },
          select: { parentId: true }
        });
        if (!parentUser || !parentUser.parentId || student.parentId !== parentUser.parentId) {
          return NextResponse.json({ error: 'Access Denied: You are not authorized to view this student profile.' }, { status: 403 });
        }
      }

      return NextResponse.json({ success: true, data: student });
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // If student or parent, restrict list query
    if (session.role === 'STUDENT' || session.role === 'PARENT') {
      return NextResponse.json({ error: 'Access Denied: You are not authorized to view the school student registry.' }, { status: 403 });
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
        parent: { include: { user: true } },
        user: true
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    return NextResponse.json(
      { success: true, data: students },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
  } catch (error: any) {
    console.error('Students GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch student registry' }, { status: error.status || 500 });
  }
}

// 2. POST: Create a new student profile and provision user credentials
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { schoolId, firstName, lastName, middleName, admissionNumber, gender, dateOfBirth, classId, armId, passportPhoto } = body;

    // Validation
    if (!schoolId || !firstName || !lastName || !admissionNumber || !gender || !classId || !armId) {
      return NextResponse.json({ error: 'Missing required student details' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

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

    // Capacity limit enforcement
    const schoolObj = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { maxStudents: true }
    });
    const activeStudentsCount = await prisma.student.count({
      where: { schoolId, status: 'ACTIVE' }
    });
    const studentLimit = schoolObj?.maxStudents ?? 100;
    if (activeStudentsCount >= studentLimit) {
      return NextResponse.json({
        error: `Prepaid student limit reached. Your school has registered ${activeStudentsCount} of ${studentLimit} allowed students. Please upgrade your subscription plan to register more students.`,
      }, { status: 403 });
    }

    // Auto-generate unique username and bcrypt-hashed password
    const tempPassword = generateTempPassword();
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(tempPassword, salt);
    const username = await generateUniqueUsername(lastName);
    const email = `${username}@student.local`; // Unique generated email since student forms don't capture emails

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Student record
      const student = await tx.student.create({
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

      // 2. Create linked User record
      const user = await tx.user.create({
        data: {
          schoolId,
          username,
          email,
          passwordHash,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: 'STUDENT',
          studentId: student.id,
          isFirstLogin: true,
          status: 'ACTIVE',
          isActive: true
        }
      });

      return { student, user };
    });

    return NextResponse.json({ 
      success: true, 
      data: result.student,
      username,
      temporaryPassword: tempPassword
    });
  } catch (error: any) {
    console.error('Student POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to register student profile' }, { status: error.status || 500 });
  }
}

// 3. PUT: Update student profile or change status
export async function PUT(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { id, firstName, lastName, middleName, admissionNumber, gender, dateOfBirth, classId, armId, status, passportPhoto } = body;

    if (!id) {
      return NextResponse.json({ error: 'Student ID is required for updates' }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    requireSchoolScope(session, existing.schoolId);

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

    const result = await prisma.$transaction(async (tx) => {
      // Update student profile
      const updated = await tx.student.update({
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

      // Synchronize changes to linked User details
      await tx.user.updateMany({
        where: { studentId: id },
        data: {
          firstName: firstName ? firstName.trim() : undefined,
          lastName: lastName ? lastName.trim() : undefined,
          status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
          isActive: status === 'ACTIVE'
        }
      });

      return updated;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Student PUT Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update student profile' }, { status: error.status || 500 });
  }
}

// 4. DELETE: Safe hard deletion (Only allowed if no scores/records exist)
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids');

    if (!id && !idsParam) {
      return NextResponse.json({ error: 'Student ID or IDs parameter is required for deletion' }, { status: 400 });
    }

    if (idsParam) {
      const ids = idsParam.split(',').map(item => item.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: 'No student IDs provided' }, { status: 400 });
      }

      // Verify school scope
      const students = await prisma.student.findMany({
        where: { id: { in: ids } },
        select: { schoolId: true }
      });

      for (const s of students) {
        requireSchoolScope(session, s.schoolId);
      }

      // Check if any of these students has active academic records
      const studentsWithRecords = await prisma.student.findMany({
        where: {
          id: { in: ids },
          OR: [
            { scores: { some: {} } },
            { attendance: { some: {} } },
            { reportComments: { some: {} } }
          ]
        },
        select: {
          firstName: true,
          lastName: true
        }
      });

      if (studentsWithRecords.length > 0) {
        const names = studentsWithRecords.map(s => `${s.firstName} ${s.lastName}`).join(', ');
        return NextResponse.json({
          error: `Deletion Blocked: The following selected students have active academic records: ${names}. Hard-deleting them is prohibited to preserve academic history. Please change their status to "ARCHIVED" instead.`,
          canArchive: true,
        }, { status: 403 });
      }

      // Delete student profiles and linked user accounts
      await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({
          where: { studentId: { in: ids } }
        });
        await tx.student.deleteMany({
          where: { id: { in: ids } }
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: `Successfully deleted ${ids.length} student profiles.` 
      });
    }

    // Single deletion fallback
    if (id) {
      const student = await prisma.student.findUnique({
        where: { id },
        select: { schoolId: true }
      });

      if (!student) {
        return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
      }

      requireSchoolScope(session, student.schoolId);

      const scoresCount = await prisma.score.count({
        where: { studentId: id },
      });

      const attendanceCount = await prisma.attendance.count({
        where: { studentId: id },
      });

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

      await prisma.$transaction(async (tx) => {
        await tx.user.deleteMany({
          where: { studentId: id }
        });
        await tx.student.delete({
          where: { id },
        });
      });

      return NextResponse.json({ success: true, message: 'Student profile permanently deleted' });
    }

    return NextResponse.json({ error: 'Invalid parameters provided' }, { status: 400 });
  } catch (error: any) {
    console.error('Student DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete student profiles' }, { status: error.status || 500 });
  }
}

export const dynamic = 'force-dynamic';
