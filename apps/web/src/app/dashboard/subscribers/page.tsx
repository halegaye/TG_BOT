'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchSubscribers, getStoredBrandId } from '@/lib/api';
import Link from 'next/link';
import { Users, Search, Bot, Clock, CheckCircle2, XCircle, ChevronRight, UserCheck } from 'lucide-react';

export default function SubscribersPage() {
  const brandId = getStoredBrandId() || undefined;
  const [search, setSearch] = useState('');
  const [filterBlocked, setFilterBlocked] = useState<string>('ALL');

  const isBlocked = filterBlocked === 'BLOCKED' ? true : filterBlocked === 'ACTIVE' ? false : undefined;

  const { data: subscribers = [], isLoading } = useQuery({
    queryKey: ['subscribers', brandId, search, isBlocked],
    queryFn: () => fetchSubscribers(brandId, search, isBlocked),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-emerald-400" />
            Telegram Kullanıcıları (Subscribers)
          </h1>
          <p className="text-sm text-slate-400">
            Botlar üzerinden kaydolan tüm Telegram aboneleri, engelleme durumları ve katılım geçmişi
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'ACTIVE', 'BLOCKED'].map((status) => (
            <button
              key={status}
              onClick={() => setFilterBlocked(status)}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                filterBlocked === status
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {status === 'ALL' ? 'Tüm Aboneler' : status === 'ACTIVE' ? 'Aktif' : 'Engelleyenler'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="İsim veya kullanıcı adı ara..."
            className="w-full rounded-xl bg-slate-950 py-2 pl-9 pr-4 text-xs text-white border border-slate-700 focus:border-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Aboneler yükleniyor...</div>
        ) : subscribers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">Abonelik kaydı bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4">Kullanıcı Bilgisi</th>
                  <th className="py-3.5 px-4">Telegram User ID</th>
                  <th className="py-3.5 px-4">Katıldığı Bot</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Abonelik Tarihi</th>
                  <th className="py-3.5 px-4 text-right">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {subscribers.map((sub: any) => (
                  <tr key={sub.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-medium text-white flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-xs">
                        {sub.firstName?.[0] || 'U'}
                      </div>
                      <div>
                        <div>{sub.firstName} {sub.lastName}</div>
                        <div className="text-slate-500 text-[10px]">@{sub.username || 'username_yok'}</div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-400">{sub.telegramUserId}</td>

                    <td className="py-4 px-4 font-mono text-sky-400">
                      <span className="flex items-center gap-1">
                        <Bot className="h-3.5 w-3.5" />
                        {sub.botName}
                      </span>
                    </td>

                    <td className="py-4 px-4">
                      {sub.isBlocked ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 border border-red-500/20">
                          <XCircle className="h-3 w-3" /> Engelleyen
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" /> Aktif
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-4 font-mono text-slate-400">
                      {new Date(sub.subscribedAt).toLocaleDateString('tr-TR')}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <Link
                        href={`/dashboard/subscribers/${sub.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-emerald-600 hover:text-white transition border border-slate-700"
                      >
                        İncele
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
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
