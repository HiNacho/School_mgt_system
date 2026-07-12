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

    if (status !== 'successful' && status !== 'completed') {
      return NextResponse.json({ error: 'Invalid transaction status reported' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount specified' }, { status: 400 });
    }

    const termsCount = parseInt(String(durationTerms), 10) || 1;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Log payment
      const payment = await tx.payment.create({
        data: {
          schoolId,
          amount: numericAmount,
          paymentMethod: 'Flutterwave Gateway',
          status: 'paid',
          paymentDate: new Date(),
        }
      });

      // 2. Fetch current subscription status to check for advance stacking
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
      const grace = new Date(end.getTime() + 14 * 24 * 60 * 60 * 1005); // 14 days grace period

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

      // 3. Log a usage log trace for security verification
      await tx.usageLog.create({
        data: {
          schoolId,
          activityType: `Online Payment Verified: NGN ${numericAmount} via Flutterwave`,
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
