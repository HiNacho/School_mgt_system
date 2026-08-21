// Flutterwave Webhook Processing Endpoint with Idempotency & Signature Verification
import { NextRequest, NextResponse } from 'next/server';
import { processFlutterwaveWebhook } from '@/lib/payments/webhook.service';

export async function POST(req: NextRequest) {
  try {
    const signatureHeader = req.headers.get('verif-hash') || req.headers.get('x-flutterwave-signature');
    const body = await req.json();

    const result = await processFlutterwaveWebhook(signatureHeader, body);

    return NextResponse.json({
      status: 'success',
      data: result,
    }, { status: 200 });

  } catch (error: any) {
    console.error('Flutterwave Webhook Endpoint Error:', error);
    // Return 200 if signature missing or invalid to avoid FLW retry loop on junk, or 400 if validation error
    return NextResponse.json({
      status: 'error',
      message: error.message || 'Webhook processing failed',
    }, { status: 400 });
  }
}
