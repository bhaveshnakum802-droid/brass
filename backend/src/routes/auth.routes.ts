import { Router } from 'express';
import { login, verifyOtp, logout, getMe, refreshToken, forgotPassword, resetPassword, verifyResetOtp, updateAccount } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { z } from 'zod';

const router = Router();

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const verifyOtpSchema = z.object({
  mfaToken: z.string().min(1, 'mfaToken is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const forgotPasswordSchema = z.object({
  username: z.string().min(1, 'Username is required'),
});

const verifyResetOtpSchema = z.object({
  resetToken: z.string().min(1, 'resetToken is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, 'resetToken is required'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

const updateAccountSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});

router.post('/login', validateBody(loginSchema), login);
router.post('/verify-otp', validateBody(verifyOtpSchema), verifyOtp);
router.post('/forgot-password', validateBody(forgotPasswordSchema), forgotPassword);
router.post('/verify-reset-otp', validateBody(verifyResetOtpSchema), verifyResetOtp);
router.post('/reset-password', validateBody(resetPasswordSchema), resetPassword);
router.put('/update-account', authenticate, validateBody(updateAccountSchema), updateAccount);
router.post('/logout', logout);
router.post('/refresh', refreshToken);
router.get('/me', authenticate, getMe);

export default router;
