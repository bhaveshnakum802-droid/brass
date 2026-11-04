import { Request, Response } from 'express';
import { transporter, hasSmtpConfigured, getDefaultSenderEmail } from '../utils/email';
import { successResponse, errorResponse } from '../utils/response';

async function sendContactEmail(toEmail: string, mailOptions: any): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = getDefaultSenderEmail();

  if (resendApiKey) {
    console.log(`📡 Sending Contact form email via Resend API to ${toEmail}...`);
    const response = await (globalThis as any).fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: toEmail,
        subject: mailOptions.subject,
        html: mailOptions.html,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Resend API failed: ${response.statusText} - ${errText}`);
    }
    return;
  }

  // Fallback to Nodemailer SMTP if configured
  if (hasSmtpConfigured()) {
    const nodemailerOptions = {
      ...mailOptions,
      from: `"Chetan Brass Contact Form" <${emailFrom}>`,
    };
    await transporter.sendMail(nodemailerOptions);
  }
}

export async function submitContactForm(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, phone, company, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      errorResponse(res, 'Name, email, subject, and message are required fields', 400);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof email !== 'string' || !emailRegex.test(email.trim()) || email.length > 255) {
      errorResponse(res, 'Please provide a valid email address', 400);
      return;
    }

    if (typeof name !== 'string' || name.trim().length > 100) {
      errorResponse(res, 'Name must be 100 characters or less', 400);
      return;
    }

    if (typeof subject !== 'string' || subject.trim().length > 200) {
      errorResponse(res, 'Subject must be 200 characters or less', 400);
      return;
    }

    if (typeof message !== 'string' || message.trim().length > 5000) {
      errorResponse(res, 'Message must be 5000 characters or less', 400);
      return;
    }

    if (phone && (typeof phone !== 'string' || phone.length > 35)) {
      errorResponse(res, 'Phone number is too long', 400);
      return;
    }

    if (company && (typeof company !== 'string' || company.length > 150)) {
      errorResponse(res, 'Company name is too long', 400);
      return;
    }

    // Forward to Formspree asynchronously in the background
    (globalThis as any).fetch('https://formspree.io/f/xrpppyrg', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _subject: `New Customer Inquiry: ${subject.trim()}`,
        name: name.trim(),
        email: email.trim(),
        phone: phone ? phone.trim() : 'Not provided',
        company: company ? company.trim() : 'Not provided',
        subject: subject.trim(),
        message: message.trim(),
      }),
    })
      .then((response: any) => {
        if (response.ok) {
          console.log('✉️ Formspree contact form email forwarded successfully');
        } else {
          console.error('❌ Formspree failed to forward contact form email');
        }
      })
      .catch((err: any) => console.error('❌ Failed to forward to Formspree:', err.message || err));

    successResponse(res, null, 'Message sent successfully');
  } catch (error) {
    console.error('Contact form submission error:', error);
    errorResponse(res, 'Failed to send message. Please try again later.', 500);
  }
}
