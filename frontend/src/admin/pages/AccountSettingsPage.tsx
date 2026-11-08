import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, User, Mail, Lock, Eye, EyeOff, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { authApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';

const accountSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().optional().or(z.literal('')),
  confirmPassword: z.string().optional().or(z.literal('')),
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password.length >= 8;
  }
  return true;
}, {
  message: 'Password must be at least 8 characters',
  path: ['password'],
}).refine((data) => {
  return data.password === data.confirmPassword;
}, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type AccountForm = z.infer<typeof accountSchema>;

export default function AccountSettingsPage() {
  const { user } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm<AccountForm>({
    resolver: zodResolver(accountSchema),
    defaultValues: {
      username: user?.username || '',
      email: user?.email || '',
      password: '',
      confirmPassword: '',
    }
  });

  const onSubmit = async (data: AccountForm) => {
    try {
      const payload: any = {
        username: data.username,
        email: data.email,
      };
      if (data.password && data.password.trim() !== '') {
        payload.password = data.password;
      }

      const res = await authApi.updateAccount(payload);
      const updatedUser = res.data.data.user;

      // Update local Zustand store
      useAuthStore.setState({ user: updatedUser });

      setAlert({
        type: 'success',
        title: 'Settings Saved',
        message: 'Account details updated successfully. If email was changed, OTP verification will now use the new email.'
      });

      // Clear password fields
      reset({
        username: updatedUser.username,
        email: updatedUser.email,
        password: '',
        confirmPassword: '',
      });
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to update account details. Please try again.';
      setAlert({
        type: 'error',
        title: 'Update Failed',
        message: errMsg
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="font-heading font-bold text-2xl text-dark-900">Account Settings</h2>
        <p className="text-gray-500 text-sm">Update your owner login credentials, password, and registered 2FA verification email.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Left Info Panel */}
        <div className="md:w-80 bg-gradient-to-br from-dark-900 via-dark-800 to-primary-900 p-8 text-white flex flex-col justify-between shrink-0">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shadow-lg shadow-black/10">
              <ShieldCheck size={24} className="text-accent-DEFAULT" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg">Secure Administration</h3>
              <p className="text-gray-200 text-xs mt-2 leading-relaxed">
                We implement mandatory 2FA OTP codes on authentication attempts. If you change your email, make sure you can access the new address to retrieve future verification codes.
              </p>
            </div>
          </div>
          <div className="text-xs text-gray-300 mt-8 border-t border-white/10 pt-4 leading-relaxed">
            Authorized admin credentials modification page.
          </div>
        </div>

        {/* Right Form Panel */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Username */}
            <div>
              <label className="form-label text-dark-800">Login Username</label>
              <div className="relative group">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                <input
                  {...register('username')}
                  className="form-input pl-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 rounded-xl"
                  placeholder="admin"
                />
              </div>
              {errors.username && <p className="form-error mt-1 text-xs text-red-500 font-semibold">{errors.username.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="form-label text-dark-800">Verification Email (OTP Recipient)</label>
              <div className="relative group">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                <input
                  {...register('email')}
                  type="email"
                  className="form-input pl-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 rounded-xl"
                  placeholder="owner@gmail.com"
                />
              </div>
              {errors.email && <p className="form-error mt-1 text-xs text-red-500 font-semibold">{errors.email.message}</p>}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-heading font-semibold text-dark-900 text-sm mb-4">Change Password (Leave blank to keep current)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* New Password */}
              <div>
                <label className="form-label text-dark-800">New Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                  <input
                    {...register('password')}
                    type={showPass ? 'text' : 'password'}
                    className="form-input pl-10 pr-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 rounded-xl"
                    placeholder="Min 6 characters"
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-900 transition-colors focus:outline-none">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="form-error mt-1 text-xs text-red-500 font-semibold">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="form-label text-dark-800">Confirm Password</label>
                <div className="relative group">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-DEFAULT transition-colors" />
                  <input
                    {...register('confirmPassword')}
                    type={showConfirmPass ? 'text' : 'password'}
                    className="form-input pl-10 pr-10 border-gray-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 rounded-xl"
                    placeholder="Re-enter new password"
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-dark-900 transition-colors focus:outline-none">
                    {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="form-error mt-1 text-xs text-red-500 font-semibold">{errors.confirmPassword.message}</p>}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary rounded-xl px-6 py-3 flex items-center gap-2 hover:shadow-lg transition-all duration-300 disabled:opacity-50 font-semibold"
            >
              <Save size={16} />
              {isSubmitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Alert popup overlay */}
      <AnimatePresence>
        {alert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAlert(null)}
              className="absolute inset-0 bg-dark-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center border border-gray-100 z-10"
            >
              <div className="mx-auto mb-5 flex items-center justify-center">
                {alert.type === 'success' ? (
                  <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20">
                    <CheckCircle2 size={36} />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-500 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/20">
                    <XCircle size={36} />
                  </div>
                )}
              </div>
              <h3 className="font-heading font-extrabold text-xl text-dark-900 mb-2 tracking-tight">{alert.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-6 px-2">{alert.message}</p>
              <button
                onClick={() => setAlert(null)}
                className="w-full py-3 rounded-xl font-bold text-white transition-all duration-300 shadow-md bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800"
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
