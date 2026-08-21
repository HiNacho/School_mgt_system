// Flutterwave API v3 Low-level Service Client
import crypto from 'crypto';

function getSecretKey(): string {
  return (process.env.FLW_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY || '').trim();
}
function getPublicKey(): string {
  return (process.env.FLW_PUBLIC_KEY || process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || '').trim();
}
function getSecretHash(): string {
  return (process.env.FLW_SECRET_HASH || process.env.FLUTTERWAVE_WEBHOOK_SECRET || 'OPERON_FLW_WEBHOOK_SECRET_KEY').trim();
}
const FLW_BASE_URL = (process.env.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3').trim();

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
  platformFeeAmount?: number;
  meta?: Record<string, any>;
}

export interface CreateSubaccountParams {
  account_bank: string;
  account_number: string;
  business_name: string;
  business_email: string;
  business_contact?: string;
  business_contact_mobile?: string;
  business_mobile?: string;
  country?: string;
  split_type?: 'flat' | 'percentage';
  split_value?: number;
}

const DEFAULT_NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '035', name: 'Wema Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '215', name: 'Unity Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '100033', name: 'PalmPay' },
  { code: '090405', name: 'PalmPay MFB' },
  { code: '100004', name: 'OPay Digital Services' },
  { code: '090325', name: 'OPay' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '090129', name: 'Moniepoint Microfinance Bank' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '566', name: 'VFD Microfinance Bank' },
  { code: '090110', name: 'VFD MFB' },
];

export async function getFlutterwaveBanks(country: string = 'NG') {
  if (!getSecretKey()) return DEFAULT_NIGERIAN_BANKS;
  try {
    const response = await fetch(`${FLW_BASE_URL}/banks/${country}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getSecretKey()}`,
      },
    });
    const json = await response.json();
    if (response.ok && json.status === 'success' && Array.isArray(json.data)) {
      return json.data.map((b: any) => ({
        code: String(b.code),
        name: b.name,
      }));
    }
  } catch (e) {
    console.warn('Failed to fetch live banks from Flutterwave:', e);
  }
  return DEFAULT_NIGERIAN_BANKS;
}

export async function resolveBankAccount(accountNumber: string, bankCode: string) {
  const secretKey = getSecretKey();
  if (!secretKey) {
    throw new Error('Flutterwave Secret Key is not configured on server.');
  }

  const cleanAccountNumber = accountNumber.replace(/[^0-9]/g, '').trim();
  const cleanBankCode = String(bankCode).trim();

  const response = await fetch(`${FLW_BASE_URL}/accounts/resolve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secretKey}`,
    },
    body: JSON.stringify({
      account_number: cleanAccountNumber,
      account_bank: cleanBankCode,
    }),
  });

  const json = await response.json();
  if (!response.ok || json.status !== 'success') {
    console.error('[Flutterwave Resolve Error]', {
      cleanAccountNumber,
      cleanBankCode,
      httpStatus: response.status,
      json,
      keyPrefix: secretKey.slice(0, 12),
    });

    const rawMsg = (json.message || '').toLowerCase();
    const isTestKey = secretKey.includes('TEST');

    if (rawMsg.includes('invalid account')) {
      if (isTestKey) {
        throw new Error(
          'Flutterwave is currently in TEST MODE (FLWSECK_TEST). Real live bank account numbers return "invalid account" in test mode. For test verification, use GTBank NUBAN 0690000032. For live school accounts, set FLW_SECRET_KEY to your Flutterwave Live Secret Key (FLWSECK-...).'
        );
      } else {
        throw new Error(
          'Invalid account details. Flutterwave could not verify this 10-digit account number with the selected bank. Please double-check the account number or select the correct bank.'
        );
      }
    }

    throw new Error(json.message || 'Bank account verification failed. Please check the account number and bank code.');
  }

  return {
    accountNumber: json.data.account_number as string,
    accountName: json.data.account_name as string,
  };
}

