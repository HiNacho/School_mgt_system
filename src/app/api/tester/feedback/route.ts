import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { sendEmail } from '@/lib/mailer';

// 1. GET: Check if user is a tester and if feedback is already submitted
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 });
    }

    const activity = await prisma.testerActivity.findUnique({
      where: { userId },
    });

    if (!activity) {
      return NextResponse.json({ isTester: false });
    }

    const existingFeedback = await prisma.feedback.findUnique({
      where: { leadId: activity.leadId },
    });

    return NextResponse.json({
      isTester: true,
      feedbackSubmitted: !!existingFeedback,
      leadId: activity.leadId,
    });

  } catch (error: any) {
    console.error('Feedback Check GET Error:', error);
    return NextResponse.json({ error: 'Server error checking feedback status.' }, { status: 500 });
  }
}

// 2. POST: Submit feedback and update lead status
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      easeOfUse,
      design,
      usefulness,
      mostUsefulFeature,
      confusingFeature,
      suggestions,
      wouldUseInSchool,
      wouldPay,
      additionalComments,
    } = body;

    if (!leadId || easeOfUse === undefined || design === undefined || usefulness === undefined) {
      return NextResponse.json({ error: 'Missing required feedback parameters.' }, { status: 400 });
    }

    // Save feedback
    const feedback = await prisma.feedback.create({
      data: {
        leadId,
        easeOfUse: parseInt(easeOfUse, 10),
        design: parseInt(design, 10),
        usefulness: parseInt(usefulness, 10),
        mostUsefulFeature: mostUsefulFeature || '',
        confusingFeature: confusingFeature || '',
        suggestions: suggestions || '',
        wouldUseInSchool,
        wouldPay,
        additionalComments: additionalComments || null,
      },
    });

    // Update Lead status
    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: {
        leadStatus: 'FEEDBACK_RECEIVED',
      },
    });

    // Send thank you email
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
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Thank You for Your Feedback!</h2>
          </div>
          <div class="content">
            <p>Hello ${lead.contactName || 'Valued Tester'},</p>
            <p>Thank you so much for taking the time to share your feedback on the NachoEd School Management SaaS platform.</p>
            
            <p>Your inputs regarding ease of use, design, and product features have been directly logged in our CRM dashboard. We review these comments carefully to refine our grading compilation engines and parent/teacher portals.</p>
            
            <p>If you are interested in starting a pilot program or transitioning to a live paying subscription, please don't hesitate to reply directly to this email or speak with our onboarding team.</p>
            
            <p>Best Regards,<br/><strong>The NachoEd Product Team</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;

    await sendEmail({
      leadId: leadId,
      to: lead.email,
      subject: 'Thank you for your feedback on NachoEd!',
      body: emailHtml,
    });

    return NextResponse.json({ success: true, data: feedback });

  } catch (error: any) {
    console.error('Feedback Submit POST Error:', error);
    return NextResponse.json({ error: 'Server error submitting feedback.' }, { status: 500 });
  }
}
