import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth } from '@/lib/auth-middleware';

// GET: Fetch conversations & chat history
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const studentId = searchParams.get('studentId');
    const conversationId = searchParams.get('conversationId');

    const session = await requireAuth(req);

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // 1. Fetch details of a single conversation with its message threads
    if (conversationId) {
      const conversation = await prisma.chatConversation.findUnique({
        where: { id: conversationId },
        include: {
          student: {
            select: { id: true, firstName: true, lastName: true, admissionNumber: true }
          },
          parent: {
            select: { id: true, firstName: true, lastName: true, role: true }
          },
          teacher: {
            select: { id: true, firstName: true, lastName: true, role: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              sender: {
                select: { id: true, firstName: true, lastName: true, role: true }
              }
            }
          }
        }
      });

      if (!conversation || conversation.schoolId !== schoolId) {
        return NextResponse.json({ error: 'Conversation thread not found' }, { status: 404 });
      }

      // Authorization guard: verify session user is parent, teacher, or admin for this conversation
      const isAuthorized =
        session.role === 'SCHOOL_ADMIN' ||
        session.role === 'SUPER_ADMIN' ||
        conversation.parentId === session.userId ||
        conversation.teacherId === session.userId;

      if (!isAuthorized) {
        return NextResponse.json({ error: 'Access denied: Unauthorized chat scope' }, { status: 403 });
      }

      // Mark unread messages sent by OTHER users as read
      await prisma.chatMessage.updateMany({
        where: {
          conversationId,
          senderId: { not: session.userId },
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true, data: conversation });
    }

    // 2. Fetch list of conversations for the user context
    let conversationsQuery: any = { schoolId };

    if (studentId) {
      conversationsQuery.studentId = studentId;
    }

    if (session.role === 'PARENT') {
      conversationsQuery.parentId = session.userId;
    } else if (
      session.role === 'CLASS_TEACHER' || 
      session.role === 'SUBJECT_TEACHER' || 
      session.role === 'HEAD_TEACHER' || 
      session.role === 'TEACHER'
    ) {
      conversationsQuery.teacherId = session.userId;
    }

    const conversations = await prisma.chatConversation.findMany({
      where: conversationsQuery,
      orderBy: { lastActivity: 'desc' },
      include: {
        student: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true, 
            class: { select: { name: true } }, 
            arm: { select: { name: true } } 
          }
        },
        parent: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        teacher: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Also fetch presets and policies for setup contexts
    const templates = await prisma.communicationTemplate.findMany({
      where: { schoolId }
    });

    const settings = await prisma.communicationSettings.findUnique({
      where: { schoolId }
    });

    return NextResponse.json({
      success: true,
      data: {
        conversations,
        templates,
        settings: settings || {
          communicationHoursStart: "08:00",
          communicationHoursEnd: "17:00",
          whoCanMessageWhom: "ALL",
          maxAttachmentSizeMb: 5,
          messageRetentionDays: 365,
          autoCloseInactivityDays: 7,
          directSubjectTeacherContact: true
        }
      }
    });

  } catch (error: any) {
    console.error('Chat GET Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to retrieve message logs' }, { status: 500 });
  }
}

