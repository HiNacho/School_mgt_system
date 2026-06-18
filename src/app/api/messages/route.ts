// Message & Broadcast Feed API Endpoint
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// 1. GET: Fetch user's inbox or administrator's sent history with delivery stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const userId = searchParams.get('userId');
    const mode = searchParams.get('mode') || 'inbox'; // 'inbox' or 'sent'

    if (!schoolId || !userId) {
      return NextResponse.json({ error: 'School ID and User ID are required' }, { status: 400 });
    }

    if (mode === 'sent') {
      // Fetch announcements sent by this user
      const messages = await prisma.message.findMany({
        where: {
          schoolId,
          senderId: userId
        },
        include: {
          recipients: {
            select: {
              isRead: true,
              recipient: {
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
          createdAt: 'desc'
        }
      });

      // Calculate viewed percentages and smart delivery metrics
      const compiledMessages = messages.map(msg => {
        const total = msg.recipients.length;
        const readCount = msg.recipients.filter(r => r.isRead).length;
        const percentage = total > 0 ? Math.round((readCount / total) * 100) : 0;

        return {
          id: msg.id,
          title: msg.title,
          body: msg.body,
          messageType: msg.messageType,
          targetAudience: msg.targetAudience,
          priority: msg.priority,
          isPinned: msg.isPinned,
          scheduledFor: msg.scheduledFor,
          expiresAt: msg.expiresAt,
          createdAt: msg.createdAt,
          deliveryStats: {
            totalRecipients: total,
            readCount,
            viewedPercentage: percentage
          }
        };
      });

      return NextResponse.json({ success: true, data: compiledMessages });
    } else {
      // Fetch received announcements for this user's inbox
      const received = await prisma.messageRecipient.findMany({
        where: {
          recipientId: userId,
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
                  id: true,
                  firstName: true,
                  lastName: true,
                  role: true,
                  passportPhoto: true
                }
              }
            }
          }
        },
        orderBy: {
          message: {
            createdAt: 'desc'
          }
        }
      });

      const inbox = received.map(rec => ({
        id: rec.messageId,
        recipientRecordId: rec.id,
        isRead: rec.isRead,
        readAt: rec.readAt,
        messageId: rec.messageId,
        title: rec.message.title,
        body: rec.message.body,
        messageType: rec.message.messageType,
        targetAudience: rec.message.targetAudience,
        priority: rec.message.priority,
        isPinned: rec.message.isPinned,
        scheduledFor: rec.message.scheduledFor,
        expiresAt: rec.message.expiresAt,
        createdAt: rec.message.createdAt,
        sender: rec.message.sender ? {
          id: rec.message.sender.id,
          firstName: rec.message.sender.firstName,
          lastName: rec.message.sender.lastName,
          role: rec.message.sender.role,
          passportPhoto: rec.message.sender.passportPhoto
        } : null
      }));

      return NextResponse.json({ success: true, data: inbox });
    }
  } catch (error: any) {
    console.error('Messages GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve messages' }, { status: 500 });
  }
}

