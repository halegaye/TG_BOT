'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchCampaignResults } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileText, ArrowLeft, Send, CheckCircle2, XCircle, MousePointer, Download, Clock } from 'lucide-react';

export default function CampaignReportPage() {
  const { id } = useParams<{ id: string }>();

  const { data: results, isLoading } = useQuery({
    queryKey: ['campaign-report', id],
    queryFn: () => fetchCampaignResults(id),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Kampanya raporu yükleniyor...</div>;
  }

  const totals = results?.totals || results?.metrics || { total: 0, sent: 0, failed: 0, clicks: 0 };
  const totalAudience = totals.total ?? totals.totalDeliveries ?? 0;
  const sentCount = totals.sent ?? totals.sentCount ?? 0;
  const failedCount = totals.failed ?? totals.failedCount ?? 0;
  const clickCount = totals.clicks ?? totals.clickCount ?? 0;
  const ctrRate = sentCount > 0 ? ((clickCount / sentCount) * 100).toFixed(1) + '%' : '0.0%';

  const deliveries = results?.deliveries || [];

  const handleDownloadCsv = () => {
    if (!deliveries || deliveries.length === 0) return;
    const header = 'ID,Durum,Bot,Abone_ID,Abone_Adi,Tarih,Hata\n';
    const csvContent = header + deliveries.map((d: any) => 
      `"${d.id}","${d.status}","${d.botUsername}","${d.subscriberTelegramId}","${d.subscriberName}","${d.sentAt}","${d.errorMessage || ''}"`
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Kampanya_Raporu_${id.slice(0, 8)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
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
              <FileText className="h-6 w-6 text-sky-400" />
              Kampanya Performans Raporu
              {results?.title && (
                <span className="text-sm font-medium text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                  {results.title}
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-400 font-mono">Kampanya ID: {id}</p>
          </div>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition border border-slate-700"
        >
          <Download className="h-4 w-4" />
          CSV Raporunu İndir
        </button>
      </div>

      {/* Top 4 Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-2">
          <div className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
            <Send className="h-4 w-4 text-sky-400" /> Toplam Hedef Kitle
          </div>
          <div className="text-3xl font-black text-white">{totalAudience}</div>
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 shadow-xl space-y-2">
          <div className="text-xs text-emerald-400 font-semibold uppercase flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Başarılı İleti
          </div>
          <div className="text-3xl font-black text-emerald-400">{sentCount}</div>
        </div>

        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-xl space-y-2">
          <div className="text-xs text-red-400 font-semibold uppercase flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-400" /> Başarısız Teslimat
          </div>
          <div className="text-3xl font-black text-red-400">{failedCount}</div>
        </div>

        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 shadow-xl space-y-2">
          <div className="text-xs text-amber-400 font-semibold uppercase flex items-center gap-1.5">
            <MousePointer className="h-4 w-4 text-amber-400" /> CTR (Tıklama Oranı)
          </div>
          <div className="text-3xl font-black text-amber-400">{ctrRate}</div>
        </div>
      </div>

      {/* Detailed Delivery Log Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
        <h2 className="text-base font-semibold text-white flex items-center gap-2">
          📊 Satır Bazlı İleti Gönderim Detayları ({deliveries.length} Kayıt)
        </h2>

        {deliveries.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Bu kampanya için henüz gönderim kaydı (delivery) bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/90 text-slate-400 font-semibold uppercase sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Telegram Bot</th>
                  <th className="p-3">Alıcı Abone</th>
                  <th className="p-3">Telegram ID</th>
                  <th className="p-3">Gönderim Tarihi</th>
                  <th className="p-3">Hata Ayrıntısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {deliveries.map((d: any) => (
                  <tr key={d.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-3">
                      {d.status === 'SENT' ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          BAŞARILI
                        </span>
                      ) : d.status === 'PERMANENTLY_FAILED' ? (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          BAŞARISIZ
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          {d.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-sky-400 font-semibold">@{d.botUsername}</td>
                    <td className="p-3 text-slate-200 font-sans">{d.subscriberName}</td>
                    <td className="p-3 text-slate-400">{d.subscriberTelegramId}</td>
                    <td className="p-3 text-slate-400">
                      {d.sentAt ? new Date(d.sentAt).toLocaleString('tr-TR') : '-'}
                    </td>
                    <td className="p-3 font-sans">
                      {d.errorMessage ? (
                        <span className="text-red-400">{d.errorMessage}</span>
                      ) : (
                        <span className="text-slate-500">-</span>
                      )}
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
