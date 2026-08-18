import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const armId = searchParams.get('armId');
    const sessionId = searchParams.get('sessionId');
    const termId = searchParams.get('termId');

    const schoolId = session.schoolId || searchParams.get('schoolId');
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID context required' }, { status: 400 });
    }

    if (session.schoolId) {
      requireSchoolScope(session, schoolId);
    }

    // Query outstanding invoices
    const invoices = await prisma.invoice.findMany({
      where: {
        schoolId,
        status: { in: ['OUTSTANDING', 'PARTIALLY_PAID'] },
        deletedAt: null,
        classId: classId || undefined,
        armId: armId || undefined,
        sessionId: sessionId || undefined,
        termId: termId || undefined,
      },
      include: {
        student: {
          include: {
            class: true,
            arm: true,
          },
        },
        session: true,
        term: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const defaulters = invoices.map(inv => {
      const outstanding = Math.max(0, inv.netAmount - inv.paidAmount);
      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        studentId: inv.studentId,
        admissionNumber: inv.student.admissionNumber,
        studentName: `${inv.student.lastName}, ${inv.student.firstName} ${inv.student.middleName || ''}`.trim(),
        className: inv.student.class?.name || '',
        armName: inv.student.arm?.name || '',
        sessionName: inv.session?.name || '',
        termName: inv.term?.name || '',
        netAmount: inv.netAmount,
        paidAmount: inv.paidAmount,
        outstanding,
        dueDate: inv.dueDate,
        status: inv.status,
      };
    });

    return NextResponse.json({ success: true, data: defaulters });

  } catch (error: any) {
    console.error('Defaulters GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch fee defaulters' }, { status: 500 });
  }
}