// 2. POST: Create broadcast message and map targeted recipients transactionally
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, senderId, title, body: msgBody, 
      messageType, targetAudience, priority, 
      classId, armId, isPinned, scheduledFor, expiresAt 
    } = body;

    if (!schoolId || !senderId || !title || !msgBody) {
      return NextResponse.json({ error: 'Missing required broadcast parameters' }, { status: 400 });
    }

    // A. Resolve recipient IDs based on target audience selectors
    let targetRecipientUserIds: string[] = [];

    if (targetAudience === 'TEACHERS') {
      // All teacher and administrative roles
      const teachers = await prisma.user.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          role: {
            in: ['SCHOOL_ADMIN', 'HEAD_TEACHER', 'CLASS_TEACHER', 'SUBJECT_TEACHER']
          },
          id: { not: senderId }
        },
        select: { id: true }
      });
      targetRecipientUserIds = teachers.map(t => t.id);
    } else if (targetAudience === 'STUDENTS') {
      // All student accounts (specifically users linked to active students)
      const students = await prisma.user.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          role: 'STUDENT',
          id: { not: senderId }
        },
        select: { id: true }
      });
      targetRecipientUserIds = students.map(s => s.id);
    } else if (targetAudience === 'PARENTS') {
      // All parent accounts
      const parents = await prisma.user.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          role: 'PARENT',
          id: { not: senderId }
        },
        select: { id: true }
      });
      targetRecipientUserIds = parents.map(p => p.id);
    } else if (targetAudience === 'UNPAID_PARENTS') {
      // Target only parents of children who have not paid school fees
      // Supports optional class and arm boundaries!
      const unpaidStudents = await prisma.student.findMany({
        where: {
          schoolId,
          feesPaid: false,
          status: 'ACTIVE',
          ...(classId ? { classId } : {}),
          ...(armId ? { armId } : {})
        },
        include: {
          parent: {
            include: {
              user: {
                select: { id: true }
              }
            }
          }
        }
      });

      const parentUserIds = unpaidStudents
        .map(s => s.parent?.user?.id)
        .filter((id): id is string => !!id && id !== senderId);

      targetRecipientUserIds = Array.from(new Set(parentUserIds));
    } else if (targetAudience === 'CLASS' && classId) {
      // All students registered inside this class cohort
      const studentsInClass = await prisma.student.findMany({
        where: {
          schoolId,
          classId,
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: { id: true }
          }
        }
      });
      
      // Extract their User account IDs
      targetRecipientUserIds = studentsInClass
        .map(s => s.user?.id)
        .filter((id): id is string => !!id && id !== senderId);
    } else if (targetAudience === 'ARM' && armId) {
      // All students registered inside this class arm division
      const studentsInArm = await prisma.student.findMany({
        where: {
          schoolId,
          armId,
          status: 'ACTIVE'
        },
        include: {
          user: {
            select: { id: true }
          }
        }
      });
      
      targetRecipientUserIds = studentsInArm
        .map(s => s.user?.id)
        .filter((id): id is string => !!id && id !== senderId);
    } else {
      // Default: ALL active school users except sender
      const allUsers = await prisma.user.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          id: { not: senderId }
        },
        select: { id: true }
      });
      targetRecipientUserIds = allUsers.map(u => u.id);
    }

    // B. Build the Message and Recipients transactionally
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create primary Message record
      const message = await tx.message.create({
        data: {
          schoolId,
          senderId,
          title,
          body: msgBody,
          messageType: messageType || 'ANNOUNCEMENT',
          targetAudience,
          priority: priority || 'NORMAL',
          isPinned: isPinned || false,
          scheduledFor: scheduledFor || null,
          expiresAt: expiresAt || null,
          classId: classId || null,
          armId: armId || null
        }
      });

      // 2. Bulk insert recipient mappings
      if (targetRecipientUserIds.length > 0) {
        const recipientData = targetRecipientUserIds.map(uid => ({
          messageId: message.id,
          recipientId: uid,
          isRead: false
        }));

        await tx.messageRecipient.createMany({
          data: recipientData
        });
      }

      return { message, recipientsCount: targetRecipientUserIds.length };
    });

    return NextResponse.json({ 
      success: true, 
      message: `Announcement broadcast successfully compiled and dispatched to ${result.recipientsCount} recipients!`,
      data: result.message
    });

  } catch (error: any) {
    console.error('Messages POST Error:', error);
    return NextResponse.json({ error: `Failed to dispatch broadcast announcement: ${error.message || error}` }, { status: 500 });
  }
}

// 3. PATCH: Mark dynamic received announcements/notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, messageIds } = body; // messageIds: string[] of message IDs

    if (!userId || !messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'User ID and messageIds array are required' }, { status: 400 });
    }

    const result = await prisma.messageRecipient.updateMany({
      where: {
        recipientId: userId,
        messageId: {
          in: messageIds
        }
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Successfully marked ${result.count} announcements as read.` 
    });

  } catch (error: any) {
    console.error('Messages PATCH Error:', error);
    return NextResponse.json({ error: 'Failed to update read status' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
