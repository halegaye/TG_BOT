'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  Send,
  Shield,
  Building2,
  Users,
  LogOut,
  FileText,
  History,
  Activity,
  BarChart3,
  Layers,
  Link2,
  Split,
  Upload,
  ShieldAlert,
  Server,
  Bell,
  Database,
  Settings,
  User,
  Monitor,
  Menu,
  X,
} from 'lucide-react';
import { ReactNode, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBrands, getStoredBrandId, setStoredBrandId } from '@/lib/api';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [selectedBrandId, setSelectedBrandId] = useState<string>('');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  });

  useEffect(() => {
    const stored = getStoredBrandId();
    if (stored) {
      setSelectedBrandId(stored);
    } else if (brands.length > 0) {
      setSelectedBrandId(brands[0].id);
      setStoredBrandId(brands[0].id);
    }
  }, [brands]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [pathname]);

  const handleBrandChange = (brandId: string) => {
    setSelectedBrandId(brandId);
    setStoredBrandId(brandId);
    window.location.reload();
  };

  const navGroups = [
    {
      groupTitle: 'GENEL & ANALİZ',
      items: [
        { name: 'Genel Bakış', href: '/dashboard', icon: LayoutDashboard },
        { name: 'İstatistikler', href: '/dashboard/analytics', icon: BarChart3 },
      ],
    },
    {
      groupTitle: 'MARKA & BOTLAR',
      items: [
        { name: 'Markalar', href: '/dashboard/brands', icon: Building2 },
        { name: 'Botlar', href: '/dashboard/bots', icon: Bot },
        { name: 'Bot Sağlık Merkezi', href: '/dashboard/bots/health', icon: Activity },
        { name: 'Toplu Bot Yükle', href: '/dashboard/bots/bulk-import', icon: Upload },
      ],
    },
    {
      groupTitle: 'HEDEF KİTLE & SEGMENTLER',
      items: [
        { name: 'Telegram Kullanıcıları', href: '/dashboard/subscribers', icon: Users },
        { name: 'Segmentler', href: '/dashboard/segments', icon: Layers },
      ],
    },
    {
      groupTitle: 'KAMPANYA & ŞABLONLAR',
      items: [
        { name: 'Mesaj Şablonları', href: '/dashboard/templates', icon: FileText },
        { name: 'Kampanyalar', href: '/dashboard/campaigns', icon: Send },
        { name: 'Kampanya Sihirbazı', href: '/dashboard/campaigns/wizard', icon: Send },
        { name: 'A/B Test Raporu', href: '/dashboard/campaigns/ab-test-report', icon: Split },
        { name: 'Link Takibi', href: '/dashboard/links', icon: Link2 },
        { name: 'Paylaşım Kayıtları', href: '/dashboard/broadcast-logs', icon: History },
      ],
    },
    {
      groupTitle: 'YÖNETİM & SİSTEM',
      items: [
        { name: 'Panel Kullanıcıları', href: '/dashboard/users', icon: Users },
        { name: 'Roller ve İzinler', href: '/dashboard/roles', icon: Shield },
        { name: 'Audit Log', href: '/dashboard/audit-logs', icon: ShieldAlert },
        { name: 'Sistem Sağlığı', href: '/dashboard/system/health', icon: Activity },
        { name: 'Kuyruk Durumu', href: '/dashboard/system/queues', icon: Server },
        { name: 'Uyarılar', href: '/dashboard/system/alerts', icon: Bell },
        { name: 'Yedeklemeler', href: '/dashboard/system/backups', icon: Database },
        { name: 'Sistem Ayarları', href: '/dashboard/system/settings', icon: Settings },
      ],
    },
    {
      groupTitle: 'HESAP & PROFİL',
      items: [
        { name: 'Profilim', href: '/dashboard/profile', icon: User },
        { name: '2FA Yönetimi', href: '/dashboard/profile/2fa', icon: Shield },
        { name: 'Aktif Oturumlar', href: '/dashboard/profile/sessions', icon: Monitor },
      ],
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between px-3 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400 font-bold">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-bold text-white text-sm">TG Enterprise</h1>
              <p className="text-xs text-slate-400">Yönetim Paneli</p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.groupTitle} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {group.groupTitle}
              </div>
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-4 mt-6">
        <Link
          href="/"
          onClick={() => {
            localStorage.clear();
            setIsMobileSidebarOpen(false);
          }}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:bg-red-500/10 transition"
        >
          <LogOut className="h-4 w-4" />
          Çıkış Yap
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-100 overflow-x-hidden">
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-slate-800 bg-slate-900/60 p-4 flex-col justify-between overflow-y-auto max-h-screen shrink-0">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Backdrop & Drawer Sidebar */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between overflow-y-auto z-50 shadow-2xl">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Content Body */}
      <div className="flex-1 flex flex-col overflow-y-auto min-w-0 max-w-full">
        <header className="border-b border-slate-800 bg-slate-900/40 px-4 sm:px-6 md:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                aria-label="Menüyü Aç"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-xs font-semibold text-slate-300 truncate max-w-[200px] sm:max-w-none">
                  Sistem Sağlığı: Canlı Veri Akışı Aktif
                </span>
              </div>
            </div>
          </div>

          {/* Active Brand Switcher */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-800 pt-2 sm:pt-0">
            <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Aktif Marka:</span>
            <select
              value={selectedBrandId}
              onChange={(e) => handleBrandChange(e.target.value)}
              className="rounded-lg bg-slate-950 py-1.5 px-3 text-xs text-sky-400 font-medium border border-slate-700 focus:border-sky-500 focus:outline-none max-w-[180px] sm:max-w-none truncate"
            >
              {brands.length === 0 ? (
                <option value="">Marka Yükleniyor...</option>
              ) : (
                brands.map((brand: any) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.code})
                  </option>
                ))
              )}
            </select>
          </div>
        </header>

        <main className="p-3 sm:p-6 md:p-8 flex-1 min-w-0 max-w-full overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
