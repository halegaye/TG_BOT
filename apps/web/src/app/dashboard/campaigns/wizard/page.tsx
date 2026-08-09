'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBots,
  fetchTemplates,
  createCampaign,
  dispatchCampaign,
  estimateAudience,
  testSendCampaign,
  submitCampaignApproval,
  approveCampaign,
  scheduleCampaign,
  getStoredBrandId,
} from '@/lib/api';
import {
  Send,
  Eye,
  Plus,
  Trash2,
  CheckCircle,
  Sparkles,
  CheckSquare,
  Square,
  Users,
  Bot,
  AlertTriangle,
  FileText,
  Clock,
  Calculator,
  ShieldCheck,
  FlaskConical,
  Zap,
} from 'lucide-react';
import ScheduleBuilder from '../components/ScheduleBuilder';

export default function CampaignWizardPage() {
  const queryClient = useQueryClient();
  const activeBrandId = getStoredBrandId() || '';

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<'IMMEDIATE' | 'SCHEDULED' | 'RECURRING' | 'AB_TEST'>('IMMEDIATE');
  const [priority, setPriority] = useState<'HIGH' | 'NORMAL' | 'LOW'>('NORMAL');
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>([]);
  const [targetAllBots, setTargetAllBots] = useState<boolean>(true);
  const [templateId, setTemplateId] = useState<string>('');

  const [parseMode, setParseMode] = useState<'HTML' | 'MARKDOWN_V2'>('HTML');
  const [messageText, setMessageText] = useState(
    'Merhaba {{first_name}}! 👋\n\nYeni kampanya fırsatlarımız başladı. Detaylar için aşağıdaki butona tıklayabilirsiniz!',
  );
  const [buttons, setButtons] = useState<Array<{ text: string; url: string; sameRow?: boolean }>>([
    { text: 'Kampanyayı İncele 🚀', url: 'https://example.com/promo', sameRow: false },
  ]);

  const [quietHoursPolicy, setQuietHoursPolicy] = useState<'SKIP' | 'DELAY_TO_NEXT_WINDOW' | 'FORCE_SEND'>('SKIP');
  const [frequencyLimitPolicy, setFrequencyLimitPolicy] = useState<'SKIP' | 'DELAY'>('SKIP');
  const [scheduledAt, setScheduledAt] = useState('');
  const [scheduleConfig, setScheduleConfig] = useState<any>({
    scheduleType: 'IMMEDIATE',
    scheduledAt: '',
    intervalHours: 2,
    timeOfDay: '14:30',
    timesOfDay: ['09:00', '14:00', '20:00'],
    daysOfWeek: [1, 3, 5],
    dayOfMonth: 15,
    startsAt: '',
    endsAt: '',
    isIndefinite: true,
    maxExecutions: 10,
    customCron: '0 14 * * *',
  });

  const [testTelegramUserId, setTestTelegramUserId] = useState('');
  const [testFeedback, setTestFeedback] = useState<string | null>(null);

  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [isDispatched, setIsDispatched] = useState(false);
  const [dispatchResult, setDispatchResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  // 1. Fetch Real Bots from DB
  const { data: bots = [], isLoading: isLoadingBots } = useQuery({
    queryKey: ['bots', activeBrandId],
    queryFn: async () => {
      const brandBots = await fetchBots(activeBrandId);
      if (Array.isArray(brandBots) && brandBots.length > 0) return brandBots;
      return fetchBots();
    },
  });

  // 2. Fetch Templates
  const { data: templates = [] } = useQuery({
    queryKey: ['templates', activeBrandId],
    queryFn: () => fetchTemplates(activeBrandId, true),
  });

  useEffect(() => {
    if (bots.length > 0 && selectedBotIds.length === 0 && targetAllBots) {
      setSelectedBotIds(bots.map((b: any) => b.id));
    }
  }, [bots]);

  const handleSelectTemplate = (selectedId: string) => {
    setTemplateId(selectedId);
    if (!selectedId) return;

    const tmpl = templates.find((t: any) => t.id === selectedId);
    if (tmpl) {
      setMessageText(tmpl.content);
      setParseMode(tmpl.parseMode || 'HTML');
      if (Array.isArray(tmpl.buttons)) {
        setButtons(tmpl.buttons);
      }
    }
  };

  const handleToggleSelectAll = () => {
    if (targetAllBots || selectedBotIds.length === bots.length) {
      setTargetAllBots(false);
      setSelectedBotIds([]);
    } else {
      setTargetAllBots(true);
      setSelectedBotIds(bots.map((b: any) => b.id));
    }
  };

  const handleToggleBot = (botId: string) => {
    if (targetAllBots) setTargetAllBots(false);
    if (selectedBotIds.includes(botId)) {
      const updated = selectedBotIds.filter((id) => id !== botId);
      setSelectedBotIds(updated);
    } else {
      const updated = [...selectedBotIds, botId];
      setSelectedBotIds(updated);
      if (updated.length === bots.length) setTargetAllBots(true);
    }
  };

  const targetBots = targetAllBots ? bots : bots.filter((b: any) => selectedBotIds.includes(b.id));

  // Estimate Audience Mutation
  const estimateMutation = useMutation({
    mutationFn: () =>
      estimateAudience({
        brandId: activeBrandId,
        targetBotIds: targetAllBots ? ['ALL'] : selectedBotIds,
      }),
    onSuccess: (res) => {
      setEstimatedCount(res.estimatedRecipientsCount);
    },
  });

  // Test Send Mutation
  const testSendMutation = useMutation({
    mutationFn: async () => {
      const created = await createCampaign({
        title: title || 'Test Kampanyası ' + new Date().toLocaleTimeString('tr-TR'),
        description,
        brandId: activeBrandId,
        templateId: templateId || undefined,
      });

      return testSendCampaign(created.id, testTelegramUserId);
    },
    onSuccess: (res) => {
      setTestFeedback(`✅ [Test Gönderildi] ${res.message}`);
      setTimeout(() => setTestFeedback(null), 5000);
    },
    onError: (err: any) => setError(err.message || 'Test gönderimi hatası.'),
  });

  // Dispatch Campaign Mutation
  const dispatchMutation = useMutation({
    mutationFn: async () => {
      const created = await createCampaign({
        title: title || 'Hızlı Duyuru ' + new Date().toLocaleDateString('tr-TR'),
        description,
        brandId: activeBrandId,
        type: scheduleConfig.scheduleType === 'IMMEDIATE' ? 'IMMEDIATE' : 'SCHEDULED',
        priority,
        targetBotIds: targetAllBots ? ['ALL'] : selectedBotIds,
        templateId: templateId || undefined,
        quietHoursPolicy,
        frequencyLimitPolicy,
        ...scheduleConfig,
        status: scheduleConfig.scheduleType === 'IMMEDIATE' ? 'ACTIVE' : 'SCHEDULED',
      });

      if (type === 'SCHEDULED' && scheduledAt) {
        return scheduleCampaign(created.id, scheduledAt);
      }

      return dispatchCampaign(created.id, {
        botIds: targetAllBots ? ['ALL'] : selectedBotIds,
        targetAllBots,
        messageText,
        parseMode,
        buttons,
        templateId: templateId || undefined,
      });
    },
    onSuccess: (res) => {
      setDispatchResult(res);
      setIsDispatched(true);
      setError('');
    },
    onError: (err: any) => setError(err.message || 'Kampanya başlatılırken hata oluştu.'),
  });

  const handleAddButton = () => {
    setButtons([...buttons, { text: 'Yeni Buton 🔗', url: 'https://example.com', sameRow: false }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleUpdateButton = (index: number, field: string, value: any) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], [field]: value };
    setButtons(updated);
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Wizard Header */}
      <div className="border-b border-slate-800 pb-5">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-sky-400" />
          Gelişmiş Kampanya & Duyuru Yönetimi
        </h1>
        <p className="text-sm text-slate-400">
          Marka şablonları, çoklu bot hedefleme, A/B varyasyonları, sessiz saat politikaları ve onay akışı
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 p-3.5 text-xs text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      {testFeedback && (
        <div className="rounded-lg bg-emerald-500/10 p-3.5 text-xs text-emerald-400 border border-emerald-500/20 font-semibold">
          {testFeedback}
        </div>
      )}

      {/* Step Progress */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-900/60 p-4 rounded-2xl border border-slate-800 gap-3 overflow-x-auto">
        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs">1</span>
          Hedef & Bot Seçimi ({targetBots.length} Bot)
        </div>
        <div className="h-0.5 w-12 bg-slate-800"></div>
        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs">2</span>
          Şablon & Mesaj Editörü
        </div>
        <div className="h-0.5 w-12 bg-slate-800"></div>
        <div className={`flex items-center gap-2 ${step >= 3 ? 'text-sky-400 font-bold' : 'text-slate-500'}`}>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs">3</span>
          Zamanlama & Test & Onay
        </div>
      </div>

      {/* Step 1: Target & Multi-Bot Selection */}
      {step === 1 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Kampanya Adı
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: 2026 VIP Yaz Duyurusu"
                className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Kampanya Türü
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
              >
                <option value="IMMEDIATE">Anlık Gönderim (IMMEDIATE)</option>
                <option value="SCHEDULED">Zamanlanmış (SCHEDULED)</option>
                <option value="RECURRING">Tekrarlayan (RECURRING)</option>
                <option value="AB_TEST">A/B Testi (AB_TEST)</option>
              </select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Hedef Bot Seçimi (Çoklu Bot & Marka Tümünü Seç)
                </label>
                <p className="text-xs text-slate-400">
                  Kampanyanızı istediğiniz belirli botlara veya markadaki tüm botlara yönlendirebilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  disabled={bots.length === 0}
                  className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border transition ${
                    targetAllBots || (bots.length > 0 && selectedBotIds.length === bots.length)
                      ? 'bg-sky-600/20 text-sky-400 border-sky-500/40 hover:bg-sky-600/30'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  {targetAllBots || (bots.length > 0 && selectedBotIds.length === bots.length) ? (
                    <>
                      <CheckSquare className="h-4 w-4 text-sky-400" />
                      Tüm Botlar Seçildi ({bots.length})
                    </>
                  ) : (
                    <>
                      <Square className="h-4 w-4 text-slate-400" />
                      Markaya Ait Tüm Botları Seç ({bots.length})
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Audience Estimator Button & Pill */}
            <div className="flex items-center justify-between text-xs px-2 py-1 text-slate-400">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Bot className="h-4 w-4 text-sky-400" />
                Seçili Bot: <strong className="text-white">{targetBots.length}</strong> / {bots.length}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => estimateMutation.mutate()}
                  disabled={estimateMutation.isPending}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline bg-sky-500/10 px-3 py-1 rounded border border-sky-500/20"
                >
                  <Calculator className="h-3.5 w-3.5" />
                  {estimateMutation.isPending ? 'Hesaplanıyor...' : 'Tahmini Alıcı Hesapla'}
                </button>

                {estimatedCount !== null && (
                  <span className="flex items-center gap-1.5 font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                    <Users className="h-3.5 w-3.5" />
                    Tahmini Alıcı: <strong>{estimatedCount.toLocaleString('tr-TR')} Kullanıcı</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Bot Grid */}
            {isLoadingBots ? (
              <div className="text-xs text-slate-400 py-6 text-center">Botlar yükleniyor...</div>
            ) : bots.length === 0 ? (
              <div className="text-xs text-red-400 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
                Henüz bot bulunamadı. Lütfen önce Bot Yönetimi sekmesinden bot ekleyin!
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {bots.map((b: any) => {
                  const isChecked = targetAllBots || selectedBotIds.includes(b.id);
                  return (
                    <div
                      key={b.id}
                      onClick={() => handleToggleBot(b.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-sky-950/40 border-sky-500/60 shadow-lg shadow-sky-900/10'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-5 w-5 rounded flex items-center justify-center border transition ${
                            isChecked ? 'bg-sky-600 border-sky-500 text-white' : 'bg-slate-900 border-slate-700 text-transparent'
                          }`}
                        >
                          ✓
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-2">
                            {b.displayName}
                            <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                              @{b.username}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 pt-0.5">
                            {(b.subscribers || 0).toLocaleString('tr-TR')} Abone
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <button
              disabled={bots.length === 0 || (!targetAllBots && selectedBotIds.length === 0)}
              onClick={() => {
                setError('');
                setStep(2);
              }}
              className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
            >
              İleri: Şablon & Mesaj Editörüne Geç &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Template Selection & Message Editor */}
      {step === 2 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5 shadow-xl">
            {/* Template Selector */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4" /> Hazır Marka Mesaj Şablonu Seç
              </label>
              <select
                value={templateId}
                onChange={(e) => handleSelectTemplate(e.target.value)}
                className="w-full rounded-lg bg-slate-900 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
              >
                <option value="">-- Özel Metin / Şablonsuz --</option>
                {templates.map((t: any) => (
                  <option key={t.id} value={t.id}>
                    {t.name} (v{t.version}) - {t.mediaType !== 'NONE' ? `[${t.mediaType}]` : '[Metin]'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Şablon Mesaj Metni
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setParseMode('HTML')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg ${parseMode === 'HTML' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  HTML
                </button>
                <button
                  type="button"
                  onClick={() => setParseMode('MARKDOWN_V2')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg ${parseMode === 'MARKDOWN_V2' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                >
                  MarkdownV2
                </button>
              </div>
            </div>

            <textarea
              rows={6}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full rounded-lg bg-slate-950 p-3 text-sm text-white font-mono border border-slate-700 focus:border-sky-500 focus:outline-none"
            />

            {/* Inline Buttons */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Inline URL Butonları
                </span>
                <button
                  type="button"
                  onClick={handleAddButton}
                  className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Buton Ekle
                </button>
              </div>

              {buttons.map((btn, index) => (
                <div key={index} className="flex items-center gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <input
                    type="text"
                    value={btn.text}
                    onChange={(e) => handleUpdateButton(index, 'text', e.target.value)}
                    placeholder="Buton Metni"
                    className="w-1/3 rounded bg-slate-900 py-1.5 px-2.5 text-xs text-white border border-slate-700"
                  />
                  <input
                    type="text"
                    value={btn.url}
                    onChange={(e) => handleUpdateButton(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="w-1/2 font-mono rounded bg-slate-900 py-1.5 px-2.5 text-xs text-white border border-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveButton(index)}
                    className="text-red-400 p-1 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
              >
                &larr; Geri
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="rounded-xl bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
              >
                İleri: Zamanlama & Test & Onay &rarr;
              </button>
            </div>
          </div>

          {/* Telegram Mock Preview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl flex flex-col">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Eye className="h-4 w-4 text-sky-400" />
              Canlı Telegram Önizleme
            </h3>

            <div className="flex-1 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 font-sans">
              <div className="bg-slate-800/80 p-3.5 rounded-2xl rounded-tl-sm max-w-sm text-sm text-slate-100 whitespace-pre-wrap shadow-md">
                {messageText.replace('{{first_name}}', 'Ahmet')}
              </div>

              {buttons.length > 0 && (
                <div className="space-y-1.5 max-w-sm">
                  {buttons.map((btn, i) => (
                    <a
                      key={i}
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      className="block text-center rounded-xl bg-slate-800/90 hover:bg-slate-700 py-2 px-4 text-xs font-semibold text-sky-400 border border-slate-700 shadow"
                    >
                      {btn.text} 🔗
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Scheduling, Quiet Hours, Test Send & Dispatch */}
      {step === 3 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl">
          {isDispatched ? (
            <div className="py-8 space-y-4 max-w-xl mx-auto text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <CheckCircle className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-white">Kampanya Gönderim Kuyruğuna Eklendi!</h2>
              <div className="text-xs font-mono text-emerald-400 bg-slate-950 p-4 rounded-xl border border-slate-800 text-left space-y-1">
                <div><strong>Kampanya ID:</strong> {dispatchResult?.campaignId}</div>
                <div><strong>Hedef Bot Sayısı:</strong> {dispatchResult?.botCount} Bot</div>
                <div><strong>Kuyruğa Alınan Mesaj:</strong> {dispatchResult?.totalEnqueued} Adet</div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDispatched(false);
                  setDispatchResult(null);
                  setStep(1);
                }}
                className="rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Yeni Kampanya Başlat
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enterprise Schedule Builder Component */}
              <ScheduleBuilder
                brandId={activeBrandId}
                userRole="SUPER_ADMIN"
                value={scheduleConfig}
                onChange={setScheduleConfig}
              />

              {/* Quiet Hours Policy */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Sessiz Saat Politikası (Gece Gönderimi)
                </label>
                <select
                  value={quietHoursPolicy}
                  onChange={(e) => setQuietHoursPolicy(e.target.value as any)}
                  className="mt-1 w-full rounded-lg bg-slate-900 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                >
                  <option value="SKIP">Atla (Sessiz Saatlerde Gönderme)</option>
                  <option value="DELAY_TO_NEXT_WINDOW">Ertelesin (Sabah Pencerisine Kaydır)</option>
                  <option value="FORCE_SEND">Zorla Gönder (Sessiz Bildirimle Gönder)</option>
                </select>
              </div>

              {/* Test Send Box */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <FlaskConical className="h-4 w-4" /> Canlı Test Gönderimi (Developers / Admins)
                </span>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={testTelegramUserId}
                    onChange={(e) => setTestTelegramUserId(e.target.value)}
                    placeholder="Telegram User ID veya Chat ID (Örn: 5947341902)"
                    className="flex-1 rounded-lg bg-slate-900 py-2 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!testTelegramUserId) return setError('Lütfen test Telegram User ID girin.');
                      testSendMutation.mutate();
                    }}
                    disabled={testSendMutation.isPending}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-500 disabled:opacity-50"
                  >
                    {testSendMutation.isPending ? 'Gönderiliyor...' : 'Test Mesajı Gönder'}
                  </button>
                </div>
              </div>

              {/* Final Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-300 hover:bg-slate-700"
                >
                  &larr; Şablona Dön
                </button>

                <button
                  type="button"
                  disabled={dispatchMutation.isPending}
                  onClick={() => {
                    if (!title.trim()) {
                      setError('Lütfen önce 1. Adımda Kampanya Başlığı giriniz.');
                      return;
                    }
                    setError('');
                    dispatchMutation.mutate();
                  }}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-7 py-3 text-sm font-bold text-white hover:bg-emerald-500 disabled:opacity-50 shadow-lg shadow-emerald-600/30 cursor-pointer"
                >
                  <Send className="h-5 w-5" />
                  {dispatchMutation.isPending
                    ? 'Kuyruğa Ekleniyor...'
                    : type === 'SCHEDULED'
                    ? 'Kampanyayı Zamanla'
                    : 'Kampanyayı Başlat & Toplu Gönder'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
