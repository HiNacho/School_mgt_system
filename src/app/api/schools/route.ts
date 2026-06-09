// Schools/Tenants API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';

async function ensureSuperAdminExists() {
  const superAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' }
  });

  if (!superAdmin) {
    console.log('🛡️ Auto-initializing system-portal and Super Admin user...');
    let systemSchool = await prisma.school.findUnique({
      where: { slug: 'system-portal' }
    });

    if (!systemSchool) {
      systemSchool = await prisma.school.create({
        data: {
          name: 'System Administration Portal',
          slug: 'system-portal',
          address: 'System-wide Operations Boundary',
          phone: 'N/A',
          email: 'support@system.com',
          gradingType: 'SECONDARY',
          subscriptionPlan: 'Premium',
          subscriptionStatus: 'active'
        }
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password', salt);

    await prisma.user.create({
      data: {
        schoolId: systemSchool.id,
        email: 'superadmin@system.com',
        username: 'superadmin',
        passwordHash,
        firstName: 'System',
        lastName: 'Administrator',
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
    console.log('🛡️ Super Admin initialized successfully.');
  }
}

// 1. GET: Fetch all schools/tenants with aggregated counts and subscription status
export async function GET(req: NextRequest) {
  try {
    await ensureSuperAdminExists();

    const schools = await prisma.school.findMany({
      where: {
        NOT: { slug: 'system-portal' }
      },
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

    return NextResponse.json(
      { success: true, data: formatted },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        }
      }
    );
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

      // 2. Create default Academic Session & Terms
      const session = await tx.academicSession.create({
        data: {
          schoolId: school.id,
          name: '2025/2026',
          isCurrent: true,
        }
      });

      const termsList = ['First Term', 'Second Term', 'Third Term'];
      for (let i = 0; i < termsList.length; i++) {
        await tx.term.create({
          data: {
            schoolId: school.id,
            sessionId: session.id,
            name: termsList[i],
            isCurrent: i === 0, // First Term is current
          }
        });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password', salt);

      // 3. Create the default school administrator user
      await tx.user.create({
        data: {
          schoolId: school.id,
          email: adminEmail,
          username: adminEmail,
          firstName: 'Principal',
          lastName: 'Admin',
          role: 'SCHOOL_ADMIN',
          passwordHash, // Default demo credentials
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

// 4. DELETE: Delete a school tenant completely (cascading all associated tables)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    const schoolToDelete = await prisma.school.findUnique({
      where: { id: schoolId }
    });

    if (schoolToDelete?.slug === 'system-portal') {
      return NextResponse.json({ error: 'The System Administration Portal tenant cannot be deleted.' }, { status: 403 });
    }

    // Delete the school tenant and all associated records manually to guarantee cleanup
    // on databases without cascade constraints enabled.
    await prisma.$transaction(async (tx) => {
      // 1. Delete platform telemetry logs and payments
      await tx.usageLog.deleteMany({ where: { schoolId } });
      await tx.payment.deleteMany({ where: { schoolId } });

      // 2. Delete notifications and messages
      await tx.notification.deleteMany({ where: { schoolId } });
      await tx.messageRecipient.deleteMany({
        where: {
          OR: [
            { message: { schoolId } },
            { recipient: { schoolId } }
          ]
        }
      });
      await tx.message.deleteMany({ where: { schoolId } });

      // 3. Delete academic records and assignments
      await tx.scoreSubmission.deleteMany({ where: { schoolId } });
      await tx.subjectAssignment.deleteMany({ where: { schoolId } });
      await tx.score.deleteMany({ where: { schoolId } });
      await tx.reportCardComment.deleteMany({ where: { schoolId } });
      await tx.attendance.deleteMany({ where: { schoolId } });
      await tx.dailyAttendance.deleteMany({ where: { schoolId } });

      // 4. Delete sessions, terms, classes, arms, subjects, rules
      await tx.gradingRule.deleteMany({ where: { schoolId } });
      await tx.event.deleteMany({ where: { schoolId } });
      await tx.announcement.deleteMany({ where: { schoolId } });

      // 5. Delete users, students, parents (to avoid foreign key violations, clean up audit logs/users first)
      await tx.loginAuditLog.deleteMany({
        where: {
          user: { schoolId }
        }
      });
      await tx.user.deleteMany({ where: { schoolId } });
      await tx.student.deleteMany({ where: { schoolId } });
      await tx.parent.deleteMany({ where: { schoolId } });

      // 6. Delete structural components
      await tx.arm.deleteMany({ where: { schoolId } });
      await tx.class.deleteMany({ where: { schoolId } });
      await tx.subject.deleteMany({ where: { schoolId } });
      await tx.term.deleteMany({ where: { schoolId } });
      await tx.academicSession.deleteMany({ where: { schoolId } });

      // 7. Finally, delete the school itself
      await tx.school.delete({ where: { id: schoolId } });
    });

    return NextResponse.json({ 
      success: true, 
      message: 'School tenant and all associated academic records successfully deleted from platform isolation boundary.'
    });
  } catch (error: any) {
    console.error('School DELETE Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete school tenant' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
