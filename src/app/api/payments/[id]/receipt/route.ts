// Digital Payment Receipt API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { generatePaymentReceiptData } from '@/lib/payments/receipt.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { id } = await params;

    const schoolId = session.role === 'SUPER_ADMIN' ? undefined : session.schoolId || undefined;
    const receiptData = await generatePaymentReceiptData(id, schoolId);

    if (session.role === 'PARENT') {
      if (receiptData.parent && receiptData.parent.email !== (session as any).email && receiptData.student.id) {
        // verify student is linked to parent
      }
    }

    return NextResponse.json({
      success: true,
      data: receiptData,
    });
  } catch (error: any) {
    console.error('Receipt Generation Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate payment receipt' }, { status: 400 });
  }
}
