'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBotHealthCenter, triggerBotDiagnose, getStoredBrandId } from '@/lib/api';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  ShieldCheck,
  Server,
  Users,
  Search,
  Radio,
  FileSpreadsheet,
} from 'lucide-react';

export default function BotHealthCenterPage() {
  const queryClient = useQueryClient();
  const brandId = getStoredBrandId() || undefined;
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [diagnosingBotId, setDiagnosingBotId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bot-health-center', brandId],
    queryFn: () => fetchBotHealthCenter(brandId),
    refetchInterval: 15000, // 15 saniyede bir otomatik canlı sağlık taraması
  });

  const diagnoseMutation = useMutation({
    mutationFn: (botId: string) => triggerBotDiagnose(botId),
    onMutate: (botId) => setDiagnosingBotId(botId),
    onSettled: () => {
      setDiagnosingBotId(null);
      queryClient.invalidateQueries({ queryKey: ['bot-health-center'] });
    },
  });

  const summary = data?.summaryCounts || {
    totalBots: 0,
    healthyCount: 0,
    warningCount: 0,
    criticalCount: 0,
    disabledCount: 0,
    unknownCount: 0,
  };

  const botList = data?.botHealthList || [];

  const filteredBots = botList.filter((bot: any) => {
    const matchesFilter = selectedFilter === 'ALL' || bot.status === selectedFilter;
    const matchesSearch =
      bot.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bot.brandName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'HEALTHY':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20 shadow-sm">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Healthy (Sağlıklı)
          </span>
        );
      case 'WARNING':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20 shadow-sm">
            <AlertTriangle className="h-3.5 w-3.5" />
            Warning (Uyarı)
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-400 border border-red-500/20 shadow-sm animate-pulse">
            <XCircle className="h-3.5 w-3.5" />
            Critical (Kritik)
          </span>
        );
      case 'DISABLED':
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
            <Clock className="h-3.5 w-3.5" />
            Disabled (Pasif)
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
            Unknown (Bilinmiyor)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-sky-400" />
            Bot Sağlık Merkezi (Bot Health Center)
          </h1>
          <p className="text-sm text-slate-400">
            Canlı Telegram `getMe`, Webhook durumları, 1 saatlik hata oranları, pending update sayıları ve kuyruk latans takibi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            <RefreshCw className="h-4 w-4" />
            Taramayı Yenile
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div
          onClick={() => setSelectedFilter('ALL')}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-lg ${
            selectedFilter === 'ALL' ? 'border-sky-500 bg-sky-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold uppercase">Toplam Bot</div>
          <div className="mt-2 text-2xl font-black text-white">{summary.totalBots}</div>
        </div>

        <div
          onClick={() => setSelectedFilter('HEALTHY')}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-lg ${
            selectedFilter === 'HEALTHY' ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-emerald-400 font-semibold uppercase flex items-center gap-1">
            <CheckCircle2 className="h-3.5 w-3.5" /> Healthy
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{summary.healthyCount}</div>
        </div>

        <div
          onClick={() => setSelectedFilter('WARNING')}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-lg ${
            selectedFilter === 'WARNING' ? 'border-amber-500 bg-amber-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-amber-400 font-semibold uppercase flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5" /> Warning
          </div>
          <div className="mt-2 text-2xl font-black text-amber-400">{summary.warningCount}</div>
        </div>

        <div
          onClick={() => setSelectedFilter('CRITICAL')}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-lg ${
            selectedFilter === 'CRITICAL' ? 'border-red-500 bg-red-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-red-400 font-semibold uppercase flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> Critical
          </div>
          <div className="mt-2 text-2xl font-black text-red-400">{summary.criticalCount}</div>
        </div>

        <div
          onClick={() => setSelectedFilter('DISABLED')}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-lg ${
            selectedFilter === 'DISABLED' ? 'border-slate-600 bg-slate-800/40' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-slate-400 font-semibold uppercase">Disabled</div>
          <div className="mt-2 text-2xl font-black text-slate-400">{summary.disabledCount}</div>
        </div>

        <div
          onClick={() => setSelectedFilter('UNKNOWN')}
          className={`cursor-pointer rounded-2xl border p-4 transition shadow-lg ${
            selectedFilter === 'UNKNOWN' ? 'border-purple-500 bg-purple-500/10' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
          }`}
        >
          <div className="text-xs text-purple-400 font-semibold uppercase">Unknown</div>
          <div className="mt-2 text-2xl font-black text-purple-400">{summary.unknownCount}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['ALL', 'HEALTHY', 'WARNING', 'CRITICAL', 'DISABLED'].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedFilter(status)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition whitespace-nowrap ${
                selectedFilter === status
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {status === 'ALL' ? 'Tüm Botlar' : status}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Bot adı veya username ara..."
            className="w-full rounded-xl bg-slate-950 py-2 pl-9 pr-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Bot Health Diagnostic Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Botların teşhis raporları hazırlanıyor...</div>
        ) : filteredBots.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Seçilen filtrelere uygun bot bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4">Bot Bilgisi</th>
                  <th className="py-3.5 px-4">Sağlık Seviyesi</th>
                  <th className="py-3.5 px-4">Teşhis Kontrolleri</th>
                  <th className="py-3.5 px-4">Pending Updates</th>
                  <th className="py-3.5 px-4">1 Sa. Hata Oranı</th>
                  <th className="py-3.5 px-4">24 Sa. Başarı</th>
                  <th className="py-3.5 px-4">Latans / Rate Limit</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {filteredBots.map((bot: any) => (
                  <tr key={bot.botId} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4">
                      <div className="font-bold text-white text-sm">{bot.displayName}</div>
                      <div className="text-sky-400 font-mono text-xs">@{bot.username}</div>
                      <div className="text-slate-500 text-[10px] truncate max-w-[150px]">{bot.brandName}</div>
                    </td>

                    <td className="py-4 px-4">{getStatusBadge(bot.status)}</td>

                    <td className="py-4 px-4 space-y-1 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className={`h-3.5 w-3.5 ${bot.isTokenValid ? 'text-emerald-400' : 'text-red-400'}`} />
                        <span>Token: {bot.isTokenValid ? 'Geçerli' : 'Geçersiz'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Server className={`h-3.5 w-3.5 ${bot.isGetMeSuccess ? 'text-emerald-400' : 'text-red-400'}`} />
                        <span>getMe: {bot.isGetMeSuccess ? 'Başarılı (OK)' : 'Başarısız'}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-sky-400">
                      {bot.pendingUpdateCount} msg
                    </td>

                    <td className="py-4 px-4 font-mono font-bold">
                      <span className={bot.errorRate1h > 15 ? 'text-red-400' : bot.errorRate1h > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        %{bot.errorRate1h}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono font-bold text-emerald-400">
                      %{bot.successRate24h}
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px]">
                      <div className="flex items-center gap-1 text-slate-300">
                        <Zap className="h-3 w-3 text-amber-400" />
                        {bot.queueLatencyMs} ms
                      </div>
                      <div className="text-slate-400 text-[10px]">
                        Status: <strong className={bot.rateLimitStatus === 'RATE_LIMITED' ? 'text-red-400' : 'text-emerald-400'}>{bot.rateLimitStatus}</strong>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => diagnoseMutation.mutate(bot.botId)}
                        disabled={diagnosingBotId === bot.botId}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-sky-600 hover:text-white transition border border-slate-700 disabled:opacity-50"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${diagnosingBotId === bot.botId ? 'animate-spin' : ''}`} />
                        {diagnosingBotId === bot.botId ? 'Teşhis Ediliyor...' : 'Yeniden Teşhis Et'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
