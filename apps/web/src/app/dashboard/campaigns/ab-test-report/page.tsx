'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchABTestReport, fetchCampaigns, getStoredBrandId } from '@/lib/api';
import { Split, ArrowLeft, Trophy, MousePointer, Send, CheckCircle2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export default function ABTestReportPage() {
  const brandId = getStoredBrandId() || undefined;
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');

  const { data: campaigns = [], isLoading: isCampaignsLoading } = useQuery({
    queryKey: ['campaigns', brandId],
    queryFn: () => fetchCampaigns(brandId),
  });

  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: ['abTestReport', brandId, selectedCampaignId],
    queryFn: () => fetchABTestReport(brandId, selectedCampaignId || undefined),
  });

  return (
    <div className="space-y-8">
      {/* Header & Campaign Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/campaigns"
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Split className="h-6 w-6 text-indigo-400" />
              A/B Test Performans Raporu
            </h1>
            <p className="text-sm text-slate-400">
              Gönderilen tüm kampanyalar için mesaj metni ve görsel varyasyonlarının canlı dönüşüm kıyaslaması
            </p>
          </div>
        </div>

        {/* Campaign Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">Kampanya Seçin:</span>
          <div className="relative">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="appearance-none rounded-xl bg-slate-900 border border-slate-700 py-2.5 pl-4 pr-10 text-xs font-semibold text-sky-400 focus:border-indigo-500 focus:outline-none shadow-lg transition"
            >
              <option value="">En Son Gönderilen Kampanya (Otomatik)</option>
              {campaigns.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.type === 'AB_TEST' ? 'A/B Test' : c.status})
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {isReportLoading || isCampaignsLoading ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          A/B Test rapor verileri hesaplanıyor...
        </div>
      ) : !report || !report.variations || report.variations.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm rounded-2xl border border-slate-800 bg-slate-900/40">
          Seçilen kampanya için henüz A/B test verisi bulunmuyor.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Selected Campaign Metadata Info */}
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Raporlanan Kampanya:</span>
                <span className="text-indigo-400">{report.campaignTitle}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Durum: <span className="text-emerald-400 font-semibold">{report.status}</span> — Toplam Hedef Kitle: {report.totalAudience?.toLocaleString('tr-TR')} Abone
              </p>
            </div>
          </div>

          {/* Variations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {report.variations.map((varItem: any, idx: number) => {
              const isWinner = varItem.isWinner;
              return (
                <div
                  key={varItem.id || idx}
                  className={`rounded-2xl border p-6 space-y-4 shadow-xl relative overflow-hidden transition ${
                    isWinner
                      ? 'border-emerald-500 bg-slate-900/90 shadow-2xl shadow-emerald-500/10'
                      : 'border-slate-800 bg-slate-900/60'
                  }`}
                >
                  {isWinner && (
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-slate-950 shadow-lg">
                      <Trophy className="h-3.5 w-3.5" /> Kazanan Varyasyon
                    </div>
                  )}

                  <div className="flex items-center justify-between pr-36">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold border ${
                        isWinner
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                      }`}
                    >
                      {varItem.label}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      %{varItem.splitPercentage} Kitle
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-950 p-4 text-xs font-mono text-slate-300 border border-slate-800 leading-relaxed min-h-[4.5rem]">
                    {varItem.text}
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <div className="text-[10px] text-slate-400 uppercase">Gönderilen</div>
                      <div className="text-lg font-black text-white mt-1">
                        {varItem.sentCount?.toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <div className="text-[10px] text-slate-400 uppercase">Tıklama</div>
                      <div className="text-lg font-black text-amber-400 mt-1">
                        {varItem.clickCount?.toLocaleString('tr-TR')}
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-800/60 p-3">
                      <div className="text-[10px] text-slate-400 uppercase">CTR (Tıklama Oranı)</div>
                      <div
                        className={`text-lg font-black mt-1 ${
                          isWinner ? 'text-emerald-400' : 'text-slate-300'
                        }`}
                      >
                        %{varItem.ctrRate}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
