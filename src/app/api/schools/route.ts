// Schools/Tenants API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch all schools/tenants with aggregated counts and subscription status
export async function GET(req: NextRequest) {
  try {
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            students: true,
            users: true,
            scores: true,
          }
        },
        payments: true,
        usageLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    const formatted = schools.map(s => {
      const lastActiveLog = s.usageLogs[0];
      const totalPaid = s.payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + p.amount, 0);

      return {
        id: s.id,
        name: s.name,
        slug: s.slug,
        address: s.address || 'Not Provided',
        phone: s.phone || 'Not Provided',
        email: s.email || 'Not Provided',
        gradingType: s.gradingType,
        createdAt: s.createdAt,
        studentCount: s._count.students,
        staffCount: s._count.users,
        scoresRecorded: s._count.scores,
        subscriptionPlan: s.subscriptionPlan,
        subscriptionStatus: s.subscriptionStatus,
        subscriptionStart: s.subscriptionStart,
        subscriptionEnd: s.subscriptionEnd,
        gracePeriodEnd: s.gracePeriodEnd,
        totalRevenue: totalPaid,
        lastActive: lastActiveLog ? lastActiveLog.createdAt : null,
      };
    });

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Schools GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch school tenants' }, { status: 500 });
  }
}

// 2. POST: Register a new school tenant with default admin and trial subscription
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, slug, address, phone, email, gradingType } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'School Name and Unique URL Slug are required' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-');

    // Check if slug is unique
    const existing = await prisma.school.findUnique({
      where: { slug: cleanSlug },
    });

    if (existing) {
      return NextResponse.json({ error: 'A school with this unique URL slug already exists. Please choose another one.' }, { status: 400 });
    }

    const adminEmail = email ? email.toLowerCase().trim() : `admin@${cleanSlug}.com`;

    // Check if user email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingUser) {
      return NextResponse.json({ error: `An administrator account with email '${adminEmail}' already exists. Please use a unique school email.` }, { status: 400 });
    }

    const trialStart = new Date();
    const trialEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days trial
    const graceEnd = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);  // 14 days trial + 14 days grace

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the school tenant
      const school = await tx.school.create({
        data: {
          name,
          slug: cleanSlug,
          address: address || null,
          phone: phone || null,
          email: adminEmail,
          gradingType: gradingType || 'SECONDARY',
          subscriptionPlan: 'Basic',
          subscriptionStatus: 'trial',
          subscriptionStart: trialStart,
          subscriptionEnd: trialEnd,
          gracePeriodEnd: graceEnd,
          gradingRules: {
            create: gradingType === 'PRIMARY'
              ? [
                  { minScore: 80, maxScore: 100, grade: 'A', interpretation: 'Excellent' },
                  { minScore: 60, maxScore: 79.9, grade: 'B', interpretation: 'Good' },
                  { minScore: 40, maxScore: 59.9, grade: 'C', interpretation: 'Pass' },
                  { minScore: 0, maxScore: 39.9, grade: 'D', interpretation: 'Needs Improvement' },
                ]
              : [
                  { minScore: 75, maxScore: 100, grade: 'A1', interpretation: 'Excellent' },
                  { minScore: 70, maxScore: 74.9, grade: 'B2', interpretation: 'Very Good' },
                  { minScore: 65, maxScore: 69.9, grade: 'B3', interpretation: 'Good' },
                  { minScore: 60, maxScore: 64.9, grade: 'C4', interpretation: 'Credit' },
                  { minScore: 55, maxScore: 59.9, grade: 'C5', interpretation: 'Credit' },
                  { minScore: 50, maxScore: 54.9, grade: 'C6', interpretation: 'Credit' },
                  { minScore: 45, maxScore: 49.9, grade: 'D7', interpretation: 'Pass' },
                  { minScore: 40, maxScore: 44.9, grade: 'E8', interpretation: 'Pass' },
                  { minScore: 0, maxScore: 39.9, grade: 'F9', interpretation: 'Fail' },
                ]
          }
        }
      });

      // 2. Create the default school administrator user
      await tx.user.create({
        data: {
          schoolId: school.id,
          email: adminEmail,
          firstName: 'Principal',
          lastName: 'Admin',
          role: 'SCHOOL_ADMIN',
          passwordHash: 'password', // Default demo credentials
          status: 'ACTIVE'
        }
      });

      return school;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error('School POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create school tenant' }, { status: 500 });
  }
}

// 3. PATCH: Update school coordinates and subscription settings dynamically
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, name, address, phone, email, gradingType, logoUrl,
      subscriptionPlan, subscriptionStatus, subscriptionStart, subscriptionEnd, gracePeriodEnd
    } = body;

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const updated = await prisma.school.update({
      where: { id: schoolId },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        address: address !== undefined ? address.trim() : undefined,
        phone: phone !== undefined ? phone.trim() : undefined,
        email: email !== undefined ? email.toLowerCase().trim() : undefined,
        gradingType: gradingType !== undefined ? gradingType : undefined,
        logoUrl: logoUrl !== undefined ? logoUrl : undefined,
        subscriptionPlan: subscriptionPlan !== undefined ? subscriptionPlan : undefined,
        subscriptionStatus: subscriptionStatus !== undefined ? subscriptionStatus : undefined,
        subscriptionStart: subscriptionStart !== undefined ? (subscriptionStart ? new Date(subscriptionStart) : null) : undefined,
        subscriptionEnd: subscriptionEnd !== undefined ? (subscriptionEnd ? new Date(subscriptionEnd) : null) : undefined,
        gracePeriodEnd: gracePeriodEnd !== undefined ? (gracePeriodEnd ? new Date(gracePeriodEnd) : null) : undefined,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('School PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update school configurations' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
