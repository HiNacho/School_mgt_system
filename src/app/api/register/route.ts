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
    const {
      schoolName,
      schoolType,
      ownershipType,
      contactName,
      name, // fallback for name
      position,
      email,
      phone,
      studentCount,
      teacherCount,
      classCount,
      currentResultMethod,
      currentAttendanceMethod,
      biggestChallenge,
      interestedFeatures,
      message, // contact message
    } = body;

    // 1. Validate required parameters
    const resolvedContactName = contactName || name;
    if (!resolvedContactName || !email || !schoolName) {
      return NextResponse.json(
        { error: 'Missing required parameters (Name, Email, and School Name are required).' },
        { status: 400 }
      );
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address format.' },
        { status: 400 }
      );
    }

    // 3. Check if email is already registered as a lead
    const existingLead = await prisma.lead.findUnique({
      where: { email }
    });

    let lead = existingLead;
    let provisionedCredentials: any = null;

    if (!message) {
      // Check if school already exists for this email
      const existingSchool = await prisma.school.findFirst({
        where: { email }
      });
      if (existingSchool) {
        const existingAdmin = await prisma.user.findFirst({
          where: { schoolId: existingSchool.id, role: 'SCHOOL_ADMIN' }
        });
        if (existingAdmin) {
          return NextResponse.json({
            success: true,
            message: 'This email is already registered. Here are your credentials.',
            credentials: {
              email: existingAdmin.email,
              username: existingAdmin.username,
              password: 'password',
              schoolName: existingSchool.name,
              schoolSlug: existingSchool.slug,
              isExisting: true
            },
            data: lead
          }, { status: 200 });
        }
      }
    }

    // Convert interestedFeatures to string if it's an array
    const resolvedFeatures = Array.isArray(interestedFeatures)
      ? interestedFeatures.join(', ')
      : (interestedFeatures || null);

    if (!lead) {
      // Parse integers if they come as strings
      const parsedStudentCount = studentCount ? parseInt(studentCount, 10) : null;
      const parsedTeacherCount = teacherCount ? parseInt(teacherCount, 10) : null;
      const parsedClassCount = classCount ? parseInt(classCount, 10) : null;

      // Create new Lead record in the database
      lead = await prisma.lead.create({
        data: {
          schoolName,
          schoolType: schoolType || null,
          ownershipType: ownershipType || null,
          contactName: resolvedContactName,
          position: position || null,
          email,
          phone: phone || null,
          studentCount: parsedStudentCount,
          teacherCount: parsedTeacherCount,
          classCount: parsedClassCount,
          currentResultMethod: currentResultMethod || null,
          currentAttendanceMethod: currentAttendanceMethod || null,
          biggestChallenge: biggestChallenge || null,
          interestedFeatures: resolvedFeatures,
          leadStatus: 'NEW',
        }
      });
    }

    // Provision school automatically for early access registrations (Scenario B)
    if (!message) {
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

      // Create clean school (no student mock records)
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

      // Seed standard rules for the live school
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
      const adminUser = await prisma.user.create({
        data: {
          schoolId,
          username: adminUsername,
          email: email,
          passwordHash,
          firstName: resolvedContactName ? resolvedContactName.split(' ')[0] : 'School',
          lastName: resolvedContactName && resolvedContactName.split(' ').length > 1 ? resolvedContactName.split(' ').slice(1).join(' ') : 'Admin',
          role: 'SCHOOL_ADMIN',
          status: 'ACTIVE',
          isActive: true,
          isFirstLogin: true, // Force reset/profile setup on first login
        },
      });

      // Update lead status and associate demoSchoolId
      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          demoSchoolId: liveSchool.id,
          leadStatus: 'PILOT_SCHOOL',
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

      provisionedCredentials = {
        email: email,
        username: adminUsername,
        password: 'password',
        schoolName: schoolName,
        schoolSlug: slug
      };
    }

    const adminEmailAddress = 'hellotonachoai@gmail.com';

    // 4. Handle Contact Inquiry vs Early Access Registration
    if (message) {
      // --- Scenario A: Contact Inquiry ---
      
      // A1. Notification Email to the Administrator
      const adminEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New NachoEd Contact Inquiry</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.6; color: #334155; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #ffffff; }
            h2 { color: #0f172a; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .field { margin-bottom: 12px; font-size: 14px; }
            .label { font-weight: bold; color: #475569; }
            .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; margin-top: 15px; white-space: pre-wrap; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Contact Us Inquiry Received</h2>
            <div class="field"><span class="label">Sender Name:</span> ${escapeHtml(resolvedContactName)}</div>
            <div class="field"><span class="label">Email Address:</span> ${escapeHtml(email)}</div>
            <div class="field"><span class="label">School Name:</span> ${escapeHtml(schoolName)}</div>
            <div class="message-box">
              <strong>Message:</strong><br/>
              ${escapeHtml(message)}
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: lead.id,
        to: adminEmailAddress,
        subject: `[NachoEd Inquiry] Message from ${resolvedContactName} (${schoolName})`,
        body: adminEmailHtml,
      });

      // A2. Receipt Confirmation Email to the Visitor
      const visitorEmailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Inquiry Received</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.6; color: #334155; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #ffffff; }
            h2 { color: #0f172a; margin-top: 0; }
            p { font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>We Have Received Your Inquiry</h2>
            <p>Dear ${escapeHtml(resolvedContactName)},</p>
            <p>Thank you for reaching out to the NachoEd Team! We have successfully received your message regarding <strong>${escapeHtml(schoolName)}</strong>.</p>
            <p>Our team is currently reviewing your inquiry and we will get back to you shortly (typically within 24 hours).</p>
            <br/>
            <p>Best Regards,</p>
            <p><strong>The NachoEd Team</strong></p>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: lead.id,
        to: email,
        subject: 'We received your inquiry - NachoEd Support',
        body: visitorEmailHtml,
      });

      // Send Slack notification
      const slackMessage = `🔔 *New NachoEd Contact Inquiry*\n` +
        `• *Name:* ${resolvedContactName}\n` +
        `• *Email:* ${email}\n` +
        `• *School:* ${schoolName}\n` +
        `• *Message:* ${message}`;
      await sendSlackNotification(slackMessage);

      return NextResponse.json({
        success: true,
        message: 'Inquiry submitted successfully! A notification and email confirmation have been dispatched.',
        data: lead
      }, { status: 200 });

    } else {
      // --- Scenario B: Early Access Registration ---

      // B1. Notification Email to the Administrator
      const adminRegHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>New NachoEd Registration</title>
          <style>
            body { font-family: 'Plus Jakarta Sans', sans-serif; line-height: 1.6; color: #334155; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #ffffff; }
            h2 { color: #0f172a; margin-top: 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
            .field { margin-bottom: 10px; font-size: 14px; }
            .label { font-weight: bold; color: #475569; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>New Early Access Registration</h2>
            <div class="field"><span class="label">School Name:</span> ${escapeHtml(schoolName)}</div>
            <div class="field"><span class="label">School Type:</span> ${escapeHtml(schoolType || 'N/A')}</div>
            <div class="field"><span class="label">Ownership:</span> ${escapeHtml(ownershipType || 'N/A')}</div>
            <div class="field"><span class="label">Contact Name:</span> ${escapeHtml(resolvedContactName)}</div>
            <div class="field"><span class="label">Position:</span> ${escapeHtml(position || 'N/A')}</div>
            <div class="field"><span class="label">Email Address:</span> ${escapeHtml(email)}</div>
            <div class="field"><span class="label">Phone:</span> ${escapeHtml(phone || 'N/A')}</div>
            <div class="field"><span class="label">Student Count:</span> ${studentCount || 'N/A'}</div>
            <div class="field"><span class="label">Teacher Count:</span> ${teacherCount || 'N/A'}</div>
            <div class="field"><span class="label">Class Count:</span> ${classCount || 'N/A'}</div>
            <div class="field"><span class="label">Current Result Method:</span> ${escapeHtml(currentResultMethod || 'N/A')}</div>
            <div class="field"><span class="label">Current Attendance Method:</span> ${escapeHtml(currentAttendanceMethod || 'N/A')}</div>
            <div class="field"><span class="label">Biggest Challenge:</span> ${escapeHtml(biggestChallenge || 'N/A')}</div>
            <div class="field"><span class="label">Interested Features:</span> ${escapeHtml(resolvedFeatures || 'N/A')}</div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: lead.id,
        to: adminEmailAddress,
        subject: `[NachoEd Early Access] New Registration from ${resolvedContactName} (${schoolName})`,
        body: adminRegHtml,
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
            .credential-label {
              font-weight: 600;
              font-size: 13px;
              color: #475569;
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
              <p>Thank you for registering interest in NachoEd! We are thrilled to help simplify academic operations at <strong>${escapeHtml(schoolName)}</strong>.</p>
              
              <p>Your custom 1-month trial sandbox environment has been successfully prepared!</p>
              
              <div style="text-align: center;">
                <a href="http://localhost:3000/login" class="btn">Go to Login Portal</a>
              </div>

              <div class="credentials-section">
                <h3>🔑 Your Administrator Credentials</h3>
                
                <div class="credential-item">
                  <strong>School Name:</strong> ${escapeHtml(schoolName)}<br/>
                  <strong>Portal ID (Slug):</strong> ${escapeHtml(provisionedCredentials?.schoolSlug || '')}<br/>
                  <strong>Login Email:</strong> <span class="credential-value">${escapeHtml(email)}</span><br/>
                  <strong>Admin Username:</strong> <span class="credential-value">${escapeHtml(provisionedCredentials?.username || '')}</span><br/>
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
        subject: 'Welcome to NachoEd - Early Access & Demo Credentials',
        body: visitorWelcomeHtml,
      });

      // Send Slack notification
      const slackMessage = `🚀 *New Early Access Registration*\n` +
        `• *School:* ${schoolName}\n` +
        `• *Type:* ${schoolType || 'N/A'}\n` +
        `• *Ownership:* ${ownershipType || 'N/A'}\n` +
        `• *Contact:* ${resolvedContactName} (${position || 'N/A'})\n` +
        `• *Email:* ${email}\n` +
        `• *Phone:* ${phone || 'N/A'}\n` +
        `• *Size:* ${studentCount || 'N/A'} students, ${teacherCount || 'N/A'} teachers\n` +
        `• *Challenge:* ${biggestChallenge || 'N/A'}`;
      await sendSlackNotification(slackMessage);

      return NextResponse.json({ 
        success: true, 
        message: 'Registration successful! Your 1-month free trial school portal has been provisioned.',
        credentials: provisionedCredentials,
        data: lead 
      }, { status: 201 });
    }

  } catch (error: any) {
    console.error('Registration/Inquiry API Error:', error);
    return NextResponse.json(
      { error: 'Server error processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
