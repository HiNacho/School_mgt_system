import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { compileClassResults } from '@/lib/rankingEngine';

// GET: Fetch complete class broadsheet matrix for a class, arm, and term
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const termId = searchParams.get('termId');

    if (!schoolId || !classId || !armId || !termId) {
      return NextResponse.json({ error: 'School ID, Class ID, Arm ID, and Term ID are required' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Fetch class info, arm info, term info, subjects, active students, and all recorded scores
    const [targetClass, targetArm, targetTerm, subjects, students, scores, gradingRules] = await Promise.all([
      prisma.class.findFirst({ where: { id: classId, schoolId } }),
      prisma.arm.findFirst({ where: { id: armId, schoolId } }),
      prisma.term.findFirst({ where: { id: termId, schoolId } }),
      prisma.subject.findMany({
        where: { schoolId },
        orderBy: { name: 'asc' }
      }),
      prisma.student.findMany({
        where: { schoolId, classId, armId, status: 'ACTIVE' },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }]
      }),
      prisma.score.findMany({
        where: { schoolId, termId, student: { classId, armId, status: 'ACTIVE' } }
      }),
      prisma.gradingRule.findMany({
        where: { schoolId },
        orderBy: { minScore: 'desc' }
      })
    ]);

    if (!targetClass || !targetArm || !targetTerm) {
      return NextResponse.json({ error: 'Class, Arm, or Term not found' }, { status: 404 });
    }

    // Map raw scores for compileClassResults engine
    const rawScoresInput = scores.map(s => ({
      studentId: s.studentId,
      subjectId: s.subjectId,
      ca1: s.ca1,
      ca2: s.ca2,
      assignment: s.assignment,
      exam: s.exam
    }));

    // Compile complete results including positions and subject totals using rankingEngine
    const compiledReports = compileClassResults(students, subjects, rawScoresInput, gradingRules);

    return NextResponse.json({
      success: true,
      data: {
        class: { id: targetClass.id, name: targetClass.name },
        arm: { id: targetArm.id, name: targetArm.name },
        term: { id: targetTerm.id, name: targetTerm.name },
        subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })),
        students: compiledReports
      }
    });
  } catch (error: any) {
    console.error('Broadsheet GET Error:', error);
    return NextResponse.json({ error: 'Failed to generate class broadsheet' }, { status: 500 });
  }
}
