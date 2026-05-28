import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch all platform payments or payments for a single school
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    const payments = await prisma.payment.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        school: {
          select: { name: true }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const formatted = payments.map(p => ({
      id: p.id,
      schoolId: p.schoolId,
      schoolName: p.school.name,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      status: p.status
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Superadmin Payments GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments log' }, { status: 500 });
  }
}

// 2. POST: Log manual payment and transactionally activate/extend school subscription plan
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, amount, paymentMethod, status, planSelected } = body;

    if (!schoolId || !amount || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required payment parameters' }, { status: 400 });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount specified' }, { status: 400 });
    }

    const cleanStatus = status || 'pending';
    const plan = planSelected || 'Basic';

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the payment record
      const payment = await tx.payment.create({
        data: {
          schoolId,
          amount: numericAmount,
          paymentMethod,
          status: cleanStatus,
        }
      });

      // 2. If status is paid, trigger automated subscription activation
      if (cleanStatus === 'paid') {
        const start = new Date();
        const end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year subscription
        const grace = new Date(end.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days grace period

        await tx.school.update({
          where: { id: schoolId },
          data: {
            subscriptionStatus: 'active',
            subscriptionPlan: plan,
            subscriptionStart: start,
            subscriptionEnd: end,
            gracePeriodEnd: grace
          }
        });
      }

      return payment;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('Superadmin Payments POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to log manual payment' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
