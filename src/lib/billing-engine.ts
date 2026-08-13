import prisma from '@/lib/db';

export const PRICE_PER_STUDENT_TERM = 1000; // ₦1,000 per student per term

/**
 * Counts billable students for a school.
 * Billable statuses: ACTIVE, ENROLLED
 * Non-billable statuses: GRADUATED, WITHDRAWN, TRANSFERRED, ARCHIVED, SUSPENDED
 */
export async function getBillableStudentCount(schoolId: string): Promise<number> {
  const count = await prisma.student.count({
    where: {
      schoolId,
      status: {
        in: ['ACTIVE', 'ENROLLED']
      }
    }
  });
  return count;
}

/**
 * Calculates total bill amount based on student count
 */
export function calculateTermBill(studentCount: number, discount = 0, tax = 0) {
  const subtotal = Math.max(0, studentCount) * PRICE_PER_STUDENT_TERM;
  const totalAmount = Math.max(0, subtotal - discount + tax);
  return {
    studentCount,
    pricePerStudent: PRICE_PER_STUDENT_TERM,
    subtotal,
    discount,
    tax,
    totalAmount
  };
}

/**
 * Generates a unique SaaS Invoice Number: OP-2026-2027-T1-000001
 */
export async function generateInvoiceNumber(schoolId: string, sessionName?: string, termName?: string): Promise<string> {
  const cleanSession = (sessionName || '2026-2027').replace(/[^a-zA-Z0-9]/g, '-').toUpperCase();
  let termCode = 'T1';
  if (termName?.toLowerCase().includes('second')) termCode = 'T2';
  if (termName?.toLowerCase().includes('third')) termCode = 'T3';

  const count = await prisma.saaSBillingInvoice.count({
    where: { schoolId }
  });
  const seq = String(count + 1).padStart(6, '0');
  const invNumber = `OP-${cleanSession}-${termCode}-${seq}`;

  // Ensure uniqueness
  const existing = await prisma.saaSBillingInvoice.findUnique({
    where: { invoiceNumber: invNumber }
  });
  if (existing) {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `OP-${cleanSession}-${termCode}-${seq}-${randomSuffix}`;
  }

  return invNumber;
}

/**
 * Generates a unique Receipt Number: REC-OP-000001
 */
export async function generateReceiptNumber(schoolId: string): Promise<string> {
  const count = await prisma.paymentReceipt.count({
    where: { schoolId }
  });
  const seq = String(count + 1).padStart(6, '0');
  const receiptNum = `REC-OP-${seq}`;

  const existing = await prisma.paymentReceipt.findUnique({
    where: { receiptNumber: receiptNum }
  });
  if (existing) {
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    return `REC-OP-${seq}-${randomSuffix}`;
  }

  return receiptNum;
}

/**
 * Ensures a SchoolSubscription record exists for the given school.
 */
export async function ensureSchoolSubscription(schoolId: string) {
  let sub = await prisma.schoolSubscription.findUnique({
    where: { schoolId }
  });

  const billableCount = await getBillableStudentCount(schoolId);

  if (!sub) {
    // Check if school has subscription fields on School table
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        name: true,
        email: true,
        phone: true,
        address: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        gracePeriodEnd: true,
        createdAt: true
      }
    });

    const now = new Date();
    const trialEnd = school?.subscriptionEnd || new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days default trial

    sub = await prisma.schoolSubscription.create({
      data: {
        schoolId,
        planName: 'Operon School Management',
        pricePerStudentTerm: PRICE_PER_STUDENT_TERM,
        status: (school?.subscriptionStatus?.toUpperCase() as any) || 'TRIAL',
        currentBillableCount: billableCount,
        trialStartDate: school?.subscriptionStart || school?.createdAt || now,
        trialEndDate: trialEnd,
        gracePeriodEnd: school?.gracePeriodEnd || new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000),
        billingContactName: school?.name || null,
        billingContactEmail: school?.email || null,
        billingPhone: school?.phone || null,
        billingAddress: school?.address || null,
      }
    });
  } else {
    // Update billable count snapshot
    sub = await prisma.schoolSubscription.update({
      where: { schoolId },
      data: { currentBillableCount: billableCount }
    });
  }

  return sub;
}

/**
 * Ensures the termly SaaS invoice for the current session/term exists.
 */
