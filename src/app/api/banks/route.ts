// Dynamic Nigerian Banks List API from Flutterwave
import { NextRequest, NextResponse } from 'next/server';
import { getFlutterwaveBanks } from '@/lib/payments/flutterwave.service';

export async function GET(req: NextRequest) {
  try {
    const banks = await getFlutterwaveBanks('NG');
    return NextResponse.json({
      success: true,
      data: banks,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to load banks' }, { status: 500 });
  }
}
