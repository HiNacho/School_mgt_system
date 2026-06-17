import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/mailer';

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
    } = body;

    // 1. Validate required parameters
    const resolvedContactName = contactName || name;
    if (!resolvedContactName || !email || !schoolName) {
      return NextResponse.json(
        { error: 'Missing required registration parameters (Name, Email, and School Name are required).' },
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

    if (existingLead) {
      return NextResponse.json(
        { error: 'This email address has already been registered for early access.' },
        { status: 400 }
      );
    }

    // Parse integers if they come as strings
    const parsedStudentCount = studentCount ? parseInt(studentCount, 10) : null;
    const parsedTeacherCount = teacherCount ? parseInt(teacherCount, 10) : null;
    const parsedClassCount = classCount ? parseInt(classCount, 10) : null;

    // Convert interestedFeatures to string if it's an array
    const resolvedFeatures = Array.isArray(interestedFeatures)
      ? interestedFeatures.join(', ')
      : (interestedFeatures || null);

    // 4. Create the Lead record in the database
    const newLead = await prisma.lead.create({
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

    // 5. Build HTML email body with premium styling
    const emailHtml = `
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
            <h2>Hello ${resolvedContactName},</h2>
            <p>Thank you for registering interest in NachoEd! We are thrilled to help simplify academic operations at <strong>${schoolName}</strong>.</p>
            
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

    // 6. Send the live email via the mailer module
    await sendEmail({
      leadId: newLead.id,
      to: email,
      subject: 'Welcome to NachoEd - Early Access & Demo Credentials',
      body: emailHtml,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Registration successful! An automated welcome email has been sent.',
      data: newLead 
    }, { status: 201 });

  } catch (error: any) {
    console.error('Lead Registration API Error:', error);
    return NextResponse.json(
      { error: 'Server error processing your registration. Please try again.' },
      { status: 500 }
    );
  }
}

