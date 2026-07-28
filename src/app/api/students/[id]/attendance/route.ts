import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER']);
    const { id: studentId } = await params;

    const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
    if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    requireSchoolScope(session, student.schoolId);

    // Aggregate attendance across terms
    const termAttendance = await prisma.attendance.findMany({
      where: { studentId },
      include: { term: { include: { session: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Daily attendance logs (last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const dailyLogs = await prisma.dailyAttendance.findMany({
      where: {
        studentId,
        attendanceDate: { gte: ninetyDaysAgo.toISOString().split('T')[0] },
      },
      orderBy: { attendanceDate: 'asc' },
    });

    // Compute totals
    const totalPresent = termAttendance.reduce((sum, t) => sum + t.daysPresent, 0);
    const totalAbsent = termAttendance.reduce((sum, t) => sum + t.daysAbsent, 0);
    const totalDays = totalPresent + totalAbsent;
    const attendancePct = totalDays > 0 ? Math.round((totalPresent / totalDays) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        summary: { totalPresent, totalAbsent, totalDays, attendancePct },
        byTerm: termAttendance,
        dailyLogs,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}
