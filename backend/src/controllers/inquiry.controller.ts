import { Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { transporter, hasSmtpConfigured, getDefaultSenderEmail } from '../utils/email';
import { successResponse, errorResponse } from '../utils/response';

async function sendInquiryEmail(toEmail: string, mailOptions: any): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = getDefaultSenderEmail();

  if (resendApiKey) {
    console.log(`📡 [Email] Dispatching RFQ inquiry via Resend...`);
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
      from: `"Chetan Brass RFQ Portal" <${emailFrom}>`,
    };
    await transporter.sendMail(nodemailerOptions);
  }
}

export async function submitInquiryForm(req: Request, res: Response): Promise<void> {
  try {
    const { name, company, email, phone, productId, quantity, requirements } = req.body;

    if (!name || !email || !phone || !productId || !requirements) {
      errorResponse(res, 'Name, email, phone, product, and requirements are required fields', 400);
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

    if (typeof phone !== 'string' || phone.trim().length > 35) {
      errorResponse(res, 'Phone number is too long', 400);
      return;
    }

    if (typeof requirements !== 'string' || requirements.trim().length > 5000) {
      errorResponse(res, 'Requirements must be 5000 characters or less', 400);
      return;
    }

    if (company && (typeof company !== 'string' || company.length > 150)) {
      errorResponse(res, 'Company name is too long', 400);
      return;
    }

    if (quantity && (typeof quantity !== 'string' || quantity.length > 50)) {
      errorResponse(res, 'Quantity format is too long', 400);
      return;
    }

    // Resolve product name from database
    let productName = 'General inquiry / Choose a Product';
    if (productId && productId !== 'general') {
      const product = await prisma.product.findUnique({
        where: { id: String(productId) },
      });
      if (product) {
        productName = `${product.name} (SKU: ${product.sku || 'N/A'})`;
      } else {
        // Fallback check if it was sent as a slug
        const productBySlug = await prisma.product.findUnique({
          where: { slug: String(productId) },
        });
        if (productBySlug) {
          productName = `${productBySlug.name} (SKU: ${productBySlug.sku || 'N/A'})`;
        }
      }
    }

    // Forward to Formspree asynchronously in the background
    (globalThis as any).fetch('https://formspree.io/f/xrpppyrg', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        _subject: `New RFQ Inquiry: ${productName}`,
        name: name.trim(),
        company: company ? company.trim() : 'Not provided',
        email: email.trim(),
        phone: phone.trim(),
        product: productName,
        quantity: quantity ? quantity.trim() : 'Not specified',
        requirements: requirements.trim(),
      }),
    })
      .then((response: any) => {
        if (response.ok) {
          console.log('✉️ Formspree RFQ inquiry email forwarded successfully');
        } else {
          console.error('❌ Formspree failed to forward RFQ inquiry email');
        }
      })
      .catch((err: any) => console.error('❌ Failed to forward to Formspree:', err.message || err));

    successResponse(res, null, 'Inquiry sent successfully');
  } catch (error) {
    console.error('Inquiry form submission error:', error);
    errorResponse(res, 'Failed to send inquiry. Please try again later.', 500);
  }
}
