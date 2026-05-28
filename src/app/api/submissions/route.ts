import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateScoreDetails } from '@/lib/rankingEngine';

// 1. GET: Retrieve a score submission (either a specific selection, or lists of pending ones for class teachers)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const subjectId = searchParams.get('subjectId');
    const termId = searchParams.get('termId');
    const classTeacherId = searchParams.get('classTeacherId'); // To fetch pending submissions for this class teacher
    const teacherId = searchParams.get('teacherId'); // To fetch submissions from a specific teacher
    const statusParam = searchParams.get('status'); // 'all' or specific status (defaults to 'PENDING')

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // A. If searching for pending submissions for a specific class teacher
    if (classTeacherId) {
      // Find all class arms managed by this teacher
      const teacherArms = await prisma.arm.findMany({
        where: { schoolId, classTeacherId },
        select: { id: true }
      });

      const armIds = teacherArms.map(a => a.id);

      if (armIds.length === 0) {
        return NextResponse.json({ success: true, data: [] });
      }

      // Fetch score submissions for these arms
      const pendingSubmissions = await prisma.scoreSubmission.findMany({
        where: {
          schoolId,
          armId: { in: armIds },
          ...(statusParam === 'all' ? {} : { status: statusParam || 'PENDING' })
        },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          subject: true,
          class: true,
          arm: true,
          term: {
            include: { session: true }
          }
        },
        orderBy: { sentAt: 'desc' }
      });

      return NextResponse.json({ success: true, data: pendingSubmissions });
    }

    // B. If searching for all submissions made by a specific subject teacher
    if (teacherId) {
      const submissions = await prisma.scoreSubmission.findMany({
        where: {
          schoolId,
          teacherId
        },
        include: {
          subject: true,
          class: true,
          arm: true,
          term: {
            include: { session: true }
          }
        },
        orderBy: { sentAt: 'desc' }
      });

      return NextResponse.json({ success: true, data: submissions });
    }

    // C. Fetch a specific single submission for a teacher's classroom slot
    if (classId && armId && subjectId && termId) {
      const submission = await prisma.scoreSubmission.findFirst({
        where: {
          schoolId,
          classId,
          armId,
          subjectId,
          termId
        },
        include: {
          teacher: {
            select: { id: true, firstName: true, lastName: true }
          },
          subject: true,
          class: true,
          arm: true,
          term: true
        }
      });

      return NextResponse.json({ success: true, data: submission });
    }

    return NextResponse.json({ error: 'Missing filter parameters' }, { status: 400 });
  } catch (error: any) {
    console.error('Submissions GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch score submission data' }, { status: 500 });
  }
}

// 2. POST: Subject Teacher saves a DRAFT or submits a PENDING scoresheet
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, classId, armId, subjectId, termId, teacherId, scores, status } = body;

    if (!schoolId || !classId || !armId || !subjectId || !termId || !teacherId || !scores || !status) {
      return NextResponse.json({ error: 'Missing required payload parameters' }, { status: 400 });
    }

    // Fetch the teacher details
    const teacher = await prisma.user.findFirst({
      where: { id: teacherId, schoolId }
    });

    if (!teacher) {
      return NextResponse.json({ error: 'Teacher account not found' }, { status: 404 });
    }

    // 1. Upsert the ScoreSubmission
    const payloadJson = JSON.stringify(scores);

    const submission = await prisma.scoreSubmission.upsert({
      where: {
        schoolId_subjectId_classId_armId_termId: {
          schoolId,
          subjectId,
          classId,
          armId,
          termId
        }
      },
      update: {
        teacherId,
        status,
        payload: payloadJson,
        sentAt: status === 'PENDING' ? new Date() : undefined
      },
      create: {
        schoolId,
        subjectId,
        classId,
        armId,
        termId,
        teacherId,
        status,
        payload: payloadJson
      },
      include: {
        subject: true,
        class: true,
        arm: true,
        term: true
      }
    });

    // 2. Trigger notification if status is PENDING
    if (status === 'PENDING') {
      const arm = await prisma.arm.findFirst({
        where: { id: armId, schoolId }
      });

      if (arm && arm.classTeacherId) {
        const subjectName = submission.subject.name;
        const className = `${submission.class.name} ${submission.arm.name}`;
        const senderName = `${teacher.firstName} ${teacher.lastName}`;
        const termName = submission.term.name;

        // Create the notification in the database
        await prisma.notification.create({
          data: {
            schoolId,
            userId: arm.classTeacherId,
            message: `${termName} ${subjectName} scores received from ${senderName} for ${className}`,
            submissionId: submission.id
          }
        });
      }
    }

    return NextResponse.json({ success: true, data: submission });
  } catch (error: any) {
    console.error('Submissions POST Error:', error);
    return NextResponse.json({ error: 'Failed to record score submission' }, { status: 500 });
  }
}

