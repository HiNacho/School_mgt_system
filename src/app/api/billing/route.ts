import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SCHOOL_ADMIN']);

    const schoolId = session.schoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School context not found in user session' }, { status: 400 });
    }

    const payments = await prisma.payment.findMany({
      where: { schoolId },
      orderBy: { paymentDate: 'desc' }
    });

    // Also fetch school details
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        maxStudents: true,
        phone: true,
        _count: {
          select: { students: true }
        }
      }
    });

    return NextResponse.json({ success: true, payments, school });
  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Billing GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch billing details' }, { status: 500 });
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
    const { amount, planSelected, durationTerms, transactionRef, status } = body;

    if (!amount || !planSelected || !durationTerms || !transactionRef) {
      return NextResponse.json({ error: 'Missing payment details (amount, planSelected, durationTerms, transactionRef)' }, { status: 400 });
    }

    // 1. Prevent transaction replay attacks (check unique index)
    const existingPayment = await prisma.payment.findUnique({
      where: { transactionRef: String(transactionRef) }
    });
    if (existingPayment) {
      return NextResponse.json({ error: 'This transaction reference has already been processed and verified' }, { status: 400 });
    }

    // 2. Calculate expected plan price per term
    let pricePerTerm = 80000;
    if (planSelected.includes('Basic') || planSelected.includes('100') || planSelected.includes('Tier 1')) {
      pricePerTerm = 40000;
    } else if (planSelected.includes('Standard') || planSelected.includes('250') || planSelected.includes('Tier 2')) {
      pricePerTerm = 80000;
    } else if (planSelected.includes('Premium') || planSelected.includes('500') || planSelected.includes('Tier 3')) {
      pricePerTerm = 150000;
    } else if (planSelected.includes('Unlimited') || planSelected.includes('Enterprise') || planSelected.includes('Tier 4')) {
      pricePerTerm = 300000;
    }
    const termsCount = parseInt(String(durationTerms), 10) || 1;
    const expectedAmount = pricePerTerm * termsCount;

    // 3. Connect to Flutterwave verification API to verify payment validity
    const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey || secretKey.trim() === '') {
      return NextResponse.json({ error: 'Server payment gateway key is not configured' }, { status: 500 });
    }

    let flwData: any = null;
    try {
      const verifyRes = await fetch(`https://api.flutterwave.com/v3/transactions/${transactionRef}/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${secretKey}`,
          'Content-Type': 'application/json'
        }
      });

      const verifyJson = await verifyRes.json();
      if (!verifyRes.ok || verifyJson.status !== 'success') {
        return NextResponse.json({ error: verifyJson.message || 'Verification rejected by Flutterwave payment gateway' }, { status: 400 });
      }

      flwData = verifyJson.data;
    } catch (err) {
      console.error('Flutterwave fetch verification error:', err);
      return NextResponse.json({ error: 'Failed to verify transaction with payment gateway' }, { status: 500 });
    }

    // 4. Validate transaction properties
    if (flwData.status !== 'successful') {
      return NextResponse.json({ error: `Payment failed: reported status is ${flwData.status}` }, { status: 400 });
    }

    if (flwData.currency !== 'NGN') {
      return NextResponse.json({ error: `Invalid payment currency: expected NGN, got ${flwData.currency}` }, { status: 400 });
    }

    const numericPaidAmount = parseFloat(flwData.amount);
    if (isNaN(numericPaidAmount) || numericPaidAmount < expectedAmount) {
      return NextResponse.json({ 
        error: `Insufficient payment: expected NGN ${expectedAmount}, received NGN ${flwData.amount}` 
      }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Log payment
      const payment = await tx.payment.create({
        data: {
          schoolId,
          amount: numericPaidAmount,
          paymentMethod: 'Flutterwave Gateway',
          status: 'paid',
          transactionRef: String(transactionRef),
          paymentDate: new Date(),
        }
      });

      // Fetch current subscription status to check for advance stacking
      const school = await tx.school.findUnique({
        where: { id: schoolId },
        select: { subscriptionEnd: true }
      });

      const start = new Date();
      const baseTime = school?.subscriptionEnd && new Date(school.subscriptionEnd).getTime() > Date.now()
        ? new Date(school.subscriptionEnd).getTime()
        : Date.now();

      // Calculate end date: 90 days per term paid
      const end = new Date(baseTime + termsCount * 90 * 24 * 60 * 60 * 1000);
      const grace = new Date(end.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days grace period

      // Map plan to student limits
      let maxStudents = 100;
      if (planSelected.includes('Basic') || planSelected.includes('100') || planSelected.includes('Tier 1')) {
        maxStudents = 100;
      } else if (planSelected.includes('Standard') || planSelected.includes('250') || planSelected.includes('Tier 2')) {
        maxStudents = 250;
      } else if (planSelected.includes('Premium') || planSelected.includes('500') || planSelected.includes('Tier 3')) {
        maxStudents = 500;
      } else if (planSelected.includes('Unlimited') || planSelected.includes('Enterprise') || planSelected.includes('Tier 4')) {
        maxStudents = 999999;
      }

      const updatedSchool = await tx.school.update({
        where: { id: schoolId },
        data: {
          subscriptionStatus: 'active',
          subscriptionPlan: planSelected,
          subscriptionEnd: end,
          gracePeriodEnd: grace,
          maxStudents: maxStudents
        }
      });

      // Log a usage log trace for security verification
      await tx.usageLog.create({
        data: {
          schoolId,
          activityType: `Online Payment Verified: NGN ${numericPaidAmount} via Flutterwave`,
        }
      });

      return { payment, school: updatedSchool };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Billing POST Error:', error);
    return NextResponse.json({ error: 'Failed to verify and process payment' }, { status: 500 });
  }
}
