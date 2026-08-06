'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSystemSettings } from '@/lib/api';
import { Settings, Save, Sliders } from 'lucide-react';

export default function SystemSettingsPage() {
  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: fetchSystemSettings,
  });

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-sky-400" />
            Sistem Ayarları (Global Settings)
          </h1>
          <p className="text-sm text-slate-400">Genel sistem parametreleri, rate limitler ve altyapı konfigürasyonu</p>
        </div>

        <button className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition">
          <Save className="h-4 w-4" />
          Ayarları Kaydet
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Ayarlar yükleniyor...</div>
        ) : (
          <div className="space-y-4">
            {settings.map((s: any) => (
              <div key={s.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-3">
                <div>
                  <span className="font-mono text-xs font-bold text-white">{s.key}</span>
                  <div className="text-[10px] text-slate-500 font-mono">Kategori: {s.category}</div>
                </div>
                <input
                  type="text"
                  defaultValue={s.value}
                  className="w-full sm:w-64 rounded-xl bg-slate-950 py-2 px-3 text-xs text-sky-400 font-mono border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
