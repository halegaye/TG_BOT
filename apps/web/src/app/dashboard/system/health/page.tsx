'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSystemHealth } from '@/lib/api';
import { Server, Database, Activity, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

export default function SystemHealthPage() {
  const { data: health, isLoading, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: fetchSystemHealth,
    refetchInterval: 5000,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Sistem sağlığı taranıyor...</div>;
  }

  const services = health?.services || {};

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-emerald-400" />
            Sistem Sağlığı ve Altyapı (System Infrastructure Health)
          </h1>
          <p className="text-sm text-slate-400">PostgreSQL, Redis, NestJS Core API, BullMQ Worker ve Telegram Gateway durumları</p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition border border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Yeniden Tara
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(services).map(([key, service]: [string, any]) => (
          <div key={key} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white">{service.name}</span>
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {service.status}
              </span>
            </div>

            <div className="font-mono text-xs space-y-1 text-slate-400">
              {service.latencyMs !== undefined && <div>Yanıt Süresi: <strong className="text-amber-400">{service.latencyMs} ms</strong></div>}
              {service.uptime !== undefined && <div>Çalışma Süresi (Uptime): <strong className="text-sky-400">{Math.floor(service.uptime)} sn</strong></div>}
              {service.activeJobs !== undefined && <div>Aktif Job: <strong className="text-emerald-400">{service.activeJobs}</strong></div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
