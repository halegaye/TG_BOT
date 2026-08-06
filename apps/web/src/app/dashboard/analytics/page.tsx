'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAdvancedOverviewMetrics, fetchBroadcastLogs, getStoredBrandId } from '@/lib/api';
import { BarChart3, TrendingUp, Users, MousePointer, Send, CheckCircle2, Radio, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  const brandId = getStoredBrandId() || undefined;

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['analytics-metrics', brandId],
    queryFn: () => fetchAdvancedOverviewMetrics(brandId),
  });

  const { data: broadcastLogs = [] } = useQuery({
    queryKey: ['broadcast-logs', brandId],
    queryFn: () => fetchBroadcastLogs(brandId),
  });

  const recentBroadcasts = metrics?.recentBroadcasts?.length ? metrics.recentBroadcasts : broadcastLogs;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-sky-400" />
            İstatistikler & Gönderim Analizi (Advanced Analytics)
          </h1>
          <p className="text-sm text-slate-400">Marka ve bot bazlı kampanya gönderimleri, canlı tıklama oranları ve paylaşım geçmişi</p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">İstatistikler yükleniyor...</div>
      ) : (
        <>
          {/* Top 4 Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-2">
              <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
                <Send className="h-4 w-4 text-sky-400" /> Toplam Gönderim (Tüm Zamanlar)
              </div>
              <div className="text-3xl font-black text-white font-mono">{metrics?.allTimeSent || metrics?.todaySent || 0}</div>
              <div className="text-xs text-slate-500">Bugün: {metrics?.todaySent || 0} İleti</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-xl space-y-2">
              <div className="text-xs text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Başarılı İletilen
              </div>
              <div className="text-3xl font-black text-emerald-400 font-mono">{metrics?.allTimeSuccess || metrics?.todaySuccess || 0}</div>
              <div className="text-xs text-emerald-500/80">Bugün: {metrics?.todaySuccess || 0} Başarılı</div>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-xl space-y-2">
              <div className="text-xs text-amber-400 font-semibold uppercase flex items-center gap-1.5">
                <MousePointer className="h-4 w-4 text-amber-400" /> Tıklamalar (Tüm Zamanlar)
              </div>
              <div className="text-3xl font-black text-amber-400 font-mono">{metrics?.allTimeClicks ?? metrics?.todayUniqueClicks ?? 0}</div>
              <div className="text-xs text-amber-500/80">Bugün: {metrics?.todayUniqueClicks || 0} Tıklama</div>
            </div>

            <div className="rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6 shadow-xl space-y-2">
              <div className="text-xs text-purple-400 font-semibold uppercase flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-purple-400" /> CTR (Tıklama Oranı)
              </div>
              <div className="text-3xl font-black text-purple-400 font-mono">{metrics?.allTimeCtrRate || metrics?.ctrRate || '0.0%'}</div>
              <div className="text-xs text-purple-500/80">Tüm Zamanlar Dönüşüm Oranı</div>
            </div>
          </div>

          {/* Broadcast Logs / Paylaşımlar Table */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Radio className="h-5 w-5 text-sky-400" />
              Gönderilen Kampanya ve Paylaşım Geçmişi ({recentBroadcasts.length} Paylaşım)
            </h2>

            {recentBroadcasts.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Henüz gönderilmiş herhangi bir paylaşım/kampanya kaydı bulunamadı.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/90 text-slate-400 font-semibold uppercase sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="p-3">Kampanya / Duyuru Başlığı</th>
                      <th className="p-3">Hedef Bot Sayısı</th>
                      <th className="p-3">Alıcı Sayısı</th>
                      <th className="p-3">Gönderim Tarihi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 font-mono">
                    {recentBroadcasts.map((b: any) => (
                      <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-semibold text-slate-100 font-sans">
                          {b.title || b.campaign?.title || 'Duyuru'}
                        </td>
                        <td className="p-3 text-sky-400">
                          {b.targetBotCount || b.targetBotNames?.length || 1} Bot
                        </td>
                        <td className="p-3 text-emerald-400 font-bold">
                          {b.recipientCount || b.targetAudienceCount || 0} Abone
                        </td>
                        <td className="p-3 text-slate-400 flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-500" />
                          {b.dispatchedAt || b.createdAt ? new Date(b.dispatchedAt || b.createdAt).toLocaleString('tr-TR') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
