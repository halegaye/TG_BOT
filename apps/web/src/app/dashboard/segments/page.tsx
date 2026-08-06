'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchSegments, getStoredBrandId } from '@/lib/api';
import Link from 'next/link';
import { Layers, Plus, Filter, Users, ChevronRight } from 'lucide-react';

export default function SegmentsPage() {
  const brandId = getStoredBrandId() || undefined;

  const { data: segments = [], isLoading } = useQuery({
    queryKey: ['segments', brandId],
    queryFn: () => fetchSegments(brandId),
  });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="h-6 w-6 text-purple-400" />
            Hedef Kitle Segmentleri (Segments)
          </h1>
          <p className="text-sm text-slate-400">
            Dinamik kurallara göre kurgulanmış özel abone grupları ve segmentasyon listeleri
          </p>
        </div>

        <Link
          href="/dashboard/segments/builder"
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition"
        >
          <Plus className="h-4 w-4" />
          Yeni Segment Oluştur
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-sm">Segmentler yükleniyor...</div>
        ) : segments.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-400 text-sm">Henüz tanımlanmış segment bulunmuyor.</div>
        ) : (
          segments.map((seg: any) => (
            <div key={seg.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4 hover:border-purple-500/50 transition">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20 text-purple-400">
                  <Filter className="h-5 w-5" />
                </div>
                <span className="rounded-full bg-purple-500/10 px-2.5 py-1 text-[11px] font-mono font-bold text-purple-400 border border-purple-500/20">
                  Dinamik
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{seg.name}</h3>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{seg.description || 'Açıklama belirtilmemiş.'}</p>
              </div>

              <div className="border-t border-slate-800 pt-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Users className="h-4 w-4 text-purple-400" />
                  Hedef Kitle Filtresi Aktif
                </div>
                <span className="font-mono text-slate-500">{new Date(seg.createdAt).toLocaleDateString('tr-TR')}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
