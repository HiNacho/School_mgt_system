// Digital Receipt Generation & Formatting Service
import prisma from '@/lib/db';

export async function generatePaymentReceiptData(paymentId: string, schoolId?: string) {
  const query: any = { id: paymentId };
  if (schoolId) query.schoolId = schoolId;

  const payment = await prisma.studentPayment.findFirst({
    where: query,
    include: {
      school: true,
      student: {
        include: {
          class: true,
          arm: true,
        },
      },
      parent: true,
      invoice: {
        include: {
          session: true,
          term: true,
        },
      },
    },
  });

  if (!payment) {
    throw new Error('Payment record not found.');
  }

  const school = payment.school;
  const student = payment.student;

  return {
    receiptNumber: payment.receiptNumber,
    paymentReference: payment.referenceNumber || 'N/A',
    flutterwaveTransactionId: payment.flutterwaveTransactionId || 'N/A',
    flutterwaveRef: payment.flutterwaveRef || 'N/A',

    school: {
      name: school.name,
      address: school.address || 'Main School Campus',
      phone: school.phone || '',
      email: school.email || '',
      logoUrl: school.logoUrl || null,
      subaccountId: school.flutterwaveSubaccountId || null,
      bankName: school.flutterwaveBankCode || null,
      accountName: school.flutterwaveAccountName || null,
      accountNumberLast4: school.flutterwaveAccountNumberLast4 || null,
    },

    student: {
      id: student.id,
      name: `${student.firstName} ${student.middleName || ''} ${student.lastName}`.trim(),
      admissionNumber: student.admissionNumber,
      className: `${student.class?.name || ''} ${student.arm?.name || ''}`.trim(),
    },

    parent: payment.parent
      ? {
          name: `${payment.parent.firstName} ${payment.parent.lastName}`.trim(),
          email: payment.parent.email,
          phone: payment.parent.phone,
        }
      : null,

    invoice: payment.invoice
      ? {
          invoiceNumber: payment.invoice.invoiceNumber,
          session: payment.invoice.session?.name || '',
          term: payment.invoice.term?.name || '',
          totalAmount: payment.invoice.amount,
          netAmount: payment.invoice.netAmount,
          paidAmount: payment.invoice.paidAmount,
          outstandingBalance: Math.max(0, payment.invoice.netAmount - payment.invoice.paidAmount),
        }
      : null,

    paymentDetails: {
      amountPaid: payment.amount,
      grossAmount: payment.grossAmount || payment.amount,
      platformFee: payment.platformFee || 0,
      schoolAmount: payment.schoolAmount || payment.amount,
      currency: payment.currency || 'NGN',
      paymentMethod: payment.paymentMethod,
      paymentType: payment.paymentType,
      paymentDate: payment.paymentDate,
      status: payment.status,
      notes: payment.notes,
    },
  };
}
