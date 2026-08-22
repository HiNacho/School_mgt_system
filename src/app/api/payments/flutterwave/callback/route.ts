import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { processPaymentVerification } from '@/lib/payments/payment-verification.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tx_ref = searchParams.get('tx_ref');
  const transaction_id = searchParams.get('transaction_id');
  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!tx_ref) {
    return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=cancelled`);
  }

  try {
    // 1. Locate pending payment record
    const payment = await prisma.studentPayment.findFirst({
      where: { referenceNumber: tx_ref },
      include: { student: true, school: true, invoice: true },
    });

    if (!payment) {
      return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=error&msg=Transaction+not+found`);
    }

    // 2. Idempotency Check: If already processed, redirect cleanly to receipt
    if (payment.status === 'SUCCESSFUL' || payment.status === 'VERIFIED') {
      return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=success&paymentId=${payment.id}`);
    }

    // 3. Handle Cancelled / Failed statuses from Flutterwave
    if (status === 'cancelled' || !transaction_id) {
      await prisma.studentPayment.update({
        where: { id: payment.id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=cancelled`);
    }

    // 4. Verify transaction server-to-server and settle ledger automatically
    const result = await processPaymentVerification(transaction_id, tx_ref);

    if (result.success) {
      return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=success&paymentId=${payment.id}`);
    } else {
      return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=failed`);
    }
  } catch (error: any) {
    console.error('[Flutterwave Callback Error]', error);
    return NextResponse.redirect(`${origin}/dashboard/parents/fees?paymentStatus=error`);
  }
}
