import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { seedDemoSchool } from '@/lib/demoSeeder';
import { sendEmail } from '@/lib/mailer';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, action, status } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required.' }, { status: 400 });
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    // 1. APPROVE DEMO ENVIRONMENT
    if (action === 'approveDemo') {
      if (lead.demoSchoolId) {
        return NextResponse.json({ error: 'Demo school environment has already been spun up for this lead.' }, { status: 400 });
      }

      // Spin up the demo school (100 students, mock data, etc.)
      const seedResult = await seedDemoSchool(lead.schoolName, lead.email, lead.schoolType || 'SECONDARY');

      // Update Lead status and reference
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          demoSchoolId: seedResult.schoolId,
          leadStatus: 'TESTING', // set to testing since sandbox is active
        },
      });

      // Find the admin user created to get the ID for TesterActivity
      const adminUser = await prisma.user.findFirst({
        where: { schoolId: seedResult.schoolId, role: 'SCHOOL_ADMIN' },
      });

      if (adminUser) {
        // Create TesterActivity telemetry tracker
        await prisma.testerActivity.create({
          data: {
            userId: adminUser.id,
            leadId: leadId,
            loginCount: 0,
            timeSpent: 0,
          },
        });
      }

      // Send confirmation email with custom credentials
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; background-color: #f8fafc; color: #334155; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { background-color: #0f172a; color: #ffffff; padding: 24px; text-align: center; }
            .content { padding: 24px; line-height: 1.5; }
            .credentials { background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .btn { display: inline-block; background-color: #0f172a; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Private Demo Sandbox Ready!</h2>
            </div>
            <div class="content">
              <p>Hello ${lead.contactName},</p>
              <p>We are excited to let you know that your custom demo sandbox environment for <strong>${lead.schoolName}</strong> has been successfully prepared!</p>
              
              <p>This is a private, fully loaded testing environment seeded with <strong>100 students</strong> across classes, complete schedules, sample test results, and mock grade books. You can log in as the School Administrator immediately to test report generation, analytics, and portals.</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="http://localhost:3000/login" class="btn">Access Sandbox Login</a>
              </div>

              <div class="credentials">
                <h4 style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 12px; color: #475569;">🔑 Administrator Access</h4>
                <strong>Login Email:</strong> <code style="background:#cbd5e1; padding:2px 6px; border-radius:3px;">${seedResult.adminEmail}</code><br/>
                <strong>Username:</strong> <code style="background:#cbd5e1; padding:2px 6px; border-radius:3px;">${seedResult.adminUsername}</code><br/>
                <strong>Default Password:</strong> <code style="background:#cbd5e1; padding:2px 6px; border-radius:3px;">password</code>
              </div>

              <p>Explore features, edit student information, register test marks, and download compiled academic reports. After testing, you can convert this seamlessly to a live production environment.</p>

              <p>Best Regards,<br/><strong>The NachoEd Onboarding Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: leadId,
        to: lead.email,
        subject: `Your Private Demo Sandbox for ${lead.schoolName} is Active`,
        body: emailHtml,
      });

      return NextResponse.json({ success: true, message: 'Demo sandbox created and welcome credentials email sent.', data: updatedLead });
    }

    // 2. CONVERT TO LIVE / PILOT SCHOOL
    if (action === 'convertToPilot' || action === 'convertToCustomer') {
      const isCustomer = action === 'convertToCustomer';
      
      // Generate unique slug
      const cleanSlug = lead.schoolName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const slug = `${cleanSlug}-live-${randomSuffix}`;

      // Hash default password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('password', salt);

      // Create clean school (no student mock records)
      const liveSchool = await prisma.school.create({
        data: {
          name: lead.schoolName,
          slug: slug,
          logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop',
          address: 'Main School Campus',
          phone: lead.phone || null,
          email: lead.email,
          gradingType: lead.schoolType === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY',
          subscriptionPlan: isCustomer ? 'Premium' : 'Standard',
          subscriptionStatus: isCustomer ? 'active' : 'trial',
          subscriptionStart: new Date(),
          subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      const schoolId = liveSchool.id;

      // Seed standard rules for the live school
      const isPrimary = lead.schoolType === 'PRIMARY';
      if (isPrimary) {
        const primaryRules = [
          { minScore: 80, maxScore: 100, grade: 'A', interpretation: 'Excellent' },
          { minScore: 60, maxScore: 79.9, grade: 'B', interpretation: 'Good' },
          { minScore: 40, maxScore: 59.9, grade: 'C', interpretation: 'Pass' },
          { minScore: 0, maxScore: 39.9, grade: 'D', interpretation: 'Needs Improvement' },
        ];
        await prisma.gradingRule.createMany({
          data: primaryRules.map(r => ({ schoolId, ...r })),
        });
      } else {
        const secondaryRules = [
          { minScore: 75, maxScore: 100, grade: 'A1', interpretation: 'Excellent' },
          { minScore: 70, maxScore: 74.9, grade: 'B2', interpretation: 'Very Good' },
          { minScore: 65, maxScore: 69.9, grade: 'B3', interpretation: 'Good' },
          { minScore: 60, maxScore: 64.9, grade: 'C4', interpretation: 'Credit' },
          { minScore: 55, maxScore: 59.9, grade: 'C5', interpretation: 'Credit' },
          { minScore: 50, maxScore: 54.9, grade: 'C6', interpretation: 'Credit' },
          { minScore: 45, maxScore: 49.9, grade: 'D7', interpretation: 'Pass' },
          { minScore: 40, maxScore: 44.9, grade: 'E8', interpretation: 'Pass' },
          { minScore: 0, maxScore: 39.9, grade: 'F9', interpretation: 'Fail' },
        ];
        await prisma.gradingRule.createMany({
          data: secondaryRules.map(r => ({ schoolId, ...r })),
        });
      }

      // Create Session & Term
      const session = await prisma.academicSession.create({
        data: {
          schoolId,
          name: '2025/2026',
          isCurrent: true,
        },
      });

      await prisma.term.create({
        data: {
          schoolId,
          sessionId: session.id,
          name: 'First Term',
          isCurrent: true,
        },
      });

      // Seed default subjects
      const subjectsData = [
        { name: 'Mathematics', code: 'MTH', category: 'COMPULSORY', color: 'blue' },
        { name: 'English Language', code: 'ENG', category: 'COMPULSORY', color: 'purple' },
        { name: 'Basic Science', code: 'BSC', category: 'COMPULSORY', color: 'emerald' },
      ];
      await prisma.subject.createMany({
        data: subjectsData.map(s => ({ schoolId, ...s })),
      });

      // Create live admin user
      const adminUsername = `admin_${randomSuffix}`;
      await prisma.user.create({
        data: {
          schoolId,
          username: adminUsername,
          email: lead.email,
          passwordHash,
          firstName: lead.contactName ? lead.contactName.split(' ')[0] : 'School',
          lastName: lead.contactName && lead.contactName.split(' ').length > 1 ? lead.contactName.split(' ').slice(1).join(' ') : 'Admin',
          role: 'SCHOOL_ADMIN',
          status: 'ACTIVE',
          isActive: true,
          isFirstLogin: true, // Force reset/profile setup on first login
        },
      });

      // Update lead status
      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          leadStatus: isCustomer ? 'CUSTOMER' : 'PILOT_SCHOOL',
        },
      });

      // Send live portal activation email
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: sans-serif; background-color: #f8fafc; color: #334155; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; }
            .header { background-color: #10b981; color: #ffffff; padding: 24px; text-align: center; }
            .content { padding: 24px; line-height: 1.5; }
            .credentials { background-color: #f1f5f9; border-radius: 6px; padding: 16px; margin: 20px 0; border: 1px solid #e2e8f0; }
            .btn { display: inline-block; background-color: #10b981; color: #ffffff !important; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header" style="${isCustomer ? 'background-color: #3b82f6;' : 'background-color: #10b981;'}">
              <h2>Your Live School Portal is Active!</h2>
            </div>
            <div class="content">
              <p>Hello ${lead.contactName},</p>
              <p>Congratulations! We have activated your official live school portal boundary for <strong>${lead.schoolName}</strong> as a <strong>${isCustomer ? 'Paying Customer' : 'Pilot Program Partner'}</strong>.</p>
              
              <p>This is a clean, secure instance, isolated within our SaaS database. The system grading rules for <strong>${isPrimary ? 'Primary' : 'Secondary'} school level</strong> have been pre-installed. You can now log in, register your class levels, invite teachers, upload student lists, and start compiling report cards.</p>
              
              <div style="text-align: center; margin: 20px 0;">
                <a href="http://localhost:3000/login" class="btn" style="${isCustomer ? 'background-color: #3b82f6;' : 'background-color: #10b981;'}">Access Live Login Portal</a>
              </div>

              <div class="credentials">
                <h4 style="margin: 0 0 10px 0; text-transform: uppercase; font-size: 12px; color: #475569;">🔑 Live Administrator Credentials</h4>
                <strong>Login Email:</strong> <code style="background:#cbd5e1; padding:2px 6px; border-radius:3px;">${lead.email}</code><br/>
                <strong>Admin Username:</strong> <code style="background:#cbd5e1; padding:2px 6px; border-radius:3px;">${adminUsername}</code><br/>
                <strong>Temporary Password:</strong> <code style="background:#cbd5e1; padding:2px 6px; border-radius:3px;">password</code><br/>
                <span style="font-size: 11px; color: #ef4444; font-weight: bold;">⚠️ You will be prompted to update this temporary password upon first login.</span>
              </div>

              <p>If you need assistance importing your student registry from Excel, you can use our built-in importer template inside the portal or reply to this email to have our support team upload it for you.</p>

              <p>Welcome to the NachoEd family!</p>
              <p>Best Regards,<br/><strong>The NachoEd SaaS Team</strong></p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: leadId,
        to: lead.email,
        subject: `Active Portal: Welcome to NachoEd - ${lead.schoolName}`,
        body: emailHtml,
      });

      return NextResponse.json({
        success: true,
        message: `Lead successfully converted to ${isCustomer ? 'CUSTOMER' : 'PILOT_SCHOOL'}. Live school environment is active.`,
        data: updatedLead,
      });
    }

    // 3. UPDATE STATUS MANUALLY
    if (action === 'updateStatus') {
      if (!status) {
        return NextResponse.json({ error: 'Status is required for updateStatus action.' }, { status: 400 });
      }

      const updatedLead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          leadStatus: status,
        },
      });

      return NextResponse.json({ success: true, message: 'Status updated successfully.', data: updatedLead });
    }

    // 4. DELETE LEAD
    if (action === 'deleteLead') {
      // If there's a demo school associated, delete the school
      if (lead.demoSchoolId) {
        try {
          await prisma.school.delete({
            where: { id: lead.demoSchoolId }
          });
          console.log(`[SuperAdminActions] Deleted demo school ${lead.demoSchoolId} linked to deleted lead`);
        } catch (err) {
          console.error(`[SuperAdminActions] Failed to delete demo school ${lead.demoSchoolId}:`, err);
        }
      }

      await prisma.lead.delete({
        where: { id: leadId },
      });

      return NextResponse.json({ success: true, message: 'Lead deleted successfully.' });
    }

    return NextResponse.json({ error: 'Invalid action requested.' }, { status: 400 });

  } catch (error: any) {
    console.error('Super Admin Actions API Error:', error);
    return NextResponse.json({ error: 'Server error processing action.' }, { status: 500 });
  }
}
