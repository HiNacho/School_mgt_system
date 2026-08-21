// Webhook Processing & Idempotency Handler
import prisma from '@/lib/db';
import crypto from 'crypto';
import { verifyWebhookSignature } from './flutterwave.service';
import { processPaymentVerification } from './payment-verification.service';

export async function processFlutterwaveWebhook(
  signatureHeader: string | null,
  body: any
) {
  // 1. Authenticate webhook signature
  const isValidSignature = verifyWebhookSignature(signatureHeader);
  if (!isValidSignature) {
    throw new Error('Unauthorized webhook signature.');
  }

  const eventType = body.event || body['event.type'] || 'charge.completed';
  const data = body.data || body;

  const transactionId = String(data.id || data.transaction_id || '');
  const txRef = String(data.tx_ref || '');
  const eventId = String(body.id || data.id || `${txRef}-${data.status}`);

  if (!transactionId && !txRef) {
    return { status: 'IGNORED', message: 'No transaction ID or reference found in payload.' };
  }

  // 2. Idempotency Suppression via PaymentEvent Table
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(body))
    .digest('hex');

  const existingEvent = await prisma.paymentEvent.findUnique({
    where: { eventId },
  });

  if (existingEvent && existingEvent.processed) {
    return {
      status: 'IDEMPOTENT_SKIPPED',
      message: 'Event already processed successfully.',
      eventId,
    };
  }

  // Record pending event if not existing
  if (!existingEvent) {
    try {
      await prisma.paymentEvent.create({
        data: {
          provider: 'FLUTTERWAVE',
          eventId,
          transactionId,
          eventType,
          payloadHash,
          processed: false,
        },
      });
    } catch (createErr) {
      // Handles race condition where duplicate payload arrives concurrently
      return {
        status: 'IDEMPOTENT_SKIPPED',
        message: 'Concurrent duplicate event suppressed.',
        eventId,
      };
    }
  }

  // 3. Process Transaction Verification & Invoice Settlement
  let result = null;
  try {
    result = await processPaymentVerification(transactionId, txRef);

    // Mark PaymentEvent as processed
    await prisma.paymentEvent.update({
      where: { eventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(`[Webhook Processing Error] EventId: ${eventId}`, err);
    throw err;
  }

  return {
    status: 'PROCESSED',
    eventId,
    result,
  };
}
