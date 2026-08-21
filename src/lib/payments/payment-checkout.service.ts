// Dedicated Payment Checkout & Initialization Service
import prisma from '@/lib/db';
import { initializePaymentCheckout } from './flutterwave.service';
import { calculatePaymentSplit } from './commission.service';

export interface InitiatePaymentParams {
  schoolId: string;
  studentId: string;
  invoiceId?: string;
  amount: number;
  parentId?: string | null;
  parentEmail?: string;
  parentName?: string;
  parentPhone?: string;
  originHeader?: string;
  actorId?: string;
}

export async function initiatePaymentCheckoutFlow(params: InitiatePaymentParams) {
  const { schoolId, studentId, invoiceId, amount } = params;

  if (!studentId || !amount || amount <= 0) {
    throw new Error('Valid student ID and positive payment amount are required.');
  }

  // 1. Fetch Student & School profile with strict multi-tenant scope
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId },
    include: { school: true, class: true, arm: true },
  });

  if (!student || !student.school) {
    throw new Error('Student profile or School tenant context not found.');
  }

  const school = student.school;

  // 2. Validate online payment activation & subaccount readiness
  if (!school.onlinePaymentsEnabled) {
    throw new Error('Online fee payments are currently disabled by your school administration.');
  }

  if (!['ACTIVE', 'VERIFIED'].includes(school.flutterwaveStatus || '') || !school.flutterwaveSubaccountId) {
    throw new Error('School online payment account setup is pending or unverified. Payments cannot be processed yet.');
  }

  // 3. Retrieve Invoice & calculate server-side balance
  let invoice = null;
  if (invoiceId) {
    invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, schoolId: school.id, studentId: student.id },
    });
  } else {
    invoice = await prisma.invoice.findFirst({
      where: { schoolId: school.id, studentId: student.id, status: { in: ['OUTSTANDING', 'PARTIALLY_PAID'] } },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (!invoice) {
    throw new Error('No outstanding fee invoice found for this student.');
  }

  const outstandingBalance = invoice.netAmount - invoice.paidAmount;
  if (outstandingBalance <= 0) {
    throw new Error('This fee invoice is already fully paid.');
  }

  if (amount > outstandingBalance) {
    throw new Error(`Payment amount (₦${amount.toLocaleString()}) cannot exceed remaining outstanding balance (₦${outstandingBalance.toLocaleString()}).`);
  }

  if (amount < outstandingBalance && !school.allowPartialPayments) {
    throw new Error('Your school requires full invoice payment. Partial payments are disabled.');
  }

  if (amount < outstandingBalance && amount < (school.minPartialPaymentAmount || 1000)) {
    throw new Error(`Minimum allowed partial payment is ₦${(school.minPartialPaymentAmount || 1000).toLocaleString()}.`);
  }

  // 4. Calculate Platform Commission & School Split
  const split = calculatePaymentSplit(amount, school);

  // 5. Generate Unique Transaction References
  const timestamp = Date.now();
  const cleanSlug = (school.slug || 'SCH').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const cleanAdmission = (student.admissionNumber || 'STU').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const tx_ref = `OP-${cleanSlug}-${cleanAdmission}-FEE-${timestamp}`;
  const receiptNumber = `REC-FEE-${timestamp.toString().slice(-8)}`;

  // 6. Create PENDING StudentPayment Record
  const pendingPayment = await prisma.studentPayment.create({
    data: {
      schoolId: school.id,
      studentId: student.id,
      parentId: params.parentId || null,
      invoiceId: invoice.id,
      receiptNumber,
      amount: split.grossAmount,
      grossAmount: split.grossAmount,
      platformFee: split.platformFee,
      schoolAmount: split.schoolAmount,
      netAmount: split.schoolAmount,
      currency: 'NGN',
      paymentMethod: 'FLUTTERWAVE',
      paymentType: 'SCHOOL_FEE',
      referenceNumber: tx_ref,
      status: 'PENDING',
      notes: `Online fee payment for ${student.firstName} ${student.lastName} (${invoice.invoiceNumber})`,
    },
  });

  // 7. Audit Log
  await prisma.paymentAuditLog.create({
    data: {
      schoolId: school.id,
      actorId: params.actorId || null,
      action: 'PAYMENT_INITIALIZED',
      resourceType: 'PAYMENT',
      resourceId: pendingPayment.id,
      metadata: {
        tx_ref,
        invoiceId: invoice.id,
        amount: split.grossAmount,
        platformFee: split.platformFee,
        schoolAmount: split.schoolAmount,
      },
    },
  });

  // 8. Build Callback Redirect URL & Initialize Flutterwave Checkout
  const origin = params.originHeader || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const redirect_url = `${origin}/api/payments/flutterwave/callback`;

  const checkoutResult = await initializePaymentCheckout({
    tx_ref,
    amount: split.grossAmount,
    currency: 'NGN',
    redirect_url,
    customer: {
      email: params.parentEmail || 'parent@guardian.local',
      name: params.parentName || `${student.lastName} Family`,
      phonenumber: params.parentPhone || '',
    },
    customizations: {
      title: `${school.name} — School Fees`,
      description: `School fee payment for ${student.lastName}, ${student.firstName} (${student.class?.name || ''})`,
      logo: school.logoUrl || undefined,
    },
    subaccountId: school.flutterwaveSubaccountId,
    platformFeeAmount: split.platformFee,
    meta: {
      paymentId: pendingPayment.id,
      schoolId: school.id,
      studentId: student.id,
      invoiceId: invoice.id,
      parentId: params.parentId || null,
      platformFee: split.platformFee,
      schoolAmount: split.schoolAmount,
    },
  });

  return {
    checkoutUrl: checkoutResult.link,
    txRef: tx_ref,
    paymentId: pendingPayment.id,
    receiptNumber,
    split,
  };
}
