'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchBroadcastLogs, fetchBrands, getStoredBrandId } from '@/lib/api';
import { History, User, Bot, Calendar, Shield, Users, CheckCircle, Search } from 'lucide-react';

export default function BroadcastLogsPage() {
  const activeBrandId = getStoredBrandId() || '';
  const [selectedBrandId, setSelectedBrandId] = useState(activeBrandId);
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Fetch Brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  });

  // 2. Fetch Broadcast Logs
  const {
    data: logs = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['broadcast-logs', selectedBrandId || activeBrandId],
    queryFn: () => fetchBroadcastLogs(selectedBrandId || activeBrandId),
  });

  const filteredLogs = logs.filter((log: any) => {
    const search = searchQuery.toLowerCase();
    return (
      log.title?.toLowerCase().includes(search) ||
      log.dispatchedBy?.toLowerCase().includes(search) ||
      log.userEmail?.toLowerCase().includes(search) ||
      log.messageText?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <History className="h-6 w-6 text-sky-400" />
            Paylaşım Geçmişi & Denetim Kayıtları
          </h1>
          <p className="text-sm text-slate-400">
            Hangi personel tarafından ne zaman duyuru/paylaşım yapıldığının kayıtları
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none"
          >
            <option value="">Tüm Markalarım</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Security Privacy Notice */}
      <div className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-4 text-xs text-sky-300 flex items-center gap-3 shadow-md">
        <Shield className="h-5 w-5 text-sky-400 flex-shrink-0" />
        <span>
          <strong>🔒 Yetkili Erişim & Firma İzolasyonu:</strong> Bu paylaşım kayıtlarını ve işlem geçmişini yalnızca ilgili firmanın tanımlı personeli ve Süper Admin görüntüleyebilir. Diğer firmalar bu verileri kesinlikle göremez.
        </span>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Personel adı, e-posta, kampanya başlığı veya mesaj metninde ara..."
          className="w-full rounded-xl bg-slate-900 py-2.5 pl-10 pr-4 text-sm text-white border border-slate-800 focus:border-sky-500 focus:outline-none"
        />
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Paylaşım kayıtları yükleniyor...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
          {(error as any)?.message || 'Kayıtlar yüklenirken yetki hatası veya ağ hatası oluştu.'}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
          Henüz yapılmış bir paylaşım kaydı bulunamadı.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4">Tarih / Saat</th>
                  <th className="py-3.5 px-4">Paylaşım Yapan Personel</th>
                  <th className="py-3.5 px-4">Marka</th>
                  <th className="py-3.5 px-4">Kampanya / Başlık</th>
                  <th className="py-3.5 px-4">Hedef Botlar</th>
                  <th className="py-3.5 px-4 text-right">Alıcı Sayısı</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredLogs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Calendar className="h-3.5 w-3.5 text-sky-400" />
                        {new Date(log.dispatchedAt).toLocaleString('tr-TR')}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-medium text-white">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{log.dispatchedBy}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{log.userEmail}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20">
                        {log.brandName} ({log.brandCode})
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-xs truncate">
                      <div className="font-bold text-slate-200">{log.title}</div>
                      <div className="text-xs text-slate-400 truncate">{log.messageText}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1">
                        {Array.isArray(log.targetBotNames) && log.targetBotNames.length > 0 ? (
                          log.targetBotNames.map((name: string, idx: number) => (
                            <span
                              key={idx}
                              className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20"
                            >
                              {name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">{log.targetBotCount} Bot</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <Users className="h-3.5 w-3.5" />
                        {(log.recipientCount || 0).toLocaleString('tr-TR')} Abone
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
