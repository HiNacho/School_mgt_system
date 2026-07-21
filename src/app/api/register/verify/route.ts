import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/mailer';
import { sendSlackNotification } from '@/lib/slack';
import bcrypt from 'bcryptjs';

// Helper to escape HTML to prevent injection and rendering errors
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, code } = body;

    if (!leadId || !code) {
      return NextResponse.json({ error: 'Lead ID and verification code are required.' }, { status: 400 });
    }

    // 1. Fetch lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Registration lead not found.' }, { status: 404 });
    }

    if (lead.emailVerified) {
      return NextResponse.json({ error: 'This registration has already been verified and active.' }, { status: 400 });
    }

    // 2. Validate code and expiry
    if (lead.verificationCode !== code.trim()) {
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    }

    if (lead.verificationExpires && new Date() > new Date(lead.verificationExpires)) {
      return NextResponse.json({ error: 'Verification code has expired. Please register again.' }, { status: 400 });
    }

    // 3. Provision school automatically now that email is verified
    const schoolName = lead.schoolName;
    const email = lead.email;
    const phone = lead.phone;
    const schoolType = lead.schoolType;
    const studentCount = lead.studentCount;
    const teacherCount = lead.teacherCount;
    const classCount = lead.classCount;
    const currentResultMethod = lead.currentResultMethod;
    const currentAttendanceMethod = lead.currentAttendanceMethod;
    const biggestChallenge = lead.biggestChallenge;
    const resolvedFeatures = lead.interestedFeatures;
    const resolvedContactName = lead.contactName || 'School Admin';

    // Generate unique slug
    const cleanSlug = schoolName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const slug = `${cleanSlug}-live-${randomSuffix}`;

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password', salt);

    // Create school
    const liveSchool = await prisma.school.create({
      data: {
        name: schoolName,
        slug: slug,
        logoUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop',
        address: 'Main School Campus',
        phone: phone || null,
        email: email,
        gradingType: schoolType === 'PRIMARY' ? 'PRIMARY' : 'SECONDARY',
        subscriptionPlan: 'Standard',
        subscriptionStatus: 'trial',
        subscriptionStart: new Date(),
        subscriptionEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    const schoolId = liveSchool.id;

    // Seed standard rules
    const isPrimary = schoolType === 'PRIMARY';
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
    
    // Set unique hash for default password "password"
    const { getPasswordUniqueHash } = require('@/lib/password-rules');
    const defaultUniqueHash = getPasswordUniqueHash('password');

    const adminUser = await prisma.user.create({
      data: {
        schoolId,
        username: adminUsername,
        email: email,
        passwordHash,
        passwordUniqueHash: defaultUniqueHash,
        firstName: resolvedContactName ? resolvedContactName.split(' ')[0] : 'School',
        lastName: resolvedContactName && resolvedContactName.split(' ').length > 1 ? resolvedContactName.split(' ').slice(1).join(' ') : 'Admin',
        role: 'SCHOOL_ADMIN',
        status: 'ACTIVE',
        isActive: true,
        isFirstLogin: true,
      },
    });

    // Update lead status and associate demoSchoolId, setting verified true
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        demoSchoolId: liveSchool.id,
        leadStatus: 'PILOT_SCHOOL',
        emailVerified: true
      },
    });

    // Create TesterActivity telemetry tracker
    await prisma.testerActivity.create({
      data: {
        userId: adminUser.id,
        leadId: lead.id,
        loginCount: 0,
        timeSpent: 0,
      },
    });

    // B2. Premium Styled Welcome Email to the Visitor
    const visitorWelcomeHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to NachoEd</title>
        <style>
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f8fafc;
            color: #334155;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            background-color: #0f172a;
            color: #ffffff;
            padding: 32px 24px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .header p {
            margin: 8px 0 0 0;
            color: #94a3b8;
            font-size: 14px;
          }
          .content {
            padding: 32px 24px;
            line-height: 1.6;
          }
          .content h2 {
            font-size: 18px;
            color: #0f172a;
            margin-top: 0;
          }
          .credentials-section {
            background-color: #f1f5f9;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
          }
          .credentials-section h3 {
            margin-top: 0;
            font-size: 14px;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 8px;
          }
          .credential-item {
            margin-bottom: 12px;
          }
          .credential-item:last-child {
            margin-bottom: 0;
          }
          .credential-value {
            font-family: monospace;
            background-color: #e2e8f0;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
            color: #0f172a;
          }
          .btn {
            display: inline-block;
            background-color: #0f172a;
            color: #ffffff !important;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 14px;
            text-align: center;
            margin: 16px 0;
          }
          .footer {
            background-color: #f8fafc;
            padding: 24px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #e2e8f0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>NachoEd</h1>
            <p>School Management SaaS Platform</p>
          </div>
          <div class="content">
            <h2>Hello ${escapeHtml(resolvedContactName)},</h2>
            <p>Thank you for verifying your email! We are thrilled to help simplify academic operations at <strong>${escapeHtml(schoolName)}</strong>.</p>
            
            <p>Your custom 1-month trial sandbox environment has been successfully prepared!</p>
            
            <div style="text-align: center;">
              <a href="https://school-mgt-system-dun.vercel.app/login" class="btn">Go to Login Portal</a>
            </div>

            <div class="credentials-section">
              <h3>🔑 Your Administrator Credentials</h3>
              
              <div class="credential-item">
                <strong>School Name:</strong> ${escapeHtml(schoolName)}<br/>
                <strong>Portal ID (Slug):</strong> ${escapeHtml(slug)}<br/>
                <strong>Login Email:</strong> <span class="credential-value">${escapeHtml(email)}</span><br/>
                <strong>Admin Username:</strong> <span class="credential-value">${escapeHtml(adminUsername)}</span><br/>
                <strong>Temporary Password:</strong> <span class="credential-value">password</span>
              </div>
              <p style="font-size: 11px; color: #ef4444; font-weight: bold; margin-top: 10px; margin-bottom: 0;">⚠️ You will be prompted to update this temporary password upon first login.</p>
            </div>

            <p>If you have any questions or would like to expedite your pilot program request, please feel free to reply directly to this email.</p>
            
            <p>Best Regards,<br/><strong>The NachoEd Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} NachoEd. All rights reserved.</p>
            <p>Simplifying student databases, result sheets, and report card compilation.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      leadId: lead.id,
      to: email,
      subject: 'Welcome to NachoEd - Early Access Portal & Credentials',
      body: visitorWelcomeHtml,
    });

    // Send Slack notification
    const slackMessage = `✅ *Registration Verified & Portal Created*\n` +
      `• *School:* ${schoolName}\n` +
      `• *Contact:* ${resolvedContactName}\n` +
      `• *Email:* ${email}\n` +
      `• *Slug:* ${slug}`;
    await sendSlackNotification(slackMessage);

    return NextResponse.json({
      success: true,
      message: 'Email verification successful! Your school trial portal is active.',
      credentials: {
        email: email,
        username: adminUsername,
        password: 'password',
        schoolName: schoolName,
        schoolSlug: slug
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Verify API Error:', error);
    return NextResponse.json({ error: 'Server error processing your request.' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
