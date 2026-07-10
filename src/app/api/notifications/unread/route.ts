// Unread notifications and alerts quick count API
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'School ID and User ID are required' }, { status: 400 });
    }

    // 1. Fetch total count of unread received messages (announcements)
    const unreadMessagesCount = await prisma.messageRecipient.count({
      where: {
        recipientId: userId,
        isRead: false,
        message: {
          schoolId,
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date().toISOString() } }
          ]
        }
      }
    });

    // 2. Fetch the latest 5 unread received messages with sender details for bell drawer previews
    const latestUnreadMessages = await prisma.messageRecipient.findMany({
      where: {
        recipientId: userId,
        isRead: false,
        message: {
          schoolId,
          OR: [
            { scheduledFor: null },
            { scheduledFor: { lte: new Date().toISOString() } }
          ]
        }
      },
      include: {
        message: {
          include: {
            sender: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          }
        }
      },
      orderBy: {
        message: {
          createdAt: 'desc'
        }
      },
      take: 5
    });

    const mappedLatestMessages = latestUnreadMessages.map(rec => ({
      messageId: rec.messageId,
      title: rec.message.title,
      body: rec.message.body,
      messageType: rec.message.messageType,
      priority: rec.message.priority,
      createdAt: rec.message.createdAt,
      sender: rec.message.sender ? {
        firstName: rec.message.sender.firstName,
        lastName: rec.message.sender.lastName,
        role: rec.message.sender.role
      } : null,
      redirectUrl: '/dashboard/messages'
    }));

    // 3. Fetch unread system notifications (like report card approval notifications)
    const unreadSystemNotifications = await prisma.notification.findMany({
      where: {
        schoolId,
        userId,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    const unreadNotificationsCount = await prisma.notification.count({
      where: {
        schoolId,
        userId,
        isRead: false
      }
    });

    const mappedSystemNotifications = unreadSystemNotifications.map(n => ({
      messageId: n.id,
      title: 'Report Card Alert',
      body: n.message,
      messageType: 'ALERT',
      priority: 'HIGH',
      createdAt: n.createdAt,
      sender: {
        firstName: 'System',
        lastName: 'Alert',
        role: 'SYSTEM'
      },
      redirectUrl: '/dashboard/classes'
    }));

    // 4. Combine both arrays, sort by date descending, and limit to 5
    const combinedLatest = [...mappedLatestMessages, ...mappedSystemNotifications]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const totalUnreadCount = unreadMessagesCount + unreadNotificationsCount;

    return NextResponse.json({
      success: true,
      data: {
        unreadCount: totalUnreadCount,
        latest: combinedLatest
      }
    });

  } catch (error: any) {
    console.error('Unread Notifications GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve unread statistics' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
