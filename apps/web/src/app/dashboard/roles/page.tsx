'use client';

import { Shield, CheckCircle2, Lock } from 'lucide-react';

export default function RolesAndPermissionsPage() {
  const roles = [
    {
      name: 'SUPER_ADMIN',
      title: 'Süper Yönetici',
      desc: 'Tüm sistem, markalar, botlar ve yetkiler üzerinde sınırsız erişim yetkisi.',
      color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
    },
    {
      name: 'BRAND_ADMIN',
      title: 'Marka Yöneticisi',
      desc: 'Yalnızca kendisine atanan markanın botlarını, abonelerini ve kampanyalarını yönetebilir. Yeni marka ekleyemez.',
      color: 'text-sky-400 border-sky-500/30 bg-sky-500/10',
    },
    {
      name: 'CAMPAIGN_MANAGER',
      title: 'Kampanya Uzmanı',
      desc: 'Marka içindeki kampanya sihirbazını kullanır, şablon oluşturur ve gönderim başlatır.',
      color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
    },
    {
      name: 'VIEW_ONLY',
      title: 'Salt Okunur İzleyici',
      desc: 'Yalnızca istatistikleri ve raporları görüntüleyebilir, veri değiştirme yetkisi yoktur.',
      color: 'text-slate-400 border-slate-700 bg-slate-800/40',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-purple-400" />
            Roller ve İzinler (RBAC Matrix)
          </h1>
          <p className="text-sm text-slate-400">Rol Bazlı Erişim Kontrolü (Role-Based Access Control) güvenlik politikaları</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {roles.map((r) => (
          <div key={r.name} className={`rounded-2xl border p-6 space-y-3 shadow-xl ${r.color}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{r.title}</h3>
              <span className="font-mono text-xs font-bold uppercase">{r.name}</span>
            </div>
            <p className="text-xs text-slate-300">{r.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