export async function createFlutterwaveSubaccount(params: CreateSubaccountParams) {
  if (!getSecretKey()) {
    throw new Error('Flutterwave Secret Key is not configured on server.');
  }

  const payload = {
    account_bank: params.account_bank,
    account_number: params.account_number,
    business_name: params.business_name,
    business_email: params.business_email,
    business_contact: params.business_contact || params.business_name,
    business_contact_mobile: params.business_contact_mobile || params.business_mobile || '08000000000',
    business_mobile: params.business_mobile || '08000000000',
    country: params.country || 'NG',
    split_type: params.split_type || 'percentage',
    split_value: params.split_value || 0,
  };

  const response = await fetch(`${FLW_BASE_URL}/subaccounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSecretKey()}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok || json.status !== 'success') {
    console.error('[Flutterwave Subaccount Creation Error]', json);
    throw new Error(json.message || 'Failed to create Flutterwave subaccount.');
  }

  return {
    subaccountId: json.data.subaccount_id as string,
    id: json.data.id as number,
    accountNumber: json.data.account_number as string,
    bankCode: json.data.account_bank as string,
    bankName: json.data.bank_name as string,
    fullName: json.data.full_name as string,
    raw: json.data,
  };
}

export async function updateFlutterwaveSubaccount(subaccountId: string, params: Partial<CreateSubaccountParams>) {
  if (!getSecretKey()) {
    throw new Error('Flutterwave Secret Key is not configured on server.');
  }

  const response = await fetch(`${FLW_BASE_URL}/subaccounts/${subaccountId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSecretKey()}`,
    },
    body: JSON.stringify(params),
  });

  const json = await response.json();
  if (!response.ok || json.status !== 'success') {
    console.error('[Flutterwave Subaccount Update Error]', json);
    throw new Error(json.message || 'Failed to update Flutterwave subaccount.');
  }

  return json.data;
}

export async function initializePaymentCheckout(params: InitializePaymentParams) {
  if (!getSecretKey()) {
    throw new Error('Flutterwave Secret Key (getSecretKey()) is not configured in server environment.');
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

  if (params.subaccountId) {
    payload.subaccounts = [
      {
        id: params.subaccountId,
        transaction_charge_type: 'flat_subaccount',
        transaction_charge: String(params.platformFeeAmount || 0),
      }
    ];
  }

  const response = await fetch(`${FLW_BASE_URL}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSecretKey()}`,
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
  if (!getSecretKey()) {
    throw new Error('Flutterwave Secret Key is not configured.');
  }

  const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/verify`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSecretKey()}`,
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
    app_fee: json.data.app_fee || 0,
    merchant_fee: json.data.merchant_fee || 0,
    customer: json.data.customer,
    subaccounts: json.data.subaccounts,
    raw: json.data,
  };
}

export async function initiateFlutterwaveRefund(transactionId: string, amount?: number) {
  if (!getSecretKey()) {
    throw new Error('Flutterwave Secret Key is not configured.');
  }

  const bodyPayload: any = {};
  if (amount && amount > 0) bodyPayload.amount = amount;

  const response = await fetch(`${FLW_BASE_URL}/transactions/${transactionId}/refund`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getSecretKey()}`,
    },
    body: JSON.stringify(bodyPayload),
  });

  const json = await response.json();
  if (!response.ok || json.status !== 'success') {
    console.error('[Flutterwave Refund Error]', json);
    throw new Error(json.message || 'Failed to process refund with Flutterwave');
  }

  return {
    refundId: json.data.id,
    amount: json.data.amount_refunded,
    status: json.data.status,
    raw: json.data,
  };
}

export function verifyWebhookSignature(signatureHeader: string | null): boolean {
  const secretHash = getSecretHash();
  if (!signatureHeader || !secretHash) return false;
  return signatureHeader === secretHash;
}
