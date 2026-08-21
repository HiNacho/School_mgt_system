// School Payment Account Onboarding API (Flutterwave Subaccount)
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireSchoolScope } from '@/lib/auth-middleware';
import {
  onboardSchoolSubaccount,
  updateSchoolSettlementAccount,
} from '@/lib/payments/subaccount.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { schoolId } = await params;

    requireSchoolScope(session, schoolId);

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        flutterwaveSubaccountId: true,
        flutterwaveStatus: true,
        flutterwaveBankCode: true,
        flutterwaveAccountName: true,
        flutterwaveAccountNumberLast4: true,
        paymentOnboardingStatus: true,
        paymentOnboardingCompletedAt: true,
        onlinePaymentsEnabled: true,
        allowPartialPayments: true,
        minPartialPaymentAmount: true,
        platformFeeType: true,
        platformFeeValue: true,
        operonPlatformFeePercent: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: school,
    });
  } catch (error: any) {
    console.error('Payment Account GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch payment account' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { schoolId } = await params;

    requireSchoolScope(session, schoolId);

    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized to configure payment accounts' }, { status: 403 });
    }

    const body = await req.json();
    const { accountBank, accountNumber, businessName, businessEmail, businessMobile } = body;

    if (!accountBank || !accountNumber || accountNumber.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit account number and bank code are required' }, { status: 400 });
    }

    const updatedSchool = await onboardSchoolSubaccount({
      schoolId,
      accountBank,
      accountNumber,
      businessName,
      businessEmail,
      businessContactMobile: businessMobile,
      actorId: session.userId,
      actorRole: session.role,
    });

    return NextResponse.json({
      success: true,
      message: 'Flutterwave payment subaccount successfully created and activated.',
      data: {
        subaccountId: updatedSchool.flutterwaveSubaccountId,
        status: updatedSchool.flutterwaveStatus,
        accountName: updatedSchool.flutterwaveAccountName,
        accountNumberLast4: updatedSchool.flutterwaveAccountNumberLast4,
        bankCode: updatedSchool.flutterwaveBankCode,
      },
    });
  } catch (error: any) {
    console.error('Payment Account Onboarding Error:', error);
    return NextResponse.json({ error: error.message || 'Subaccount onboarding failed' }, { status: 400 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  try {
    const session = await requireAuth(req);
    const { schoolId } = await params;

    requireSchoolScope(session, schoolId);

    if (!['SUPER_ADMIN', 'SCHOOL_ADMIN'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized to update settlement account' }, { status: 403 });
    }

    const body = await req.json();
    const { accountBank, accountNumber, businessName, businessEmail, onlinePaymentsEnabled, allowPartialPayments, minPartialPaymentAmount } = body;

    let updatedSchool;
    if (accountBank && accountNumber) {
      updatedSchool = await updateSchoolSettlementAccount({
        schoolId,
        accountBank,
        accountNumber,
        businessName,
        businessEmail,
        actorId: session.userId,
        actorRole: session.role,
      });
    }

    if (onlinePaymentsEnabled !== undefined || allowPartialPayments !== undefined || minPartialPaymentAmount !== undefined) {
      updatedSchool = await prisma.school.update({
        where: { id: schoolId },
        data: {
          onlinePaymentsEnabled: onlinePaymentsEnabled !== undefined ? Boolean(onlinePaymentsEnabled) : undefined,
          allowPartialPayments: allowPartialPayments !== undefined ? Boolean(allowPartialPayments) : undefined,
          minPartialPaymentAmount: minPartialPaymentAmount !== undefined ? Number(minPartialPaymentAmount) : undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Payment configuration updated successfully.',
      data: updatedSchool,
    });
  } catch (error: any) {
    console.error('Payment Account Update Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update payment settings' }, { status: 400 });
  }
}
