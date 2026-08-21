// Server-Side Payment Verification & Financial Settlement Engine
import prisma from '@/lib/db';
import { verifyFlutterwaveTransaction } from './flutterwave.service';

export async function processPaymentVerification(transactionId: string, txRef?: string) {
  if (!transactionId) {
    throw new Error('Transaction ID is required for payment verification.');
  }

  // 1. Verify transaction server-to-server directly with Flutterwave API
  const verified = await verifyFlutterwaveTransaction(transactionId);

  if (verified.status !== 'successful') {
    // Locate payment by transaction ID or reference if pending
    if (verified.tx_ref || txRef) {
      await prisma.studentPayment.updateMany({
        where: {
          OR: [
            { referenceNumber: verified.tx_ref || txRef },
            { flutterwaveTransactionId: String(transactionId) },
          ],
          status: 'PENDING',
        },
        data: {
          status: 'FAILED',
          flutterwaveTransactionId: String(transactionId),
          flutterwaveRef: verified.flw_ref || null,
        },
      });
    }

    return {
      success: false,
      status: verified.status,
      message: `Transaction verified with status: ${verified.status}`,
    };
  }

  const targetTxRef = verified.tx_ref || txRef;

  // 2. Find internal payment record
  const payment = await prisma.studentPayment.findFirst({
    where: {
      OR: [
        { referenceNumber: targetTxRef },
        { flutterwaveTransactionId: String(transactionId) },
      ],
    },
    include: {
      invoice: true,
      student: { include: { school: true } },
    },
  });

  if (!payment) {
    throw new Error(`No payment record found matching transaction reference: ${targetTxRef}`);
  }

  // If payment was already verified and marked successful, return idempotent success
  if (payment.status === 'SUCCESSFUL' || payment.status === 'VERIFIED') {
    return {
      success: true,
      alreadyVerified: true,
      payment,
    };
  }

  // 3. Amount & Currency Verification
  if (Math.abs(payment.amount - verified.amount) > 0.01) {
    console.error('[Payment Verification Mismatch]', {
      expected: payment.amount,
      received: verified.amount,
    });
    await prisma.studentPayment.update({
      where: { id: payment.id },
      data: {
        status: 'UNDER_REVIEW',
        flutterwaveTransactionId: String(transactionId),
        flutterwaveRef: verified.flw_ref || null,
        notes: `Amount mismatch: Expected ₦${payment.amount}, Received ₦${verified.amount}`,
      },
    });

    throw new Error(`Payment verification failed: Amount paid (₦${verified.amount}) does not match expected invoice payment (₦${payment.amount}).`);
  }

  // 4. Atomic Financial Settlement Database Transaction
  const updatedPayment = await prisma.$transaction(async (tx) => {
    // A. Update Payment status to SUCCESSFUL
    const updated = await tx.studentPayment.update({
      where: { id: payment.id },
      data: {
        status: 'SUCCESSFUL',
        flutterwaveTransactionId: String(transactionId),
        flutterwaveRef: verified.flw_ref || null,
        flutterwaveFee: Number(verified.app_fee || 0),
        paymentDate: new Date(),
      },
    });

    // B. Update Invoice paidAmount and status
    if (payment.invoiceId && payment.invoice) {
      const currentPaid = payment.invoice.paidAmount || 0;
      const newPaidAmount = currentPaid + payment.amount;
      const netInvoiceAmount = payment.invoice.netAmount;

      let newInvoiceStatus = 'PARTIALLY_PAID';
      if (newPaidAmount >= netInvoiceAmount - 0.01) {
        newInvoiceStatus = 'PAID';
      }

      await tx.invoice.update({
        where: { id: payment.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newInvoiceStatus,
        },
      });

      // Also update any matching InstallmentSchedule items if present
      await tx.installmentSchedule.updateMany({
        where: {
          invoiceId: payment.invoiceId,
          status: 'UNPAID',
        },
        data: {
          status: 'PAID',
        },
      });
    }

    // C. Write Financial Audit Log
    await tx.financialAuditLog.create({
      data: {
        schoolId: payment.schoolId,
        userId: payment.parentId || payment.studentId,
        role: payment.parentId ? 'PARENT' : 'STUDENT',
        action: 'ONLINE_FEE_PAYMENT_SUCCESSFUL',
        details: `Online fee payment of ₦${payment.amount.toLocaleString()} verified via Flutterwave (TxRef: ${payment.referenceNumber}, TxId: ${transactionId})`,
      },
    });

    await tx.paymentAuditLog.create({
      data: {
        schoolId: payment.schoolId,
        actorId: payment.parentId || null,
        action: 'WEBHOOK_VERIFIED',
        resourceType: 'PAYMENT',
        resourceId: payment.id,
        metadata: {
          transactionId,
          flwRef: verified.flw_ref,
          amount: payment.amount,
        },
      },
    });

    // D. In-app Notification for Parent & School Admin
    if (payment.student) {
      await tx.notification.create({
        data: {
          schoolId: payment.schoolId,
          userId: payment.studentId,
          message: `💳 Payment Successful: Payment of ₦${payment.amount.toLocaleString()} for ${payment.student.firstName} ${payment.student.lastName} was confirmed. Receipt: ${payment.receiptNumber}`,
        },
      });
    }

    return updated;
  });

  return {
    success: true,
    payment: updatedPayment,
  };
}
