import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { initiatePaymentCheckoutFlow } from '@/lib/payments/payment-checkout.service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    
    // Only parents (or admins/bursars on behalf of parents) can initiate online fee payments
    if (!['PARENT', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized payment authorization' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, invoiceId, amount } = body;

    if (!studentId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid student ID and payment amount are required' }, { status: 400 });
    }

    let parentObj = null;
    if (session.role === 'PARENT') {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true },
      });

      parentObj = await prisma.parent.findFirst({
        where: {
          OR: [
            { user: { id: user?.id } },
            { email: user?.email },
          ],
        },
        include: { students: true },
      });

      if (!parentObj) {
        return NextResponse.json({ error: 'Parent record not found' }, { status: 404 });
      }

      const isStudentLinked = parentObj.students.some(s => s.id === studentId);
      if (!isStudentLinked) {
        return NextResponse.json({ error: 'Forbidden. Student is not linked to your parent account' }, { status: 403 });
      }
    }

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { schoolId: true },
    });

    if (!student || !student.schoolId) {
      return NextResponse.json({ error: 'Student or School profile not found' }, { status: 404 });
    }

    const originHeader = req.headers.get('origin') || undefined;

    const checkout = await initiatePaymentCheckoutFlow({
      schoolId: student.schoolId,
      studentId,
      invoiceId,
      amount: Number(amount),
      parentId: parentObj?.id || null,
      parentEmail: parentObj?.email || undefined,
      parentName: parentObj ? `${parentObj.firstName} ${parentObj.lastName}` : undefined,
      parentPhone: parentObj?.phone || undefined,
      originHeader,
      actorId: session.userId,
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkout.checkoutUrl,
      txRef: checkout.txRef,
      paymentId: checkout.paymentId,
      receiptNumber: checkout.receiptNumber,
    });
  } catch (error: any) {
    console.error('Payment Init Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize payment' }, { status: 400 });
  }
}
