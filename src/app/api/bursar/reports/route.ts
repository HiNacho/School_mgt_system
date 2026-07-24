import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get('export'); // csv, excel or json

    // Dates setup
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);

    // 1. Fetch aggregates
    // Total revenue today
    const revenueToday = await prisma.studentPayment.aggregate({
      where: { schoolId, status: 'VERIFIED', deletedAt: null, paymentDate: { gte: todayStart } },
      _sum: { amount: true }
    });

    // Revenue this week
    const revenueWeek = await prisma.studentPayment.aggregate({
      where: { schoolId, status: 'VERIFIED', deletedAt: null, paymentDate: { gte: weekStart } },
      _sum: { amount: true }
    });

    // Revenue this month
    const revenueMonth = await prisma.studentPayment.aggregate({
      where: { schoolId, status: 'VERIFIED', deletedAt: null, paymentDate: { gte: monthStart } },
      _sum: { amount: true }
    });

    // Revenue this session
    const currentSession = await prisma.academicSession.findFirst({
      where: { schoolId, isCurrent: true }
    });

    let revenueSessionVal = 0;
    if (currentSession) {
      const revenueSession = await prisma.studentPayment.aggregate({
        where: {
          schoolId,
          status: 'VERIFIED',
          deletedAt: null,
          invoice: { sessionId: currentSession.id }
        },
        _sum: { amount: true }
      });
      revenueSessionVal = revenueSession._sum.amount || 0;
    }

    // Outstanding fees (Total netAmount - paidAmount on active invoices)
    const activeInvoices = await prisma.invoice.findMany({
      where: { schoolId, deletedAt: null }
    });

    let outstandingFeesSum = 0;
    activeInvoices.forEach(inv => {
      const diff = inv.netAmount - inv.paidAmount;
      if (diff > 0) {
        outstandingFeesSum += diff;
      }
    });
    const studentsOwingCount = await prisma.student.count({
      where: { schoolId, feesPaid: false, status: 'ACTIVE' }
    });

    // Pending payment verifications
    const pendingVerifications = await prisma.studentPayment.count({
      where: { schoolId, status: 'PENDING', deletedAt: null }
    });

    // Scholarships awarded
    const totalScholarships = await prisma.invoice.aggregate({
      where: { schoolId, deletedAt: null },
      _sum: { scholarship: true }
    });

    // Total receipts
    const totalReceiptsCount = await prisma.studentPayment.count({
      where: { schoolId, status: 'VERIFIED', deletedAt: null }
    });

    // 2. Interactive Charts analytics
    // Payment method distribution
    const paymentsRaw = await prisma.studentPayment.findMany({
      where: { schoolId, status: 'VERIFIED', deletedAt: null }
    });

    const paymentMethodStats: Record<string, number> = {
      FLUTTERWAVE: 0,
      BANK_TRANSFER: 0,
      CASH: 0,
      POS: 0,
      CHEQUE: 0
    };

    paymentsRaw.forEach(p => {
      const m = p.paymentMethod.toUpperCase().replace(' ', '_');
      if (m in paymentMethodStats) {
        paymentMethodStats[m] += p.amount;
      } else {
        paymentMethodStats.CASH += p.amount; // default fallback
      }
    });

    // Payment status chart distribution
    const statusStats = {
      paid: activeInvoices.filter(i => i.status === 'PAID').length,
      partiallyPaid: activeInvoices.filter(i => i.status === 'PARTIALLY_PAID').length,
      outstanding: activeInvoices.filter(i => i.status === 'OUTSTANDING').length,
      scholarship: activeInvoices.filter(i => i.status === 'SCHOLARSHIP' || i.scholarship > 0).length,
      exempted: activeInvoices.filter(i => i.status === 'EXEMPTED').length
    };

    // Outstanding fees by Class
    const classes = await prisma.class.findMany({
      where: { schoolId },
      include: { students: { include: { invoices: { where: { deletedAt: null } } } } }
    });

    const classOutstandingReport = classes.map(cls => {
      let owed = 0;
      cls.students.forEach(stud => {
        stud.invoices.forEach(inv => {
          const diff = inv.netAmount - inv.paidAmount;
          if (diff > 0) owed += diff;
        });
      });
      return {
        className: cls.name,
        outstanding: owed
      };
    });

    const reportData = {
      kpis: {
        revenueToday: revenueToday._sum.amount || 0,
        revenueWeek: revenueWeek._sum.amount || 0,
        revenueMonth: revenueMonth._sum.amount || 0,
        revenueSession: revenueSessionVal,
        outstandingFees: outstandingFeesSum,
        studentsOwing: studentsOwingCount,
        pendingVerifications,
        scholarshipsAwarded: totalScholarships._sum.scholarship || 0,
        totalReceipts: totalReceiptsCount
      },
      charts: {
        paymentMethods: paymentMethodStats,
        paymentStatus: statusStats,
        classOutstanding: classOutstandingReport
      }
    };

    // If CSV export is requested, format and return CSV
    if (exportType === 'csv') {
      let csvContent = 'Metric,Amount/Count\n';
      csvContent += `Total Revenue Today,₦${reportData.kpis.revenueToday.toLocaleString()}\n`;
      csvContent += `Total Revenue This Week,₦${reportData.kpis.revenueWeek.toLocaleString()}\n`;
      csvContent += `Total Revenue This Month,₦${reportData.kpis.revenueMonth.toLocaleString()}\n`;
      csvContent += `Total Revenue This Session,₦${reportData.kpis.revenueSession.toLocaleString()}\n`;
      csvContent += `Outstanding Fees,₦${reportData.kpis.outstandingFees.toLocaleString()}\n`;
      csvContent += `Students Owing Dues,${reportData.kpis.studentsOwing}\n`;
      csvContent += `Pending Verifications,${reportData.kpis.pendingVerifications}\n`;
      csvContent += `Scholarships Awarded,₦${reportData.kpis.scholarshipsAwarded.toLocaleString()}\n`;
      csvContent += `Total Receipts Issued,${reportData.kpis.totalReceipts}\n\n`;

      csvContent += 'Class,Outstanding Debt\n';
      classOutstandingReport.forEach(c => {
        csvContent += `"${c.className}",₦${c.outstanding.toLocaleString()}\n`;
      });

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename=school_financial_report.csv'
        }
      });
    }

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
