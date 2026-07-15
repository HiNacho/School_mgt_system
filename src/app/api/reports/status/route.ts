import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// 1. GET: Fetch the status of a class arm compilation, or all arms in a school
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const termId = searchParams.get('termId');
    const all = searchParams.get('all') === 'true';

    if (!schoolId || !termId) {
      return NextResponse.json({ error: 'School ID and Term ID are required' }, { status: 400 });
    }

    // A. Fetch all class statuses for the school (for Admin Dashboard)
    if (all) {
      const classes = await prisma.class.findMany({
        where: { schoolId },
        include: {
          arms: true
        }
      });

      const statuses = await prisma.classReportStatus.findMany({
        where: { schoolId, termId }
      });

      const scoreGroups = await prisma.score.groupBy({
        by: ['classId', 'armId'],
        where: { schoolId, termId },
        _count: {
          _all: true
        }
      });

      const roster = [];
      for (const cls of classes) {
        for (const arm of cls.arms) {
          const matchedStatus = statuses.find(s => s.classId === cls.id && s.armId === arm.id);
          const matchedScores = scoreGroups.find(sg => sg.classId === cls.id && sg.armId === arm.id);
          const scoreCount = matchedScores?._count._all || 0;

          let status = matchedStatus?.status || 'DRAFT';
          if (status === 'DRAFT' && scoreCount === 0) {
            status = 'NOT_SET';
          }

          roster.push({
            classId: cls.id,
            className: cls.name,
            armId: arm.id,
            armName: arm.name,
            status,
            feedback: matchedStatus?.feedback || null,
            scoreCount
          });
        }
      }

      return NextResponse.json({ success: true, data: roster });
    }

    // B. Fetch status for a single class arm
    if (!classId || !armId) {
      return NextResponse.json({ error: 'Class ID and Arm ID are required for single status fetch' }, { status: 400 });
    }

    const record = await prisma.classReportStatus.findUnique({
      where: {
        schoolId_classId_armId_termId: {
          schoolId,
          classId,
          armId,
          termId
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: record || {
        schoolId,
        classId,
        armId,
        termId,
        status: 'DRAFT',
        feedback: null
      }
    });
  } catch (error: any) {
    console.error('ClassReportStatus GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve compilation status' }, { status: 500 });
  }
}

// 2. POST: Upsert the class compilation status
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const body = await req.json();
    const { schoolId, classId, armId, termId, status, feedback } = body;

    if (!schoolId || !classId || !armId || !termId || !status) {
      return NextResponse.json({ error: 'Missing required request body fields' }, { status: 400 });
    }

    // Validate transition
    const validStatuses = ['DRAFT', 'AWAITING_APPROVAL', 'APPROVED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status state' }, { status: 400 });
    }

    // Upsert the status record
    const updatedRecord = await prisma.classReportStatus.upsert({
      where: {
        schoolId_classId_armId_termId: {
          schoolId,
          classId,
          armId,
          termId
        }
      },
      update: {
        status,
        feedback: status === 'REJECTED' ? (feedback || null) : null
      },
      create: {
        schoolId,
        classId,
        armId,
        termId,
        status,
        feedback: status === 'REJECTED' ? (feedback || null) : null
      },
      include: {
        class: true,
        arm: true,
        term: true
      }
    });

    const armName = `${updatedRecord.class.name} ${updatedRecord.arm.name}`;

    // --- Notifications Triggering System ---

    // A. Class Teacher submits for review -> Notify School Admins
    if (status === 'AWAITING_APPROVAL') {
      const admins = await prisma.user.findMany({
        where: { schoolId, role: 'SCHOOL_ADMIN', status: 'ACTIVE' }
      });
      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            schoolId,
            userId: admin.id,
            message: `${armName} Results Ready for Approval. Please review the compilation.`
          }
        });
      }
    }

    // B. Admin rejects/returns for correction -> Notify Class Teacher
    else if (status === 'REJECTED') {
      const arm = await prisma.arm.findFirst({
        where: { id: armId, schoolId }
      });
      if (arm && arm.classTeacherId) {
        const rejectionReason = feedback ? ` Reason: "${feedback}"` : '';
        await prisma.notification.create({
          data: {
            schoolId,
            userId: arm.classTeacherId,
            message: `${updatedRecord.term.name} reports for ${armName} were returned for correction.${rejectionReason}`
          }
        });
      }
    }

    // C. Admin approves -> Notify all Parents of students in this arm (Automated Release)
    else if (status === 'APPROVED') {
      // Find all students in this arm
      const students = await prisma.student.findMany({
        where: { schoolId, classId, armId, status: 'ACTIVE' },
        include: {
          user: true // Check if student has a linked user profile
        }
      });

      // Find all parent users of these students
      // We can scan the Parent table and filter parents whose students array contains these student IDs
      const studentIds = students.map(s => s.id);
      
      const parents = await prisma.parent.findMany({
        where: {
          schoolId,
          students: {
            some: {
              id: { in: studentIds }
            }
          }
        },
        include: {
          user: true
        }
      });

      // Notify Parents & Log Timelines
      for (const parent of parents) {
        if (parent.user) {
          await prisma.notification.create({
            data: {
              schoolId,
              userId: parent.user.id,
              message: `Your child's ${updatedRecord.term.name} Report Card is now available. Click My Ward to view.`
            }
          });
        }
      }

      // Add to Student Timelines
      const studentsInArm = await prisma.student.findMany({
        where: { schoolId, classId: updatedRecord.classId, armId: updatedRecord.armId, status: 'ACTIVE' }
      });
      for (const student of studentsInArm) {
        await prisma.studentTimeline.create({
          data: {
            schoolId,
            studentId: student.id,
            eventType: 'RESULT',
            title: `Report Card Released`,
            description: `Official ${updatedRecord.term.name} academic report card compiled and released to parents.`,
            referenceId: updatedRecord.id
          }
        });
      }
    }

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('ClassReportStatus POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update compilation status' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
