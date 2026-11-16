import nodemailer from 'nodemailer';

const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;

export const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: smtpUser || '',
    pass: smtpPass || '',
  },
});

export function hasSmtpConfigured(): boolean {
  return Boolean(smtpUser && smtpPass);
}

export function getDefaultSenderEmail(): string {
  const emailFrom = process.env.EMAIL_FROM;
  // If custom email is set and is NOT the unverified placeholder domain
  if (emailFrom && emailFrom.includes('@') && !emailFrom.includes('chetanbrass.com')) {
    return emailFrom;
  }
  // Default to Resend verified onboarding sender for 100% deliverability on free tier
  return smtpUser || 'Chetan Brass <onboarding@resend.dev>';
}

export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'your registered email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  const maskedMiddle = '*'.repeat(Math.min(local.length - 2, 6));
  return `${first}${maskedMiddle}${last}@${domain}`;
}
