import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/mailer';

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

    if (!lead) {
      // Parse integers if they come as strings
      const parsedStudentCount = studentCount ? parseInt(studentCount, 10) : null;
      const parsedTeacherCount = teacherCount ? parseInt(teacherCount, 10) : null;
      const parsedClassCount = classCount ? parseInt(classCount, 10) : null;

      // Convert interestedFeatures to string if it's an array
      const resolvedFeatures = Array.isArray(interestedFeatures)
        ? interestedFeatures.join(', ')
        : (interestedFeatures || null);

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
    } else if (!message) {
      // If the email exists and it is NOT a message submission, block as duplicate registration
      return NextResponse.json(
        { error: 'This email address has already been registered for early access.' },
        { status: 400 }
      );
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
            <div class="field"><span class="label">Interested Features:</span> ${escapeHtml(interestedFeatures || 'N/A')}</div>
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
              
              <p>Your early access application is now in our queue. Our team is currently reviewing your profile to spin up a custom sandbox environment for your school size of <strong>${studentCount || 'unknown'} students</strong>.</p>
              
              <p>In the meantime, you can explore our pre-populated <strong>demo school environment</strong> right away using the credentials below:</p>
              
              <div style="text-align: center;">
                <a href="http://localhost:3000/login" class="btn">Go to Demo Login</a>
              </div>

              <div class="credentials-section">
                <h3>🔑 Demo Login Credentials</h3>
                
                <div class="credential-item">
                  <span class="credential-label">School Admin:</span><br/>
                  Email: <span class="credential-value">admin@greenwood.com</span><br/>
                  Password: <span class="credential-value">password</span>
                </div>
                
                <div class="credential-item" style="margin-top: 12px;">
                  <span class="credential-label">Class Teacher:</span><br/>
                  Email: <span class="credential-value">classteacher@greenwood.com</span><br/>
                  Password: <span class="credential-value">password</span>
                </div>
                
                <div class="credential-item" style="margin-top: 12px;">
                  <span class="credential-label">Parent Portal:</span><br/>
                  Email: <span class="credential-value">parent@greenwood.com</span><br/>
                  Password: <span class="credential-value">password</span>
                </div>
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

      return NextResponse.json({ 
        success: true, 
        message: 'Registration successful! An automated welcome email has been sent.',
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
