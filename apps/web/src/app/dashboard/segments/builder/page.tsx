'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createSegment, getStoredBrandId } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Layers, ArrowLeft, Save, Filter, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export default function SegmentBuilderPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const brandId = getStoredBrandId() || '';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [rules, setRules] = useState([
    { field: 'subscribed_at', operator: 'gte', value: '7_days_ago' },
    { field: 'is_blocked', operator: 'equals', value: 'false' },
  ]);

  const createMutation = useMutation({
    mutationFn: () => createSegment({ brandId, name, description, rulesJson: { rules } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['segments'] });
      router.push('/dashboard/segments');
    },
  });

  const addRule = () => {
    setRules([...rules, { field: 'bot_id', operator: 'in', value: '' }]);
  };

  const removeRule = (idx: number) => {
    setRules(rules.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/segments"
            className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="h-6 w-6 text-purple-400" />
              Segment Oluşturucu (Segment Builder)
            </h1>
            <p className="text-sm text-slate-400">Dinamik filtreleme kurallarıyla hedef kitle segmenti tanımlayın</p>
          </div>
        </div>

        <button
          onClick={() => createMutation.mutate()}
          disabled={!name || createMutation.isPending}
          className="flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:bg-purple-500 transition disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {createMutation.isPending ? 'Kaydediliyor...' : 'Segmenti Kaydet'}
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300">Segment Adı</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Son 7 Gündür Aktif Aboneler"
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300">Açıklama</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Segment kurgusu hakkında açıklama yazın..."
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Filter className="h-4 w-4 text-purple-400" />
              Segment Kuralları (Filtreleme Koşulları)
            </h3>

            <button
              onClick={addRule}
              className="flex items-center gap-1 text-xs font-semibold text-purple-400 hover:text-purple-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Kural Ekle
            </button>
          </div>

          <div className="space-y-3">
            {rules.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3">
                <select
                  value={rule.field}
                  onChange={(e) => {
                    const copy = [...rules];
                    copy[idx].field = e.target.value;
                    setRules(copy);
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-200 border border-slate-700"
                >
                  <option value="subscribed_at">Abonelik Tarihi</option>
                  <option value="is_blocked">Engelleme Durumu</option>
                  <option value="bot_id">Katıldığı Bot</option>
                  <option value="click_count">Tıklama Sayısı</option>
                </select>

                <select
                  value={rule.operator}
                  onChange={(e) => {
                    const copy = [...rules];
                    copy[idx].operator = e.target.value;
                    setRules(copy);
                  }}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-slate-200 border border-slate-700"
                >
                  <option value="equals">Eşittir</option>
                  <option value="gte">Büyüktür / Eşit</option>
                  <option value="lte">Küçüktür / Eşit</option>
                  <option value="in">İçindedir</option>
                </select>

                <input
                  type="text"
                  value={rule.value}
                  onChange={(e) => {
                    const copy = [...rules];
                    copy[idx].value = e.target.value;
                    setRules(copy);
                  }}
                  placeholder="Değer..."
                  className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs text-white border border-slate-700"
                />

                <button
                  onClick={() => removeRule(idx)}
                  className="text-slate-500 hover:text-red-400 transition p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
