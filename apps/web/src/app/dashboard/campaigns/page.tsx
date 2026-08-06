'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchCampaigns, deleteCampaign, getStoredBrandId } from '@/lib/api';
import Link from 'next/link';
import { Send, Plus, Calendar, Activity, CheckCircle2, Clock, PauseCircle, ChevronRight, Trash2, AlertTriangle } from 'lucide-react';

export default function CampaignsPage() {
  const brandId = getStoredBrandId() || undefined;
  const queryClient = useQueryClient();

  const [deletingCampaign, setDeletingCampaign] = useState<{ id: string; title: string } | null>(null);
  const [actionError, setActionError] = useState<string>('');

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ['campaigns', brandId],
    queryFn: () => fetchCampaigns(brandId),
  });

  const deleteMutation = useMutation({
    mutationFn: (campaignId: string) => deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns', brandId] });
      setDeletingCampaign(null);
      setActionError('');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Kampanya silinirken bir hata oluştu.');
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
            <Activity className="h-3.5 w-3.5 animate-pulse" /> Aktif Gönderimde
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400 border border-sky-500/20">
            <Calendar className="h-3.5 w-3.5" /> Zamanlandı
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Tamamlandı
          </span>
        );
      case 'PAUSED':
        return (
          <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <PauseCircle className="h-3.5 w-3.5" /> Duraklatıldı
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Send className="h-6 w-6 text-sky-400" />
            Kampanyalar (Campaigns)
          </h1>
          <p className="text-sm text-slate-400">Tüm anlık, zamanlanmış, periyodik ve A/B test toplu mesaj kampanyaları</p>
        </div>

        <Link
          href="/dashboard/campaigns/wizard"
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition"
        >
          <Plus className="h-4 w-4" />
          Yeni Kampanya Oluştur
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Kampanyalar yükleniyor...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Henüz kampanya oluşturulmamış.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4">Kampanya Başlığı</th>
                  <th className="py-3.5 px-4">Tür / Öncelik</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Oluşturulma Tarihi</th>
                  <th className="py-3.5 px-4 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {campaigns.map((camp: any) => (
                  <tr key={camp.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-bold text-white text-sm">
                      {camp.title}
                      <div className="text-slate-500 text-[10px] truncate max-w-xs">{camp.description || 'Açıklama yok'}</div>
                    </td>

                    <td className="py-4 px-4 font-mono text-xs">
                      <span className="rounded bg-slate-800 px-2 py-1 text-slate-300">{camp.type}</span>
                      <span className="ml-1 rounded bg-slate-800 px-2 py-1 text-amber-400">{camp.priority}</span>
                    </td>

                    <td className="py-4 px-4">{getStatusBadge(camp.status)}</td>

                    <td className="py-4 px-4 font-mono text-slate-400">
                      {new Date(camp.createdAt).toLocaleDateString('tr-TR')}
                    </td>

                    <td className="py-4 px-4 text-right space-x-2">
                      <Link
                        href={`/dashboard/campaigns/${camp.id}/live`}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500 hover:text-white transition border border-emerald-500/20"
                      >
                        Canlı Durum
                      </Link>
                      <Link
                        href={`/dashboard/campaigns/${camp.id}/report`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-sky-600 hover:text-white transition border border-slate-700"
                      >
                        Rapor
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        onClick={() => {
                          setDeletingCampaign({ id: camp.id, title: camp.title });
                          setActionError('');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:bg-red-600 hover:text-white transition border border-red-500/20"
                        title="Kampanyayı Sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Sil
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-white">Kampanyayı Sil</h3>
            </div>
            <p className="text-sm text-slate-300">
              <strong>"{deletingCampaign.title}"</strong> isimli kampanyayı ve bu kampanyaya ait tüm gönderim ileti geçmişini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </p>

            {actionError && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingCampaign(null)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                Vazgeç
              </button>
              <button
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingCampaign.id)}
                className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-40 shadow-lg shadow-red-600/30"
              >
                {deleteMutation.isPending ? 'Siliniyor...' : 'Evet, Kampanyayı Sil'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
