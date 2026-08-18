import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    let parentId = session.parentId;
    let parentEmail = session.email;

    // Search for parent profile by user parentId or email
    const parent = await prisma.parent.findFirst({
      where: {
        OR: [
          { id: parentId || undefined },
          { email: parentEmail },
        ],
      },
      include: {
        students: {
          include: {
            class: true,
            arm: true,
            school: {
              select: {
                id: true,
                name: true,
                logoUrl: true,
                onlinePaymentsEnabled: true,
                flutterwaveStatus: true,
                allowPartialPayments: true,
                minPartialPaymentAmount: true,
              },
            },
          },
        },
      },
    });

    if (!parent) {
      return NextResponse.json({ success: true, data: [] });
    }

    const result = [];

    for (const student of parent.students) {
      // Fetch latest active session/term invoice for this student
      const invoice = await prisma.invoice.findFirst({
        where: {
          schoolId: student.schoolId,
          studentId: student.id,
          deletedAt: null,
        },
        include: {
          session: true,
          term: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch payment history
      const payments = await prisma.studentPayment.findMany({
        where: {
          schoolId: student.schoolId,
          studentId: student.id,
          deletedAt: null,
        },
        orderBy: { paymentDate: 'desc' },
      });

      const totalFees = invoice ? invoice.netAmount : 0;
      const totalPaid = invoice ? invoice.paidAmount : 0;
      const outstanding = Math.max(0, totalFees - totalPaid);

      result.push({
        student: {
          id: student.id,
          firstName: student.firstName,
          lastName: student.lastName,
          middleName: student.middleName,
          admissionNumber: student.admissionNumber,
          gender: student.gender,
          passportPhoto: student.passportPhoto,
          className: student.class?.name || '',
          armName: student.arm?.name || '',
          school: student.school,
        },
        invoice: invoice ? {
          id: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          sessionId: invoice.sessionId,
          sessionName: invoice.session?.name || '',
          termId: invoice.termId,
          termName: invoice.term?.name || '',
          totalAmount: invoice.amount,
          discount: invoice.discount,
          scholarship: invoice.scholarship,
          netAmount: invoice.netAmount,
          paidAmount: invoice.paidAmount,
          outstanding,
          status: invoice.status,
          dueDate: invoice.dueDate,
          items: invoice.items || [],
        } : null,
        summary: {
          totalFees,
          totalPaid,
          outstanding,
          status: invoice ? invoice.status : 'NO_INVOICE',
        },
        paymentHistory: payments.map(p => ({
          id: p.id,
          receiptNumber: p.receiptNumber,
          amount: p.amount,
          currency: p.currency || 'NGN',
          paymentMethod: p.paymentMethod,
          referenceNumber: p.referenceNumber,
          flutterwaveTransactionId: p.flutterwaveTransactionId,
          paymentDate: p.paymentDate,
          status: p.status,
          notes: p.notes,
        })),
      });
    }

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Parent Fees GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch parent fee accounts' }, { status: 500 });
  }
}
