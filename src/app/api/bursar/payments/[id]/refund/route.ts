// Payment Refund Processing Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireSchoolScope } from '@/lib/auth-middleware';
import { processPaymentRefund } from '@/lib/payments/refund.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized to process refunds' }, { status: 403 });
    }

    const body = await req.json();
    const { amount, reason, schoolId } = body;

    const targetSchoolId = session.schoolId || schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    requireSchoolScope(session, targetSchoolId);

    if (!reason || reason.trim().length < 3) {
      return NextResponse.json({ error: 'A valid reason is required for processing a refund' }, { status: 400 });
    }

    const refund = await processPaymentRefund({
      schoolId: targetSchoolId,
      paymentId: id,
      amount: amount ? Number(amount) : undefined,
      reason: reason.trim(),
      actorId: session.userId,
      actorRole: session.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Refund successfully initiated and processed.',
      data: refund,
    });
  } catch (error: any) {
    console.error('Payment Refund API Error:', error);
    return NextResponse.json({ error: error.message || 'Refund processing failed' }, { status: 400 });
  }
}
