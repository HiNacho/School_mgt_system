// Standardized Payment Checkout Initialization Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { initiatePaymentCheckoutFlow } from '@/lib/payments/payment-checkout.service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);

    const body = await req.json();
    const { studentId, invoiceId, amount } = body;

    if (!studentId || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: 'Valid student ID and positive payment amount are required' }, { status: 400 });
    }

    // Determine school context from authenticated session or student
    let schoolId = session.schoolId;

    let parentObj = null;
    if (session.role === 'PARENT') {
      parentObj = await prisma.parent.findFirst({
        where: {
          id: (session as any).parentId || undefined,
          email: (session as any).email,
        },
        include: { students: true },
      });

      if (!parentObj) {
        return NextResponse.json({ error: 'Parent account context not found' }, { status: 404 });
      }

      const isStudentLinked = parentObj.students.some(s => s.id === studentId);
      if (!isStudentLinked) {
        return NextResponse.json({ error: 'Forbidden. Student is not linked to your parent account' }, { status: 403 });
      }

      if (!schoolId && parentObj.students.length > 0) {
        schoolId = parentObj.students.find(s => s.id === studentId)?.schoolId || parentObj.schoolId;
      }
    }

    if (!schoolId) {
      const student = await prisma.student.findUnique({ where: { id: studentId }, select: { schoolId: true } });
      schoolId = student?.schoolId || null;
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School tenant context could not be identified' }, { status: 400 });
    }

    const originHeader = req.headers.get('origin') || undefined;

    const checkout = await initiatePaymentCheckoutFlow({
      schoolId,
      studentId,
      invoiceId,
      amount: Number(amount),
      parentId: parentObj?.id || (session as any).parentId || null,
      parentEmail: parentObj?.email || (session as any).email,
      parentName: parentObj ? `${parentObj.firstName} ${parentObj.lastName}` : `${(session as any).user?.firstName || 'Parent'} ${(session as any).user?.lastName || ''}`.trim(),
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
      split: checkout.split,
    });
  } catch (error: any) {
    console.error('Payment Initialization API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initialize payment checkout' }, { status: 400 });
  }
}
