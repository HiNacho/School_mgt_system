// Configurable Platform Commission Calculation Engine
export interface CommissionSplitResult {
  grossAmount: number;
  platformFee: number;
  schoolAmount: number;
  feeType: 'PERCENTAGE' | 'FIXED';
  feeValue: number;
}

export function calculatePaymentSplit(
  grossAmount: number,
  schoolConfig: {
    platformFeeType?: string | null;
    platformFeeValue?: number | null;
    operonPlatformFeePercent?: number | null;
  }
): CommissionSplitResult {
  const amount = Number(grossAmount) || 0;
  if (amount <= 0) {
    return {
      grossAmount: 0,
      platformFee: 0,
      schoolAmount: 0,
      feeType: 'PERCENTAGE',
      feeValue: 0,
    };
  }

  let feeType: 'PERCENTAGE' | 'FIXED' = 'PERCENTAGE';
  let feeValue = 0;

  if (schoolConfig.platformFeeType === 'FIXED') {
    feeType = 'FIXED';
    feeValue = Number(schoolConfig.platformFeeValue) || 0;
  } else {
    feeType = 'PERCENTAGE';
    feeValue = Number(schoolConfig.platformFeeValue) || Number(schoolConfig.operonPlatformFeePercent) || 0;
  }

  let platformFee = 0;
  if (feeType === 'FIXED') {
    platformFee = Math.min(amount, Math.max(0, feeValue));
  } else {
    // Percentage fee e.g. 1.5 => 1.5%
    const rate = Math.max(0, feeValue) / 100;
    platformFee = amount * rate;
  }

  // Round monetary values to 2 decimal places cleanly
  platformFee = Math.round(platformFee * 100) / 100;
  const schoolAmount = Math.max(0, Math.round((amount - platformFee) * 100) / 100);

  return {
    grossAmount: amount,
    platformFee,
    schoolAmount,
    feeType,
    feeValue,
  };
}
