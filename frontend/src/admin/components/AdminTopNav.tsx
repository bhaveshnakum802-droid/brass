import { useLocation, Link } from 'react-router-dom';
import { Menu, Bell, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';

const breadcrumbs: Record<string, string> = {
  '/owner/dashboard': 'Dashboard',
  '/owner/products': 'Products',
  '/owner/products/new': 'Add Product',
  '/owner/categories': 'Categories',
  '/owner/testimonials': 'Testimonials',
  '/owner/services': 'Services',
  '/owner/content': 'Site Content',
};

export default function AdminTopNav({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const breadcrumb = breadcrumbs[location.pathname] || (location.pathname.includes('/edit') ? 'Edit Product' : 'Owner Area');

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors lg:hidden">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-heading font-bold text-dark-900 text-lg">{breadcrumb}</h1>
          <p className="text-xs text-gray-400">Owner Area</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a href="https://www.chetanbrassindustries.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-DEFAULT transition-colors">
          <ExternalLink size={14} /> View Website
        </a>
        <button className="relative p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-DEFAULT to-primary-900 flex items-center justify-center text-white font-bold text-sm">
          {user?.username?.charAt(0).toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  );
}
