import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Factory, Phone, Mail, MapPin, Linkedin, Facebook, Instagram, Youtube, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { settingsApi, categoriesApi } from '@/services/api';
import type { SiteSettings, Category } from '@/types';

export default function Footer() {
  const navigate = useNavigate();
  const { data: settings } = useQuery({ queryKey: ['settings'], queryFn: () => settingsApi.getAll().then((r) => r.data.data as SiteSettings), staleTime: 10 * 60 * 1000 });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.getAll().then((r) => r.data.data as Category[]), staleTime: 10 * 60 * 1000 });

  const siteName = settings?.site_name || '[Client Name] Industries';
  const tagline = settings?.site_tagline || 'Precision. Quality. Reliability.';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'l') {
        e.preventDefault();
        navigate('/owner/login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const quickLinks = [
    { to: '/', label: 'Home' }, { to: '/about', label: 'About Us' },
    { to: '/products', label: 'Products' }, { to: '/contact', label: 'Contact' },
  ];

  const socials = [
    { icon: Linkedin, url: settings?.social_linkedin, label: 'LinkedIn' },
    { icon: Facebook, url: settings?.social_facebook, label: 'Facebook' },
    { icon: Instagram, url: settings?.social_instagram, label: 'Instagram' },
    { icon: Youtube, url: settings?.social_youtube, label: 'YouTube' },
  ].filter((s) => s.url);

  return (
    <footer className="bg-dark-900 text-gray-400">
      {/* Main footer */}
      <div className="container-xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link to="/" className="inline-flex mb-5">
              <div className="bg-white px-4 py-2 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 hover:scale-[1.02] transition-transform">
                <img
                  src={settings?.site_logo || "/images/hero/cbi-logo.png"}
                  alt={siteName}
                  className="h-11 md:h-12 w-auto max-w-[240px] md:max-w-[280px] object-contain"
                />
              </div>
            </Link>
            <p className="text-sm leading-relaxed mb-6">{settings?.site_description || 'Leading manufacturer and exporter of precision brass components, custom turned parts, and industrial fittings in Jamnagar, Gujarat.'}</p>
            <div className="flex gap-3">
              {/* Facebook */}
              <a
                key="Facebook"
                href={settings?.social_facebook || 'https://facebook.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-600 flex items-center justify-center text-gray-400 hover:bg-[#1877F2] hover:text-white hover:border-transparent transition-all duration-300"
              >
                <Facebook size={18} />
              </a>

              {/* Instagram */}
              <a
                key="Instagram"
                href={settings?.social_instagram || 'https://instagram.com'}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-600 flex items-center justify-center text-gray-400 hover:bg-gradient-to-tr hover:from-[#f9ce34] hover:via-[#ee2a7b] hover:to-[#6228d7] hover:text-white hover:border-transparent transition-all duration-300"
              >
                <Instagram size={18} />
              </a>

              {/* WhatsApp */}
              <a
                key="WhatsApp"
                href={`https://wa.me/${settings?.whatsapp_number || '919924464511'}?text=${encodeURIComponent('Hello, I am interested in your products.')}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                className="w-10 h-10 rounded-xl bg-dark-800 border border-dark-600 flex items-center justify-center text-gray-400 hover:bg-[#25D366] hover:text-white hover:border-transparent transition-all duration-300"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.963C16.588 1.981 14.115.95 11.482.95 6.042.95 1.614 5.32 1.61 10.749c-.001 1.744.469 3.447 1.361 4.966L1.932 21.9l6.3-1.654-.585-.092zm10.312-7.143c-.27-.135-1.597-.788-1.846-.879-.25-.09-.43-.135-.61.135-.18.27-.696.879-.852 1.058-.157.18-.314.202-.584.067-.27-.135-1.14-.42-2.172-1.341-.803-.715-1.346-1.597-1.503-1.867-.157-.27-.017-.417.118-.552.122-.122.27-.315.405-.472.135-.157.18-.27.27-.45.09-.18.045-.337-.022-.472-.068-.135-.61-1.468-.836-2.013-.22-.53-.442-.458-.61-.466-.157-.008-.337-.01-.518-.01-.18 0-.472.067-.72.337-.247.27-.945.922-.945 2.247s.965 2.6 1.1 2.78c.135.18 1.9 2.9 4.604 4.07 2.7.1.325.2.637.28.326.08.7.2 1.168.325.438.12.922.3 1.258.337.337.037.72.067.72-.045s.54-.52.54-1.22c0-.7-.27-.81-.36-.945z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-heading font-semibold text-white text-base mb-5">Quick Links</h3>
            <ul className="space-y-2.5">
              {quickLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} className="flex items-center gap-2 text-sm hover:text-accent-DEFAULT transition-colors group">
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-heading font-semibold text-white text-base mb-5">Product Categories</h3>
            <ul className="space-y-2.5">
              {categories?.slice(0, 6).map((cat) => (
                <li key={cat.id}>
                  <Link to={`/products?category=${cat.slug}`} className="flex items-center gap-2 text-sm hover:text-accent-DEFAULT transition-colors group">
                    <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-white text-base mb-5">Contact Info</h3>
            <ul className="space-y-4">
              {settings?.contact_address && (
                <li className="flex items-start gap-3">
                  <MapPin size={15} className="text-accent-DEFAULT mt-0.5 shrink-0" />
                  <span className="text-sm whitespace-pre-line">{settings.contact_address}</span>
                </li>
              )}
              {settings?.contact_phone && (
                <li className="flex items-center gap-3">
                  <Phone size={15} className="text-accent-DEFAULT shrink-0" />
                  <a href={`tel:${settings.contact_phone}`} className="text-sm hover:text-white transition-colors">{settings.contact_phone}</a>
                </li>
              )}
              {settings?.contact_phone_alt && (
                <li className="flex items-center gap-3">
                  <Phone size={15} className="text-accent-DEFAULT shrink-0" />
                  <a href={`tel:${settings.contact_phone_alt}`} className="text-sm hover:text-white transition-colors">{settings.contact_phone_alt}</a>
                </li>
              )}
              {settings?.contact_email && (
                <li className="flex items-center gap-3">
                  <Mail size={15} className="text-accent-DEFAULT shrink-0" />
                  <a href={`mailto:${settings.contact_email}`} className="text-sm hover:text-white transition-colors">{settings.contact_email}</a>
                </li>
              )}
              <li className="flex items-center gap-3 pt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-accent-DEFAULT/20 text-accent-DEFAULT border border-accent-DEFAULT/30">
                  GSTIN
                </span>
                <span className="text-sm font-mono tracking-wider text-gray-300 font-medium">
                  {settings?.gst_number || '24ATFPN6016R1Z9'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-dark-700">
        <div className="container-xl py-5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
            <span>
              <span
                onClick={() => navigate('/owner/login')}
                className="cursor-default select-none"
              >
                © {new Date().getFullYear()}
              </span>{' '}
              {siteName}. All rights reserved.
            </span>
            <span className="text-dark-500 hidden sm:inline">•</span>
            <span className="text-gray-400 font-mono">GSTIN: {settings?.gst_number || '24ATFPN6016R1Z9'}</span>
          </div>

          <div className="text-gray-400 text-center">
            Designed & Developed by{' '}
            <a
              href="https://www.linkedin.com/in/rnakum"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-accent-DEFAULT font-medium transition-colors underline-offset-4 hover:underline"
            >
              Rajnish Nakum
            </a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/terms-and-conditions" className="hover:text-white transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
