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

    // Generate verification code for early access registrations
    if (!message) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      lead = await prisma.lead.update({
        where: { id: lead.id },
        data: {
          verificationCode,
          verificationExpires,
          emailVerified: false,
          leadStatus: 'NEW'
        }
      });

      provisionedCredentials = {
        verificationRequired: true,
        email,
        leadId: lead.id
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
          <title>New NachoEd Registration (Unverified)</title>
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
            <h2>New Early Access Registration (Waiting for Verification Code)</h2>
            <div class="field"><span class="label">School Name:</span> ${escapeHtml(schoolName)}</div>
            <div class="field"><span class="label">Contact Name:</span> ${escapeHtml(resolvedContactName)}</div>
            <div class="field"><span class="label">Email Address:</span> ${escapeHtml(email)}</div>
            <div class="field"><span class="label">Phone:</span> ${escapeHtml(phone || 'N/A')}</div>
            <div class="field"><span class="label">OTP Verification Code Sent:</span> ${lead.verificationCode}</div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: lead.id,
        to: adminEmailAddress,
        subject: `[NachoEd Register] Unverified Registration from ${resolvedContactName} (${schoolName})`,
        body: adminRegHtml,
      });

      // B2. Premium Styled OTP Verification Code Email to the Visitor
      const visitorVerificationHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Verify Your Email - NachoEd</title>
          <style>
            body {
              font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background-color: #f8fafc;
              color: #334155;
              margin: 0;
              padding: 20px;
            }
            .container {
              max-width: 500px;
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
              padding: 24px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: -0.025em;
            }
            .content {
              padding: 32px 24px;
              line-height: 1.6;
            }
            .content h2 {
              font-size: 16px;
              color: #0f172a;
              margin-top: 0;
            }
            .code-section {
              background-color: #f1f5f9;
              border-radius: 8px;
              padding: 20px;
              margin: 24px 0;
              border: 1px dashed #cbd5e1;
              text-align: center;
            }
            .otp-code {
              font-family: monospace;
              font-size: 32px;
              font-weight: 800;
              letter-spacing: 0.15em;
              color: #0f172a;
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
            </div>
            <div class="content">
              <h2>Verify Your Email Address</h2>
              <p>Hello ${escapeHtml(resolvedContactName)},</p>
              <p>Thank you for registering interest in NachoEd! To complete your school registration and provision your trial school portal, please verify your email address by entering the following 6-digit verification code on the registration screen:</p>
              
              <div class="code-section">
                <span class="otp-code">${lead.verificationCode}</span>
              </div>
              
              <p style="font-size: 12px; color: #ef4444; font-weight: 600; margin-top: 10px;">⚠️ This code is valid for the next 15 minutes. If you did not request this verification, you can safely ignore this email.</p>
              
              <p>Best Regards,<br/><strong>The NachoEd Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} NachoEd. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      await sendEmail({
        leadId: lead.id,
        to: email,
        subject: 'Verify Your Email Address - NachoEd Onboarding',
        body: visitorVerificationHtml,
      });

      // Send Slack notification
      const slackMessage = `⏳ *New Unverified Registration*\n` +
        `• *School:* ${schoolName}\n` +
        `• *Contact:* ${resolvedContactName}\n` +
        `• *Email:* ${email}\n` +
        `• *OTP Sent:* ${lead.verificationCode}`;
      await sendSlackNotification(slackMessage);

      return NextResponse.json({ 
        success: true, 
        message: 'Registration form submitted! Verification code sent to email.',
        data: {
          verificationRequired: true,
          email,
          leadId: lead.id
        }
      }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Registration/Inquiry API Error:', error);
    return NextResponse.json(
      { error: 'Server error processing your request. Please try again.' },
      { status: 500 }
    );
  }
}
