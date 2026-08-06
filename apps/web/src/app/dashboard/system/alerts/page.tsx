'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSystemAlerts } from '@/lib/api';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, Bell } from 'lucide-react';

export default function SystemAlertsPage() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['system-alerts'],
    queryFn: fetchSystemAlerts,
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-400" />
            Sistem Uyarıları & Bildirimler (Alert Center)
          </h1>
          <p className="text-sm text-slate-400">Sistem arızaları, Telegram rate limit kilitleri ve acil durum günlükleri</p>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Uyarılar yükleniyor...</div>
        ) : (
          alerts.map((alt: any) => (
            <div key={alt.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex items-start gap-4 shadow-xl">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-sm">{alt.title}</h3>
                  <span className="text-xs text-slate-500 font-mono">{new Date(alt.createdAt).toLocaleString('tr-TR')}</span>
                </div>
                <p className="text-xs text-slate-300">{alt.message}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
