import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, featureCode } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    // Try to find the matching TesterActivity by userId
    const activity = await prisma.testerActivity.findUnique({
      where: { userId },
    });

    if (!activity) {
      // If user is not linked to a tester activity, return 200 silently (since it's a live customer/admin)
      return NextResponse.json({ success: true, message: 'Not a tester user. Telemetry skipped.' });
    }

    let updateData: any = {};

    if (action === 'login') {
      updateData = {
        loginCount: { increment: 1 },
        lastLogin: new Date(),
      };
    } else if (action === 'heartbeat') {
      // Each heartbeat increments timeSpent by 15 seconds
      updateData = {
        timeSpent: { increment: 15 },
      };
    } else if (action === 'report_generated') {
      updateData = {
        reportCardsGeneratedCount: { increment: 1 },
      };
    } else if (action === 'attendance_marked') {
      updateData = {
        attendanceSessionsCount: { increment: 1 },
      };
    } else if (action === 'results_viewed') {
      updateData = {
        resultsViewedCount: { increment: 1 },
      };
    }

    // Append featureCode if provided and not already in featuresVisited list
    if (featureCode) {
      const currentFeatures = activity.featuresVisited
        ? activity.featuresVisited.split(',').map(f => f.trim())
        : [];
      
      if (!currentFeatures.includes(featureCode)) {
        currentFeatures.push(featureCode);
        updateData.featuresVisited = currentFeatures.join(', ');
      }
    }

    // Update TesterActivity
    const updatedActivity = await prisma.testerActivity.update({
      where: { id: activity.id },
      data: updateData,
    });

    // Also update lead status to 'TESTING' if it was 'DEMO_SENT' or 'NEW'
    const lead = await prisma.lead.findUnique({
      where: { id: activity.leadId }
    });
    if (lead && (lead.leadStatus === 'NEW' || lead.leadStatus === 'DEMO_SENT' || lead.leadStatus === 'CONTACTED')) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { leadStatus: 'TESTING' }
      });
    }

    return NextResponse.json({ success: true, data: updatedActivity });

  } catch (error: any) {
    console.error('Tester Telemetry Tracking Error:', error);
    return NextResponse.json({ error: 'Server error processing telemetry.' }, { status: 500 });
  }
}
