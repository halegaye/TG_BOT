'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, RotateCw, AlertCircle, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';
import { previewNextRuns } from '@/lib/api';

interface ScheduleBuilderProps {
  brandId?: string;
  userRole?: string; // 'SUPER_ADMIN' | 'BRAND_ADMIN' etc.
  value: any;
  onChange: (newValue: any) => void;
}

export default function ScheduleBuilder({ brandId, userRole = 'VIEW_ONLY', value, onChange }: ScheduleBuilderProps) {
  const [scheduleConfig, setScheduleConfig] = useState<any>({
    scheduleType: value.scheduleType || 'IMMEDIATE',
    scheduledAt: value.scheduledAt || '',
    intervalHours: value.intervalHours || 2,
    timeOfDay: value.timeOfDay || '14:30',
    timesOfDay: value.timesOfDay || ['09:00', '14:00', '20:00'],
    daysOfWeek: value.daysOfWeek || [1, 3, 5],
    dayOfMonth: value.dayOfMonth || 15,
    startsAt: value.startsAt || '',
    endsAt: value.endsAt || '',
    isIndefinite: value.isIndefinite !== undefined ? value.isIndefinite : true,
    maxExecutions: value.maxExecutions || 10,
    customCron: value.customCron || '0 14 * * *',
  });

  const [nextRuns, setNextRuns] = useState<any[]>([]);
  const [brandTimezone, setBrandTimezone] = useState<string>('Europe/Belgrade');
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [newTimeInput, setNewTimeInput] = useState<string>('12:00');

  const isAdvancedUser = ['SUPER_ADMIN', 'BRAND_ADMIN', 'CAMPAIGN_MANAGER'].includes(userRole);

  const updateConfig = (key: string, val: any) => {
    const updated = { ...scheduleConfig, [key]: val };
    setScheduleConfig(updated);
    onChange(updated);
  };

  // Fetch Live Next 5 Occurrences Preview
  useEffect(() => {
    let isMounted = true;
    setLoadingPreview(true);

    previewNextRuns({ ...scheduleConfig, brandId })
      .then((res) => {
        if (isMounted) {
          setNextRuns(res.nextRunsFormatted || []);
          setBrandTimezone(res.brandTimezone || 'Europe/Belgrade');
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingPreview(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    scheduleConfig.scheduleType,
    scheduleConfig.scheduledAt,
    scheduleConfig.intervalHours,
    scheduleConfig.timeOfDay,
    scheduleConfig.timesOfDay,
    scheduleConfig.daysOfWeek,
    scheduleConfig.dayOfMonth,
    scheduleConfig.startsAt,
    scheduleConfig.endsAt,
    scheduleConfig.isIndefinite,
    scheduleConfig.maxExecutions,
    scheduleConfig.customCron,
    brandId,
  ]);

  const daysOptions = [
    { label: 'Pzt', value: 1 },
    { label: 'Sal', value: 2 },
    { label: 'Çar', value: 3 },
    { label: 'Per', value: 4 },
    { label: 'Cum', value: 5 },
    { label: 'Cmt', value: 6 },
    { label: 'Paz', value: 0 },
  ];

  const toggleDay = (dayVal: number) => {
    const current = scheduleConfig.daysOfWeek || [];
    const updated = current.includes(dayVal)
      ? current.filter((d: number) => d !== dayVal)
      : [...current, dayVal];
    updateConfig('daysOfWeek', updated);
  };

  const addTimeOfDay = () => {
    if (!newTimeInput) return;
    const current = scheduleConfig.timesOfDay || [];
    if (!current.includes(newTimeInput)) {
      updateConfig('timesOfDay', [...current, newTimeInput].sort());
    }
  };

  const removeTimeOfDay = (t: string) => {
    const current = scheduleConfig.timesOfDay || [];
    updateConfig(
      'timesOfDay',
      current.filter((item: string) => item !== t),
    );
  };

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
      <div className="border-b border-slate-800 pb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="h-5 w-5 text-sky-400" />
          Zamanlama Ayarları (Gelişmiş Çalışma Planlayıcısı)
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Mesaj gönderiminizin ne zaman ve hangi periyotla otomatik gerçekleşeceğini seçin. Veriler UTC saklanır, markanızın saat dilimine göre dönüştürülür.
        </p>
      </div>

      {/* Schedule Type Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300">Zamanlama Türü</label>
        <select
          value={scheduleConfig.scheduleType}
          onChange={(e) => updateConfig('scheduleType', e.target.value)}
          className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-sm text-white focus:border-sky-500 focus:outline-none"
        >
          <option value="IMMEDIATE">⚡ Şimdi Gönder (Anında Başlat)</option>
          <option value="ONCE">📅 Tek Seferlik Belirli Tarih ve Saatte</option>
          <option value="HOURLY">⏱️ Her Saat Başı</option>
          <option value="EVERY_X_HOURS">⏳ Her X Saatte Bir</option>
          <option value="DAILY_AT_TIME">☀️ Her Gün Belirli Saatte</option>
          <option value="DAILY_MULTIPLE_TIMES">🔔 Her Gün Birden Fazla Seçilmiş Saatte</option>
          <option value="WEEKLY_DAYS">🗓️ Haftanın Belirli Günlerinde</option>
          <option value="WEEKLY">📆 Her Hafta (Haftalık)</option>
          <option value="MONTHLY_DAY">📆 Her Ayın Belirli Gününde</option>
          {isAdvancedUser && <option value="CUSTOM_CRON">⚙️ Özel Cron İfasi (Yalnızca İleri Düzey Yetkililer)</option>}
        </select>
      </div>

      {/* Dynamic Sub-Controls Based on Type */}
      <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
        {scheduleConfig.scheduleType === 'ONCE' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Gönderim Tarihi ve Saati</label>
            <input
              type="datetime-local"
              value={scheduleConfig.scheduledAt}
              onChange={(e) => updateConfig('scheduledAt', e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        )}

        {scheduleConfig.scheduleType === 'EVERY_X_HOURS' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Kaç Saatte Bir Çalışsın? (Saat)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={scheduleConfig.intervalHours}
              onChange={(e) => updateConfig('intervalHours', parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        )}

        {(scheduleConfig.scheduleType === 'DAILY_AT_TIME' ||
          scheduleConfig.scheduleType === 'WEEKLY_DAYS' ||
          scheduleConfig.scheduleType === 'WEEKLY' ||
          scheduleConfig.scheduleType === 'MONTHLY_DAY') && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Günün Hangi Saatininde Çalışsın?</label>
            <input
              type="time"
              value={scheduleConfig.timeOfDay}
              onChange={(e) => updateConfig('timeOfDay', e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        )}

        {scheduleConfig.scheduleType === 'DAILY_MULTIPLE_TIMES' && (
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-300">Her Gün Çalışacak Saatler Listesi</label>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={newTimeInput}
                onChange={(e) => setNewTimeInput(e.target.value)}
                className="rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-sm text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={addTimeOfDay}
                className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-500"
              >
                + Saat Ekle
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {(scheduleConfig.timesOfDay || []).map((t: string) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/10 px-3 py-1 text-xs font-mono text-sky-400 border border-sky-500/20"
                >
                  ⏰ {t}
                  <button
                    type="button"
                    onClick={() => removeTimeOfDay(t)}
                    className="text-red-400 hover:text-red-300 text-xs font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {scheduleConfig.scheduleType === 'WEEKLY_DAYS' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Çalışacağı Günleri Seçin</label>
            <div className="flex flex-wrap gap-2">
              {daysOptions.map((opt) => {
                const selected = (scheduleConfig.daysOfWeek || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleDay(opt.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                      selected
                        ? 'bg-sky-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {scheduleConfig.scheduleType === 'MONTHLY_DAY' && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Her Ayın Kaçıncı Günü? (1-31)</label>
            <input
              type="number"
              min="1"
              max="31"
              value={scheduleConfig.dayOfMonth}
              onChange={(e) => updateConfig('dayOfMonth', parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none"
            />
          </div>
        )}

        {scheduleConfig.scheduleType === 'CUSTOM_CRON' && isAdvancedUser && (
          <div className="space-y-2">
            <label className="text-xs font-semibold text-sky-400 flex items-center gap-1">
              <ShieldAlert className="h-4 w-4" /> Özel Cron İfadesi (Örn: "0 14 * * *")
            </label>
            <input
              type="text"
              value={scheduleConfig.customCron}
              onChange={(e) => updateConfig('customCron', e.target.value)}
              placeholder="0 14 * * *"
              className="w-full rounded-xl bg-slate-900 border border-sky-500/40 px-4 py-2 text-sm font-mono text-white focus:outline-none"
            />
          </div>
        )}

        {/* Date Ranges & Limits */}
        {scheduleConfig.scheduleType !== 'IMMEDIATE' && (
          <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400">Başlangıç Tarihi (İsteğe Bağlı)</label>
              <input
                type="datetime-local"
                value={scheduleConfig.startsAt}
                onChange={(e) => updateConfig('startsAt', e.target.value)}
                className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400">Bitiş Tarihi (İsteğe Bağlı)</label>
              <input
                type="datetime-local"
                value={scheduleConfig.endsAt}
                onChange={(e) => updateConfig('endsAt', e.target.value)}
                className="w-full mt-1 rounded-xl bg-slate-900 border border-slate-700 px-3 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="col-span-1 md:col-span-2 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isIndefinite"
                  checked={scheduleConfig.isIndefinite}
                  onChange={(e) => updateConfig('isIndefinite', e.target.checked)}
                  className="h-4 w-4 rounded bg-slate-950 border-slate-700 text-sky-600 focus:ring-sky-500"
                />
                <label htmlFor="isIndefinite" className="text-xs text-slate-200 cursor-pointer">
                  Süresiz Tekrar Et (Sınır Olmadan Çalışsın)
                </label>
              </div>

              {!scheduleConfig.isIndefinite && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">En Fazla</span>
                  <input
                    type="number"
                    min="1"
                    value={scheduleConfig.maxExecutions}
                    onChange={(e) => updateConfig('maxExecutions', parseInt(e.target.value, 10) || 1)}
                    className="w-20 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1 text-xs text-white text-center focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">Kez Tekrar Et</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Live Next 5 Occurrences Preview Card */}
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <Calendar className="h-4 w-4" />
            Ön İzleme: Bir Sonraki En Az 5 Çalışma Zamanı
          </div>
          <span className="text-[11px] font-mono text-emerald-300/80 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            Saat Dilimi: {brandTimezone}
          </span>
        </div>

        {loadingPreview ? (
          <div className="text-xs text-slate-400 py-2">Çalışma zamanları hesaplanıyor...</div>
        ) : nextRuns.length === 0 ? (
          <div className="text-xs text-slate-400 py-2">
            Seçilen parametrelere göre gelecek için planlanmış bir çalışma zamanı bulunamadı.
          </div>
        ) : (
          <div className="space-y-1.5">
            {nextRuns.map((run: any) => (
              <div
                key={run.index}
                className="flex items-center justify-between text-xs bg-slate-950/80 px-3 py-2 rounded-lg border border-slate-800"
              >
                <span className="font-semibold text-slate-400">{run.index}. Çalışma:</span>
                <span className="font-mono text-emerald-300 font-medium">{run.formatted}</span>
                <span className="text-[10px] text-slate-500 font-mono">({new Date(run.utc).toUTCString()})</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
