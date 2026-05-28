import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch global usage trends and aggregates for central SaaS telemetry dashboard
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    const logs = await prisma.usageLog.findMany({
      where: schoolId ? { schoolId } : {},
      include: {
        school: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const formatted = logs.map(l => ({
      id: l.id,
      schoolId: l.schoolId,
      schoolName: l.school.name,
      activityType: l.activityType,
      createdAt: l.createdAt
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('UsageLog GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch platform usage analytics logs' }, { status: 500 });
  }
}

// 2. POST: Create a new usage logging trace from any platform event
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, activityType } = body;

    if (!schoolId || !activityType) {
      return NextResponse.json({ error: 'Missing required usage parameters (schoolId and activityType)' }, { status: 400 });
    }

    const log = await prisma.usageLog.create({
      data: {
        schoolId,
        activityType,
      }
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    console.error('UsageLog POST Error:', error);
    return NextResponse.json({ error: 'Failed to write engagement usage logs trace' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
