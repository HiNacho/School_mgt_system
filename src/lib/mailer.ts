import nodemailer from 'nodemailer';
import prisma from './db';

interface SendEmailParams {
  leadId: string;
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail({ leadId, to, subject, body }: SendEmailParams): Promise<boolean> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASSWORD;
  const fromEmail = process.env.MAIL_FROM || `NachoEd Onboarding <${smtpUser}>`;

  let sentSuccessfully = false;

  console.log(`[Mailer] Attempting to send email to ${to} (Lead ID: ${leadId})`);
  console.log(`[Mailer] Subject: ${subject}`);

  if (smtpUser && smtpPass && smtpUser.trim() !== '' && smtpPass.trim() !== '') {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to: to,
        subject: subject,
        html: body,
      });

      console.log(`[Mailer] Email sent successfully via Gmail SMTP. Message ID: ${info.messageId}`);
      sentSuccessfully = true;
    } catch (err) {
      console.error('[Mailer] Error sending email via Gmail SMTP:', err);
    }
  } else {
    console.log('[Mailer] SMTP_USER or SMTP_PASSWORD is not configured. Falling back to local console logger.');
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
