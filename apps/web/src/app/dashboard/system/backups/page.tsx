'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchBackupLogs, createManualBackup } from '@/lib/api';
import { Database, Plus, Download, CheckCircle2, RefreshCw } from 'lucide-react';

export default function BackupsPage() {
  const { data: backups = [], isLoading, refetch } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: fetchBackupLogs,
  });

  const createMutation = useMutation({
    mutationFn: createManualBackup,
    onSuccess: () => refetch(),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Database className="h-6 w-6 text-emerald-400" />
            Veritabanı Yedeklemeleri (Backups)
          </h1>
          <p className="text-sm text-slate-400">PostgreSQL veri tabanı otomatik ve manuel SQL dump yedek kaydı</p>
        </div>

        <button
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {createMutation.isPending ? 'Yedek Alınıyor...' : 'Manuel Yedek Al'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Yedekler yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4">Yedek Dosya Adı</th>
                  <th className="py-3.5 px-4">Boyut</th>
                  <th className="py-3.5 px-4">Durum</th>
                  <th className="py-3.5 px-4">Yedeklenme Tarihi</th>
                  <th className="py-3.5 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {backups.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-bold text-white">{b.fileName}</td>
                    <td className="py-4 px-4 text-sky-400">{(b.sizeBytes / (1024 * 1024)).toFixed(2)} MB</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-3 w-3" /> SUCCESS
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400">{new Date(b.createdAt).toLocaleString('tr-TR')}</td>
                    <td className="py-4 px-4 text-right">
                      <button className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-emerald-600 hover:text-white transition border border-slate-700">
                        <Download className="h-3.5 w-3.5" /> İndir
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
