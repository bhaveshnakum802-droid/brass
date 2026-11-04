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
  if (emailFrom && emailFrom.includes('@')) {
    return emailFrom;
  }
  return smtpUser || 'no-reply@chetanbrass.com';
}
