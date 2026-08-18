// Flutterwave SDK / REST API Client for School Fee Payments
import crypto from 'crypto';

const FLW_PUBLIC_KEY = process.env.FLW_PUBLIC_KEY || process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '';
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || '';
const FLW_SECRET_HASH = process.env.FLW_SECRET_HASH || 'OPERON_FLW_WEBHOOK_SECRET_KEY';

const FLW_BASE_URL = 'https://api.flutterwave.com/v3';

export interface InitializePaymentParams {
  tx_ref: string;
  amount: number;
  currency?: string;
  redirect_url: string;
  customer: {
    email: string;
    name: string;
    phonenumber?: string;
  };
  customizations: {
    title: string;
    description: string;
    logo?: string;
  };
  subaccountId?: string | null;
  platformFeePercent?: number; // E.g., 0 by default
  meta?: Record<string, any>;
}

export async function initializePaymentCheckout(params: InitializePaymentParams) {
  if (!FLW_SECRET_KEY) {
    throw new Error('Flutterwave Secret Key (FLW_SECRET_KEY) is not configured in server environment.');
  }

  const payload: any = {
    tx_ref: params.tx_ref,
    amount: params.amount,
    currency: params.currency || 'NGN',
    redirect_url: params.redirect_url,
    customer: {
      email: params.customer.email,
      name: params.customer.name,
      phonenumber: params.customer.phonenumber || '',
    },
    customizations: {
      title: params.customizations.title,
      description: params.customizations.description,
      logo: params.customizations.logo || '',
    },
    meta: params.meta || {},
  };

  // If school has an active Flutterwave Subaccount, attach subaccounts split
  if (params.subaccountId) {
    payload.subaccounts = [
      {
        id: params.subaccountId,
        transaction_charge_type: 'flat_subaccount',
        transaction_charge: '0',
      }
    ];
  }

  const response = await fetch(`${FLW_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FLW_SECRET_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();

  if (!response.ok || json.status !== 'success') {
    console.error('[Flutterwave Init Error]', json);
    throw new Error(json.message || 'Failed to initialize payment gateway link');
  }

  return {
    link: json.data.link as string,
    status: json.status as string,
    message: json.message as string,
  };
}

export async function verifyFlutterwaveTransaction(transactionId: string) {
  if (!FLW_SECRET_KEY) {
    throw new Error('Flutterwave Secret Key is not configured.');
  }

  const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FLW_SECRET_KEY}`,
    },
  });

  const json = await response.json();

  if (!response.ok || json.status !== 'success') {
    console.error('[Flutterwave Verify Error]', json);
    throw new Error(json.message || 'Failed to verify transaction with Flutterwave');
  }

  return {
    status: json.data.status, // "successful", "failed", etc.
    amount: json.data.amount,
    currency: json.data.currency,
    tx_ref: json.data.tx_ref,
    flw_ref: json.data.flw_ref,
    id: json.data.id,
    customer: json.data.customer,
    raw: json.data,
  };
}

export function verifyWebhookSignature(signatureHeader: string | null): boolean {
  if (!signatureHeader || !FLW_SECRET_HASH) return false;
  return signatureHeader === FLW_SECRET_HASH;
}
