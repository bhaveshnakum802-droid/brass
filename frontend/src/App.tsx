import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect, useState } from 'react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ProtectedRoute from '@/admin/components/ProtectedRoute';
import { useAuthStore } from '@/store/auth.store';
import SelfPing from '@/utils/selfPing';
import { authApi, settingsApi } from '@/services/api';
import WhatsAppButton from '@/components/shared/WhatsAppButton';

// Public pages
const HomePage = lazy(() => import('@/pages/HomePage'));
const ProductsPage = lazy(() => import('@/pages/ProductsPage'));
const ProductDetailPage = lazy(() => import('@/pages/ProductDetailPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const InquiryPage = lazy(() => import('@/pages/InquiryPage'));
const PrivacyPolicyPage = lazy(() => import('@/pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

// Admin pages
const AdminLoginPage = lazy(() => import('@/admin/pages/LoginPage'));
const AdminLayout = lazy(() => import('@/admin/components/AdminLayout'));
const DashboardPage = lazy(() => import('@/admin/pages/DashboardPage'));
const ProductsListPage = lazy(() => import('@/admin/pages/ProductsListPage'));
const ProductFormPage = lazy(() => import('@/admin/pages/ProductFormPage'));
const CategoriesPage = lazy(() => import('@/admin/pages/CategoriesPage'));
const TestimonialsPage = lazy(() => import('@/admin/pages/TestimonialsPage'));
const ServicesPage = lazy(() => import('@/admin/pages/ServicesPage'));
const SiteContentPage = lazy(() => import('@/admin/pages/SiteContentPage'));
const AccountSettingsPage = lazy(() => import('@/admin/pages/AccountSettingsPage'));

function PublicLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!sessionStorage.getItem('cb_visited')) {
      sessionStorage.setItem('cb_visited', '1');
      settingsApi.recordVisit().catch(() => {});
    }
  }, []);

  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <WhatsAppButton />
    </>
  );
}

export default function App() {
  const { isAuthenticated, accessToken, setAccessToken, logout } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);

  useEffect(() => {
    const bootstrapSession = async () => {
      if (!isAuthenticated) {
        // Not logged in — nothing to restore
        setIsValidating(false);
        return;
      }

      if (accessToken) {
        // Access token is already in memory (same tab, no reload) — verify it's still valid
        try {
          await authApi.getMe();
        } catch (err: any) {
          if (err?.response?.status === 401) {
            logout();
          }
        }
        setIsValidating(false);
        return;
      }

      // Access token was lost (page reload, new tab) — silently restore it
      // using the httpOnly refresh-token cookie that the backend manages.
      try {
        const { data } = await authApi.refresh();
        if (data?.data?.accessToken) {
          setAccessToken(data.data.accessToken, data.data.refreshToken ?? null);
        } else {
          logout();
        }
      } catch {
        // Refresh token expired or revoked — force fresh login
        logout();
      }

      setIsValidating(false);
    };

    bootstrapSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isValidating) {
    return <LoadingSpinner fullscreen />;
  }

  return (
    <>
      <SelfPing />
      <Suspense fallback={<LoadingSpinner fullscreen />}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
          <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
          <Route path="/products" element={<PublicLayout><ProductsPage /></PublicLayout>} />
          <Route path="/products/:slug" element={<PublicLayout><ProductDetailPage /></PublicLayout>} />
          <Route path="/inquiry" element={<PublicLayout><InquiryPage /></PublicLayout>} />
          <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
          <Route path="/privacy-policy" element={<PublicLayout><PrivacyPolicyPage /></PublicLayout>} />
          <Route path="/terms-and-conditions" element={<PublicLayout><TermsPage /></PublicLayout>} />

          {/* Owner routes */}
          <Route path="/owner/login" element={<AdminLoginPage />} />
          <Route path="/owner" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/owner/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="products" element={<ProductsListPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="testimonials" element={<TestimonialsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="content" element={<SiteContentPage />} />
            <Route path="settings" element={<AccountSettingsPage />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<PublicLayout><NotFoundPage /></PublicLayout>} />
        </Routes>
      </Suspense>
    </>
  );
}
