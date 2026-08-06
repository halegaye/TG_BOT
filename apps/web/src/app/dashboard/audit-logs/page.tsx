'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAuditLogs, getStoredBrandId } from '@/lib/api';
import { ShieldAlert, Globe, Clock, UserCheck } from 'lucide-react';

export default function AuditLogsPage() {
  const brandId = getStoredBrandId() || undefined;

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', brandId],
    queryFn: () => fetchAuditLogs(brandId),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-400" />
            Denetim Kayıtları (Audit Logs)
          </h1>
          <p className="text-sm text-slate-400">Sistemdeki tüm kullanıcı işlemleri, IP adresleri, oturum ve veri değişiklik kayıtları</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Denetim kayıtları yükleniyor...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3.5 px-4">İşlem (Action)</th>
                  <th className="py-3.5 px-4">Kaynak Tipi</th>
                  <th className="py-3.5 px-4">IP Adresi</th>
                  <th className="py-3.5 px-4">Marka</th>
                  <th className="py-3.5 px-4">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono">
                {logs.map((log: any) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-4 px-4 font-bold text-sky-400">{log.action}</td>
                    <td className="py-4 px-4 text-slate-300">{log.resourceType}</td>
                    <td className="py-4 px-4 text-slate-400 flex items-center gap-1">
                      <Globe className="h-3.5 w-3.5 text-slate-500" />
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                    <td className="py-4 px-4 text-purple-400">{log.brand?.name || 'Sistem'}</td>
                    <td className="py-4 px-4 text-slate-500">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
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
