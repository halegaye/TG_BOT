'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchQueueStatus } from '@/lib/api';
import { Server, Activity, Clock, CheckCircle2, RefreshCw } from 'lucide-react';

export default function QueueStatusPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['queue-status'],
    queryFn: fetchQueueStatus,
    refetchInterval: 3000,
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Kuyruk verileri yükleniyor...</div>;
  }

  const queues = data?.queues || [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Server className="h-6 w-6 text-sky-400" />
            BullMQ Kuyruk Durumu (Queue Monitor)
          </h1>
          <p className="text-sm text-slate-400">Arka plan işleri, kuyruktaki mesaj yükleri ve aktif worker canlı metrikleri</p>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition border border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Yenile
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {queues.map((q: any) => (
          <div key={q.name} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white font-mono">{q.name}</h3>
              <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-bold text-sky-400 border border-sky-500/20">
                Kuyruk Aktif
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center font-mono">
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Bekleyen</div>
                <div className="text-xl font-bold text-amber-400 mt-1">{q.waiting}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">İşlenen</div>
                <div className="text-xl font-bold text-sky-400 mt-1">{q.active}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Tamamlanan</div>
                <div className="text-xl font-bold text-emerald-400 mt-1">{q.completed}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Hatalı</div>
                <div className="text-xl font-bold text-red-400 mt-1">{q.failed}</div>
              </div>
              <div className="rounded-xl bg-slate-950 p-3 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Geciktirilen</div>
                <div className="text-xl font-bold text-slate-400 mt-1">{q.delayed}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
