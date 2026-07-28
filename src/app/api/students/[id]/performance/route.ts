import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true, classId: true, armId: true },
    });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    // All scores with subject and term
    const scores = await prisma.score.findMany({
      where: { studentId },
      include: { subject: true, term: { include: { session: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Compute average per term
    const termMap: Record<string, { termName: string; sessionName: string; scores: any[]; avg: number }> = {};
    for (const score of scores) {
      const key = score.termId;
      if (!termMap[key]) {
        termMap[key] = {
          termName: score.term.name,
          sessionName: score.term.session.name,
          scores: [],
          avg: 0,
        };
      }
      termMap[key].scores.push(score);
    }

    for (const key in termMap) {
      const validScores = termMap[key].scores.filter((s) => s.total !== null);
      termMap[key].avg =
        validScores.length > 0
          ? Math.round(validScores.reduce((sum: number, s: any) => sum + (s.total || 0), 0) / validScores.length)
          : 0;
    }

    // Best and worst subject
    const subjectTotals: Record<string, { name: string; scores: number[] }> = {};
    for (const score of scores) {
      if (score.total === null) continue;
      if (!subjectTotals[score.subjectId]) {
        subjectTotals[score.subjectId] = { name: score.subject.name, scores: [] };
      }
      subjectTotals[score.subjectId].scores.push(score.total);
    }

    const subjectAverages = Object.values(subjectTotals).map((s) => ({
      name: s.name,
      avg: Math.round(s.scores.reduce((a, b) => a + b, 0) / s.scores.length),
    }));
    subjectAverages.sort((a, b) => b.avg - a.avg);

    return NextResponse.json({
      success: true,
      data: {
        scores,
        byTerm: Object.values(termMap),
        subjectAverages,
        bestSubject: subjectAverages[0] || null,
        worstSubject: subjectAverages[subjectAverages.length - 1] || null,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
