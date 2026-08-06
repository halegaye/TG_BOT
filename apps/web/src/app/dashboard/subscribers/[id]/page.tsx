'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSubscriberById } from '@/lib/api';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { User, Bot, Send, ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';

export default function SubscriberDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: sub, isLoading } = useQuery({
    queryKey: ['subscriber-detail', id],
    queryFn: () => fetchSubscriberById(id),
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Abone detayları yükleniyor...</div>;
  }

  if (!sub) {
    return <div className="p-12 text-center text-red-400 text-sm">Abone kaydı bulunamadı.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4 border-b border-slate-800 pb-5">
        <Link
          href="/dashboard/subscribers"
          className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="h-6 w-6 text-emerald-400" />
            Abone Detayı: {sub.firstName} {sub.lastName}
          </h1>
          <p className="text-sm text-slate-400">Telegram User ID: {sub.telegramUserId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Profil Bilgileri
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500">Ad Soyad:</span>
              <div className="font-bold text-white text-sm">{sub.firstName} {sub.lastName}</div>
            </div>
            <div>
              <span className="text-slate-500">Username:</span>
              <div className="font-mono text-sky-400">@{sub.username || 'yok'}</div>
            </div>
            <div>
              <span className="text-slate-500">Telegram User ID:</span>
              <div className="font-mono text-slate-300">{sub.telegramUserId}</div>
            </div>
            <div>
              <span className="text-slate-500">Telegram Chat ID:</span>
              <div className="font-mono text-slate-300">{sub.chatId}</div>
            </div>
            <div>
              <span className="text-slate-500">Dil Kodu:</span>
              <div className="font-mono text-slate-300">{sub.languageCode}</div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Abonelik Durumu
          </h3>
          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-500">Bağlı Olduğu Bot:</span>
              <div className="font-bold text-sky-400 text-sm flex items-center gap-1.5 mt-1">
                <Bot className="h-4 w-4" />
                {sub.botName}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Engelleme Durumu:</span>
              <div className="mt-1">
                {sub.isBlocked ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-3 py-1 font-bold text-red-400 border border-red-500/20">
                    <XCircle className="h-3.5 w-3.5" /> Botu Engelledi
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 font-bold text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aktif Abone
                  </span>
                )}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Abonelik Başlangıcı:</span>
              <div className="font-mono text-slate-300 mt-1">
                {new Date(sub.subscribedAt).toLocaleString('tr-TR')}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Son Etkileşim
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-slate-500">Son Aktiflik Zamanı:</span>
              <div className="font-mono text-slate-300 mt-1">
                {new Date(sub.lastActiveAt).toLocaleString('tr-TR')}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Gönderilen Mesaj Sayısı:</span>
              <div className="font-extrabold text-2xl text-white mt-1">{sub.deliveries?.length || 0}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Send className="h-5 w-5 text-sky-400" />
          Kullanıcıya Gönderilen Son Mesajlar
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950 text-slate-400 uppercase font-mono">
              <tr>
                <th className="py-3 px-4">Kampanya</th>
                <th className="py-3 px-4">Teslimat Durumu</th>
                <th className="py-3 px-4">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {sub.deliveries?.map((d: any) => (
                <tr key={d.id}>
                  <td className="py-3 px-4 font-bold text-white">{d.campaignTitle}</td>
                  <td className="py-3 px-4">
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-mono text-emerald-400">
                      {d.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {new Date(d.createdAt).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
