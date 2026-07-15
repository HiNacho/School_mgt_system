import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET: Fetch behaviour logs for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

    const session = await requireAuth(req);

    if (!schoolId || !studentId) {
      return NextResponse.json({ error: 'School ID and Student ID are required' }, { status: 400 });
    }

    // Verify parent/student relationship linkage for security boundary
    if (session.role === 'PARENT') {
      const parentUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: {
          parent: {
            include: {
              students: { select: { id: true } }
            }
          }
        }
      });
      const hasWard = parentUser?.parent?.students.some((s: any) => s.id === studentId);
      if (!hasWard) {
        return NextResponse.json({ error: 'Access denied: Requested student is not your linked ward.' }, { status: 403 });
      }
    } else if (session.role === 'STUDENT') {
      const studentUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { studentId: true }
      });
      if (studentUser?.studentId !== studentId) {
        return NextResponse.json({ error: 'Access denied: Unauthorized student record request.' }, { status: 403 });
      }
    }

    const logs = await prisma.behaviourLog.findMany({
      where: {
        schoolId,
        studentId
      },
      orderBy: { createdAt: 'desc' },
      include: {
        teacher: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: logs });

  } catch (error: any) {
    console.error('Behaviour Logs GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve behaviour logs' }, { status: 500 });
  }
}

// POST: Create a daily behaviour log record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, studentId, category, severity, title, description } = body;

    const session = await requireAuth(req);

    if (!schoolId || !studentId || !category || !severity || !title || !description) {
      return NextResponse.json({ error: 'Missing required parameters for behaviour log creation' }, { status: 400 });
    }

    // Authorization: Only teaching staff and admins can log behaviour incidents
    const isStaff =
      session.role === 'CLASS_TEACHER' ||
      session.role === 'SUBJECT_TEACHER' ||
      session.role === 'HEAD_TEACHER' ||
      session.role === 'SCHOOL_ADMIN' ||
      session.role === 'SUPER_ADMIN';

    if (!isStaff) {
      return NextResponse.json({ error: 'Access denied: Unauthorized staff permissions.' }, { status: 403 });
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        parent: {
          select: {
            id: true,
            user: { select: { id: true } }
          }
        }
      }
    });

    if (!student || student.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    // Save behaviour incident and update timelines transactionally
    const result = await prisma.$transaction(async (tx) => {
      const newLog = await tx.behaviourLog.create({
        data: {
          schoolId,
          studentId,
          teacherId: session.userId,
          category,
          severity,
          title,
          description
        }
      });

      // Add to Student Timeline
      await tx.studentTimeline.create({
        data: {
          schoolId,
          studentId,
          eventType: 'BEHAVIOUR',
          title: `Behaviour Event: ${title}`,
          description: `Logged as ${category} (${severity} severity): "${description}"`,
          referenceId: newLog.id
        }
      });

      // Notify parent
      if (student.parent?.user?.id) {
        const sender = await tx.user.findUnique({
          where: { id: session.userId },
          select: { firstName: true, lastName: true }
        });
        const teacherName = sender ? `${sender.firstName} ${sender.lastName}` : 'Staff';
        await tx.notification.create({
          data: {
            schoolId,
            userId: student.parent.user.id,
            message: `${student.firstName} has a behaviour update: ${title} (${severity} event logged by ${teacherName}).`
          }
        });
      }

      return newLog;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Behaviour Logs POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to record behaviour log' }, { status: 500 });
  }
}
