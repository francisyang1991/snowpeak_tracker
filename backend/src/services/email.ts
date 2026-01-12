import { Resend } from 'resend';

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

export async function sendAlertEmail(params: SendEmailParams): Promise<void> {
  const resend = getResendClient();
  if (!resend) {
    // No API key configured; treat as "email disabled"
    return;
  }

  const from = process.env.ALERT_FROM_EMAIL || 'SnowPeak Alerts <onboarding@resend.dev>';

  await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
}

