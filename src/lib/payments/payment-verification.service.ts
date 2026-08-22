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

  // 5. Asynchronous Notification & Email Acknowledgment Dispatch (Bursar, Admin, Parent)
  dispatchFeePaymentNotifications(payment.id).catch(err => {
    console.error('Failed background notification dispatch:', err);
  });

  return {
    success: true,
    payment: updatedPayment,
  };
}

export async function dispatchFeePaymentNotifications(paymentId: string) {
  try {
    const payment = await prisma.studentPayment.findUnique({
      where: { id: paymentId },
      include: {
        school: true,
        invoice: true,
        student: {
          include: {
            class: true,
            parent: {
              include: { user: true }
            }
          }
        }
      }
    });

    if (!payment || !payment.student) return;

    const school = payment.school;
    const student = payment.student;
    const parent = student.parent;
    const amountStr = `₦${payment.amount.toLocaleString()}`;
    const studentName = `${student.firstName} ${student.lastName}`;
    const className = student.class?.name || 'Class';

    // A. Notify Bursars & School Admins (In-app Notification)
    const adminBursarUsers = await prisma.user.findMany({
      where: {
        schoolId: payment.schoolId,
        role: { in: ['BURSAR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'] },
        isActive: true,
      },
      select: { id: true, email: true, firstName: true }
    });

    for (const adminUser of adminBursarUsers) {
      await prisma.notification.create({
        data: {
          schoolId: payment.schoolId,
          userId: adminUser.id,
          message: `🎉 Fee Payment Received: ${amountStr} for ${studentName} (${className}). Receipt: ${payment.receiptNumber}`,
        }
      }).catch(e => console.warn('Failed to create admin notification:', e));
    }

    // B. Notify Parent User (In-app Notification)
    let parentUserId = parent?.user?.id;
    if (!parentUserId && parent?.email) {
      const pUser = await prisma.user.findFirst({
        where: { email: parent.email },
        select: { id: true }
      });
      parentUserId = pUser?.id;
    }

    if (parentUserId) {
      await prisma.notification.create({
        data: {
          schoolId: payment.schoolId,
          userId: parentUserId,
          message: `✅ Payment Acknowledgment: Thank you for your payment of ${amountStr} for ${studentName}. Receipt #${payment.receiptNumber} is now available in your portal.`,
        }
      }).catch(e => console.warn('Failed to create parent notification:', e));
    }

    // C. Record Student Timeline Event
    await prisma.studentTimeline.create({
      data: {
        schoolId: payment.schoolId,
        studentId: student.id,
        title: 'Fee Payment Received',
        description: `Fee payment of ${amountStr} received via Flutterwave (Receipt #${payment.receiptNumber})`,
        eventType: 'NOTE',
      }
    }).catch(e => console.warn('Failed to record student timeline:', e));

    // D. Send Email Acknowledgment to Parent
    const parentEmail = parent?.email;
    if (parentEmail) {
      const parentName = parent ? `${parent.firstName} ${parent.lastName}` : 'Parent/Guardian';
      const emailSubject = `Payment Acknowledgment & Receipt: ${studentName} — ${school.name}`;
      const emailBody = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="background-color: #4f46e5; padding: 16px 24px; border-radius: 8px 8px 0 0; text-align: center; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px;">${school.name}</h2>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Official Payment Receipt & Acknowledgment</p>
          </div>
          <div style="padding: 24px; color: #1e293b; line-height: 1.6;">
            <p>Dear <strong>${parentName}</strong>,</p>
            <p>Thank you for your payment! We hereby confirm that your fee payment for <strong>${studentName}</strong> has been successfully received and recorded.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f8fafc; border-radius: 8px; font-size: 14px;">
              <tr><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Receipt Number:</td><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${payment.receiptNumber}</td></tr>
              <tr><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Student Name:</td><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${studentName}</td></tr>
              <tr><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Class:</td><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-align: right;">${className}</td></tr>
              <tr><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; color: #64748b;">Amount Paid:</td><td style="padding: 10px 14px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #059669; text-align: right;">${amountStr}</td></tr>
              <tr><td style="padding: 10px 14px; color: #64748b;">Payment Method:</td><td style="padding: 10px 14px; font-weight: bold; text-align: right;">Flutterwave Online Payment</td></tr>
            </table>

            <p>Your official digital receipt is now available for download on your Parent Portal dashboard under <strong>School Fees & Receipts</strong>.</p>
            <br/>
            <p style="margin: 0; color: #64748b; font-size: 13px;">Warm regards,</p>
            <p style="margin: 4px 0 0 0; font-weight: bold;">Bursary & Accounts Department</p>
            <p style="margin: 0; color: #4f46e5; font-size: 13px;">${school.name}</p>
          </div>
        </div>
      `;

      try {
        const { sendEmail } = await import('@/lib/mailer');
        await sendEmail({
          leadId: payment.id,
          to: parentEmail,
          subject: emailSubject,
          body: emailBody,
        });
      } catch (e) {
        console.warn('Failed to send parent email acknowledgment:', e);
      }
    }
  } catch (err) {
    console.error('Error dispatching fee payment notifications:', err);
  }
}