// 3. PATCH: Class Teacher APPROVES or REJECTS a score submission
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, schoolId, status, feedback, userId } = body;

    if (!id || !schoolId || !status || !userId) {
      return NextResponse.json({ error: 'Missing required validation payload parameters' }, { status: 400 });
    }

    // Fetch the submission
    const submission = await prisma.scoreSubmission.findFirst({
      where: { id, schoolId },
      include: {
        subject: true,
        class: true,
        arm: true,
        term: true,
        teacher: true
      }
    });

    if (!submission) {
      return NextResponse.json({ error: 'Score submission record not found' }, { status: 404 });
    }

    // Fetch details of the class teacher who is approving/rejecting
    const classTeacher = await prisma.user.findFirst({
      where: { id: userId, schoolId }
    });

    const reviewerName = classTeacher ? `${classTeacher.firstName} ${classTeacher.lastName}` : 'Class Teacher';

    // A. If status is APPROVED
    if (status === 'APPROVED') {
      // 1. Parse JSON payload
      const scores = JSON.parse(submission.payload);

      // 2. Fetch school grading rules to compute grades on the fly
      const gradingRules = await prisma.gradingRule.findMany({
        where: { schoolId }
      });

      // 3. Bulk upsert into the official Score table
      for (const scoreEntry of scores) {
        const { studentId, ca1, ca2, assignment, exam } = scoreEntry;

        if (!studentId) continue;

        // Clean inputs
        const c1 = ca1 !== undefined && ca1 !== null && ca1 !== '' ? Number(ca1) : null;
        const c2 = ca2 !== undefined && ca2 !== null && ca2 !== '' ? Number(ca2) : null;
        const asg = assignment !== undefined && assignment !== null && assignment !== '' ? Number(assignment) : null;
        const ex = exam !== undefined && exam !== null && exam !== '' ? Number(exam) : null;

        // Compute totals and grades if any score is recorded
        const hasRecord = c1 !== null || c2 !== null || asg !== null || ex !== null;
        
        let total = null;
        let grade = null;
        let remarks = null;

        if (hasRecord) {
          const details = calculateScoreDetails(c1, c2, asg, ex, gradingRules);
          total = details.total;
          grade = details.grade;
          remarks = details.remarks;
        }

        // Upsert score record into Score
        await prisma.score.upsert({
          where: {
            schoolId_studentId_subjectId_termId: {
              schoolId,
              studentId,
              subjectId: submission.subjectId,
              termId: submission.termId
            }
          },
          update: {
            ca1: c1,
            ca2: c2,
            assignment: asg,
            exam: ex,
            total,
            grade,
            remarks,
            classId: submission.classId,
            armId: submission.armId,
            teacherId: submission.teacherId
          },
          create: {
            schoolId,
            studentId,
            subjectId: submission.subjectId,
            termId: submission.termId,
            classId: submission.classId,
            armId: submission.armId,
            ca1: c1,
            ca2: c2,
            assignment: asg,
            exam: ex,
            total,
            grade,
            remarks,
            teacherId: submission.teacherId
          }
        });
      }

      // 4. Update submission status to APPROVED
      await prisma.scoreSubmission.update({
        where: { id },
        data: { status: 'APPROVED' }
      });

      // 5. Create notification for subject teacher
      const subjectName = submission.subject.name;
      const className = `${submission.class.name} ${submission.arm.name}`;

      await prisma.notification.create({
        data: {
          schoolId,
          userId: submission.teacherId,
          message: `Your ${submission.term.name} ${subjectName} scores for ${className} have been approved & published by ${reviewerName}.`
        }
      });
    } 
    
    // B. If status is REJECTED
    else if (status === 'REJECTED') {
      // Update submission status to REJECTED
      await prisma.scoreSubmission.update({
        where: { id },
        data: { status: 'REJECTED' }
      });

      // Create notification for subject teacher
      const subjectName = submission.subject.name;
      const className = `${submission.class.name} ${submission.arm.name}`;
      const rejectionReason = feedback ? ` Reason: "${feedback}"` : '';

      await prisma.notification.create({
        data: {
          schoolId,
          userId: submission.teacherId,
          message: `Your ${submission.term.name} ${subjectName} scores for ${className} were returned by ${reviewerName}.${rejectionReason}`
        }
      });
    }

    return NextResponse.json({ success: true, message: `Score submission has been successfully ${status.toLowerCase()}.` });
  } catch (error: any) {
    console.error('Submissions PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to process score submission review' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
