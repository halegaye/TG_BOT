'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchActiveSessions, revokeSession } from '@/lib/api';
import { Monitor, ArrowLeft, Globe, LogOut, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ActiveSessionsPage() {
  const { data: sessions = [], isLoading, refetch } = useQuery({
    queryKey: ['active-sessions'],
    queryFn: fetchActiveSessions,
  });

  const revokeMutation = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: () => refetch(),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Aktif oturumlar yükleniyor...</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <Link
          href="/dashboard/profile"
          className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Monitor className="h-6 w-6 text-sky-400" />
            Aktif Oturumlar ve Cihazlar (Active Sessions)
          </h1>
          <p className="text-sm text-slate-400">Hesabınıza giriş yapılmış tüm aktif tarayıcılar ve IP adresleri</p>
        </div>
      </div>

      <div className="space-y-4">
        {sessions.map((s: any) => (
          <div key={s.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/20 text-sky-400">
                <Monitor className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <span>{s.userAgent || 'Chrome / Windows PC'}</span>
                  {s.isCurrent && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                      Mevcut Cihaz
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3 text-slate-500" /> {s.ipAddress || '127.0.0.1'}
                  </span>
                  <span>• Son Aktiflik: {new Date(s.createdAt).toLocaleDateString('tr-TR')}</span>
                </div>
              </div>
            </div>

            {!s.isCurrent && (
              <button
                onClick={() => revokeMutation.mutate(s.id)}
                className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-600 hover:text-white transition border border-red-500/20"
              >
                <LogOut className="h-3.5 w-3.5" /> Oturumu Kapat
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