// POST: Create a conversation, send a message, save settings, or manage templates
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      schoolId, action,
      // Chat message fields
      studentId, recipientId, category, subject, messageBody, attachmentUrl, attachmentName, conversationId,
      // Settings fields
      communicationHoursStart, communicationHoursEnd, whoCanMessageWhom, maxAttachmentSizeMb, messageRetentionDays, autoCloseInactivityDays, directSubjectTeacherContact,
      // Template fields
      templateId, templateTitle, templateContent, templateCategory
    } = body;

    const session = await requireAuth(req);

    if (!schoolId) {
      return NextResponse.json({ error: 'School ID is required' }, { status: 400 });
    }

    // 1. ACTION: Save Communication Settings (Admin only)
    if (action === 'SAVE_SETTINGS') {
      if (session.role !== 'SCHOOL_ADMIN' && session.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 });
      }

      const settings = await prisma.communicationSettings.upsert({
        where: { schoolId },
        create: {
          schoolId,
          communicationHoursStart: communicationHoursStart || "08:00",
          communicationHoursEnd: communicationHoursEnd || "17:00",
          whoCanMessageWhom: whoCanMessageWhom || "ALL",
          maxAttachmentSizeMb: parseInt(maxAttachmentSizeMb, 10) || 5,
          messageRetentionDays: parseInt(messageRetentionDays, 10) || 365,
          autoCloseInactivityDays: parseInt(autoCloseInactivityDays, 10) || 7,
          directSubjectTeacherContact: directSubjectTeacherContact !== false
        },
        update: {
          communicationHoursStart: communicationHoursStart || "08:00",
          communicationHoursEnd: communicationHoursEnd || "17:00",
          whoCanMessageWhom: whoCanMessageWhom || "ALL",
          maxAttachmentSizeMb: parseInt(maxAttachmentSizeMb, 10) || 5,
          messageRetentionDays: parseInt(messageRetentionDays, 10) || 365,
          autoCloseInactivityDays: parseInt(autoCloseInactivityDays, 10) || 7,
          directSubjectTeacherContact: directSubjectTeacherContact !== false
        }
      });
      return NextResponse.json({ success: true, data: settings });
    }

    // 2. ACTION: Create Communication Template (Admin only)
    if (action === 'CREATE_TEMPLATE') {
      if (session.role !== 'SCHOOL_ADMIN' && session.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 });
      }

      if (!templateTitle || !templateContent) {
        return NextResponse.json({ error: 'Template title and content are required' }, { status: 400 });
      }

      const newTemplate = await prisma.communicationTemplate.create({
        data: {
          schoolId,
          title: templateTitle,
          content: templateContent,
          category: templateCategory || "GENERAL"
        }
      });
      return NextResponse.json({ success: true, data: newTemplate });
    }

    // 3. ACTION: Delete Communication Template (Admin only)
    if (action === 'DELETE_TEMPLATE') {
      if (session.role !== 'SCHOOL_ADMIN' && session.role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Access denied: Admin role required' }, { status: 403 });
      }

      if (!templateId) {
        return NextResponse.json({ error: 'Template ID is required' }, { status: 400 });
      }

      await prisma.communicationTemplate.delete({
        where: { id: templateId }
      });
      return NextResponse.json({ success: true, message: 'Template deleted successfully' });
    }

    if (!messageBody || messageBody.trim() === '') {
      return NextResponse.json({ error: 'Message body cannot be empty' }, { status: 400 });
    }

    let targetConversationId = conversationId;

    // Transaction to safely open chats, append messages, and notify
    const result = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create conversation
      if (!targetConversationId) {
        if (!studentId || !recipientId || !category || !subject) {
          throw new Error('Missing parameters to establish a new chat thread');
        }

        // Determine parent vs teacher role allocations
        let parentId = '';
        let teacherId = '';

        if (session.role === 'PARENT') {
          parentId = session.userId;
          teacherId = recipientId;
        } else {
          parentId = recipientId;
          teacherId = session.userId;
        }

        // Check if an open thread already exists for student + parent + teacher + category
        const existing = await tx.chatConversation.findFirst({
          where: {
            schoolId,
            studentId,
            parentId,
            teacherId,
            category,
            status: { in: ['OPEN', 'PENDING'] }
          }
        });

        if (existing) {
          targetConversationId = existing.id;
        } else {
          const newConv = await tx.chatConversation.create({
            data: {
              schoolId,
              studentId,
              parentId,
              teacherId,
              category,
              subject,
              status: 'OPEN'
            }
          });
          targetConversationId = newConv.id;

          // Add Student timeline log event
          await tx.studentTimeline.create({
            data: {
              schoolId,
              studentId,
              eventType: 'CHAT_MESSAGE',
              title: `New Chat Thread: ${category}`,
              description: `A direct communication channel opened: "${subject}"`,
              referenceId: newConv.id
            }
          });
        }
      }

      // Fetch the conversation recipient to notify them
      const conversation = await tx.chatConversation.findUnique({
        where: { id: targetConversationId },
        include: {
          student: true,
          parent: true,
          teacher: true
        }
      });

      if (!conversation) {
        throw new Error('Target conversation thread not found');
      }

      // Identify receiver user ID
      const notifyUserId = session.userId === conversation.parentId ? conversation.teacherId : conversation.parentId;

      // 2. Append Chat Message
      const newMessage = await tx.chatMessage.create({
        data: {
          conversationId: targetConversationId,
          senderId: session.userId,
          body: messageBody,
          attachmentUrl,
          attachmentName
        },
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, role: true }
          }
        }
      });

      // 3. Update Conversation lastActivity & status
      await tx.chatConversation.update({
        where: { id: targetConversationId },
        data: {
          lastActivity: new Date(),
          status: session.userId === conversation.parentId ? 'OPEN' : 'PENDING' // Teachers flag chats pending parent response
        }
      });

      // 4. Trigger In-App Notification
      const senderName = `${newMessage.sender.firstName} ${newMessage.sender.lastName}`;
      await tx.notification.create({
        data: {
          schoolId,
          userId: notifyUserId,
          message: `New message from ${senderName} (regarding ${conversation.student.firstName}): "${messageBody.slice(0, 50)}${messageBody.length > 50 ? '...' : ''}"`
        }
      });

      return newMessage;
    });

    return NextResponse.json({ success: true, data: result });

  } catch (error: any) {
    console.error('Chat POST Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to deliver message' }, { status: 500 });
  }
}

// PATCH: Update Conversation status (Resolve/Close)
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { schoolId, conversationId, status } = body;

    const session = await requireAuth(req);

    if (!conversationId || !status) {
      return NextResponse.json({ error: 'Conversation ID and status are required' }, { status: 400 });
    }

    const conversation = await prisma.chatConversation.findUnique({
      where: { id: conversationId }
    });

    if (!conversation || conversation.schoolId !== schoolId) {
      return NextResponse.json({ error: 'Conversation thread not found' }, { status: 404 });
    }

    // Admins and teachers can change status (Resolve/Close)
    const isAuthorized =
      session.role === 'SCHOOL_ADMIN' ||
      session.role === 'SUPER_ADMIN' ||
      conversation.teacherId === session.userId;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized role permissions' }, { status: 403 });
    }

    const updated = await prisma.chatConversation.update({
      where: { id: conversationId },
      data: { status }
    });

    return NextResponse.json({ success: true, data: updated });

  } catch (error: any) {
    console.error('Chat PATCH Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to update conversation status' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

