'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi, getStoredBrandId } from '@/lib/api';
import { Link2, ExternalLink, MousePointer, Copy, Plus, Check, Sparkles, ArrowRight } from 'lucide-react';

export default function LinksPage() {
  const queryClient = useQueryClient();
  const brandId = getStoredBrandId() || undefined;

  const [targetUrl, setTargetUrl] = useState('');
  const [createdLink, setCreatedLink] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: links = [], isLoading } = useQuery({
    queryKey: ['links', brandId],
    queryFn: () => fetchApi<any[]>(`/api/v1/links${brandId ? `?brandId=${brandId}` : ''}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: { targetUrl: string }) =>
      fetchApi('/api/v1/links', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
      setCreatedLink(res);
      setTargetUrl('');
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Kısa link oluşturulurken bir hata oluştu.');
    },
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUrl.trim()) return;
    setErrorMsg('');
    setCreatedLink(null);
    createMutation.mutate({ targetUrl });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Link2 className="h-6 w-6 text-amber-400" />
          Link Kısaltma & CTR Takibi
        </h1>
        <p className="text-sm text-slate-400">
          İstediğin web adresini kısalt, Telegram mesajlarına veya butonlarına yapıştır ve tıklamaları canlı takip et.
        </p>
      </div>

      {/* Quick Shortener Tool Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
          <Sparkles className="h-4 w-4" />
          <span>Hızlı Link Kısaltıcı</span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="url"
              placeholder="Kısaltmak istediğin adresi yapıştır (Örn: https://siteniz.com/promosyon)"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              required
              className="w-full rounded-xl bg-slate-950 border border-slate-700 p-3.5 text-xs text-white placeholder-slate-500 focus:border-amber-500 focus:outline-none transition"
            />
          </div>

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-amber-600/30 hover:bg-amber-500 transition disabled:opacity-50"
          >
            {createMutation.isPending ? (
              'Kısaltılıyor...'
            ) : (
              <>
                <span>Kısalt & Oluştur</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {errorMsg && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Newly Created Link Result Box */}
        {createdLink && (
          <div className="mt-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in duration-300">
            <div className="space-y-1">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                ✅ Kısa Linkiniz Hazır! (Tıklamalara Açık)
              </div>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <span>{createdLink.trackingUrl}</span>
                <a
                  href={createdLink.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white"
                  title="Test Et (Yeni Sekmede Aç)"
                >
                  <ExternalLink className="h-4 w-4 text-emerald-400" />
                </a>
              </div>
            </div>

            <button
              onClick={() => handleCopy(createdLink.trackingUrl, 'created_new')}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition"
            >
              {copiedId === 'created_new' ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Kopyalandı!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Linki Kopyala</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Links History Table */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Kısaltılan Link Geçmişi</h2>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-sm">Linkler yükleniyor...</div>
          ) : links.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">Henüz oluşturulmuş takipli link bulunmuyor.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono">
                  <tr>
                    <th className="py-3.5 px-4">Takipli Kısa Link (Tracking URL)</th>
                    <th className="py-3.5 px-4">Hedef Yönlendirme URL</th>
                    <th className="py-3.5 px-4">Tıklama (CTR)</th>
                    <th className="py-3.5 px-4">Tarih</th>
                    <th className="py-3.5 px-4 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                  {links.map((l: any) => (
                    <tr key={l.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-4 px-4 text-amber-400 font-bold">
                        <div className="flex items-center gap-2">
                          <span>{l.trackingUrl}</span>
                          <a
                            href={l.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-white"
                            title="Test Et"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-slate-300 truncate max-w-xs">{l.targetUrl}</td>
                      <td className="py-4 px-4 font-bold">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <MousePointer className="h-3.5 w-3.5" />
                          {l.clickCount || 0} Tıklama
                        </span>
                      </td>
                      <td className="py-4 px-4 text-slate-500">{new Date(l.createdAt).toLocaleDateString('tr-TR')}</td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleCopy(l.trackingUrl, l.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white transition font-sans font-semibold"
                        >
                          {copiedId === l.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-amber-400" />
                              <span>Linki Kopyala</span>
                            </>
                          )}
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
    </div>
  );
}
