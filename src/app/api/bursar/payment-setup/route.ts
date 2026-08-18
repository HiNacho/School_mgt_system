import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole, requireSchoolScope } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'HEAD_TEACHER']);

    const schoolId = session.schoolId;
    if (!schoolId && session.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'School ID context required' }, { status: 400 });
    }

    const targetSchoolId = schoolId || new URL(req.url).searchParams.get('schoolId');
    if (!targetSchoolId) {
      return NextResponse.json({ error: 'Missing target school ID' }, { status: 400 });
    }

    const school = await prisma.school.findUnique({
      where: { id: targetSchoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        flutterwaveSubaccountId: true,
        flutterwaveMerchantId: true,
        flutterwaveStatus: true,
        onlinePaymentsEnabled: true,
        allowPartialPayments: true,
        minPartialPaymentAmount: true,
        operonPlatformFeePercent: true,
      },
    });

    if (!school) {
      return NextResponse.json({ error: 'School not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: school });

  } catch (error: any) {
    console.error('Payment Setup GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch payment setup' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN']);

    const body = await req.json();
    const { 
      schoolId: requestedSchoolId, 
      flutterwaveSubaccountId, 
      flutterwaveMerchantId, 
      onlinePaymentsEnabled, 
      allowPartialPayments, 
      minPartialPaymentAmount,
      flutterwaveStatus
    } = body;

    const schoolId = session.schoolId || requestedSchoolId;
    if (!schoolId) {
      return NextResponse.json({ error: 'School ID required' }, { status: 400 });
    }

    if (session.schoolId) {
      requireSchoolScope(session, schoolId);
    }

    const updatedSchool = await prisma.school.update({
      where: { id: schoolId },
      data: {
        flutterwaveSubaccountId: flutterwaveSubaccountId !== undefined ? (flutterwaveSubaccountId ? flutterwaveSubaccountId.trim() : null) : undefined,
        flutterwaveMerchantId: flutterwaveMerchantId !== undefined ? (flutterwaveMerchantId ? flutterwaveMerchantId.trim() : null) : undefined,
        onlinePaymentsEnabled: onlinePaymentsEnabled !== undefined ? Boolean(onlinePaymentsEnabled) : undefined,
        allowPartialPayments: allowPartialPayments !== undefined ? Boolean(allowPartialPayments) : undefined,
        minPartialPaymentAmount: minPartialPaymentAmount !== undefined ? Number(minPartialPaymentAmount) : undefined,
        flutterwaveStatus: flutterwaveStatus !== undefined ? flutterwaveStatus : undefined,
      },
      select: {
        id: true,
        name: true,
        flutterwaveSubaccountId: true,
        flutterwaveMerchantId: true,
        flutterwaveStatus: true,
        onlinePaymentsEnabled: true,
        allowPartialPayments: true,
        minPartialPaymentAmount: true,
      },
    });

    // Record Financial Audit Log
    await prisma.financialAuditLog.create({
      data: {
        schoolId,
        userId: session.userId,
        role: session.role,
        action: 'PAYMENT_SETUP_UPDATED',
        details: `Updated online fee payment settings: Subaccount ID=${updatedSchool.flutterwaveSubaccountId || 'None'}, Status=${updatedSchool.flutterwaveStatus}, Enabled=${updatedSchool.onlinePaymentsEnabled}`,
      },
    });

    return NextResponse.json({ success: true, data: updatedSchool });

  } catch (error: any) {
    console.error('Payment Setup PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update payment setup' }, { status: 500 });
  }
}
