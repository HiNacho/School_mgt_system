import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import { 
  ensureSchoolSubscription, 
  ensureCurrentTermInvoice, 
  evaluateSchoolAccessStatus,
  verifyFlutterwaveTransaction,
  generateReceiptNumber,
  PRICE_PER_STUDENT_TERM,
  getBillableStudentCount
} from '@/lib/billing-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'BURSAR']);

    let schoolId = session.schoolId;
    const url = new URL(req.url);
    const targetSchoolId = url.searchParams.get('schoolId');

    if (session.role === 'SUPER_ADMIN' && targetSchoolId) {
      schoolId = targetSchoolId;
    }

    if (!schoolId) {
      return NextResponse.json({ error: 'School context not found in user session' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true
      }
    });

    if (!school) {
      return NextResponse.json({ error: 'School entity not found' }, { status: 404 });
    }

    const subscription = await ensureSchoolSubscription(schoolId);
    const termInfo = await ensureCurrentTermInvoice(schoolId);
    const accessStatus = await evaluateSchoolAccessStatus(schoolId);

    const invoices = await prisma.saaSBillingInvoice.findMany({
      where: { schoolId },
      include: {
        session: { select: { id: true, name: true } },
        term: { select: { id: true, name: true } },
        transactions: { orderBy: { paymentDate: 'desc' } },
        receipts: { orderBy: { issuedAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const payments = await prisma.paymentTransaction.findMany({
      where: { schoolId },
      include: {
        saasInvoice: { select: { invoiceNumber: true, studentCount: true } },
        receipt: true
      },
      orderBy: { paymentDate: 'desc' }
    });

    const receipts = await prisma.paymentReceipt.findMany({
      where: { schoolId },
      include: {
        saasInvoice: { select: { invoiceNumber: true, session: true, term: true } },
        transaction: true
      },
      orderBy: { issuedAt: 'desc' }
    });

    const auditLogs = await prisma.billingAuditLog.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    return NextResponse.json({
      success: true,
      pricingModel: {
        pricePerStudent: PRICE_PER_STUDENT_TERM,
        unit: 'per student / term'
      },
      school,
      subscription,
      currentTermInfo: {
        session: termInfo.session,
        term: termInfo.term,
        billableStudents: termInfo.billableCount
      },
      currentInvoice: termInfo.invoice,
      invoices,
      payments,
      receipts,
      auditLogs,
      accessStatus
    });

  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Billing GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch SaaS billing details' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SCHOOL_ADMIN']);

    const schoolId = session.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context not found in user session' }, { status: 400 });
    }

    const body = await req.json();
    const { action, autoRenew, invoiceId, transactionRef } = body;

    // Handle Auto-Renewal Toggle Action
    if (action === 'TOGGLE_AUTO_RENEW') {
      const updatedSub = await prisma.schoolSubscription.update({
        where: { schoolId },
        data: { autoRenewEnabled: Boolean(autoRenew) }
      });

      await prisma.billingAuditLog.create({
        data: {
          schoolId,
          userId: session.id,
          action: autoRenew ? 'AUTO_RENEW_ENABLED' : 'AUTO_RENEW_DISABLED',
          details: `School Admin ${session.firstName} ${session.lastName} set auto-renewal to ${autoRenew ? 'ENABLED' : 'DISABLED'}`
        }
      });

      return NextResponse.json({ success: true, subscription: updatedSub });
    }

    // Standard Online Payment Verification Action
    if (!invoiceId || !transactionRef) {
      return NextResponse.json({ error: 'Missing invoiceId or transactionRef for payment verification' }, { status: 400 });
    }

    // 1. Multi-Tenant Authorization & Invoice Lookup
    const invoice = await prisma.saaSBillingInvoice.findFirst({
      where: { id: invoiceId, schoolId },
      include: { session: true, term: true }
    });

    if (!invoice) {
      return NextResponse.json({ error: 'SaaS Billing Invoice not found or unauthorized' }, { status: 404 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ error: 'This invoice has already been fully paid and verified.' }, { status: 400 });
    }

    // 2. Anti-Replay Check
    const existingTx = await prisma.paymentTransaction.findUnique({
      where: { transactionRef: String(transactionRef) }
    });
    if (existingTx && existingTx.status === 'SUCCESSFUL') {
      return NextResponse.json({ error: 'This transaction reference has already been processed.' }, { status: 400 });
    }

    // 3. Verify Payment with Flutterwave Server API
    const flwData = await verifyFlutterwaveTransaction(String(transactionRef), invoice.totalAmount);

    const numericPaidAmount = parseFloat(flwData.amount);

    // 4. Database Transaction Execution
    const result = await prisma.$transaction(async (tx) => {
      // Record Payment Transaction
      const paymentTx = await tx.paymentTransaction.create({
        data: {
          schoolId,
          saasInvoiceId: invoice.id,
          transactionRef: String(transactionRef),
          flutterwaveRef: String(flwData.id || flwData.flw_ref || transactionRef),
          amount: numericPaidAmount,
          currency: 'NGN',
          paymentMethod: 'Flutterwave Gateway',
          status: 'SUCCESSFUL',
          paymentDate: new Date(),
          recordedById: session.id,
          rawGatewayResponse: flwData
        }
      });

      // Generate Receipt
      const receiptNum = await generateReceiptNumber(schoolId);
      const receipt = await tx.paymentReceipt.create({
        data: {
          schoolId,
          saasInvoiceId: invoice.id,
          transactionId: paymentTx.id,
          receiptNumber: receiptNum,
          amount: numericPaidAmount,
          studentCount: invoice.studentCount,
          issuedAt: new Date(),
          notes: `Paid online via Flutterwave for ${invoice.invoiceNumber}`
        }
      });

      // Mark Invoice as PAID
      const updatedInvoice = await tx.saaSBillingInvoice.update({
        where: { id: invoice.id },
        data: {
          status: 'PAID',
          paidAmount: numericPaidAmount,
          paidAt: new Date()
        }
      });

      // Update Subscription Status & Timeline
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000); // ~1 term period
      const graceEnd = new Date(periodEnd.getTime() + 14 * 24 * 60 * 60 * 1000);

      const updatedSub = await tx.schoolSubscription.update({
        where: { schoolId },
        data: {
          status: 'ACTIVE',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          gracePeriodEnd: graceEnd,
          currentBillableCount: invoice.studentCount
        }
      });

      // Also update School table for backward compatibility
      await tx.school.update({
        where: { id: schoolId },
        data: {
          subscriptionStatus: 'active',
          subscriptionEnd: periodEnd,
          gracePeriodEnd: graceEnd
        }
      });

      // Record Audit Log
      await tx.billingAuditLog.create({
        data: {
          schoolId,
          userId: session.id,
          action: 'PAYMENT_SUCCESSFUL',
          details: `Verified payment of NGN ${numericPaidAmount.toLocaleString()} for invoice ${invoice.invoiceNumber} (Receipt: ${receiptNum})`
        }
      });

      // Create Admin Notification
      await tx.notification.create({
        data: {
          schoolId,
          userId: session.id,
          title: 'Subscription Payment Received',
          message: `Your payment of NGN ${numericPaidAmount.toLocaleString()} for ${invoice.invoiceNumber} was verified. Receipt #${receiptNum} is ready.`,
          type: 'SYSTEM'
        }
      });

      return { paymentTx, receipt, invoice: updatedInvoice, subscription: updatedSub };
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Billing POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to verify and process payment' }, { status: 400 });
  }
}
