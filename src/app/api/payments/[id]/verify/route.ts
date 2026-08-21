// Manual / Server-side Payment Verification Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { processPaymentVerification } from '@/lib/payments/payment-verification.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    const payment = await prisma.studentPayment.findUnique({
      where: { id },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    if (session.role === 'PARENT') {
      if (payment.parentId && payment.parentId !== (session as any).parentId) {
        return NextResponse.json({ error: 'Forbidden. Payment does not belong to your account' }, { status: 403 });
      }
    } else if (session.schoolId && payment.schoolId !== session.schoolId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden. Cross-tenant access denied' }, { status: 403 });
    }

    const txId = payment.flutterwaveTransactionId || payment.referenceNumber;
    if (!txId) {
      return NextResponse.json({ error: 'No transaction reference found to verify' }, { status: 400 });
    }

    const verificationResult = await processPaymentVerification(txId, payment.referenceNumber || undefined);

    return NextResponse.json({
      success: true,
      data: verificationResult,
    });
  } catch (error: any) {
    console.error('Payment Verification API Error:', error);
    return NextResponse.json({ error: error.message || 'Payment verification failed' }, { status: 400 });
  }
}
