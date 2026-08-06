'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCampaignResults } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Activity, ArrowLeft, Send, CheckCircle2, XCircle, Clock, Zap, RefreshCw } from 'lucide-react';

export default function CampaignLivePage() {
  const { id } = useParams<{ id: string }>();

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['campaign-live', id],
    queryFn: () => fetchCampaignResults(id),
    refetchInterval: 3000, // 3 saniyede bir canlı yenileme
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Canlı gönderim verisi yükleniyor...</div>;
  }

  const totals = results?.totals || {
    total: 0,
    sent: 0,
    failed: 0,
    pending: 0,
    rateLimited: 0,
  };

  const progressPercent = totals.total > 0 ? ((totals.sent + totals.failed) / totals.total) * 100 : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Activity className="h-6 w-6 text-emerald-400 animate-pulse" />
              Kampanya Canlı Gönderim Durumu
            </h1>
            <p className="text-sm text-slate-400">Kampanya ID: {id}</p>
          </div>
        </div>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition border border-slate-700"
        >
          <RefreshCw className="h-4 w-4" />
          Canlı Veriyi Yenile
        </button>
      </div>

      {/* Progress Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
          <span className="text-slate-400">Genel İlerleme Durumu</span>
          <span className="text-emerald-400 font-mono">%{progressPercent.toFixed(1)}</span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-950 overflow-hidden p-0.5 border border-slate-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase">
            <span>Toplam Hedef</span>
            <Send className="h-4 w-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white">{totals.total.toLocaleString()}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold uppercase">
            <span>Başarıyla İletilen</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{totals.sent.toLocaleString()}</div>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-red-400 font-semibold uppercase">
            <span>Başarısız / Hatalı</span>
            <XCircle className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400">{totals.failed.toLocaleString()}</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold uppercase">
            <span>Kuyrukta İşlenen</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{totals.pending.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
