import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN', 'SCHOOL_ADMIN', 'BURSAR']);
    const schoolId = session.schoolId;

    if (!schoolId) {
      return NextResponse.json({ error: 'School context required' }, { status: 400 });
    }

    const body = await req.json();
    const { studentId, invoiceId, reminderType = 'OVERDUE', broadcast = false, title, content } = body;

    // Handle Bulk Broadcast Mode
    if (broadcast) {
      // Find all active students with outstanding fees (feesPaid = false)
      const unpaidStudents = await prisma.student.findMany({
        where: {
          schoolId,
          feesPaid: false,
          status: 'ACTIVE'
        },
        include: {
          parent: {
            include: {
              user: true
            }
          },
          class: true,
          invoices: {
            where: {
              deletedAt: null,
              status: { in: ['OUTSTANDING', 'PARTIALLY_PAID'] }
            }
          }
        }
      });

      if (unpaidStudents.length === 0) {
        return NextResponse.json({ success: true, message: 'No students with outstanding fees status found.' });
      }

      // 1. Create a public Announcement
      await prisma.announcement.create({
        data: {
          schoolId,
          title: title || 'IMPORTANT: School Fees Payment Notice',
          content: content || 'Dear Parents, this is an official notice to all guardians regarding outstanding school fees. Please check your child\'s financial ledger on the dashboard and proceed with online Flutterwave payments. Direct message (DM) chat option is available for any payment confirmations or installment inquiries.',
          date: new Date().toISOString().split('T')[0]
        }
      });

      let sentCount = 0;
      const processedParents = new Set<string>();

      // 2. Loop through unpaid students and send DM chats
      for (const student of unpaidStudents) {
        const parentUser = student.parent?.user;
        
        if (!parentUser) continue;

        // Avoid sending multiple DMs to the same parent for the same student in one broadcast
        const parentKey = `${parentUser.id}-${student.id}`;
        if (processedParents.has(parentKey)) continue;
        processedParents.add(parentKey);

        const balance = student.invoices.reduce((sum, inv) => sum + (inv.netAmount - inv.paidAmount), 0);

        // Find or create ChatConversation
        let conversation = await prisma.chatConversation.findFirst({
          where: {
            schoolId,
            studentId: student.id,
            parentId: parentUser.id,
            teacherId: session.userId,
            category: 'FEES'
          }
        });

        if (!conversation) {
          conversation = await prisma.chatConversation.create({
            data: {
              schoolId,
              studentId: student.id,
              parentId: parentUser.id,
              teacherId: session.userId,
              category: 'FEES',
              subject: `School Fees Outstanding - ${student.firstName} ${student.lastName}`
            }
          });
        }

        const defaultMsg = balance > 0 
          ? `Hello, this is a reminder regarding outstanding school fees of ₦${balance.toLocaleString()} for your child ${student.firstName} ${student.lastName} (${student.class.name}). Please review the invoice on your dashboard. You can reply directly to this chat message if you are having challenges paying, or need to clarify/confirm a bank payment.`
          : `Hello, this is a reminder regarding outstanding school fees for your child ${student.firstName} ${student.lastName} (${student.class.name}). Please review the fees section on your dashboard. You can reply directly to this chat message if you are having challenges paying, or need to clarify/confirm a payment.`;

        // Create ChatMessage
        await prisma.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderId: session.userId,
            body: content || defaultMsg
          }
        });

        // Trigger Student Timeline event
        await prisma.studentTimeline.create({
          data: {
            schoolId,
            studentId: student.id,
            eventType: 'NOTE',
            title: 'Overdue Broadcast DM Sent',
            description: `Sent direct message payment reminder to parent. custom content: ${!!content}`,
            referenceId: student.invoices[0]?.id || undefined
          }
        });

        sentCount++;
      }

      // Log action to financial audit log
      await prisma.financialAuditLog.create({
        data: {
          schoolId,
          userId: session.userId,
          role: session.role,
          action: 'BROADCAST_REMINDERS_SENT',
          details: `Sent fees broadcast announcement and ${sentCount} direct message reminders`
        }
      });

      return NextResponse.json({
        success: true,
        message: `Successfully posted notice announcement and sent direct message reminders to ${sentCount} parents.`
      });
    }

    // Single reminder mode
    if (!studentId || !invoiceId) {
      return NextResponse.json({ error: 'Student ID and Invoice ID are required' }, { status: 400 });
    }

    // Fetch details
    const student = await prisma.student.findUnique({
      where: { id: studentId, schoolId },
      include: {
        parent: true,
        class: true
      }
    });

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId, schoolId }
    });

    if (!student || !invoice) {
      return NextResponse.json({ error: 'Student or Invoice records not found' }, { status: 404 });
    }

    const parentEmail = student.parent?.email || 'parent@demo.com';
    const parentName = student.parent ? `${student.parent.firstName} ${student.parent.lastName}` : 'Parent';
    const amountOwed = invoice.netAmount - invoice.paidAmount;

    // Simulate sending email/SMS/WhatsApp message
    console.log(`[Reminder System] Dispatching ${reminderType} reminder to Parent ${parentName} (${parentEmail})`);
    console.log(`[Reminder System] Message: Student ${student.firstName} has outstanding school fees of ₦${amountOwed.toLocaleString()} on Invoice ${invoice.invoiceNumber}. Please pay before the due date.`);

    // Log the event to student's timeline
    await prisma.studentTimeline.create({
      data: {
        schoolId,
        studentId,
        eventType: 'NOTE',
        title: `${reminderType.replace('_', ' ')} Reminder Sent`,
        description: `Dispatched payment notification to parent email ${parentEmail} for Invoice ${invoice.invoiceNumber}`,
        referenceId: invoice.id
      }
    });

    // Create system notification for records
    await prisma.notification.create({
      data: {
        schoolId,
        userId: session.userId, // notify the bursar/admin
        title: 'Payment Reminder Sent',
        message: `Reminder sent to parent of ${student.firstName} ${student.lastName} regarding unpaid Invoice ${invoice.invoiceNumber}.`,
        type: 'SYSTEM'
      }
    });

    // Log action to financial audit log
    await prisma.financialAuditLog.create({
      data: {
        schoolId,
        userId: session.userId,
        role: session.role,
        action: 'REMINDER_SENT',
        details: `Sent ${reminderType} reminder for Invoice ${invoice.invoiceNumber} to parent of ${student.firstName} ${student.lastName}`
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${reminderType.toLowerCase().replace('_', ' ')} reminder to parent email: ${parentEmail}`
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: error.status || 500 });
  }
}
