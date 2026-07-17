import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Fetch schools with active/trial subscriptions
    const schools = await prisma.school.findMany({
      where: {
        subscriptionStatus: { in: ['active', 'trial'] },
        subscriptionEnd: { not: null }
      }
    });

    const processedLogs: string[] = [];
    let sentCount = 0;

    for (const school of schools) {
      if (!school.subscriptionEnd) continue;

      const expiry = new Date(school.subscriptionEnd);
      expiry.setHours(0, 0, 0, 0);

      const diffTime = expiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Check if diffDays matches 10, 5, or 1
      if (diffDays === 10 || diffDays === 5 || diffDays === 1) {
        // Prevent duplicate alerts sent on the same calendar day (checks past 24 hours)
        const alreadySent = await prisma.message.findFirst({
          where: {
            schoolId: school.id,
            title: `Subscription Renewal Warning: ${diffDays} Day(s) Left`,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
          }
        });

        if (alreadySent) {
          processedLogs.push(`Alert for school '${school.name}' (${diffDays} days left) already dispatched within past 24h. Skipping.`);
          continue;
        }

        // Get active school administrators
        const admins = await prisma.user.findMany({
          where: {
            schoolId: school.id,
            role: 'SCHOOL_ADMIN',
            status: 'ACTIVE'
          },
          select: { id: true }
        });

        if (admins.length === 0) {
          processedLogs.push(`No active administrators found for school '${school.name}'. Skipping.`);
          continue;
        }

        // Create Automated Alert Message
        const message = await prisma.message.create({
          data: {
            schoolId: school.id,
            senderId: null, // System automated sender
            title: `Subscription Renewal Warning: ${diffDays} Day(s) Left`,
            body: `Dear School Administration,\n\nThis is an automated notification that your school's Antigravity Portal subscription expires in ${diffDays} day(s) on ${expiry.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.\n\nPlease navigate to the Billing & Subscription portal to process your renewal and avoid any service interruptions for your staff, teachers, and parents.\n\nBest regards,\nAntigravity Accounts Team`,
            messageType: 'AUTOMATED',
            targetAudience: 'ALL',
            priority: 'HIGH'
          }
        });

        // Add recipients
        for (const admin of admins) {
          await prisma.messageRecipient.create({
            data: {
              messageId: message.id,
              recipientId: admin.id
            }
          });
          sentCount++;
        }

        processedLogs.push(`Dispatched automated reminder warning (${diffDays} days left) to school '${school.name}' (${admins.length} admins).`);
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      schoolsChecked: schools.length,
      alertsDispatched: sentCount,
      logs: processedLogs
    });

  } catch (error: any) {
    console.error('Subscription Reminder Engine Error:', error);
    return NextResponse.json({ error: `Reminders check failed: ${error.message || error}` }, { status: 500 });
  }
}
