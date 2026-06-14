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

Here is a summary of what's happening next:
1. Our onboarding engineers are preparing your isolated school tenant partition.
2. A technical advisor will contact you at ${phone || email} to assist with uploading your teachers/students Excel rosters.
3. We'll configure your grading matrices (such as A1-F9 scales or primary descriptors) so you can start compilation.

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
