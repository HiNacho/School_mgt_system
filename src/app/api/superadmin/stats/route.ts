import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';

export async function GET(req: NextRequest) {
  try {
    // 1. Enforce Super Admin auth scope
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    // 2. Fetch schools with aggregates
    const schools = await prisma.school.findMany({
      where: {
        NOT: { slug: 'system-portal' }
      },
      include: {
        _count: {
          select: {
            students: true,
            users: true,
            parents: true,
            scores: true,
            attendance: true
          }
        },
        payments: true,
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // 3. Fetch leads and feedback
    const leads = await prisma.lead.findMany({
      include: {
        feedback: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Fetch platform usage logs
    const usageLogs = await prisma.usageLog.findMany({
      include: {
        school: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    // 5. Fetch recent audit logs
    const auditLogs = await prisma.loginAuditLog.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            school: { select: { name: true } }
          }
        }
      },
      orderBy: { loginTime: 'desc' },
      take: 50
    });

    // 6. Calculate Billing aggregates
    const payments = await prisma.payment.findMany({
      include: {
        school: { select: { name: true } }
      },
      orderBy: { paymentDate: 'desc' }
    });

    const totalPaidRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    // Monthly recurring revenue (MRR) - estimate based on active subscription plans
    let calculatedMRR = 0;
    schools.forEach(s => {
      if (s.subscriptionStatus === 'active') {
        if (s.subscriptionPlan.toLowerCase().includes('premium')) {
          calculatedMRR += 150; // Premium plan hypothetical MRR
        } else if (s.subscriptionPlan.toLowerCase().includes('standard')) {
          calculatedMRR += 80;  // Standard plan hypothetical MRR
        } else {
          calculatedMRR += 40;  // Basic plan hypothetical MRR
        }
      }
    });

    // Compute School health score registry
    const computedSchools = schools.map(s => {
      const activeLog = s.usageLogs[0];
      const paymentsSum = s.payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      // Objective Health Score computation weights
      let score = 30; // base value
      if (s.subscriptionStatus === 'active') score += 30;
      else if (s.subscriptionStatus === 'trial') score += 20;
      else score -= 15;

      const studCount = s._count.students;
      if (studCount > 50) score += 20;
      else if (studCount > 10) score += 10;
      else score += 5;

      const recordCount = s._count.scores;
      if (recordCount > 100) score += 20;
      else if (recordCount > 0) score += 10;

      // Bound check
      const healthScore = Math.max(0, Math.min(100, score));

      // Recommendations
      let recommendation = 'School is healthy and engaging with features.';
      if (healthScore < 50) {
        recommendation = 'High risk of churn. Schedule immediate follow-up demo.';
      } else if (healthScore < 80) {
        recommendation = 'Low activity. Suggest training announcement broadcasts.';
      }

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        subscriptionPlan: s.subscriptionPlan,
        subscriptionStatus: s.subscriptionStatus,
        subscriptionStart: s.subscriptionStart,
        subscriptionEnd: s.subscriptionEnd,
        gracePeriodEnd: s.gracePeriodEnd,
        maxStudents: s.maxStudents,
        studentCount: studCount,
        staffCount: s._count.users,
        parentCount: s._count.parents,
        lastActivity: activeLog ? activeLog.createdAt : s.createdAt,
        totalRevenue: paymentsSum,
        healthScore,
        recommendation,
        autoRenew: true, // Mock default config
        dbSizeKB: Math.floor(15 + studCount * 0.4 + recordCount * 0.1),
        storageUsedMB: Math.floor(5 + studCount * 0.2)
      };
    });

    // Combine responses
    return NextResponse.json({
      success: true,
      stats: {
        totalRevenue: totalPaidRevenue,
        mrr: calculatedMRR,
        arr: calculatedMRR * 12,
        schoolCount: schools.length,
        activeSchools: schools.filter(s => s.subscriptionStatus === 'active').length,
        trialSchools: schools.filter(s => s.subscriptionStatus === 'trial').length,
        expiredSchools: schools.filter(s => s.subscriptionStatus === 'expired').length,
        suspendedSchools: schools.filter(s => s.subscriptionStatus === 'suspended').length,
        totalStudents: schools.reduce((sum, s) => sum + s._count.students, 0),
        totalStaff: schools.reduce((sum, s) => sum + s._count.users, 0),
        totalParents: schools.reduce((sum, s) => sum + s._count.parents, 0),
        demoRequests: leads.filter(l => l.leadStatus === 'DEMO_SENT' || l.leadStatus === 'TESTING').length,
        conversionRate: leads.length ? Math.floor((leads.filter(l => l.leadStatus === 'CUSTOMER').length / leads.length) * 100) : 0
      },
      schools: computedSchools,
      leads,
      usageLogs,
      auditLogs,
      payments
    });
  } catch (error: any) {
    console.error('Superadmin Stats GET Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
