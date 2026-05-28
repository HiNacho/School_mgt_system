// Scores API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { calculateScoreDetails } from '@/lib/rankingEngine';
import { verifySubscriptionAccess } from '@/lib/subscriptionRules';

// 1. GET: Fetch students in arm alongside their scores for a subject and term
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const subjectId = searchParams.get('subjectId');
    const termId = searchParams.get('termId');

    if (!schoolId || !classId || !armId || !subjectId || !termId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    // Get active students
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        classId,
        armId,
        status: 'ACTIVE',
      },
      orderBy: [
        { lastName: 'asc' },
        { firstName: 'asc' },
      ],
    });

    // Check if there is an active score submission draft/pending/approved
    const submission = await prisma.scoreSubmission.findFirst({
      where: {
        schoolId,
        classId,
        armId,
        subjectId,
        termId,
      }
    });

    let scores: any[] = [];
    if (submission) {
      try {
        scores = JSON.parse(submission.payload);
      } catch (e) {
        console.error('Error parsing submission payload JSON:', e);
      }
    } else {
      // Get existing finalized scores
      scores = await prisma.score.findMany({
        where: {
          schoolId,
          classId,
          armId,
          subjectId,
          termId,
        },
      });
    }

    // Merge students with scores
    const mergedData = students.map(student => {
      const studentScore = scores.find(s => s.studentId === student.id);
      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        middleName: student.middleName,
        ca1: studentScore?.ca1 ?? null,
        ca2: studentScore?.ca2 ?? null,
        assignment: studentScore?.assignment ?? null,
        exam: studentScore?.exam ?? null,
        total: studentScore?.total ?? null,
        grade: studentScore?.grade ?? null,
        remarks: studentScore?.remarks ?? null,
        scoreId: studentScore?.id ?? null,
      };
    });

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error: any) {
    console.error('Scores GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch scores sheet' }, { status: 500 });
  }
}

// 2. POST: Manual entry score updates (supports autosave or batch submission)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, subjectId, termId, classId, armId, scores, teacherId } = body;

    if (!schoolId || !subjectId || !termId || !classId || !armId || !scores || !Array.isArray(scores)) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    // Verify subscription access
    const subscriptionError = await verifySubscriptionAccess(schoolId, true);
    if (subscriptionError) {
      return NextResponse.json({ error: subscriptionError.error }, { status: 403 });
    }


    // Fetch school grading rules to compute grades on the fly
    const gradingRules = await prisma.gradingRule.findMany({
      where: { schoolId },
    });

    const savedScores = [];

    for (const scoreEntry of scores) {
      const { studentId, ca1, ca2, assignment, exam } = scoreEntry;

      if (!studentId) continue;

      // Clean inputs
      const c1 = ca1 !== undefined && ca1 !== null && ca1 !== '' ? Number(ca1) : null;
      const c2 = ca2 !== undefined && ca2 !== null && ca2 !== '' ? Number(ca2) : null;
      const asg = assignment !== undefined && assignment !== null && assignment !== '' ? Number(assignment) : null;
      const ex = exam !== undefined && exam !== null && exam !== '' ? Number(exam) : null;

      // Validate scores boundaries (CA1 <= 15, CA2 <= 15, Assignment <= 10, Exam <= 60)
      if ((c1 !== null && (c1 < 0 || c1 > 15)) || 
          (c2 !== null && (c2 < 0 || c2 > 15)) || 
          (asg !== null && (asg < 0 || asg > 10)) || 
          (ex !== null && (ex < 0 || ex > 60))) {
        return NextResponse.json({
          error: `Validation Error: Scores entered exceed standard academic boundaries (CA1:15, CA2:15, Assignment:10, Exam:60)`,
        }, { status: 422 });
      }

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

      // Upsert score record
      const score = await prisma.score.upsert({
        where: {
          schoolId_studentId_subjectId_termId: {
            schoolId,
            studentId,
            subjectId,
            termId,
          },
        },
        update: {
          ca1: c1,
          ca2: c2,
          assignment: asg,
          exam: ex,
          total,
          grade,
          remarks,
          classId,
          armId,
          teacherId: teacherId || null,
        },
        create: {
          schoolId,
          studentId,
          subjectId,
          termId,
          classId,
          armId,
          ca1: c1,
          ca2: c2,
          assignment: asg,
          exam: ex,
          total,
          grade,
          remarks,
          teacherId: teacherId || null,
        },
      });

      savedScores.push(score);
    }

    return NextResponse.json({ success: true, data: savedScores });
  } catch (error: any) {
    console.error('Scores POST Error:', error);
    return NextResponse.json({ error: 'Failed to persist scores data' }, { status: 500 });
  }
}
