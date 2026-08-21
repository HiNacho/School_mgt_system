import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';
import { initializePaymentCheckout } from '@/lib/flutterwave';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    
    // Only parents (or admins/bursars on behalf of parents) can initiate online fee payments
    if (!['PARENT', 'SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized payment authorization' }, { status: 403 });
    }

    const body = await req.json();
    const { studentId, invoiceId, amount, paymentType = 'FULL' } = body;

    if (!studentId || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Valid student ID and payment amount are required' }, { status: 400 });
    }

    // 1. Verify Parent-Student ownership server-side if parent user
    let parentObj = null;
    if (session.role === 'PARENT') {
      const user = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true },
      });

      parentObj = await prisma.parent.findFirst({
        where: {
          OR: [
            { user: { id: user?.id } },
            { email: user?.email },
          ],
        },
        include: { students: true },
      });

      if (!parentObj) {
        return NextResponse.json({ error: 'Parent record not found' }, { status: 404 });
      }

      const isStudentLinked = parentObj.students.some(s => s.id === studentId);
      if (!isStudentLinked) {
        return NextResponse.json({ error: 'Forbidden. Student is not linked to your parent account' }, { status: 403 });
      }
    }

    // 2. Fetch Student & School details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { school: true, class: true, arm: true },
    });

    if (!student || !student.school) {
      return NextResponse.json({ error: 'Student or School profile not found' }, { status: 404 });
    }

    const school = student.school;

    // 3. Verify School Payment Account Status
    if (!school.onlinePaymentsEnabled) {
      return NextResponse.json({ 
        error: 'Online fee payments are currently disabled by your school administration.' 
      }, { status: 400 });
    }

    if (!['ACTIVE', 'VERIFIED'].includes(school.flutterwaveStatus || '')) {
      return NextResponse.json({ 
        error: 'School online payment account setup is pending verification.' 
      }, { status: 400 });
    }

    // 4. Fetch Active Invoice & calculate server-side balance
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
      return NextResponse.json({ error: 'No outstanding fee invoice found for this student.' }, { status: 404 });
    }

    const outstandingBalance = invoice.netAmount - invoice.paidAmount;

    if (outstandingBalance <= 0) {
      return NextResponse.json({ error: 'This fee invoice is already fully paid.' }, { status: 400 });
    }

    // Validate partial payment rules
    if (amount > outstandingBalance) {
      return NextResponse.json({ 
        error: `Payment amount (₦${amount.toLocaleString()}) cannot exceed the outstanding balance (₦${outstandingBalance.toLocaleString()})` 
      }, { status: 400 });
    }

    if (amount < outstandingBalance && !school.allowPartialPayments) {
      return NextResponse.json({ 
        error: 'Your school does not accept partial fee payments. Full payment is required.' 
      }, { status: 400 });
    }

    if (amount < outstandingBalance && amount < (school.minPartialPaymentAmount || 1000)) {
      return NextResponse.json({ 
        error: `Minimum allowed partial payment is ₦${(school.minPartialPaymentAmount || 1000).toLocaleString()}` 
      }, { status: 400 });
    }

    // 5. Generate unique transaction reference & pending payment record
    const timestamp = Date.now();
    const cleanSlug = (school.slug || 'SCH').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanAdmission = (student.admissionNumber || 'STU').toUpperCase().replace(/[^A-Z0-9]/g, '');
    const tx_ref = `OP-${cleanSlug}-${cleanAdmission}-FEE-${timestamp}`;
    const receiptNumber = `REC-FEE-${timestamp.toString().slice(-8)}`;

    const pendingPayment = await prisma.studentPayment.create({
      data: {
        schoolId: school.id,
        studentId: student.id,
        parentId: parentObj?.id || null,
        invoiceId: invoice.id,
        receiptNumber,
        amount: Number(amount),
        currency: 'NGN',
        paymentMethod: 'FLUTTERWAVE',
        paymentType: 'SCHOOL_FEE',
        referenceNumber: tx_ref,
        status: 'PENDING',
        notes: `Online school fee payment for ${student.firstName} ${student.lastName} (${invoice.invoiceNumber})`,
      },
    });

    // 6. Build callback & checkout parameters
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirect_url = `${origin}/api/payments/flutterwave/callback`;

    const parentName = parentObj 
      ? `${parentObj.firstName} ${parentObj.lastName}` 
      : 'School Parent';
      
    const parentEmail = parentObj?.email || 'parent@school.com';

    const checkoutResult = await initializePaymentCheckout({
      tx_ref,
      amount: Number(amount),
      currency: 'NGN',
      redirect_url,
      customer: {
        email: parentEmail,
        name: parentName,
        phonenumber: parentObj?.phone || '',
      },
      customizations: {
        title: `${school.name} — School Fees`,
        description: `School fee payment for ${student.lastName}, ${student.firstName} (${student.class?.name || ''} ${student.arm?.name || ''})`,
        logo: school.logoUrl || undefined,
      },
      subaccountId: school.flutterwaveSubaccountId || undefined,
      platformFeePercent: school.operonPlatformFeePercent || 0,
      meta: {
        paymentId: pendingPayment.id,
        schoolId: school.id,
        studentId: student.id,
        invoiceId: invoice.id,
        parentId: parentObj?.id || null,
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: checkoutResult.link,
      txRef: tx_ref,
      paymentId: pendingPayment.id,
    });

  } catch (error: any) {
    console.error('Payment Initiation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to initiate payment' }, { status: 500 });
  }
}
