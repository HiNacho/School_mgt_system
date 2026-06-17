import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAuth, requireRole } from '@/lib/auth-middleware';
import { sendEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    requireRole(session, ['SUPER_ADMIN']);

    const body = await req.json();
    const { cohort, subject, body: emailBody, customEmail, customLeadId } = body;

    if (!cohort || !subject || !emailBody) {
      return NextResponse.json({ error: 'Missing required parameters (cohort, subject, body).' }, { status: 400 });
    }

    let targetLeads: Array<{ id: string; email: string; contactName: string | null }> = [];

    // 1. Fetch target cohort
    if (cohort === 'CUSTOM') {
      if (!customEmail || !customLeadId) {
        return NextResponse.json({ error: 'Custom email and lead ID are required for CUSTOM cohort.' }, { status: 400 });
      }
      
      const lead = await prisma.lead.findUnique({ where: { id: customLeadId } });
      targetLeads = [{
        id: customLeadId,
        email: customEmail,
        contactName: lead?.contactName || 'Valued Partner'
      }];
    } else if (cohort === 'ALL_LEADS') {
      targetLeads = await prisma.lead.findMany({
        select: { id: true, email: true, contactName: true }
      });
    } else if (cohort === 'ACTIVE_TESTERS') {
      targetLeads = await prisma.lead.findMany({
        where: {
          OR: [
            { leadStatus: 'TESTING' },
            { demoSchoolId: { not: null } }
          ]
        },
        select: { id: true, email: true, contactName: true }
      });
    } else if (cohort === 'PILOT_SCHOOLS') {
      targetLeads = await prisma.lead.findMany({
        where: { leadStatus: 'PILOT_SCHOOL' },
        select: { id: true, email: true, contactName: true }
      });
    } else {
      return NextResponse.json({ error: 'Invalid cohort target requested.' }, { status: 400 });
    }

    if (targetLeads.length === 0) {
      return NextResponse.json({ success: true, sentCount: 0, message: 'No leads found in the target cohort.' });
    }

    // 2. Dispatch emails in parallel / series
    console.log(`[Campaigns] Starting email campaign broadcast to ${targetLeads.length} recipients. Cohort: "${cohort}"`);
    let sentCount = 0;

    for (const lead of targetLeads) {
      // Dynamic body replacement
      const personalizedBody = emailBody
        .replace(/\{Name\}/g, lead.contactName || 'Valued Partner')
        .replace(/\{Email\}/g, lead.email);

      const success = await sendEmail({
        leadId: lead.id,
        to: lead.email,
        subject: subject,
        body: personalizedBody,
      });

      if (success) sentCount++;
    }

    return NextResponse.json({
      success: true,
      sentCount,
      message: `Campaign broadcast complete. Successfully sent ${sentCount} of ${targetLeads.length} emails.`,
    });

  } catch (error: any) {
    if (error.name === 'AuthError' || error.status) {
      return NextResponse.json({ error: error.message || 'Unauthorized' }, { status: error.status || 401 });
    }
    console.error('Superadmin Campaign Broadcast Error:', error);
    return NextResponse.json({ error: 'Server error broadcasting email campaign.' }, { status: 500 });
  }
}
