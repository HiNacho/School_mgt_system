// Comments & AI Comments Generator API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { compileClassResults } from '@/lib/rankingEngine';
import { generateStudentComment } from '@/lib/commentGenerator';

// 1. GET: Fetch existing comments and reports for a class arm
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const termId = searchParams.get('termId');

    if (!schoolId || !classId || !armId || !termId) {
      return NextResponse.json({ error: 'Missing required query parameters' }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: { schoolId, classId, armId, status: 'ACTIVE' },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });

    const comments = await prisma.reportCardComment.findMany({
      where: { schoolId, classId, armId, termId },
    });

    const mergedData = students.map(student => {
      const comm = comments.find(c => c.studentId === student.id);
      return {
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        gender: student.gender,
        teacherComment: comm?.teacherComment ?? null,
        headTeacherComment: comm?.headTeacherComment ?? null,
        isAIGenerated: comm?.isAIGenerated ?? false,
        published: comm?.published ?? false,
      };
    });

    return NextResponse.json({ success: true, data: mergedData });
  } catch (error: any) {
    console.error('Comments GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch class comments' }, { status: 500 });
  }
}

// 2. POST: Save manual teacher comments
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, termId, classId, armId, comments } = body;

    if (!schoolId || !termId || !classId || !armId || !comments || !Array.isArray(comments)) {
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const savedComments = [];

    for (const c of comments) {
      const { studentId, teacherComment, headTeacherComment, published } = c;

      if (!studentId) continue;

      const commRecord = await prisma.reportCardComment.upsert({
        where: {
          schoolId_studentId_termId: {
            schoolId,
            studentId,
            termId,
          },
        },
        update: {
          teacherComment: teacherComment !== undefined ? teacherComment : undefined,
          headTeacherComment: headTeacherComment !== undefined ? headTeacherComment : undefined,
          published: published !== undefined ? published : undefined,
          classId,
          armId,
        },
        create: {
          schoolId,
          studentId,
          termId,
          classId,
          armId,
          teacherComment: teacherComment || null,
          headTeacherComment: headTeacherComment || null,
          published: published || false,
        },
      });

      savedComments.push(commRecord);
    }

    return NextResponse.json({ success: true, data: savedComments });
  } catch (error: any) {
    console.error('Comments POST Error:', error);
    return NextResponse.json({ error: 'Failed to save comments' }, { status: 500 });
  }
}

// 3. POST /api/comments/generate: AI Comments Auto Draft Pipeline
// If studentId is passed, generates for one. If not, generates in batch for all in class arm!
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, termId, classId, armId, studentId } = body;

    if (!schoolId || !termId || !classId || !armId) {
      return NextResponse.json({ error: 'Missing required configuration parameters' }, { status: 400 });
    }

    // A. Fetch All Students and Scores to compile grades
    const students = await prisma.student.findMany({
      where: { schoolId, classId, armId, status: 'ACTIVE' },
    });

    if (students.length === 0) {
      return NextResponse.json({ error: 'No active students found in this class arm' }, { status: 404 });
    }

    const subjects = await prisma.subject.findMany({
      where: { schoolId },
    });

    const scores = await prisma.score.findMany({
      where: { schoolId, termId, classId, armId },
    });

    const gradingRules = await prisma.gradingRule.findMany({
      where: { schoolId },
    });

    // B. Run Compile Engine to get student final aggregates and rankings
    const compiledReports = compileClassResults(students, subjects, scores, gradingRules);

    const generatedResults = [];

    // Filter students to generate comments for
    const targetStudents = studentId 
      ? students.filter(s => s.id === studentId)
      : students;

    for (const student of targetStudents) {
      const report = compiledReports.find(r => r.studentId === student.id);
      if (!report) continue;

      // Run AI Commentary heuristic generator
      const aiCommentText = generateStudentComment(report, student.gender as 'MALE' | 'FEMALE');

      // Save/Upsert in DB marked as AI Draft
      const commentRecord = await prisma.reportCardComment.upsert({
        where: {
          schoolId_studentId_termId: {
            schoolId,
            studentId: student.id,
            termId,
          },
        },
        update: {
          teacherComment: aiCommentText,
          isAIGenerated: true,
          classId,
          armId,
        },
        create: {
          schoolId,
          studentId: student.id,
          termId,
          classId,
          armId,
          teacherComment: aiCommentText,
          isAIGenerated: true,
          published: false,
        },
      });

      generatedResults.push({
        studentId: student.id,
        admissionNumber: student.admissionNumber,
        firstName: student.firstName,
        lastName: student.lastName,
        aiComment: aiCommentText,
        recordId: commentRecord.id,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully drafted AI commentary for ${generatedResults.length} students`,
      data: generatedResults,
    });
  } catch (error: any) {
    console.error('Comments GENERATE Error:', error);
    return NextResponse.json({ error: 'Failed to execute AI comments generation pipeline' }, { status: 500 });
  }
}
