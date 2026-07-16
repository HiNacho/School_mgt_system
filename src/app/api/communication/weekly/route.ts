import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET: Fetch weekly progress reports for a student
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const termId = searchParams.get('termId');

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

    // Resolve term context (use current term if not specified)
    let targetTermId = termId;
    if (!targetTermId) {
      const currentTerm = await prisma.term.findFirst({
        where: { schoolId, isCurrent: true }
      });
      targetTermId = currentTerm?.id || null;
    }

    if (!targetTermId) {
      return NextResponse.json({ error: 'No active academic term found for this school context.' }, { status: 400 });
    }

    const reports = await prisma.weeklyReport.findMany({
      where: {
        schoolId,
        studentId,
        termId: targetTermId
      },
      orderBy: { weekNumber: 'desc' },
      include: {
        teacher: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: reports });

  } catch (error: any) {
    console.error('Weekly Reports GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve weekly reports' }, { status: 500 });
  }
}

// POST: Create or update a weekly progress report
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      schoolId,
      studentId,
      termId,
      weekNumber,
      academicPerformance,
      classParticipation,
      homeworkCompletion,
      behaviour,
      socialInteraction,
      leadership,
      comment,
      recommendation
    } = body;

    const session = await requireAuth(req);

    if (!schoolId || !studentId || !termId || !weekNumber) {
      return NextResponse.json({ error: 'Missing required parameters for weekly report submission' }, { status: 400 });
    }

    // Authorization: Only class teachers, school admins, or super admins can submit weekly reports
    const isAuthorized =
      session.role === 'CLASS_TEACHER' ||
      session.role === 'SCHOOL_ADMIN' ||
      session.role === 'SUPER_ADMIN';

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied: Unauthorized staff permissions.' }, { status: 403 });
    }

    // Verify class teacher actually oversees the student's arm
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        arm: true,
        parent: {
          select: {
            id: true,
            email: true,
            user: { select: { id: true } }
          }
        }
      }
    });

    if (!student || student.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Student record not found' }, { status: 404 });
    }

    if (session.role === 'CLASS_TEACHER' && student.arm.classTeacherId !== session.userId) {
      return NextResponse.json({ error: 'Access denied: You are not the assigned Class Teacher for this student\'s class.' }, { status: 403 });
    }

    // Submit report transactionally
    const result = await prisma.$transaction(async (tx) => {
      // Upsert Weekly Report
      const upserted = await tx.weeklyReport.upsert({
        where: {
          studentId_termId_weekNumber: {
            studentId,
            termId,
            weekNumber: parseInt(weekNumber, 10)
          }
        },
        create: {
          schoolId,
          studentId,
          teacherId: session.userId,
          termId,
          weekNumber: parseInt(weekNumber, 10),
          academicPerformance,
          classParticipation,
          homeworkCompletion,
          behaviour,
          socialInteraction,
          leadership,
          comment,
          recommendation
        },
        update: {
          teacherId: session.userId,
          academicPerformance,
          classParticipation,
          homeworkCompletion,
          behaviour,
          socialInteraction,
          leadership,
          comment,
          recommendation
        }
      });

      // Add to Student Timeline
      await tx.studentTimeline.create({
        data: {
          schoolId,
          studentId,
          eventType: 'WEEKLY_REPORT',
          title: `Weekly Progress Report: Week ${weekNumber}`,
          description: `Class Teacher submitted weekly updates: Academic "${academicPerformance}", Behaviour "${behaviour}".`,
          referenceId: upserted.id
        }
      });

      if (student.parent?.user?.id) {
        const sender = await tx.user.findUnique({
          where: { id: session.userId },
          select: { firstName: true, lastName: true }
        });
        const teacherName = sender ? `${sender.firstName} ${sender.lastName}` : 'Class Teacher';
        await tx.notification.create({
          data: {
            schoolId,
            userId: student.parent.user.id,
            message: `${student.firstName}'s Week ${weekNumber} progress report has been submitted by ${teacherName}.`
          }
        });
      }

      return upserted;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Weekly Reports POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit weekly progress report' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

