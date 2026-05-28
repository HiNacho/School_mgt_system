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

    // 1. Fetch total count of unread received messages
    const unreadCount = await prisma.messageRecipient.count({
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
    const latestUnread = await prisma.messageRecipient.findMany({
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

    const mappedLatest = latestUnread.map(rec => ({
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
      } : null
    }));

    return NextResponse.json({
      success: true,
      data: {
        unreadCount,
        latest: mappedLatest
      }
    });

  } catch (error: any) {
    console.error('Unread Notifications GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve unread statistics' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
