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
    const { studentId, invoiceId, reminderType = 'OVERDUE' } = body;

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