export async function ensureCurrentTermInvoice(schoolId: string) {
  const currentSession = await prisma.academicSession.findFirst({
    where: { schoolId, isCurrent: true }
  });

  const currentTerm = await prisma.term.findFirst({
    where: { schoolId, isCurrent: true }
  });

  const billableCount = await getBillableStudentCount(schoolId);
  const calculation = calculateTermBill(billableCount);

  if (!currentSession || !currentTerm) {
    return {
      session: currentSession,
      term: currentTerm,
      billableCount,
      invoice: null
    };
  }

  // Check if invoice exists for this term
  let invoice = await prisma.saaSBillingInvoice.findFirst({
    where: {
      schoolId,
      sessionId: currentSession.id,
      termId: currentTerm.id
    },
    include: {
      transactions: { orderBy: { paymentDate: 'desc' } },
      receipts: { orderBy: { issuedAt: 'desc' } }
    }
  });

  if (!invoice) {
    const invNumber = await generateInvoiceNumber(schoolId, currentSession.name, currentTerm.name);
    const dueDate = currentTerm.endDate ? new Date(currentTerm.endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    invoice = await prisma.saaSBillingInvoice.create({
      data: {
        schoolId,
        invoiceNumber: invNumber,
        sessionId: currentSession.id,
        termId: currentTerm.id,
        studentCount: billableCount,
        pricePerStudent: PRICE_PER_STUDENT_TERM,
        subtotal: calculation.subtotal,
        totalAmount: calculation.totalAmount,
        status: 'UNPAID',
        dueDate
      },
      include: {
        transactions: { orderBy: { paymentDate: 'desc' } },
        receipts: { orderBy: { issuedAt: 'desc' } }
      }
    });

    // Log audit log
    await prisma.billingAuditLog.create({
      data: {
        schoolId,
        action: 'INVOICE_GENERATED',
        details: `Generated termly SaaS invoice ${invNumber} for ${billableCount} active students (NGN ${calculation.totalAmount.toLocaleString()})`
      }
    });
  }

  return {
    session: currentSession,
    term: currentTerm,
    billableCount,
    invoice
  };
}

/**
 * Server-Side Verification of Flutterwave Payment Transaction
 */
export async function verifyFlutterwaveTransaction(transactionRef: string, expectedAmount: number) {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey || secretKey.trim() === '') {
    throw new Error('Payment gateway secret key is not configured on the server.');
  }

  const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionRef}/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    }
  });

  const verifyJson = await verifyRes.json();
  if (!verifyRes.ok || verifyJson.status !== 'success') {
    throw new Error(verifyJson.message || 'Payment verification was rejected by Flutterwave gateway.');
  }

  const flwData = verifyJson.data;

  if (flwData.status !== 'successful') {
    throw new Error(`Payment failed at gateway: reported status is ${flwData.status}`);
  }

  if (flwData.currency !== 'NGN') {
    throw new Error(`Invalid transaction currency: expected NGN, received ${flwData.currency}`);
  }

  const paidAmount = parseFloat(flwData.amount);
  if (isNaN(paidAmount) || paidAmount < expectedAmount) {
    throw new Error(`Insufficient payment amount: expected NGN ${expectedAmount.toLocaleString()}, received NGN ${flwData.amount.toLocaleString()}`);
  }

  return flwData;
}

/**
 * Evaluates subscription access level for a school
 */
export async function evaluateSchoolAccessStatus(schoolId: string) {
  const sub = await ensureSchoolSubscription(schoolId);
  const now = new Date();

  let accessMode: 'FULL_ACCESS' | 'GRACE_PERIOD' | 'SUSPENDED' = 'FULL_ACCESS';
  let message = 'Subscription is active';

  if (sub.status === 'SUSPENDED') {
    accessMode = 'SUSPENDED';
    message = 'Your Operon subscription is currently inactive. Please renew your subscription to restore full access.';
  } else if (sub.status === 'TRIAL') {
    if (sub.trialEndDate && now > sub.trialEndDate) {
      if (sub.gracePeriodEnd && now <= sub.gracePeriodEnd) {
        accessMode = 'GRACE_PERIOD';
        message = 'Your trial period has ended. You are currently in a grace period. Please pay your termly bill to prevent portal suspension.';
      } else {
        accessMode = 'SUSPENDED';
        message = 'Your Operon trial has ended. Please subscribe to continue using the platform.';
      }
    }
  } else if (sub.status === 'PAYMENT_DUE' || sub.status === 'PAST_DUE') {
    if (sub.gracePeriodEnd && now > sub.gracePeriodEnd) {
      accessMode = 'SUSPENDED';
      message = 'Your subscription payment is overdue and grace period has expired. Please renew your subscription to restore full access.';
    } else {
      accessMode = 'GRACE_PERIOD';
      message = 'Payment for the current term is overdue. Please complete your payment to avoid feature suspension.';
    }
  }

  return {
    subscription: sub,
    accessMode,
    message,
    isSuspended: accessMode === 'SUSPENDED'
  };
}
