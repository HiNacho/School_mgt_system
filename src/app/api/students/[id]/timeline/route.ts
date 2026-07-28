import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER', 'BURSAR']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 100);
    const skip = (page - 1) * limit;

    const [total, events] = await Promise.all([
      prisma.studentTimeline.count({ where: { studentId } }),
      prisma.studentTimeline.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: events,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
