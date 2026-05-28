import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch notifications for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where: {
        schoolId,
        userId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Compute unread count
    const unreadCount = await prisma.notification.count({
      where: {
        schoolId,
        userId,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        notifications,
        unreadCount
      }
    });
  } catch (error: any) {
    console.error('Notifications GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// 2. PATCH: Mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, userId, id } = body; // If id is provided, mark specific. Otherwise mark all for user.

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'Missing required validation parameters' }, { status: 400 });
    }

    if (id) {
      // Mark specific notification as read
      await prisma.notification.updateMany({
        where: {
          id,
          schoolId,
          userId
        },
        data: {
          isRead: true
        }
      });
    } else {
      // Mark all notifications as read for this user
      await prisma.notification.updateMany({
        where: {
          schoolId,
          userId,
          isRead: false
        },
        data: {
          isRead: true
        }
      });
    }

    return NextResponse.json({ success: true, message: 'Notification(s) updated successfully.' });
  } catch (error: any) {
    console.error('Notifications PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update notification state' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
