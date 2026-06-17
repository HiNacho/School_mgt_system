import prisma from './db';

interface SendEmailParams {
  leadId: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ leadId, to, subject, body }: SendEmailParams): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.MAIL_FROM || 'NachoEd Onboarding <onboarding@updates.nachoed.com>';
  
  let sentSuccessfully = false;

  console.log(`[Mailer] Attempting to send email to ${to} (Lead ID: ${leadId})`);
  console.log(`[Mailer] Subject: ${subject}`);

  if (apiKey && apiKey.trim() !== '') {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: subject,
          html: body,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Mailer] Email sent successfully via Resend. Message ID: ${data.id}`);
        sentSuccessfully = true;
      } else {
        const errorText = await response.text();
        console.error(`[Mailer] Resend API error (status ${response.status}):`, errorText);
      }
    } catch (err) {
      console.error('[Mailer] Error sending email via Resend API:', err);
    }
  } else {
    console.log('[Mailer] RESEND_API_KEY is not configured. Falling back to local console logger.');
    console.log('------------------ EMAIL BODY START ------------------');
    console.log(body);
    console.log('------------------ EMAIL BODY END --------------------');
    sentSuccessfully = true; // Fallback counts as success for dev/simulation purposes
  }

  // Always log the email to the database for CRM auditing
  try {
    await prisma.emailLog.create({
      data: {
        leadId: leadId,
        recipient: to,
        subject: subject,
        body: body,
      },
    });
    console.log(`[Mailer] Logged email in database for Lead ID: ${leadId}`);
  } catch (err) {
    console.error('[Mailer] Failed to save EmailLog to database:', err);
  }

  return sentSuccessfully;
}
