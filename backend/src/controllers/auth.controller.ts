import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomInt } from 'crypto';
import { prisma } from '../utils/prisma';
import { signAccessToken, signRefreshToken, verifyRefreshToken, getAccessSecret } from '../utils/jwt';
import { transporter, hasSmtpConfigured, getDefaultSenderEmail } from '../utils/email';
import { successResponse, errorResponse } from '../utils/response';
import { AuthRequest } from '../types';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: (process.env.NODE_ENV === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 1 * 60 * 60 * 1000, // 1 hour session timeout
  path: '/',
};

async function sendOtpEmail(otp: string, toEmail: string, subjectTitle: string = 'Your 2FA Login OTP Code'): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = getDefaultSenderEmail();

  if (resendApiKey) {
    console.log(`📡 Sending OTP email via Resend API to ${toEmail}...`);
    const response = await (globalThis as any).fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: emailFrom,
        to: toEmail,
        subject: subjectTitle,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
            <h2 style="color: #3b82f6;">Owner Portal Security Verification</h2>
            <p>Use the following One-Time Password (OTP) to complete your verification:</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e3a8a; padding: 15px 0; text-align: center; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0;">
              ${otp}
            </div>
            <p style="color: #ef4444; font-size: 13px;">This code is valid for 5 minutes. If you did not request this code, please ignore this email or secure your password.</p>
          </div>
        `,
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
    const mailOptions = {
      from: `"Owner Portal" <${emailFrom}>`,
      to: toEmail,
      subject: subjectTitle,
      text: `Your one-time password (OTP) is: ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 500px;">
          <h2 style="color: #3b82f6;">Owner Portal Security Verification</h2>
          <p>Use the following One-Time Password (OTP) to complete your verification:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1e3a8a; padding: 15px 0; text-align: center; background-color: #f3f4f6; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #ef4444; font-size: 13px;">This code is valid for 5 minutes. If you did not request this code, please ignore this email or secure your password.</p>
        </div>
      `,
    };
    await transporter.sendMail(mailOptions);
  } else {
    throw new Error('No email provider configured. Please configure RESEND_API_KEY or SMTP_USER/SMTP_PASS.');
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

    // Store bcrypt-hashed OTP in database so plain-text OTP is never stored
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { otpCode: hashedOtp, otpExpiresAt },
    });

    console.log(`🔑 [MFA] 2FA OTP code generated for user "${admin.username}"`);

    // Send email asynchronously
    sendOtpEmail(otp, admin.email, 'Your 2FA Login OTP Code')
      .then(() => {
        console.log(`✉️ OTP email sent successfully to ${admin.email}`);
      })
      .catch((emailError) => {
        console.error('⚠️ Failed to send OTP email:', emailError.message || emailError);
      });

    // Generate a temporary JWT token for 2FA verification
    const ACCESS_SECRET = getAccessSecret();
    const mfaToken = jwt.sign(
      { id: admin.id, username: admin.username, role: admin.role, purpose: 'mfa' },
      ACCESS_SECRET,
      { expiresIn: '5m' }
    );

    successResponse(res, {
      mfaRequired: true,
      mfaToken,
    }, 'OTP sent to registered email');
  } catch (error) {
    console.error('Login error:', error);
    errorResponse(res, 'Login failed', 500);
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
      const ACCESS_SECRET = getAccessSecret();
      decoded = jwt.verify(mfaToken, ACCESS_SECRET);
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
    const isOtpValid = !isExpired && admin.otpCode ? await bcrypt.compare(String(otp).trim(), admin.otpCode) : false;

    if (!isOtpValid) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    // OTP is correct! Clear OTP fields and update login time
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        otpCode: null,
        otpExpiresAt: null,
        lastLoginAt: new Date(),
      },
    });

    const payload = { id: admin.id, username: admin.username, role: admin.role };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
    successResponse(res, {
      accessToken,
      refreshToken,
      user: { id: admin.id, username: admin.username, email: admin.email, firstName: admin.firstName, lastName: admin.lastName, role: admin.role },
    }, 'Login successful');
  } catch (error) {
    console.error('OTP verification error:', error);
    errorResponse(res, 'OTP verification failed', 500);
  }
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
  successResponse(res, null, 'Logged out successfully');
}

export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) { errorResponse(res, 'Refresh token not found', 401); return; }
    const payload = verifyRefreshToken(token);
    const admin = await prisma.adminUser.findFirst({ where: { id: payload.id, isActive: true } });
    if (!admin) { errorResponse(res, 'User not found', 401); return; }
    const newPayload = { id: admin.id, username: admin.username, role: admin.role };
    const newAccessToken = signAccessToken(newPayload);
    const newRefreshToken = signRefreshToken(newPayload);
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

    // Prevent user enumeration: Return uniform response even if user doesn't exist
    if (!admin) {
      const dummyToken = jwt.sign(
        { id: 'unknown_account', username, purpose: 'reset' },
        ACCESS_SECRET,
        { expiresIn: '5m' }
      );
      successResponse(res, {
        resetToken: dummyToken,
      }, 'If an account matches those details, an OTP has been sent.');
      return;
    }

    // Generate cryptographically secure random 6-digit OTP
    const otp = randomInt(100000, 1000000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store bcrypt hash of OTP in database
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(otp, salt);

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { otpCode: hashedOtp, otpExpiresAt },
    });

    console.log(`🔑 [MFA] Forgot-password OTP generated for user "${admin.username}"`);

    // Send email via Nodemailer / Resend asynchronously
    sendOtpEmail(otp, admin.email, 'Your Password Reset OTP Code')
      .then(() => {
        console.log(`✉️ Forgot-password OTP email sent successfully to ${admin.email}`);
      })
      .catch((emailError) => {
        console.error('⚠️ Failed to send forgot-password OTP email:', emailError.message || emailError);
      });

    // Generate a temporary JWT token for reset verification
    const resetToken = jwt.sign(
      { id: admin.id, username: admin.username, purpose: 'reset' },
      ACCESS_SECRET,
      { expiresIn: '5m' }
    );

    successResponse(res, {
      resetToken,
    }, 'If an account matches those details, an OTP has been sent.');
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
      const ACCESS_SECRET = getAccessSecret();
      decoded = jwt.verify(resetToken, ACCESS_SECRET);
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
    const isOtpValid = !isExpired && admin.otpCode ? await bcrypt.compare(String(otp).trim(), admin.otpCode) : false;

    if (!isOtpValid) {
      errorResponse(res, 'Invalid or expired OTP', 401);
      return;
    }

    // Hash the new password with strong salt
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // Update password, clear OTP
    await prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        passwordHash,
        otpCode: null,
        otpExpiresAt: null,
      },
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
      const ACCESS_SECRET = getAccessSecret();
      decoded = jwt.verify(resetToken, ACCESS_SECRET);
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
    const isOtpValid = !isExpired && admin.otpCode ? await bcrypt.compare(String(otp).trim(), admin.otpCode) : false;

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

    const userExists = await prisma.adminUser.findUnique({
      where: { id: userId },
    });
    if (!userExists) {
      errorResponse(res, 'User not found. Please log out and log in again.', 401);
      return;
    }

    if (!username && !email && !password) {
      errorResponse(res, 'At least one field (username, email, password) must be provided', 400);
      return;
    }

    if (username) {
      const existingUser = await prisma.adminUser.findFirst({
        where: { username, NOT: { id: userId } }
      });
      if (existingUser) {
        errorResponse(res, 'Username is already taken', 400);
        return;
      }
    }

    if (email) {
      const existingEmail = await prisma.adminUser.findFirst({
        where: { email, NOT: { id: userId } }
      });
      if (existingEmail) {
        errorResponse(res, 'Email is already in use', 400);
        return;
      }
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
