import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { prisma } from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getAccessSecret } from '../utils/jwt';
import { transporter, hasSmtpConfigured, getDefaultSenderEmail, maskEmail } from '../utils/email';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matches JWT_REFRESH_EXPIRES default)
  path: '/',
};

async function sendOtpEmail(otp: string, toEmail: string, subjectTitle: string = 'Your 2FA Login OTP Code'): Promise<void> {
  const targetEmail = (toEmail && toEmail.includes('@') && !toEmail.endsWith('@example.com'))
    ? toEmail
    : (process.env.ADMIN_EMAIL || 'bhaveshnakum802@gmail.com');

  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = getDefaultSenderEmail();
  const formspreeUrl = process.env.FORMSPREE_URL || 'https://formspree.io/f/xrpppyrg';

  let sent = false;

  // Channel 1: Resend HTTP API
  if (resendApiKey) {
    try {
      console.log(`📡 [Email] Dispatching OTP email to ${targetEmail} via Resend...`);
      const response = await (globalThis as any).fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: emailFrom,
          to: targetEmail,
          subject: subjectTitle,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px; margin: 0 auto;">
              <h2 style="color: #1a6ea8; border-bottom: 2px solid #1a6ea8; padding-bottom: 10px;">Chetan Brass Industries — Owner Security</h2>
              <p style="font-size: 15px; color: #333;">Use the following One-Time Password (OTP) to complete your verification:</p>
              <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a6ea8; padding: 18px 0; text-align: center; background-color: #f0f7ff; border: 1px dashed #1a6ea8; border-radius: 8px; margin: 20px 0;">
                ${otp}
              </div>
              <p style="color: #dc2626; font-size: 13px; font-weight: bold;">⚠️ This code is strictly valid for 5 minutes. Never share this code with anyone.</p>
              <p style="font-size: 12px; color: #666; margin-top: 25px; border-top: 1px solid #eee; pt: 10px;">If you did not request this security code, please immediately check your portal credentials.</p>
            </div>
          `,
        }),
      });

      if (response.ok) {
        console.log(`✉️ [Email] OTP dispatched via Resend successfully to ${targetEmail}`);
        sent = true;
        return;
      } else {
        const errText = await response.text();
        console.warn(`⚠️ [Email] Resend API error (${response.status}): ${errText}`);
      }
    } catch (resendError: any) {
      console.warn(`⚠️ [Email] Resend API threw error:`, resendError.message || resendError);
    }
  }

  // Channel 2: Formspree HTTPS Webhook (Guaranteed delivery on Render free tier to owner's Gmail)
  if (!sent && formspreeUrl) {
    try {
      console.log(`📡 [Email] Attempting Formspree webhook fallback for OTP to ${targetEmail}...`);
      const fsRes = await (globalThis as any).fetch(formspreeUrl, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _subject: `[SECURITY ALERT] Chetan Brass Portal - ${subjectTitle}: ${otp}`,
          title: 'Chetan Brass Industries — Owner Security Verification',
          otp_code: otp,
          recipient_email: targetEmail,
          message: `Your one-time verification code (OTP) is: ${otp}. This code is valid for 5 minutes. Please enter it on the portal to complete verification.`,
          _replyto: targetEmail,
        }),
      });

      if (fsRes.ok) {
        console.log(`✉️ [Email] OTP dispatched via Formspree successfully to ${targetEmail}`);
        sent = true;
        return;
      } else {
        const fsErr = await fsRes.text();
        console.warn(`⚠️ [Email] Formspree dispatch failed: ${fsRes.status} ${fsErr}`);
      }
    } catch (fsError: any) {
      console.warn(`⚠️ [Email] Formspree dispatch error:`, fsError.message || fsError);
    }
  }

  // Channel 3: Nodemailer SMTP (Fallback)
  if (!sent && hasSmtpConfigured()) {
    try {
      console.log(`📡 [Email] Attempting SMTP fallback for OTP to ${targetEmail}...`);
      const mailOptions = {
        from: `"Owner Portal" <${emailFrom}>`,
        to: targetEmail,
        subject: subjectTitle,
        text: `Your one-time password (OTP) is: ${otp}. It is valid for 5 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #1a6ea8;">Owner Portal Security Verification</h2>
            <p>Use the following One-Time Password (OTP) to complete your verification:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1a6ea8; padding: 15px 0; text-align: center; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #dc2626; font-size: 13px;">This code is valid for 5 minutes. If you did not request this code, please secure your password.</p>
          </div>
        `,
      };
      await transporter.sendMail(mailOptions);
      console.log(`✉️ [Email] OTP dispatched via SMTP successfully to ${targetEmail}`);
      sent = true;
      return;
    } catch (smtpError: any) {
      console.warn(`⚠️ [Email] SMTP dispatch error:`, smtpError.message || smtpError);
    }
  }

  if (!sent) {
    console.error(`❌ [Email] All OTP delivery channels failed! Checked Resend, Formspree, and SMTP.`);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    const admin = await prisma.adminUser.findFirst({
      where: { OR: [{ username }, { email: username }], isActive: true },
    });
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      errorResponse(res, 'Invalid credentials', 401);
      return;
    }

    // Cryptographically secure random 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store bcrypt-hashed OTP in database
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { otpCode: hashedOtp, otpExpiresAt },
    });

    console.log(`🔑 [MFA] 2FA OTP generated for user "${admin.username}"`);

    const effectiveEmail = (admin.email && admin.email.includes('@') && !admin.email.endsWith('@example.com'))
      ? admin.email
      : (process.env.ADMIN_EMAIL || 'bhaveshnakum802@gmail.com');

    // Send OTP email asynchronously — do not block HTTP response
    sendOtpEmail(otp, effectiveEmail, 'Your 2FA Login OTP Code')
      .catch((emailError) => {
        console.error('⚠️ [Email] Failed to dispatch OTP email:', emailError.message || emailError);
      });

    // Generate a short-lived MFA session token
    const ACCESS_SECRET = getAccessSecret();
    const mfaToken = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, purpose: 'mfa' },
      ACCESS_SECRET,
      { expiresIn: '5m' }
    );

    const maskedEmail = maskEmail(effectiveEmail);
    successResponse(res, { mfaRequired: true, mfaToken, maskedEmail }, `OTP sent to ${maskedEmail}`);
  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
  }
}

export async function resendOtp(req: Request, res: Response): Promise<void> {
  try {
    const { mfaToken } = req.body;
    if (!mfaToken) {
      errorResponse(res, 'mfaToken is required', 400);
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(mfaToken, getAccessSecret());
    } catch {
      errorResponse(res, 'MFA session has expired. Please log in again.', 401);
      return;
    }

    if (decoded.purpose !== 'mfa') {
      errorResponse(res, 'Invalid MFA session', 401);
      return;
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: decoded.id, isActive: true },
    });

    if (!admin) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const otp = randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { otpCode: hashedOtp, otpExpiresAt },
    });

    console.log(`🔑 [MFA] Resending 2FA OTP for user "${admin.username}"`);

    const effectiveEmail = (admin.email && admin.email.includes('@') && !admin.email.endsWith('@example.com'))
      ? admin.email
      : (process.env.ADMIN_EMAIL || 'bhaveshnakum802@gmail.com');

    sendOtpEmail(otp, effectiveEmail, 'Your 2FA Login OTP Code')
      .catch((emailError) => {
        console.error('⚠️ [Email] Failed to dispatch resent OTP email:', emailError.message || emailError);
      });

    const maskedEmail = maskEmail(effectiveEmail);
    successResponse(res, { maskedEmail }, `A new OTP has been sent to ${maskedEmail}`);
  } catch (error) {
    console.error('Resend OTP error:', error);
    errorResponse(res, 'Failed to resend OTP', 500);
  }
}

export async function verifyOtp(req: Request, res: Response): Promise<void> {
  try {
    const { mfaToken, otp } = req.body;
    if (!mfaToken || !otp) {
      errorResponse(res, 'mfaToken and otp are required', 400);
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(mfaToken, getAccessSecret());
    } catch {
      errorResponse(res, 'MFA session has expired or is invalid. Please log in again.', 401);
      return;
    }

    if (decoded.purpose !== 'mfa') {
      errorResponse(res, 'Invalid MFA session', 401);
      return;
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: decoded.id, isActive: true },
    });

    if (!admin) {
      errorResponse(res, 'User not found', 404);
      return;
    }

    const isExpired = !admin.otpExpiresAt || new Date() > admin.otpExpiresAt;
    const isOtpValid = !isExpired && admin.otpCode
      ? await bcrypt.compare(String(otp).trim(), admin.otpCode)
      : false;

    if (!isOtpValid) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    const payload = { id: admin.id, username: admin.username, role: admin.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    // Store bcrypt hash of refresh token in DB for server-side revocation
    const rtSalt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, rtSalt);

    // Clear OTP, update last login, store refresh token hash
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        lastLoginAt: new Date(),
        refreshTokenHash,
      },
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    successResponse(res, {
      accessToken,
      refreshToken,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        role: admin.role,
      },
    }, 'Login successful');
  } catch (error) {
    console.error('OTP verification error:', error);
    errorResponse(res, 'OTP verification failed', 500);
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    // Revoke refresh token server-side
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await prisma.adminUser.updateMany({
          where: { id: payload.id },
          data: { refreshTokenHash: null },
        });
      } catch {
        // Token already invalid — still clear it
      }
    }
  } catch {
    // Swallow errors — logout should always succeed from client perspective
  }
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
  successResponse(res, null, 'Logged out successfully');
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) { errorResponse(res, 'Refresh token not found', 401); return; }

    const payload = verifyRefreshToken(token);

    const admin = await prisma.adminUser.findFirst({
      where: { id: payload.id, isActive: true },
      select: { id: true, username: true, email: true, firstName: true, lastName: true, role: true, refreshTokenHash: true },
    });

    if (!admin) { errorResponse(res, 'User not found', 401); return; }

    // Verify that this refresh token is the one we issued (revocation check)
    if (!admin.refreshTokenHash || !(await bcrypt.compare(token, admin.refreshTokenHash))) {
      res.clearCookie('refreshToken');
      errorResponse(res, 'Refresh token has been revoked. Please log in again.', 401);
      return;
    }

    const newPayload = { id: admin.id, username: admin.username, role: admin.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);

    // Rotate: store new refresh token hash, invalidate old one
    const rtSalt = await bcrypt.genSalt(10);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, rtSalt);
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { refreshTokenHash: newRefreshTokenHash },
    });

    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    successResponse(res, { accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed');
  } catch {
    res.clearCookie('refreshToken');
    errorResponse(res, 'Invalid refresh token', 401);
  }
}

export async function getMe(req: AuthRequest, res: Response): Promise<void> {
  try {
    const admin = await prisma.adminUser.findUnique({
      where: { id: req.user!.id },
      select: { id: true, username: true, email: true, firstName: true, lastName: true, role: true, lastLoginAt: true },
    });
    if (!admin) { errorResponse(res, 'User not found', 404); return; }
    successResponse(res, admin);
  } catch {
    errorResponse(res, 'Failed to fetch user', 500);
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { username } = req.body;
    if (!username) {
      errorResponse(res, 'Username or Email is required', 400);
      return;
    }

    const admin = await prisma.adminUser.findFirst({
      where: { OR: [{ username }, { email: username }], isActive: true },
    });

    const ACCESS_SECRET = getAccessSecret();

    // Prevent user enumeration: always return the same response shape
    if (!admin) {
      const dummyToken = jwt.sign(
        { id: 'unknown_account', username, purpose: 'reset' },
        ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      successResponse(res, { resetToken: dummyToken, maskedEmail: 'your registered email' }, 'If an account matches those details, an OTP has been sent.');
      return;
    }

    // Cryptographically secure OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { otpCode: hashedOtp, otpExpiresAt },
    });

    console.log(`🔑 [MFA] Forgot-password OTP generated for user "${admin.username}"`);

    const effectiveEmail = (admin.email && admin.email.includes('@') && !admin.email.endsWith('@example.com'))
      ? admin.email
      : (process.env.ADMIN_EMAIL || 'bhaveshnakum802@gmail.com');

    sendOtpEmail(otp, effectiveEmail, 'Your Password Reset OTP Code')
      .catch((emailError) => {
        console.error('⚠️ [Email] Failed to dispatch forgot-password OTP email:', emailError.message || emailError);
      });

    const resetToken = jwt.sign(
      { id: admin.id, username: admin.username, purpose: 'reset' },
      ACCESS_SECRET,
      { expiresIn: '5m' }
    );

    const maskedEmail = maskEmail(effectiveEmail);
    successResponse(res, { resetToken, maskedEmail }, 'If an account matches those details, an OTP has been sent.');
  } catch (error) {
    console.error('Forgot password error:', error);
    errorResponse(res, 'Forgot password request failed', 500);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { resetToken, otp, newPassword } = req.body;
    if (!resetToken || !otp || !newPassword) {
      errorResponse(res, 'All fields (resetToken, otp, newPassword) are required', 400);
      return;
    }

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      errorResponse(res, 'New password must be at least 8 characters long', 400);
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, getAccessSecret());
    } catch {
      errorResponse(res, 'Password reset session has expired. Please try again.', 401);
      return;
    }

    if (decoded.purpose !== 'reset' || decoded.id === 'unknown_account') {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: decoded.id, isActive: true },
    });

    if (!admin) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    const isExpired = !admin.otpExpiresAt || new Date() > admin.otpExpiresAt;
    const isOtpValid = !isExpired && admin.otpCode
      ? await bcrypt.compare(String(otp).trim(), admin.otpCode)
      : false;

    if (!isOtpValid) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null, refreshTokenHash: null },
    });

    successResponse(res, null, 'Password reset successful');
  } catch (error) {
    console.error('Reset password error:', error);
    errorResponse(res, 'Password reset failed', 500);
  }
}

export async function verifyResetOtp(req: Request, res: Response): Promise<void> {
  try {
    const { resetToken, otp } = req.body;
    if (!resetToken || !otp) {
      errorResponse(res, 'resetToken and otp are required', 400);
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, getAccessSecret());
    } catch {
      errorResponse(res, 'Password reset session has expired. Please try again.', 401);
      return;
    }

    if (decoded.purpose !== 'reset' || decoded.id === 'unknown_account') {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    const admin = await prisma.adminUser.findFirst({
      where: { id: decoded.id, isActive: true },
    });

    if (!admin) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    const isExpired = !admin.otpExpiresAt || new Date() > admin.otpExpiresAt;
    const isOtpValid = !isExpired && admin.otpCode
      ? await bcrypt.compare(String(otp).trim(), admin.otpCode)
      : false;

    if (!isOtpValid) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    successResponse(res, null, 'OTP verified successfully');
  } catch (error) {
    console.error('Verify reset OTP error:', error);
    errorResponse(res, 'OTP verification failed', 500);
  }
}

export async function updateAccount(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username, email, password } = req.body;
    const userId = req.user!.id;

    const userExists = await prisma.adminUser.findUnique({ where: { id: userId } });
    if (!userExists) {
      errorResponse(res, 'User not found. Please log out and log in again.', 401);
      return;
    }

    if (!username && !email && !password) {
      errorResponse(res, 'At least one field (username, email, password) must be provided', 400);
      return;
    }

    if (username) {
      const existingUser = await prisma.adminUser.findFirst({ where: { username, NOT: { id: userId } } });
      if (existingUser) { errorResponse(res, 'Username is already taken', 400); return; }
    }

    if (email) {
      const existingEmail = await prisma.adminUser.findFirst({ where: { email, NOT: { id: userId } } });
      if (existingEmail) { errorResponse(res, 'Email is already in use', 400); return; }
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) {
      if (typeof password !== 'string' || password.length < 8) {
        errorResponse(res, 'New password must be at least 8 characters long', 400);
        return;
      }
      const salt = await bcrypt.genSalt(12);
      updateData.passwordHash = await bcrypt.hash(password, salt);
      // Revoke all existing sessions when password changes
      updateData.refreshTokenHash = null;
    }

    const updatedUser = await prisma.adminUser.update({
      where: { id: userId },
      data: updateData,
    });

    successResponse(res, {
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role,
      }
    }, 'Account settings updated successfully');
  } catch (error) {
    console.error('Update account error:', error);
    errorResponse(res, 'Failed to update account settings', 500);
  }
}
