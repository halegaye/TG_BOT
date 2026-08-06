'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchAdvancedOverviewMetrics, triggerEmergencyStop, getStoredBrandId } from '@/lib/api';
import Link from 'next/link';
import {
  Bot,
  Users,
  Send,
  MousePointer,
  AlertOctagon,
  Activity,
  CheckCircle2,
  ShieldAlert,
  Building,
  AlertTriangle,
  UserPlus,
  Clock,
  Zap,
  TrendingUp,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';

export default function DashboardPage() {
  const activeBrandId = getStoredBrandId() || '';
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isStopped, setIsStopped] = useState(false);
  const [stopError, setStopError] = useState('');

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['advancedOverviewMetrics', activeBrandId],
    queryFn: () => fetchAdvancedOverviewMetrics(activeBrandId || undefined),
    refetchInterval: 10000,
  });

  const emergencyStopMutation = useMutation({
    mutationFn: () => triggerEmergencyStop('GLOBAL', 'ACIL DURDUR'),
    onSuccess: () => {
      setIsStopped(true);
      setIsEmergencyModalOpen(false);
      setConfirmationText('');
      setStopError('');
    },
    onError: (err: any) => {
      setStopError(err.message || 'Acil durum durdurma başarısız oldu.');
    },
  });

  const handleEmergencyStop = () => {
    if (confirmationText !== 'ACIL DURDUR') return;
    emergencyStopMutation.mutate();
  };

  const mainMetrics = [
    {
      name: 'Toplam Marka',
      value: isLoading ? '...' : (metricsData?.totalBrands ?? 0).toLocaleString(),
      desc: 'Sistemdeki firmalar',
      icon: Building,
      color: 'text-purple-400',
    },
    {
      name: 'Toplam Bot',
      value: isLoading ? '...' : (metricsData?.totalBots ?? 0).toLocaleString(),
      desc: 'Tüm Telegram botları',
      icon: Bot,
      color: 'text-sky-400',
    },
    {
      name: 'Aktif Bot',
      value: isLoading ? '...' : (metricsData?.activeBots ?? 0).toLocaleString(),
      desc: 'Yayındaki botlar',
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      name: 'Sağlıksız / Duraklatılan Bot',
      value: isLoading ? '...' : (metricsData?.unhealthyBots ?? 0).toLocaleString(),
      desc: 'Hatalı veya pasif botlar',
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      name: 'Toplam Aktif Abone',
      value: isLoading ? '...' : (metricsData?.totalActiveSubscribers ?? 0).toLocaleString(),
      desc: 'Engellemeyen Telegram üyeleri',
      icon: Users,
      color: 'text-emerald-400',
    },
    {
      name: 'Bugünkü Yeni Aboneler',
      value: isLoading ? '...' : (metricsData?.todayNewSubscribers ?? 0).toLocaleString(),
      desc: 'Bugün katılan yeni kullanıcılar',
      icon: UserPlus,
      color: 'text-teal-400',
    },
    {
      name: 'Toplam Gönderim',
      value: isLoading ? '...' : (metricsData?.allTimeSent ?? metricsData?.todaySent ?? 0).toLocaleString(),
      desc: `Bugün: ${metricsData?.todaySent ?? 0} Gönderim`,
      icon: Send,
      color: 'text-indigo-400',
    },
    {
      name: 'Başarılı Gönderim',
      value: isLoading ? '...' : (metricsData?.allTimeSuccess ?? metricsData?.todaySuccess ?? 0).toLocaleString(),
      desc: `Bugün: ${metricsData?.todaySuccess ?? 0} İletildi`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
    {
      name: 'Başarısız Gönderim',
      value: isLoading ? '...' : (metricsData?.allTimeFailed ?? metricsData?.todayFailed ?? 0).toLocaleString(),
      desc: `Bugün: ${metricsData?.todayFailed ?? 0} Hatalı`,
      icon: XCircle,
      color: 'text-red-400',
    },
    {
      name: 'Kuyrukta Bekleyen',
      value: isLoading ? '...' : (metricsData?.todayPending ?? 0).toLocaleString(),
      desc: 'İşlenmeyi bekleyenler',
      icon: Clock,
      color: 'text-amber-400',
    },
    {
      name: 'Rate Limited',
      value: isLoading ? '...' : (metricsData?.todayRateLimited ?? 0).toLocaleString(),
      desc: 'Telegram hız limitine takılanlar',
      icon: Zap,
      color: 'text-orange-400',
    },
    {
      name: 'Aktif Kampanya',
      value: isLoading ? '...' : (metricsData?.activeCampaigns ?? 0).toLocaleString(),
      desc: 'Çalışan ve zamanlananlar',
      icon: TrendingUp,
      color: 'text-sky-400',
    },
    {
      name: 'Toplam Tıklama',
      value: isLoading ? '...' : (metricsData?.allTimeClicks ?? metricsData?.todayUniqueClicks ?? 0).toLocaleString(),
      desc: `Bugün: ${metricsData?.todayUniqueClicks ?? 0} Tıklama`,
      icon: MousePointer,
      color: 'text-amber-400',
    },
    {
      name: 'Tıklama Oranı (CTR)',
      value: isLoading ? '...' : (metricsData?.allTimeCtrRate || metricsData?.ctrRate || '0.0%'),
      desc: 'Tüm Zamanlar Dönüşüm Oranı',
      icon: MousePointer,
      color: 'text-emerald-400',
    },
    {
      name: 'Son 24 Sa. Sistem Hataları',
      value: isLoading ? '...' : (metricsData?.systemErrors24h ?? 0).toLocaleString(),
      desc: 'Teslim edilemeyen hatalar',
      icon: AlertOctagon,
      color: 'text-rose-400',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title & Emergency Stop & Bot Health Button */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-sky-400" />
            Gelişmiş İstatistik Dashboard
          </h1>
          <p className="text-sm text-slate-400">
            Canlı aggregation verileri, Redis gerçek zamanlı sayaçları ve performans göstergeleri
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/bots/health"
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/30"
          >
            <Activity className="h-4 w-4" />
            Bot Sağlık Merkezi (Health Center)
          </Link>

          {isStopped ? (
            <button
              onClick={() => setIsStopped(false)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition shadow-md"
            >
              <CheckCircle2 className="h-4 w-4" />
              Gönderimleri Başlat
            </button>
          ) : (
            <button
              onClick={() => setIsEmergencyModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 transition shadow-md shadow-red-600/30"
            >
              <AlertOctagon className="h-4 w-4" />
              Acil Durum Durdurma
            </button>
          )}
        </div>
      </div>

      {isStopped && (
        <div className="rounded-xl bg-red-500/10 p-4 border border-red-500/30 flex items-center gap-3 text-red-300">
          <ShieldAlert className="h-6 w-6 text-red-400 flex-shrink-0" />
          <p className="text-sm font-medium">
            <strong>DİKKAT:</strong> Acil durum durdurma bayrağı aktif! Tüm kampanya gönderimleri donduruldu.
          </p>
        </div>
      )}

      {/* 15 Advanced Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {mainMetrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.name}
              className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 line-clamp-1">
                  {metric.name}
                </span>
                <div className={`rounded-lg bg-slate-800 p-2 ${metric.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3 text-2xl font-extrabold text-white">{metric.value}</div>
              <div className="mt-1 text-[10px] text-slate-500 truncate">{metric.desc}</div>
            </div>
          );
        })}
      </div>

      {/* Saatlik Metrik Özeti Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="h-5 w-5 text-sky-400" />
            Saatlik Gönderim & Tıklama Trendi (Hourly Metrics)
          </h2>
          <span className="text-xs text-slate-500 font-mono">Aggregation Engine Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              <tr>
                <th className="px-4 py-3">Saat</th>
                <th className="px-4 py-3">Gönderilen</th>
                <th className="px-4 py-3">Hatalı</th>
                <th className="px-4 py-3">Tıklama</th>
                <th className="px-4 py-3">Performans</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {metricsData?.hourlyMetrics && metricsData.hourlyMetrics.length > 0 ? (
                metricsData.hourlyMetrics.map((h: any) => (
                  <tr key={h.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 font-mono text-xs text-white">{h.hour}</td>
                    <td className="px-4 py-3 text-emerald-400 font-bold">{h.sentCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-red-400">{h.failedCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-amber-400 font-bold">{h.clickCount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
                        Normal
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500 text-xs">
                    Saatlik veriler dönemsel aggregation job ile oluşturulacaktır.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Emergency Stop Modal */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertOctagon className="h-7 w-7" />
              <h3 className="text-xl font-bold text-white">Acil Durum Durdurma Onayı</h3>
            </div>
            <p className="text-sm text-slate-300">
              Bu işlem tüm aktif kampanya gönderimlerini ve BullMQ iş akışını anında donduracaktır. Devam etmek için kutucuğa <strong>ACIL DURDUR</strong> yazmanız gerekmektedir.
            </p>

            {stopError && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                {stopError}
              </div>
            )}

            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder="ACIL DURDUR"
              className="w-full font-mono text-sm tracking-wider uppercase rounded-lg bg-slate-950 p-3 text-white border border-slate-700 focus:border-red-500 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsEmergencyModalOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Vazgeç
              </button>
              <button
                disabled={confirmationText !== 'ACIL DURDUR' || emergencyStopMutation.isPending}
                onClick={handleEmergencyStop}
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-40"
              >
                {emergencyStopMutation.isPending ? 'Durduruluyor...' : 'Tüm Sistemi Durdur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
