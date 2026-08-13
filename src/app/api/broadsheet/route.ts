import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';
import { compileClassResults } from '@/lib/rankingEngine';

// GET: Fetch complete class broadsheet matrix for a class, arm, and term
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'TEACHER', 'FORM_TEACHER']);

    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const termId = searchParams.get('termId');

    if (!schoolId || !classId || !armId || !termId) {
      return NextResponse.json({ error: 'School ID, Class ID, Arm ID, and Term ID are required' }, { status: 400 });
    }

    requireSchoolScope(session, schoolId);

    // Fetch class info, arm info, term info, subjects, active students, recorded scores, and teacher score submissions
    const [targetClass, targetArm, targetTerm, subjects, students, scores, scoreSubmissions, gradingRules] = await Promise.all([
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
      prisma.scoreSubmission.findMany({
        where: { schoolId, classId, armId, termId }
      }),
      prisma.gradingRule.findMany({
        where: { schoolId },
        orderBy: { minScore: 'desc' }
      })
    ]);

    if (!targetClass || !targetArm || !targetTerm) {
      return NextResponse.json({ error: 'Class, Arm, or Term not found' }, { status: 404 });
    }

    // Role-based access control for Class Teachers
    if (session.role === 'CLASS_TEACHER' || session.role === 'FORM_TEACHER') {
      const isAssignedToThisArm = targetArm.classTeacherId === session.id;
      if (!isAssignedToThisArm) {
        // Find if teacher has any assigned arm
        const assignedArm = await prisma.arm.findFirst({
          where: { schoolId, classTeacherId: session.id },
          include: { class: true }
        });

        if (assignedArm && assignedArm.id !== armId) {
          return NextResponse.json({
            error: `Access Restricted: You are assigned as Class Teacher for ${assignedArm.class.name} Arm ${assignedArm.name}. You do not have access to view broadsheets of other classes.`
          }, { status: 403 });
        }
      }
    }

    const scoreMap: Record<string, any> = {};

    // First populate from submitted score payloads (teacher submissions)
    scoreSubmissions.forEach(sub => {
      try {
        const parsed = JSON.parse(sub.payload || '[]');
        if (Array.isArray(parsed)) {
          parsed.forEach(item => {
            if (item.studentId) {
              const key = `${item.studentId}_${sub.subjectId}`;
              scoreMap[key] = {
                studentId: item.studentId,
                subjectId: sub.subjectId,
                ca1: item.ca1 !== undefined && item.ca1 !== null && item.ca1 !== '' ? Number(item.ca1) : null,
                ca2: item.ca2 !== undefined && item.ca2 !== null && item.ca2 !== '' ? Number(item.ca2) : null,
                assignment: item.assignment !== undefined && item.assignment !== null && item.assignment !== '' ? Number(item.assignment) : null,
                exam: item.exam !== undefined && item.exam !== null && item.exam !== '' ? Number(item.exam) : null
              };
            }
          });
        }
      } catch (err) {
        console.error('Failed to parse score submission payload in broadsheet:', err);
      }
    });

    // Override with official Score table entries (if published/approved)
    scores.forEach(s => {
      const key = `${s.studentId}_${s.subjectId}`;
      scoreMap[key] = {
        studentId: s.studentId,
        subjectId: s.subjectId,
        ca1: s.ca1,
        ca2: s.ca2,
        assignment: s.assignment,
        exam: s.exam
      };
    });

    const rawScoresInput = Object.values(scoreMap);

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
    return NextResponse.json({ error: error.message || 'Failed to generate class broadsheet' }, { status: error.status || 500 });
  }
}
