import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { verifyFlutterwaveTransaction } from '@/lib/flutterwave';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tx_ref = searchParams.get('tx_ref');
  const transaction_id = searchParams.get('transaction_id');
  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!tx_ref) {
    return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=cancelled`);
  }

  try {
    // 1. Locate pending payment record
    const payment = await prisma.studentPayment.findFirst({
      where: { referenceNumber: tx_ref },
      include: { student: true, school: true, invoice: true },
    });

    if (!payment) {
      return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=error&msg=Transaction+not+found`);
    }

    // 2. Idempotency Check: If already processed, redirect cleanly to receipt
    if (payment.status === 'SUCCESSFUL' || payment.status === 'VERIFIED') {
      return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=success&paymentId=${payment.id}`);
    }

    // 3. Handle Cancelled / Failed statuses from Flutterwave
    if (status === 'cancelled' || !transaction_id) {
      await prisma.studentPayment.update({
        where: { id: payment.id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=cancelled`);
    }

    // 4. Verify transaction server-side directly with Flutterwave API
    const verified = await verifyFlutterwaveTransaction(transaction_id);

    if (verified.status !== 'successful' || verified.amount < payment.amount) {
      console.warn('[Flutterwave Verification Failed]', { expected: payment.amount, received: verified.amount, status: verified.status });
      await prisma.studentPayment.update({
        where: { id: payment.id },
        data: { 
          status: 'FAILED',
          flutterwaveTransactionId: String(transaction_id),
          notes: `Verification failed: Expected ₦${payment.amount}, received ₦${verified.amount}`
        },
      });
      return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=failed`);
    }

    // 5. Execute DB updates atomically
    await prisma.$transaction(async (tx) => {
      // Mark Payment Successful
      await tx.studentPayment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESSFUL',
          flutterwaveTransactionId: String(transaction_id),
          flutterwaveRef: verified.flw_ref || null,
          paymentDate: new Date(),
        },
      });

      // Update Invoice Ledger
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

      // Record Audit Log
      await tx.financialAuditLog.create({
        data: {
          schoolId: payment.schoolId,
          userId: payment.parentId || payment.studentId,
          role: 'PARENT',
          action: 'ONLINE_FEE_PAYMENT_SUCCESSFUL',
          details: `Online fee payment of ₦${payment.amount.toLocaleString()} received via Flutterwave (TxRef: ${tx_ref})`,
        },
      });

      // Notify Bursar & Admins
      const admins = await tx.user.findMany({
        where: {
          schoolId: payment.schoolId,
          role: { in: ['SCHOOL_ADMIN', 'SUPER_ADMIN'] },
        },
      });

      for (const admin of admins) {
        await tx.notification.create({
          data: {
            schoolId: payment.schoolId,
            userId: admin.id,
            message: `💳 School Fee Payment Received: ₦${payment.amount.toLocaleString()} received for ${payment.student.firstName} ${payment.student.lastName} (${payment.receiptNumber}).`,
          },
        });
      }
    });

    return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=success&paymentId=${payment.id}`);

  } catch (err: any) {
    console.error('Flutterwave Callback Processing Error:', err);
    return NextResponse.redirect(`${origin}/dashboard/parents?paymentStatus=error&msg=${encodeURIComponent(err.message || 'Payment processing error')}`);
  }
}
