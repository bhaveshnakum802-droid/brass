import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Factory, Eye, EyeOff, Lock, User, Key, ArrowLeft, CheckCircle2, XCircle, Info, LockKeyhole, Mail } from 'lucide-react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import type { AdminUser, ApiResponse, AuthData } from '@/types';

const loginSchema = z.object({
  username: z.string().min(1, 'Username or Email is required'),
  password: z.string().min(1, 'Password is required'),
});
type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'login-otp' | 'forgot-request' | 'forgot-otp' | 'reset-password'>('login');
  const [showPass, setShowPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [otp, setOtp] = useState('');
  const [forgotUsername, setForgotUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string; onConfirm?: () => void } | null>(null);

  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);
  const [otpAttempts, setOtpAttempts] = useState(0);

  const navigate = useNavigate();
  const { setAuth, isAuthenticated } = useAuthStore();

  if (isAuthenticated) return <Navigate to="/owner/dashboard" replace />;

  const { register: registerLogin, handleSubmit: handleSubmitLogin, formState: { errors: loginErrors, isSubmitting: isSubmittingLogin } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  // Action 1: Login Submit
  const onLoginSubmit = async (data: LoginForm) => {
    try {
      const res = await authApi.login(data);
      const resData = (res.data as ApiResponse<any>).data;
      
      if (resData.mfaRequired) {
        setAlert({
          type: 'success',
          title: 'Credentials Verified',
          message: 'Your credentials are correct. A 6-digit verification code has been sent to your registered email.',
          onConfirm: () => {
            setMfaToken(resData.mfaToken);
            setMode('login-otp');
            setOtp('');
            setOtpAttempts(0);
          }
        });
      } else {
        const { accessToken, refreshToken, user } = resData as AuthData;
        setAlert({
          type: 'success',
          title: 'Success Login',
          message: 'Welcome back! Redirecting you to the dashboard...',
          onConfirm: () => {
            setAuth(accessToken, user as AdminUser, refreshToken);
            navigate('/owner/dashboard');
          }
        });
      }
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAlert({
        type: 'error',
        title: 'Authentication Failed',
        message: axiosErr.response?.data?.message || 'Invalid username or password. Please try again.'
      });
    }
  };

  // Action 2: Login OTP Verify
  const onVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setAlert({
        type: 'error',
        title: 'Invalid OTP',
        message: 'OTP must be exactly 6 digits.'
      });
      return;
    }
    try {
      setIsVerifyingOtp(true);
      const res = await authApi.verifyOtp({ mfaToken: mfaToken!, otp });
      const { accessToken, refreshToken, user } = (res.data as ApiResponse<AuthData>).data;
      
      setAlert({
        type: 'success',
        title: 'Successful Login',
        message: 'Security check passed! Click OK to launch the owner panel.',
        onConfirm: () => {
          setAuth(accessToken, user as AdminUser, refreshToken);
          navigate('/owner/dashboard');
        }
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);
      if (newAttempts >= 3) {
        setAlert({
          type: 'error',
          title: 'Too Many Failed Attempts',
          message: 'You have entered an incorrect OTP 3 times. Redirecting to home...',
          onConfirm: () => {
            navigate('/');
          }
        });
      } else {
        setAlert({
          type: 'error',
          title: 'Verification Failed',
          message: axiosErr.response?.data?.message || `The OTP code is invalid or has expired. You have ${3 - newAttempts} attempts remaining.`
        });
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Action 3: Forgot Password Request Submit
  const onForgotRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setAlert({
        type: 'error',
        title: 'Required Field',
        message: 'Please enter your username or email address.'
      });
      return;
    }
    try {
      setIsSubmittingForgot(true);
      const res = await authApi.forgotPassword({ username: forgotUsername });
      const resData = (res.data as ApiResponse<any>).data;
      
      setAlert({
        type: 'success',
        title: 'Reset Code Sent',
        message: 'Account verified. A 6-digit password reset OTP has been sent to your registered email address.',
        onConfirm: () => {
          setResetToken(resData.resetToken);
          setMode('forgot-otp');
          setOtp('');
          setOtpAttempts(0);
        }
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAlert({
        type: 'error',
        title: 'Verification Failed',
        message: axiosErr.response?.data?.message || 'We could not find an owner account associated with that username.'
      });
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  // Action 4: Forgot OTP Verify Transition
  const onForgotOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setAlert({
        type: 'error',
        title: 'Invalid OTP',
        message: 'Please enter the 6-digit OTP code sent to your email.'
      });
      return;
    }
    try {
      setIsVerifyingOtp(true);
      await authApi.verifyResetOtp({ resetToken: resetToken!, otp });
      
      setAlert({
        type: 'success',
        title: 'OTP Verified',
        message: 'OTP verification code verified successfully. Click OK to set your new password.',
        onConfirm: () => {
          setMode('reset-password');
          setOtpAttempts(0);
        }
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      const newAttempts = otpAttempts + 1;
      setOtpAttempts(newAttempts);
      if (newAttempts >= 3) {
        setAlert({
          type: 'error',
          title: 'Too Many Failed Attempts',
          message: 'You have entered an incorrect OTP 3 times. Redirecting to home...',
          onConfirm: () => {
            navigate('/');
          }
        });
      } else {
        setAlert({
          type: 'error',
          title: 'Verification Failed',
          message: axiosErr.response?.data?.message || `The OTP code is invalid or has expired. You have ${3 - newAttempts} attempts remaining.`
        });
      }
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Action 5: Reset Password Submit
  const onResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setAlert({
        type: 'error',
        title: 'Weak Password',
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setAlert({
        type: 'error',
        title: 'Mismatched Passwords',
        message: 'New password and confirm password do not match.'
      });
      return;
    }

    try {
      setIsSubmittingReset(true);
      await authApi.resetPassword({
        resetToken: resetToken!,
        otp,
        newPassword
      });

      setAlert({
        type: 'success',
        title: 'Password Reset Successful',
        message: 'Your password has been successfully updated. Click OK to login with your new credentials.',
        onConfirm: () => {
          setMode('login');
          setForgotUsername('');
          setOtp('');
          setNewPassword('');
          setConfirmPassword('');
          setResetToken(null);
          setMfaToken(null);
        }
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setAlert({
        type: 'error',
        title: 'Reset Failed',
        message: axiosErr.response?.data?.message || 'Failed to update password. Your OTP code may be invalid or expired. Please start over.'
      });
    } finally {
      setIsSubmittingReset(false);
    }
  };

  // Form transition animations
  const formVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: 'easeOut' } },
    exit: { opacity: 0, y: -15, scale: 0.98, transition: { duration: 0.25, ease: 'easeIn' } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-DEFAULT/10 rounded-full blur-[100px] pointer-events-none animate-pulse duration-5000" />
      <div className="absolute inset-0 hero-pattern opacity-40 pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full max-w-md"
      >
        {/* Glow behind card */}
        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-primary-500 to-accent-DEFAULT opacity-20 blur-xl group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

        {/* Card */}
        <div className="relative bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_20px_50px_rgba(15,23,42,0.3)] border border-white/20 p-8 sm:p-10 overflow-hidden">
          <AnimatePresence mode="wait">
            
            {/* 1. Login Form */}
            {mode === 'login' && (
              <motion.div key="login" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-DEFAULT to-primary-800 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_20px_rgba(26,110,168,0.25)] hover:scale-105 hover:rotate-3 transition-all duration-300">
                    <Factory size={30} className="text-white animate-bounce-subtle" />
                  </div>
                  <h1 className="font-heading font-extrabold text-2xl text-dark-900 tracking-tight">Owner Login</h1>
                  <p className="text-gray-400 text-sm mt-1">Sign in to manage your website</p>
                </div>

                <form onSubmit={handleSubmitLogin(onLoginSubmit)} className="space-y-5">
                  <div>
                    <label className="form-label text-dark-800">Username or Email</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                      <input 
                        {...registerLogin('username')} 
                        className="form-input pl-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all rounded-xl" 
                        placeholder="admin" 
                        autoComplete="username" 
                      />
                    </div>
                    {loginErrors.username && <p className="form-error mt-1 text-xs text-red-500 font-semibold">{loginErrors.username.message}</p>}
                  </div>

                  <div>
                    <label className="form-label text-dark-800">Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                      <input 
                        {...registerLogin('password')} 
                        type={showPass ? 'text' : 'password'} 
                        className="form-input pl-10 pr-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all rounded-xl" 
                        placeholder="••••••••" 
                        autoComplete="current-password" 
                      />
                      <button type="button" onClick={() => setShowPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-900 transition-colors focus:outline-none">
                        {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {loginErrors.password && <p className="form-error mt-1 text-xs text-red-500 font-semibold">{loginErrors.password.message}</p>}
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmittingLogin} 
                    className="w-full btn-primary bg-gradient-to-r from-primary-DEFAULT to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl py-3 shadow-[0_4px_15px_rgba(26,110,168,0.25)] hover:shadow-[0_4px_25px_rgba(26,110,168,0.4)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {isSubmittingLogin ? 'Validating...' : 'Sign In'}
                  </button>
                </form>

                <div className="text-center mt-8 border-t border-gray-100 pt-4 flex items-center justify-between px-1">
                  <button 
                    type="button" 
                    onClick={() => {
                      setMode('forgot-request');
                      setForgotUsername('');
                      setOtp('');
                      setOtpAttempts(0);
                    }} 
                    className="text-sm font-semibold text-primary-DEFAULT hover:text-primary-700 transition-colors focus:outline-none"
                  >
                    Forgot Password?
                  </button>

                  <a
                    href="https://chetan-brass.vercel.app/"
                    className="text-sm font-semibold text-gray-500 hover:text-dark-900 transition-colors focus:outline-none flex items-center gap-1"
                  >
                    <ArrowLeft size={14} />
                    Back to Website
                  </a>
                </div>
              </motion.div>
            )}

            {/* 2. Login OTP Form */}
            {mode === 'login-otp' && (
              <motion.div key="login-otp" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_20px_rgba(220,38,38,0.25)] hover:scale-105 transition-all duration-300">
                    <Key size={30} className="text-white" />
                  </div>
                  <h1 className="font-heading font-extrabold text-2xl text-dark-900 tracking-tight">2FA Verification</h1>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    A 6-digit verification code has been sent to the owner's registered email.
                  </p>
                </div>

                <form onSubmit={onVerifyOtpSubmit} className="space-y-6">
                  <div>
                    <label className="form-label text-center block text-dark-800 mb-3 font-bold">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      pattern="\d*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="form-input text-center text-3xl font-extrabold tracking-[0.5em] h-16 border-2 border-gray-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 rounded-2xl bg-gray-50/50"
                      placeholder="••••••"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isVerifyingOtp || otp.length !== 6}
                    className="w-full btn-primary bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl py-3 shadow-[0_4px_15px_rgba(220,38,38,0.25)] hover:shadow-[0_4px_25px_rgba(220,38,38,0.4)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isVerifyingOtp ? 'Verifying OTP...' : 'Verify & Sign In'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setOtp('');
                      setMfaToken(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 hover:text-dark-900 transition-colors mt-2"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </button>
                </form>
              </motion.div>
            )}

            {/* 3. Forgot Password Request */}
            {mode === 'forgot-request' && (
              <motion.div key="forgot-request" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-DEFAULT to-primary-800 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_20px_rgba(26,110,168,0.25)] hover:scale-105 transition-all duration-300">
                    <LockKeyhole size={30} className="text-white animate-pulse" />
                  </div>
                  <h1 className="font-heading font-extrabold text-2xl text-dark-900 tracking-tight">Forgot Password</h1>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    Enter your username or email address, and we'll send you an OTP to reset your password.
                  </p>
                </div>

                <form onSubmit={onForgotRequestSubmit} className="space-y-6">
                  <div>
                    <label className="form-label text-dark-800">Username or Email</label>
                    <div className="relative group">
                      <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                      <input
                        type="text"
                        value={forgotUsername}
                        onChange={(e) => setForgotUsername(e.target.value)}
                        className="form-input pl-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all rounded-xl"
                        placeholder="Enter owner username"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingForgot || !forgotUsername.trim()}
                    className="w-full btn-primary bg-gradient-to-r from-primary-DEFAULT to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl py-3 shadow-[0_4px_15px_rgba(26,110,168,0.25)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-60"
                  >
                    {isSubmittingForgot ? 'Validating Account...' : 'Send Reset Code'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setForgotUsername('');
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 hover:text-dark-900 transition-colors mt-2"
                  >
                    <ArrowLeft size={16} />
                    Back to Login
                  </button>
                </form>
              </motion.div>
            )}

            {/* 4. Forgot Password OTP Verify */}
            {mode === 'forgot-otp' && (
              <motion.div key="forgot-otp" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_20px_rgba(220,38,38,0.25)] hover:scale-105 transition-all duration-300">
                    <Mail size={30} className="text-white" />
                  </div>
                  <h1 className="font-heading font-extrabold text-2xl text-dark-900 tracking-tight">Reset Verification</h1>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    We sent a 6-digit reset verification code to the owner's registered email.
                  </p>
                </div>

                <form onSubmit={onForgotOtpSubmit} className="space-y-6">
                  <div>
                    <label className="form-label text-center block text-dark-800 mb-3 font-bold">Enter 6-Digit OTP</label>
                    <input
                      type="text"
                      pattern="\d*"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="form-input text-center text-3xl font-extrabold tracking-[0.5em] h-16 border-2 border-gray-200 focus:border-primary-600 focus:ring-4 focus:ring-primary-600/10 rounded-2xl bg-gray-50/50"
                      placeholder="••••••"
                      required
                      autoFocus
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otp.length !== 6}
                    className="w-full btn-primary bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl py-3 shadow-[0_4px_15px_rgba(220,38,38,0.25)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-60"
                  >
                    Confirm OTP
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot-request');
                      setOtp('');
                    }}
                    className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-gray-400 hover:text-dark-900 transition-colors mt-2"
                  >
                    <ArrowLeft size={16} />
                    Change Username / Back
                  </button>
                </form>
              </motion.div>
            )}

            {/* 5. Change Password Form */}
            {mode === 'reset-password' && (
              <motion.div key="reset-password" variants={formVariants} initial="hidden" animate="visible" exit="exit">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-DEFAULT to-primary-800 flex items-center justify-center mx-auto mb-4 shadow-[0_8px_20px_rgba(26,110,168,0.25)] hover:scale-105 transition-all duration-300">
                    <LockKeyhole size={30} className="text-white" />
                  </div>
                  <h1 className="font-heading font-extrabold text-2xl text-dark-900 tracking-tight">New Password</h1>
                  <p className="text-gray-400 text-sm mt-2 leading-relaxed">
                    Set a secure new password for your owner account.
                  </p>
                </div>

                <form onSubmit={onResetPasswordSubmit} className="space-y-5">
                  <div>
                    <label className="form-label text-dark-800">New Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="form-input pl-10 pr-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all rounded-xl"
                        placeholder="Min 8 characters"
                        required
                        minLength={8}
                      />
                      <button type="button" onClick={() => setShowNewPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-900 transition-colors focus:outline-none">
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="form-label text-dark-800">Confirm Password</label>
                    <div className="relative group">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                      <input
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="form-input pl-10 pr-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all rounded-xl"
                        placeholder="Re-enter password"
                        required
                        minLength={8}
                      />
                      <button type="button" onClick={() => setShowConfirmPass((p) => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-900 transition-colors focus:outline-none">
                        {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingReset || newPassword.length < 8 || newPassword !== confirmPassword}
                    className="w-full btn-primary bg-gradient-to-r from-primary-DEFAULT to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-xl py-3 shadow-[0_4px_15px_rgba(26,110,168,0.25)] transition-all duration-300 font-bold active:scale-95 disabled:opacity-60"
                  >
                    {isSubmittingReset ? 'Resetting Password...' : 'Reset Password'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setForgotUsername('');
                      setOtp('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setResetToken(null);
                    }}
                    className="w-full text-center text-sm font-semibold text-gray-400 hover:text-dark-900 transition-colors mt-2 focus:outline-none"
                  >
                    Cancel & Exit
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Premium Custom SweetAlert-style Popup Overlay */}
      <AnimatePresence>
        {alert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (alert.onConfirm) alert.onConfirm();
                setAlert(null);
              }}
              className="absolute inset-0 bg-dark-950/70 backdrop-blur-md"
            />
            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-[0_25px_60px_rgba(0,0,0,0.25)] p-8 text-center border border-gray-100 z-10"
            >
              {/* Icon container */}
              <div className="mx-auto mb-5 flex items-center justify-center">
                {alert.type === 'success' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.25, 1] }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20"
                  >
                    <CheckCircle2 size={36} className="animate-pulse" />
                  </motion.div>
                ) : alert.type === 'error' ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.25, 1] }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20"
                  >
                    <XCircle size={36} />
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: [0, 1.25, 1] }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20"
                  >
                    <Info size={36} />
                  </motion.div>
                )}
              </div>

              <h3 className="font-heading font-extrabold text-xl text-dark-900 mb-2 tracking-tight">{alert.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 px-2">{alert.message}</p>

              <button
                onClick={() => {
                  if (alert.onConfirm) alert.onConfirm();
                  setAlert(null);
                }}
                className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-md transform active:scale-95 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 shadow-red-500/20 hover:shadow-red-500/30"
              >
                OK
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
