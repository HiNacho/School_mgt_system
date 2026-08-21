// Bank Account Resolution & Auto-Detection API
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import {
  resolveBankAccount,
  autoDetectBankAccount,
} from '@/lib/payments/flutterwave.service';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req);

    const body = await req.json();
    const { accountNumber, bankCode, autoDetect } = body;

    if (!accountNumber || accountNumber.replace(/[^0-9]/g, '').length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit account number is required' }, { status: 400 });
    }

    if (autoDetect || !bankCode || bankCode === 'AUTO') {
      const detected = await autoDetectBankAccount(accountNumber);
      return NextResponse.json({
        success: true,
        autoDetected: true,
        data: detected,
      });
    } else {
      const resolved = await resolveBankAccount(accountNumber, bankCode);
      return NextResponse.json({
        success: true,
        autoDetected: false,
        data: {
          accountNumber: resolved.accountNumber,
          accountName: resolved.accountName,
          bankCode,
        },
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Account resolution failed' }, { status: 400 });
  }
}
