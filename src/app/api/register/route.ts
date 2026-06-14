import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, schoolName, phone, message } = body;

    // 1. Validate required parameters
    if (!name || !email || !schoolName) {
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
        { error: 'This email address has already been registered for a free trial.' },
        { status: 400 }
      );
    }

    // 4. Create the Lead record in the database
    const newLead = await prisma.lead.create({
      data: {
        name,
        email,
        schoolName,
        phone: phone || null,
        message: message || null
      }
    });

    // 5. Simulate sending an automatic welcome email (printed to server logs)
    console.log(`
============================================================
📬 [AUTOMATED EMAIL DISPATCH] WELCOME TO NACHOED!
============================================================
To: ${email}
Name: ${name}
School Name: ${schoolName}
Phone: ${phone || 'Not Provided'}
Timestamp: ${new Date().toISOString()}
Subject: Welcome to NachoEd - Report Card Automation Onboarding!

Dear ${name},

Thank you for registering interest in NachoEd Report Card Automation! We're excited to help simplify academic operations at "${schoolName}".

To help you get started immediately, we have set up default test credentials you can use to explore the platform:

Login Link: http://localhost:3000/login

--------------------------------------------------
🔑 PLATFORM-WIDE SUPER ADMIN CREDENTIALS
--------------------------------------------------
Role: Super Admin
Username: superadmin
Email: superadmin@system.com
Password: password
(Accesses SaaS tenants, billing plans, and central lead registries)

--------------------------------------------------
🔑 GREENWOOD SECONDARY ACADEMY (DEMO SCHOOL TENANT)
--------------------------------------------------
1. SCHOOL ADMIN PORTAL:
   Username: schooladmin
   Email: admin@greenwood.com
   Password: password

2. CLASS TEACHER PORTAL:
   Username: classteacher
   Email: classteacher@greenwood.com
   Password: password

3. SUBJECT TEACHER PORTAL:
   Username: subjectteacher
   Email: subjectteacher@greenwood.com
   Password: password

4. PARENT PORTAL:
   Username: greenwood_parent
   Email: parent@greenwood.com
   Password: password

5. STUDENT PORTAL:
   Username: greenwood_student
   Email: student@greenwood.com
   Password: password

Please use these credentials to log in, test workflows, view class registries, input grades, and compile academic reports.

If you have any questions, reply directly to this email or chat with us instantly on WhatsApp.

Best Regards,
The NachoEd Onboarding Team
============================================================
`);

    return NextResponse.json({ 
      success: true, 
      message: 'Registration successful! An automated welcome email has been simulated and sent.',
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
