import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET: Retrieve meeting requests
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');

    const session = await requireAuth(req);

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    let query: any = { schoolId };

    if (studentId) {
      query.studentId = studentId;
    }

    // Role filters
    if (session.role === 'PARENT') {
      query.parentId = session.userId;
    } else {
      // All staff (teachers, administrators, super admins) can only see meetings they are direct participants in
      query.teacherId = session.userId;
    }

    const meetings = await prisma.meetingRequest.findMany({
      where: query,
      orderBy: { createdAt: 'desc' },
      include: {
        student: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            class: { select: { name: true } }, 
            arm: { select: { name: true } } 
          }
        },
        parent: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      }
    });

    return NextResponse.json({ success: true, data: meetings });

  } catch (error: any) {
    console.error('Meetings GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve meeting schedules' }, { status: 500 });
  }
}

// POST: Parent submits a new meeting request
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, studentId, teacherId, type, reason, preferredDate, preferredTime } = body;

    const session = await requireAuth(req);

    if (!schoolId || !studentId || !teacherId || !type || !reason || !preferredDate || !preferredTime) {
      return NextResponse.json({ error: 'Missing parameters for meeting request submission' }, { status: 400 });
    }

    if (session.role !== 'PARENT') {
      return NextResponse.json({ error: 'Access denied: Only Parents can request teacher meetings.' }, { status: 403 });
    }

    // Verify parent-ward relationship
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

    // Save and notify transactionally
    const result = await prisma.$transaction(async (tx) => {
      const newMeeting = await tx.meetingRequest.create({
        data: {
          schoolId,
          studentId,
          parentId: session.userId,
          teacherId,
          type,
          reason,
          preferredDate,
          preferredTime,
          status: 'PENDING'
        }
      });

      // Add timeline event
      await tx.studentTimeline.create({
        data: {
          schoolId,
          studentId,
          eventType: 'MEETING',
          title: `Meeting Requested: ${reason}`,
          description: `Parent requested a ${type.toLowerCase()} meeting on ${preferredDate} at ${preferredTime}.`,
          referenceId: newMeeting.id
        }
      });

      // Notify the teacher
      const sender = await tx.user.findUnique({
        where: { id: session.userId },
        select: { firstName: true, lastName: true }
      });
      const parentName = sender ? `${sender.firstName} ${sender.lastName}` : 'Parent';
      const student = await tx.student.findUnique({ where: { id: studentId } });
      await tx.notification.create({
        data: {
          schoolId,
          userId: teacherId,
          message: `New meeting request from ${parentName} regarding ${student?.firstName || 'student'} (Reason: "${reason}").`
        }
      });

      return newMeeting;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Meetings POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to submit meeting request' }, { status: 500 });
  }
}

// PATCH: Teacher / Admin updates meeting status (Approve, Decline, Suggest Alternative)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, meetingId, status, statusReason, suggestedDate, suggestedTime } = body;

    const session = await requireAuth(req);

    if (!meetingId || !status) {
      return NextResponse.json({ error: 'Meeting ID and status are required' }, { status: 400 });
    }

    const meeting = await prisma.meetingRequest.findUnique({
      where: { id: meetingId },
      include: {
        student: true,
        parent: true
      }
    });

    if (!meeting || meeting.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Meeting request not found' }, { status: 404 });
    }

    // Verify authorized role (Teacher assigned to meeting, or Admin)
    const isAuthorized =
      session.role === 'SCHOOL_ADMIN' ||
      session.role === 'SUPER_ADMIN' ||
      meeting.teacherId === session.userId;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Access denied: Unauthorized staff permissions.' }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.meetingRequest.update({
        where: { id: meetingId },
        data: {
          status,
          statusReason: statusReason || null,
          suggestedDate: status === 'SUGGESTED' ? suggestedDate : null,
          suggestedTime: status === 'SUGGESTED' ? suggestedTime : null
        }
      });

      // Timeline logs
      let logDesc = `Meeting request was ${status.toLowerCase()} by the staff.`;
      if (statusReason) {
        logDesc += ` Reason: "${statusReason}"`;
      } else if (status === 'SUGGESTED') {
        logDesc = `Teacher/Admin suggested alternative date ${suggestedDate} at ${suggestedTime}.`;
      }

      await tx.studentTimeline.create({
        data: {
          schoolId: meeting.schoolId,
          studentId: meeting.studentId,
          eventType: 'MEETING',
          title: `Meeting Request ${status}`,
          description: logDesc,
          referenceId: meeting.id
        }
      });

      // Notify parent
      if (meeting.parent?.id) {
        const sender = await tx.user.findUnique({
          where: { id: session.userId },
          select: { firstName: true, lastName: true }
        });
        const staffName = sender ? `${sender.firstName} ${sender.lastName}` : 'Staff';
        let alertMessage = `Your meeting request regarding ${meeting.student.firstName} was ${status.toLowerCase()} by ${staffName}.`;
        if (statusReason) {
          alertMessage += ` Reason: "${statusReason}"`;
        } else if (status === 'SUGGESTED') {
          alertMessage = `${staffName} suggested an alternative meeting slot for ${meeting.student.firstName}: ${suggestedDate} at ${suggestedTime}.`;
        }

        await tx.notification.create({
          data: {
            schoolId: meeting.schoolId,
            userId: meeting.parentId,
            message: alertMessage
          }
        });
      }

      return updated;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Meetings PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update meeting status' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

