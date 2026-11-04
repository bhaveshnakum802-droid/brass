import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AdminUser } from '@/types';

interface AuthState {
  // Access token is kept in memory ONLY — never persisted to localStorage.
  // This prevents XSS-based token theft. The token is re-acquired on page
  // load via the httpOnly refresh-token cookie that the backend sets.
  accessToken: string | null;

  // Refresh token is intentionally NOT stored here — it lives only in the
  // httpOnly cookie that the backend manages. We keep a reference in
  // the response payload for the Axios interceptor's in-memory rotation,
  // but it is excluded from localStorage persistence via `partialize`.
  refreshToken: string | null;

  user: AdminUser | null;
  isAuthenticated: boolean;

  setAuth: (token: string, user: AdminUser, refreshToken?: string | null) => void;
  setAccessToken: (token: string, refreshToken?: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (accessToken, user, refreshToken = null) =>
        set((prev) => ({
          accessToken,
          refreshToken: refreshToken ?? prev.refreshToken,
          user,
          isAuthenticated: true,
        })),

      setAccessToken: (accessToken, refreshToken = null) =>
        set((prev) => ({
          accessToken,
          refreshToken: refreshToken ?? prev.refreshToken,
        })),

      logout: () =>
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }),
    }),
    {
      name: 'rajnish-auth',
      storage: createJSONStorage(() => localStorage),
      // Only persist the user profile and auth state flag.
      // Tokens are intentionally excluded: access token lives in memory only,
      // refresh token lives in the httpOnly cookie only.
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
