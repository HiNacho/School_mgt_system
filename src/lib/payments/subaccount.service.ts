// Subaccount Onboarding & Settlement Account Management Service
import prisma from '@/lib/db';
import {
  resolveBankAccount,
  createFlutterwaveSubaccount,
  updateFlutterwaveSubaccount,
} from './flutterwave.service';

export interface OnboardSubaccountParams {
  schoolId: string;
  accountBank: string; // Bank code e.g. "058" for GTBank
  accountNumber: string;
  businessName: string;
  businessEmail: string;
  businessContactMobile?: string;
  actorId?: string;
  actorRole?: string;
}

export async function onboardSchoolSubaccount(params: OnboardSubaccountParams) {
  const school = await prisma.school.findUnique({
    where: { id: params.schoolId },
  });

  if (!school) {
    throw new Error('School tenant not found.');
  }

  // 1. Verify bank account via Flutterwave Bank Account Resolve API
  const resolved = await resolveBankAccount(params.accountNumber, params.accountBank);

  // 2. Create Flutterwave Subaccount
  const subaccount = await createFlutterwaveSubaccount({
    account_bank: params.accountBank,
    account_number: params.accountNumber,
    business_name: params.businessName || school.name,
    business_email: params.businessEmail || school.email || 'admin@school.local',
    business_contact_mobile: params.businessContactMobile || school.phone || '08000000000',
    split_type: 'flat',
    split_value: 0,
  });

  const last4 = params.accountNumber.slice(-4);

  // 3. Update School model with subaccount details
  const updatedSchool = await prisma.school.update({
    where: { id: params.schoolId },
    data: {
      flutterwaveSubaccountId: subaccount.subaccountId,
      flutterwaveStatus: 'ACTIVE',
      flutterwaveBankCode: params.accountBank,
      flutterwaveAccountName: resolved.accountName,
      flutterwaveAccountNumberLast4: last4,
      paymentOnboardingStatus: 'ACTIVE',
      paymentOnboardingCompletedAt: new Date(),
      onlinePaymentsEnabled: true,
    },
  });

  // 4. Audit Log
  await prisma.paymentAuditLog.create({
    data: {
      schoolId: params.schoolId,
      actorId: params.actorId || null,
      actorRole: params.actorRole || 'SCHOOL_ADMIN',
      action: 'SUBACCOUNT_CREATED',
      resourceType: 'SCHOOL',
      resourceId: params.schoolId,
      metadata: {
        subaccountId: subaccount.subaccountId,
        bankCode: params.accountBank,
        accountName: resolved.accountName,
        accountNumberLast4: last4,
      },
    },
  });

  return updatedSchool;
}

export async function updateSchoolSettlementAccount(params: OnboardSubaccountParams) {
  const school = await prisma.school.findUnique({
    where: { id: params.schoolId },
  });

  if (!school) {
    throw new Error('School tenant not found.');
  }

  // 1. Verify new bank account details
  const resolved = await resolveBankAccount(params.accountNumber, params.accountBank);

  const last4 = params.accountNumber.slice(-4);

  // 2. Update existing subaccount if present, or create new one
  if (school.flutterwaveSubaccountId) {
    try {
      await updateFlutterwaveSubaccount(school.flutterwaveSubaccountId, {
        account_bank: params.accountBank,
        account_number: params.accountNumber,
        business_name: params.businessName || school.name,
        business_email: params.businessEmail || school.email || 'admin@school.local',
      });
    } catch (err) {
      console.warn('Subaccount update failed, falling back to new subaccount creation:', err);
      const newSub = await createFlutterwaveSubaccount({
        account_bank: params.accountBank,
        account_number: params.accountNumber,
        business_name: params.businessName || school.name,
        business_email: params.businessEmail || school.email || 'admin@school.local',
      });
      school.flutterwaveSubaccountId = newSub.subaccountId;
    }
  } else {
    const newSub = await createFlutterwaveSubaccount({
      account_bank: params.accountBank,
      account_number: params.accountNumber,
      business_name: params.businessName || school.name,
      business_email: params.businessEmail || school.email || 'admin@school.local',
    });
    school.flutterwaveSubaccountId = newSub.subaccountId;
  }

  const updatedSchool = await prisma.school.update({
    where: { id: params.schoolId },
    data: {
      flutterwaveSubaccountId: school.flutterwaveSubaccountId,
      flutterwaveStatus: 'ACTIVE',
      flutterwaveBankCode: params.accountBank,
      flutterwaveAccountName: resolved.accountName,
      flutterwaveAccountNumberLast4: last4,
      paymentOnboardingStatus: 'ACTIVE',
      onlinePaymentsEnabled: true,
    },
  });

  await prisma.paymentAuditLog.create({
    data: {
      schoolId: params.schoolId,
      actorId: params.actorId || null,
      actorRole: params.actorRole || 'SCHOOL_ADMIN',
      action: 'SUBACCOUNT_UPDATED',
      resourceType: 'SCHOOL',
      resourceId: params.schoolId,
      metadata: {
        subaccountId: updatedSchool.flutterwaveSubaccountId,
        bankCode: params.accountBank,
        accountName: resolved.accountName,
        accountNumberLast4: last4,
      },
    },
  });

  return updatedSchool;
}
