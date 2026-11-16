import { useQuery } from '@tanstack/react-query';
import { Package, FolderOpen, Star, Zap, Plus, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { productsApi, categoriesApi, testimonialsApi } from '@/services/api';
import { useAuthStore } from '@/store/auth.store';
import type { PaginatedResponse, Product, Category, Testimonial } from '@/types';

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  link,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  link?: string;
}) {
  const content = (
    <div className={`p-5 rounded-2xl border-2 ${color} bg-white group cursor-default relative overflow-hidden transition-all duration-200 hover:shadow-sm`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</p>
          <p className="font-heading font-bold text-2xl sm:text-3xl text-dark-900">{value}</p>
        </div>
        <div className="w-11 h-11 rounded-xl bg-current/10 flex items-center justify-center shrink-0">
          <Icon size={22} className="opacity-80" />
        </div>
      </div>
    </div>
  );
  return link ? <Link to={link} className="block hover:-translate-y-1 transition-transform">{content}</Link> : <div>{content}</div>;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  // Fast optimized queries: exclude 11MB image payloads for instant dashboard load
  const { data: productsData } = useQuery({
    queryKey: ['dashboard-products'],
    queryFn: () => productsApi.getAll({ limit: '5', includeImages: 'false' }).then((r) => r.data as PaginatedResponse<Product>),
  });

  const { data: featuredData } = useQuery({
    queryKey: ['dashboard-featured'],
    queryFn: () => productsApi.getAll({ featured: 'true', limit: '1', includeImages: 'false' }).then((r) => r.data as PaginatedResponse<Product>),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll().then((r) => r.data as { data: Category[] }),
  });

  const { data: testimonialsData } = useQuery({
    queryKey: ['testimonials'],
    queryFn: () => testimonialsApi.getAll().then((r) => r.data as { data: Testimonial[] }),
  });

  const stats = [
    { icon: Package, label: 'Total Products', value: productsData?.pagination?.total ?? '—', color: 'border-primary-200 text-primary-DEFAULT', link: '/owner/products' },
    { icon: Zap, label: 'Featured Products', value: featuredData?.pagination?.total ?? '—', color: 'border-amber-200 text-amber-600', link: '/owner/products' },
    { icon: FolderOpen, label: 'Categories', value: categoriesData?.data?.length ?? '—', color: 'border-blue-200 text-blue-600', link: '/owner/categories' },
    { icon: Star, label: 'Testimonials', value: testimonialsData?.data?.length ?? '—', color: 'border-purple-200 text-purple-600', link: '/owner/testimonials' },
  ];

  const recentProducts = productsData?.data?.slice(0, 5) || [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl text-dark-900">Welcome back, {user?.firstName || user?.username}! 👋</h2>
          <p className="text-gray-500 text-sm mt-1">Here's an overview of your website products and content.</p>
        </div>
        <Link to="/owner/products/new" className="btn-primary btn-md rounded-xl hidden sm:flex">
          <Plus size={16} /> Add Product
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Recent Products */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-heading font-semibold text-dark-900 flex items-center gap-2"><Clock size={16} className="text-gray-400" /> Recent Products</h3>
          <Link to="/owner/products" className="text-sm text-primary-DEFAULT hover:text-primary-700 flex items-center gap-1">View All <ArrowRight size={14} /></Link>
        </div>
        {recentProducts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {['Product', 'Category', 'Status', 'Featured', 'Actions'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentProducts.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-dark-900 text-sm truncate max-w-xs">{p.name}</div>
                    {p.sku && <div className="text-xs text-gray-400 font-mono">{p.sku}</div>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.category?.name}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.status === 'ACTIVE' ? 'bg-green-50 text-green-700' : p.status === 'DRAFT' ? 'bg-yellow-50 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{p.featured ? <span className="text-accent-DEFAULT font-semibold">★ Yes</span> : <span className="text-gray-400">No</span>}</td>
                  <td className="px-6 py-4">
                    <Link to={`/owner/products/${p.id}/edit`} className="text-primary-DEFAULT hover:text-primary-700 text-sm font-medium">Edit</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12 text-gray-400">No products yet. <Link to="/owner/products/new" className="text-primary-DEFAULT hover:underline">Add your first product</Link></div>
        )}
      </div>
    </div>
  );
}
