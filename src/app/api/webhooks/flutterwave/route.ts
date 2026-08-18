import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyFlutterwaveTransaction, verifyWebhookSignature } from '@/lib/flutterwave';

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('verif-hash');
    if (!verifyWebhookSignature(signature)) {
      return NextResponse.json({ error: 'Invalid webhook signature hash' }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;
    const data = payload.data;

    if (!data || !data.tx_ref) {
      return NextResponse.json({ status: 'ignored', message: 'No transaction ref in payload' });
    }

    // Only process charge.completed events
    if (event && event !== 'charge.completed') {
      return NextResponse.json({ status: 'ignored', message: `Unhandled event type: ${event}` });
    }

    // 1. Locate Payment Record
    const payment = await prisma.studentPayment.findFirst({
      where: { referenceNumber: data.tx_ref },
      include: { student: true, school: true, invoice: true },
    });

    if (!payment) {
      return NextResponse.json({ status: 'ignored', message: 'Payment reference not found in system' });
    }

    // 2. Idempotency Check: Skip if already verified / successful
    if (payment.status === 'SUCCESSFUL' || payment.status === 'VERIFIED') {
      return NextResponse.json({ status: 'success', message: 'Transaction already processed' });
    }

    // 3. Verify Server-Side
    if (data.status === 'successful') {
      const verified = await verifyFlutterwaveTransaction(String(data.id));

      if (verified.status === 'successful' && verified.amount >= payment.amount) {
        await prisma.$transaction(async (tx) => {
          await tx.studentPayment.update({
            where: { id: payment.id },
            data: {
              status: 'SUCCESSFUL',
              flutterwaveTransactionId: String(data.id),
              flutterwaveRef: data.flw_ref || null,
              paymentDate: new Date(),
            },
          });

          if (payment.invoiceId) {
            const inv = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
            if (inv) {
              const newPaidAmount = inv.paidAmount + payment.amount;
              const isFullyPaid = newPaidAmount >= inv.netAmount;
              await tx.invoice.update({
                where: { id: payment.invoiceId },
                data: {
                  paidAmount: newPaidAmount,
                  status: isFullyPaid ? 'PAID' : 'PARTIALLY_PAID',
                },
              });
            }
          }

          await tx.financialAuditLog.create({
            data: {
              schoolId: payment.schoolId,
              userId: payment.parentId || payment.studentId,
              role: 'PARENT',
              action: 'WEBHOOK_FEE_PAYMENT_SUCCESSFUL',
              details: `Webhook confirmed online fee payment of ₦${payment.amount.toLocaleString()} (TxRef: ${data.tx_ref})`,
            },
          });
        });

        return NextResponse.json({ status: 'success', message: 'Payment successfully processed via webhook' });
      }
    }

    return NextResponse.json({ status: 'failed', message: 'Transaction verification unsuccessful' });

  } catch (error: any) {
    console.error('Flutterwave Webhook Error:', error);
    return NextResponse.json({ error: error.message || 'Webhook internal error' }, { status: 500 });
  }
}
