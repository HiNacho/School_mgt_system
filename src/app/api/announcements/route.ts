// School Announcements API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID parameter is required' }, { status: 400 });
    }

    const announcements = await prisma.announcement.findMany({
      where: { schoolId },
      orderBy: { date: 'desc' }
    });

    return NextResponse.json({ success: true, data: announcements });
  } catch (error: any) {
    console.error('Announcements GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch school announcements' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, title, content, date } = body;

    if (!schoolId || !title || !content || !date) {
      return NextResponse.json({ error: 'Missing required announcement fields' }, { status: 400 });
    }

    const announcement = await prisma.announcement.create({
      data: {
        schoolId,
        title: title.trim(),
        content: content.trim(),
        date
      }
    });

    return NextResponse.json({ success: true, data: announcement });
  } catch (error: any) {
    console.error('Announcements POST Error:', error);
    return NextResponse.json({ error: 'Failed to create announcement record' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    await prisma.announcement.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Announcement deleted successfully' });
  } catch (error: any) {
    console.error('Announcements DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to delete announcement record' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

