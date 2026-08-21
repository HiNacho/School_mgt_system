// Super Admin SaaS Platform Payment & Financial Visibility API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');

    // 1. Aggregate SaaS-wide Financial Totals
    const [
      schoolsCount,
      activeSubaccountsCount,
      paymentMetrics,
      refundMetrics,
      schoolPerformance,
      disputes,
      recentTransactions,
    ] = await Promise.all([
      prisma.school.count(),

      prisma.school.count({
        where: { flutterwaveStatus: 'ACTIVE', flutterwaveSubaccountId: { not: null } },
      }),

      prisma.studentPayment.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _sum: { amount: true, grossAmount: true, platformFee: true, schoolAmount: true },
        _count: { id: true },
      }),

      prisma.schoolFeeRefund.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.school.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          flutterwaveStatus: true,
          flutterwaveSubaccountId: true,
          flutterwaveBankCode: true,
          flutterwaveAccountName: true,
          flutterwaveAccountNumberLast4: true,
          platformFeeType: true,
          platformFeeValue: true,
          operonPlatformFeePercent: true,
          _count: { select: { studentPayments: true, students: true } },
        },
        orderBy: { name: 'asc' },
      }),

      prisma.paymentDispute.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: { school: { select: { name: true } } },
      }),

      prisma.studentPayment.findMany({
        take: 50,
        where: {
          deletedAt: null,
          ...(status && status !== 'ALL' ? { status } : {}),
          ...(search ? {
            OR: [
              { receiptNumber: { contains: search, mode: 'insensitive' } },
              { referenceNumber: { contains: search, mode: 'insensitive' } },
              { school: { name: { contains: search, mode: 'insensitive' } } },
            ],
          } : {}),
        },
        include: {
          school: { select: { name: true, slug: true } },
          student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        },
        orderBy: { paymentDate: 'desc' },
      }),
    ]);

    let totalVolume = 0;
    let totalPlatformCommission = 0;
    let successfulCount = 0;
    let failedCount = 0;
    let pendingCount = 0;

    for (const p of paymentMetrics) {
      if (['VERIFIED', 'SUCCESSFUL'].includes(p.status)) {
        totalVolume += p._sum.grossAmount || p._sum.amount || 0;
        totalPlatformCommission += p._sum.platformFee || 0;
        successfulCount += p._count.id || 0;
      } else if (['PENDING', 'PROCESSING', 'UNDER_REVIEW'].includes(p.status)) {
        pendingCount += p._count.id || 0;
      } else if (['FAILED', 'CANCELLED'].includes(p.status)) {
        failedCount += p._count.id || 0;
      }
    }

    // Attach transaction sum per school for performance ranking
    const schoolPerformanceDetailed = await Promise.all(
      schoolPerformance.map(async (s) => {
        const schoolSum = await prisma.studentPayment.aggregate({
          where: { schoolId: s.id, status: { in: ['VERIFIED', 'SUCCESSFUL'] }, deletedAt: null },
          _sum: { amount: true, grossAmount: true, platformFee: true, schoolAmount: true },
        });

        return {
          ...s,
          totalVolume: schoolSum._sum.grossAmount || schoolSum._sum.amount || 0,
          platformCommission: schoolSum._sum.platformFee || 0,
          schoolRevenue: schoolSum._sum.schoolAmount || schoolSum._sum.amount || 0,
        };
      })
    );

    // Sort schools by total volume descending
    schoolPerformanceDetailed.sort((a, b) => b.totalVolume - a.totalVolume);

    return NextResponse.json({
      success: true,
      summary: {
        totalVolume,
        totalPlatformCommission,
        totalSchools: schoolsCount,
        activeSubaccounts: activeSubaccountsCount,
        successfulTransactions: successfulCount,
        failedTransactions: failedCount,
        pendingTransactions: pendingCount,
        totalRefunds: refundMetrics._sum.amount || 0,
      },
      schools: schoolPerformanceDetailed,
      disputes,
      recentTransactions,
    });
  } catch (error: any) {
    console.error('Super Admin Payments API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch platform payment metrics' }, { status: 500 });
  }
}

// POST: Update platform commission settings globally or per school
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    const body = await req.json();
    const { schoolId, feeType, feeValue } = body;

    if (!feeType || feeValue === undefined || Number(feeValue) < 0) {
      return NextResponse.json({ error: 'Valid feeType (PERCENTAGE or FIXED) and non-negative feeValue are required' }, { status: 400 });
    }

    if (schoolId) {
      // Per-school override
      const updated = await prisma.school.update({
        where: { id: schoolId },
        data: {
          platformFeeType: feeType,
          platformFeeValue: Number(feeValue),
          operonPlatformFeePercent: feeType === 'PERCENTAGE' ? Number(feeValue) : 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Platform commission for ${updated.name} updated to ${feeType === 'PERCENTAGE' ? `${feeValue}%` : `₦${Number(feeValue).toLocaleString()}`}`,
        data: updated,
      });
    } else {
      // Global default update across schools that have no custom override
      await prisma.school.updateMany({
        data: {
          platformFeeType: feeType,
          platformFeeValue: Number(feeValue),
          operonPlatformFeePercent: feeType === 'PERCENTAGE' ? Number(feeValue) : 0,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Global platform commission policy updated to ${feeType === 'PERCENTAGE' ? `${feeValue}%` : `₦${Number(feeValue).toLocaleString()}`}`,
      });
    }
  } catch (error: any) {
    console.error('Super Admin Payment Policy POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update platform fee policy' }, { status: 500 });
  }
}
