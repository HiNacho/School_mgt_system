// Periodic Payment Reconciliation Cron Job / Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { processPaymentVerification } from '@/lib/payments/payment-verification.service';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized to trigger reconciliation job' }, { status: 403 });
    }

    // Find pending payments created in the last 72 hours that have a transaction reference or ID
    const threeDaysAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

    const pendingPayments = await prisma.studentPayment.findMany({
      where: {
        status: 'PENDING',
        paymentMethod: 'FLUTTERWAVE',
        createdAt: { gte: threeDaysAgo },
        OR: [
          { referenceNumber: { not: null } },
          { flutterwaveTransactionId: { not: null } },
        ],
      },
      take: 50,
      orderBy: { createdAt: 'asc' },
    });

    const reconciliationResults = [];

    for (const payment of pendingPayments) {
      const txId = payment.flutterwaveTransactionId || payment.referenceNumber;
      if (!txId) continue;

      try {
        const result = await processPaymentVerification(txId, payment.referenceNumber || undefined);
        reconciliationResults.push({
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          referenceNumber: payment.referenceNumber,
          status: 'RECONCILED_SUCCESSFUL',
          result,
        });
      } catch (err: any) {
        reconciliationResults.push({
          paymentId: payment.id,
          receiptNumber: payment.receiptNumber,
          referenceNumber: payment.referenceNumber,
          status: 'STILL_PENDING_OR_FAILED',
          error: err.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Reconciliation completed for ${pendingPayments.length} pending transaction(s).`,
      reconciledCount: reconciliationResults.filter(r => r.status === 'RECONCILED_SUCCESSFUL').length,
      details: reconciliationResults,
    });
  } catch (error: any) {
    console.error('Reconciliation API Error:', error);
    return NextResponse.json({ error: error.message || 'Reconciliation failed' }, { status: 500 });
  }
}
