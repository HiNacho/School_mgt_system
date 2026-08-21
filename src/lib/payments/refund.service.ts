// Refund & Dispute Management Service
import prisma from '@/lib/db';
import { initiateFlutterwaveRefund } from './flutterwave.service';

export interface ExecuteRefundParams {
  schoolId: string;
  paymentId: string;
  amount?: number;
  reason: string;
  actorId: string;
  actorRole: string;
}

export async function processPaymentRefund(params: ExecuteRefundParams) {
  const { schoolId, paymentId, amount, reason, actorId, actorRole } = params;

  // 1. Fetch payment record with tenant check
  const payment = await prisma.studentPayment.findFirst({
    where: { id: paymentId, schoolId },
    include: { invoice: true },
  });

  if (!payment) {
    throw new Error('Payment record not found.');
  }

  if (payment.status !== 'SUCCESSFUL' && payment.status !== 'VERIFIED') {
    throw new Error(`Cannot refund a payment with status: ${payment.status}`);
  }

  const refundAmount = amount && amount > 0 ? Math.min(amount, payment.amount) : payment.amount;

  // 2. Call Flutterwave Refund API if paid via online Flutterwave
  let flutterwaveRefundId: string | null = null;
  if (payment.paymentMethod === 'FLUTTERWAVE' && payment.flutterwaveTransactionId) {
    const flwRefund = await initiateFlutterwaveRefund(payment.flutterwaveTransactionId, refundAmount);
    flutterwaveRefundId = String(flwRefund.refundId);
  }

  const refundRef = `REFUND-${Date.now()}`;

  // 3. Database transaction to record refund & adjust invoice
  const result = await prisma.$transaction(async (tx) => {
    // Record refund entry
    const refundRecord = await tx.schoolFeeRefund.create({
      data: {
        schoolId,
        paymentId: payment.id,
        refundReference: refundRef,
        flutterwaveRefundId,
        amount: refundAmount,
        reason,
        status: 'COMPLETED',
        initiatedById: actorId,
        approvedById: actorId,
        executedById: actorId,
      },
    });

    // Update payment status
    const isFullRefund = refundAmount >= payment.amount;
    await tx.studentPayment.update({
      where: { id: payment.id },
      data: {
        status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        refundReason: reason,
      },
    });

    // Adjust invoice paidAmount if linked
    if (payment.invoiceId && payment.invoice) {
      const currentPaid = payment.invoice.paidAmount || 0;
      const newPaid = Math.max(0, currentPaid - refundAmount);

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaid,
          status: newPaid === 0 ? 'OUTSTANDING' : 'PARTIALLY_PAID',
        },
      });
    }

    // Audit logs
    await tx.financialAuditLog.create({
      data: {
        schoolId,
        userId: actorId,
        role: actorRole,
        action: 'PAYMENT_REFUNDED',
        details: `Refund of ₦${refundAmount.toLocaleString()} processed for payment ${payment.receiptNumber}. Reason: ${reason}`,
      },
    });

    await tx.paymentAuditLog.create({
      data: {
        schoolId,
        actorId,
        actorRole,
        action: 'REFUND_EXECUTED',
        resourceType: 'REFUND',
        resourceId: refundRecord.id,
        metadata: {
          paymentId: payment.id,
          amount: refundAmount,
          flutterwaveRefundId,
        },
      },
    });

    return refundRecord;
  });

  return result;
}
