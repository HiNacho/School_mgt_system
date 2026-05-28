// School Events API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    const events = await prisma.event.findMany({
      where: { schoolId },
      orderBy: { date: 'asc' }
    });

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    console.error('Events GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch school events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, title, description, date, time } = body;

    if (!schoolId || !title || !date || !time) {
      return NextResponse.json({ error: 'Missing required event fields' }, { status: 400 });
    }

    const event = await prisma.event.create({
      data: {
        schoolId,
        title: title.trim(),
        description: description?.trim() || null,
        date,
        time
      }
    });

    return NextResponse.json({ success: true, data: event });
  } catch (error: any) {
    console.error('Events POST Error:', error);
    return NextResponse.json({ error: 'Failed to create event record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 });
    }

    await prisma.event.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Events DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete event record' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

