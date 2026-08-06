'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchBots,
  fetchBrands,
  registerBot,
  updateBotSettings,
  queueBulkImportBots,
  fetchBulkImportStatus,
  cancelBulkImport,
  getBulkImportFailedCsvUrl,
  simulateWebhook,
  getStoredBrandId,
} from '@/lib/api';
import {
  Bot,
  Plus,
  CheckCircle,
  Key,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  PlayCircle,
  Tag,
  BellOff,
  Settings,
  Download,
  XCircle,
  Loader2,
  Copy,
} from 'lucide-react';

export default function BotsPage() {
  const queryClient = useQueryClient();
  const activeBrandId = getStoredBrandId() || '';

  // Modal State
  const [isBotModalOpen, setIsBotModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingBot, setEditingBot] = useState<any | null>(null);

  // Form Fields State
  const [token, setToken] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState(activeBrandId);
  const [status, setStatus] = useState<'ACTIVE' | 'PASSED' | 'DRAFT'>('ACTIVE');
  const [tagsInput, setTagsInput] = useState('');
  const [startMessage, setStartMessage] = useState(
    'Merhaba {{first_name}}! 👋\n\n{{bot_name}} botuna hoş geldiniz. Size nasıl yardımcı olabilirim?',
  );
  const [startParseMode, setStartParseMode] = useState<'HTML' | 'MARKDOWN_V2'>('HTML');
  const [buttons, setButtons] = useState<Array<{ text: string; url: string; sameRow?: boolean }>>([]);
  const [disableNotification, setDisableNotification] = useState(false);
  const [description, setDescription] = useState('');

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Bulk Import State
  const [bulkCsvText, setBulkCsvText] = useState('');
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<any | null>(null);
  const [bulkError, setBulkError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Simulation Feedback State
  const [simulatingBotId, setSimulatingBotId] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  // 1. Fetch Brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  });

  // 2. Fetch Bots
  const {
    data: bots = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['bots', selectedBrandId || activeBrandId],
    queryFn: () => fetchBots(selectedBrandId || activeBrandId),
  });

  // Poll bulk import progress if activeImportId exists
  useEffect(() => {
    if (!activeImportId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchBulkImportStatus(activeImportId);
        setImportProgress(res);

        if (res.status === 'COMPLETED' || res.status === 'CANCELLED') {
          clearInterval(interval);
          queryClient.invalidateQueries({ queryKey: ['bots'] });
          queryClient.invalidateQueries({ queryKey: ['brands'] });
        }
      } catch (err: any) {
        console.error('Progress error:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeImportId]);

  // Reset form modal
  const openNewBotModal = () => {
    setEditingBot(null);
    setToken('');
    setDisplayName('');
    setSelectedBrandId(activeBrandId || brands[0]?.id || '');
    setStatus('ACTIVE');
    setTagsInput('');
    setStartMessage('Merhaba {{first_name}}! 👋\n\n{{bot_name}} botuna hoş geldiniz.');
    setStartParseMode('HTML');
    setButtons([{ text: 'Web Sitemiz 🌐', url: 'https://example.com', sameRow: false }]);
    setDisableNotification(false);
    setDescription('');
    setFormError('');
    setFormSuccess('');
    setIsBotModalOpen(true);
  };

  const openEditBotModal = (bot: any) => {
    setEditingBot(bot);
    setToken('');
    setDisplayName(bot.displayName || '');
    setSelectedBrandId(bot.brandId || activeBrandId);
    setStatus(bot.status === 'PASSED' ? 'PASSED' : bot.status === 'ACTIVE' ? 'ACTIVE' : 'DRAFT');
    setTagsInput(Array.isArray(bot.tags) ? bot.tags.join(', ') : '');
    setStartMessage(bot.startMessage || 'Merhaba {{first_name}}! 👋\n\n{{bot_name}} botuna hoş geldiniz.');
    setStartParseMode(bot.startParseMode || 'HTML');
    setButtons(Array.isArray(bot.buttons) ? bot.buttons : []);
    setDisableNotification(!!bot.disableNotification);
    setDescription(bot.description || '');
    setFormError('');
    setFormSuccess('');
    setIsBotModalOpen(true);
  };

  // 3. Register / Create Bot Mutation
  const registerBotMutation = useMutation({
    mutationFn: (data: any) => registerBot(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setFormSuccess('Bot başarıyla oluşturuldu ve ayarları kaydedildi!');
      setTimeout(() => {
        setIsBotModalOpen(false);
        setFormSuccess('');
      }, 1000);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Bot eklenirken hata oluştu.');
    },
  });

  // 4. Update Bot Mutation
  const updateBotMutation = useMutation({
    mutationFn: (data: { botId: string; payload: any }) => updateBotSettings(data.botId, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setFormSuccess('Bot ayarları başarıyla güncellendi!');
      setTimeout(() => {
        setIsBotModalOpen(false);
        setFormSuccess('');
      }, 1000);
    },
    onError: (err: any) => {
      setFormError(err.message || 'Bot ayarları güncellenirken hata oluştu.');
    },
  });

  // 5. Queued Bulk Import Mutation
  const queueBulkImportMutation = useMutation({
    mutationFn: queueBulkImportBots,
    onSuccess: (data) => {
      setActiveImportId(data.importId);
      setImportProgress({
        status: 'QUEUED',
        total: data.total,
        processed: 0,
        successCount: 0,
        failedCount: 0,
        failedRows: [],
      });
      setBulkError('');
    },
    onError: (err: any) => {
      setBulkError(err.message || 'Toplu bot yükleme görevi başlatılırken hata oluştu.');
    },
  });

  // 6. Webhook Simulation Mutation
  const simulateWebhookMutation = useMutation({
    mutationFn: (botId: string) => simulateWebhook(botId, '/start campaign_test'),
    onSuccess: (data, botId) => {
      queryClient.invalidateQueries({ queryKey: ['bots'] });
      setSimulationMessage(`⚡ [Simülasyon Başarılı] ${data.message}`);
      setSimulatingBotId(botId);
      setTimeout(() => {
        setSimulationMessage(null);
        setSimulatingBotId(null);
      }, 5000);
    },
    onError: (err: any) => {
      alert(`Simülasyon Hatası: ${err.message}`);
    },
  });

  const handleSaveBotForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const payload = {
      displayName,
      brandId: selectedBrandId,
      status,
      startMessage,
      startParseMode,
      buttons,
      disableNotification,
      description,
      tags: parsedTags,
      ...(token.trim() && { token: token.trim() }),
    };

    if (editingBot) {
      updateBotMutation.mutate({ botId: editingBot.id, payload });
    } else {
      if (!token.trim()) {
        setFormError('Telegram Bot Token alanı zorunludur.');
        return;
      }
      registerBotMutation.mutate({
        token: token.trim(),
        ...payload,
      });
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) {
      setBulkError('Lütfen en az 1 satır veri içeren CSV metni girin.');
      return;
    }
    const targetBrand = selectedBrandId || activeBrandId || brands[0]?.id;
    if (!targetBrand) {
      setBulkError('Lütfen bir varsayılan marka seçin.');
      return;
    }

    queueBulkImportMutation.mutate({
      brandId: targetBrand,
      csvContent: bulkCsvText,
    });
  };

  const handleCancelImport = async () => {
    if (!activeImportId) return;
    try {
      await cancelBulkImport(activeImportId);
    } catch (err: any) {
      console.error('Cancel error:', err);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) setBulkCsvText(text);
    };
    reader.readAsText(file);
  };

  const csvTemplateHeader = `token,brand_code,groups,active,start_message_template_name,default_redirect_url,notes\n123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ,BRAND1,VIP;Destek,true,"Merhaba {{first_name}}!","https://example.com","Ana Müşteri Botu"\n987654321:XYZabcDefGhIJKlmNoPQRsTUVw,BRAND2,Satış,false,"Hoş geldiniz!","https://example.com/promo","İç Ekip Botu"`;

  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(csvTemplateHeader);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleAddButton = () => {
    setButtons([...buttons, { text: 'Web Sitemiz 🌐', url: 'https://example.com', sameRow: false }]);
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
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="h-6 w-6 text-sky-400" />
            Çoklu Marka Bot Yönetimi & Ayarlar
          </h1>
          <p className="text-sm text-slate-400">
            Telegram bot ekleme, kuyruk üzerinden güvenli toplu içe aktarma, token doğrulaması ve canlı simülasyon
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link
            href="/dashboard/bots/bulk-import"
            className="flex items-center gap-2 rounded-xl bg-slate-800 border border-slate-700 px-4 py-2.5 text-sm font-semibold text-sky-300 hover:bg-slate-700 hover:text-white transition shadow-md"
          >
            <FileSpreadsheet className="h-5 w-5 text-sky-400" />
            CSV ile Toplu Bot Ekle (Kuyruk)
          </Link>

          <button
            onClick={openNewBotModal}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition shadow-lg shadow-sky-600/30"
          >
            <Plus className="h-5 w-5" />
            Yeni Bot Ekle
          </button>
        </div>
      </div>

      {simulationMessage && (
        <div className="rounded-xl border border-sky-500/40 bg-sky-500/10 p-4 text-xs font-semibold text-sky-300 flex items-center justify-between shadow-lg">
          <span>{simulationMessage}</span>
          <button onClick={() => setSimulationMessage(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Bots Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Botlar veritabanından yükleniyor...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
          {(error as any)?.message || 'Botlar yüklenirken hata oluştu.'}
        </div>
      ) : bots.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
          Bu markaya henüz Telegram botu eklenmemiş. "Yeni Bot Ekle" veya "CSV ile Toplu Bot Ekle" butonuna basarak ekleyebilirsiniz!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-2">
          {bots.map((bot: any) => (
            <div key={bot.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      {bot.displayName}
                      {bot.disableNotification && (
                        <span title="Sessiz Bildirim Modu Aktif" className="text-amber-400">
                          <BellOff className="h-4 w-4" />
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-sky-400 font-mono">@{bot.username}</p>
                    <p className="text-xs text-slate-500">Marka: {bot.brandName}</p>
                  </div>
                </div>

                <span
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${
                    bot.status === 'ACTIVE'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : bot.status === 'PASSED'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {bot.status}
                </span>
              </div>

              {/* Description & Tags */}
              {bot.description && (
                <p className="text-xs text-slate-300 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
                  {bot.description}
                </p>
              )}

              {Array.isArray(bot.tags) && bot.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {bot.tags.map((tag: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-300 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20"
                    >
                      <Tag className="h-3 w-3 text-sky-400" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="space-y-2 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <Key className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-slate-300">Maskeli Token: {bot.maskedToken}</span>
                </div>
                <div className="truncate bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-500">Webhook:</span> {bot.webhookUrl}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
                <button
                  onClick={() => simulateWebhookMutation.mutate(bot.id)}
                  disabled={simulateWebhookMutation.isPending && simulatingBotId === bot.id}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600 hover:text-white transition disabled:opacity-50"
                  title="Telegram /start etkinliğini yerelde BullMQ kuyruğuna gönder"
                >
                  <PlayCircle className="h-3.5 w-3.5 text-emerald-400" />
                  Simüle Et (/start)
                </button>

                <button
                  onClick={() => openEditBotModal(bot)}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600/20 border border-sky-500/30 px-3.5 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-600 hover:text-white transition"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Botu Düzenle & Ayarlar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Comprehensive Bot Modal */}
      {isBotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Bot className="h-6 w-6 text-sky-400" />
                  {editingBot ? `${editingBot.displayName} (@${editingBot.username}) — Ayarları Düzenle` : 'Yeni Telegram Botu Ekle'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingBot
                    ? 'Yalnızca Süper Admin ve ilgili marka yöneticisi (BRAND_ADMIN) düzenleme yetkisine sahiptir.'
                    : 'Token doğrulaması, marka seçimi, etiketler, /start karşılama mesajı ve buton ayarları'}
                </p>
              </div>
              <button onClick={() => setIsBotModalOpen(false)} className="text-slate-400 hover:text-white text-lg font-bold">
                ✕
              </button>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-500/10 p-3.5 text-xs text-red-400 border border-red-500/20 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="rounded-lg bg-emerald-500/10 p-3.5 text-xs text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 flex-shrink-0 text-emerald-400" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveBotForm} className="space-y-4">
              {/* Row 1: Token & Display Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Telegram Bot API Token {editingBot ? '(Boş Bırakılırsa Değişmez)' : '(Zorunludur)'}
                  </label>
                  <input
                    type="password"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder={editingBot ? 'Yenilemek için token girin...' : '123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ'}
                    className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-950 py-2.5 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Bot Ekran Adı (DisplayName)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Örn: VIP Müşteri Destek Botu"
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Brand Selection & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Bağlı Marka Seçimi
                  </label>
                  <select
                    value={selectedBrandId}
                    onChange={(e) => setSelectedBrandId(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  >
                    {brands.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Bot Durumu (Aktif / Pasif)
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE) — Mesaj Gönderimine Açık</option>
                    <option value="PASSED">Pasif (PASSED) — Gönderimler Durdurulur</option>
                    <option value="DRAFT">Taslak (DRAFT)</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Tags & Silent Notification */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Bot Grupları / Etiketler (Virgülle Ayırın)
                  </label>
                  <input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="Örn: VIP, Destek, Kampanya, TrEkip"
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <input
                      type="checkbox"
                      checked={disableNotification}
                      onChange={(e) => setDisableNotification(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-700 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="flex items-center gap-1">
                      <BellOff className="h-4 w-4 text-amber-400" />
                      Sessiz Bildirim
                    </span>
                  </label>
                </div>
              </div>

              {/* Description / Internal Notes */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Bot Açıklama & İç Not Alanı
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Botun kullanım amacı, yetkilileri veya iç notlar..."
                  className="mt-1 w-full rounded-lg bg-slate-950 p-2.5 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Start Message & Parse Mode Section */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    /start Karşılama Mesajı Şablonu
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setStartParseMode('HTML')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                        startParseMode === 'HTML' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setStartParseMode('MARKDOWN_V2')}
                      className={`px-3 py-1 text-xs font-semibold rounded-lg ${
                        startParseMode === 'MARKDOWN_V2' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      MarkdownV2
                    </button>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={startMessage}
                  onChange={(e) => setStartMessage(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 p-3 text-sm text-white font-mono border border-slate-700 focus:border-sky-500 focus:outline-none"
                />

                <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex flex-wrap gap-2">
                  <span className="text-slate-300 font-semibold">Değişkenler:</span>
                  <span className="font-mono text-sky-400">{"{{first_name}}"}</span>
                  <span className="font-mono text-sky-400">{"{{last_name}}"}</span>
                  <span className="font-mono text-sky-400">{"{{username}}"}</span>
                  <span className="font-mono text-sky-400">{"{{bot_name}}"}</span>
                  <span className="font-mono text-sky-400">{"{{brand_name}}"}</span>
                </div>
              </div>

              {/* Inline Buttons Editor */}
              <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Başlangıç Mesajı Inline URL Butonları
                  </span>
                  <button
                    type="button"
                    onClick={handleAddButton}
                    className="flex items-center gap-1 text-xs font-semibold text-sky-400 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Buton Ekle
                  </button>
                </div>

                {buttons.length === 0 ? (
                  <div className="text-xs text-slate-500 italic p-2 text-center">
                    Henüz buton eklenmedi. "Buton Ekle" butonuna basarak ekleyebilirsiniz.
                  </div>
                ) : (
                  buttons.map((btn, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                      <input
                        type="text"
                        value={btn.text}
                        onChange={(e) => handleUpdateButton(index, 'text', e.target.value)}
                        placeholder="Buton Metni"
                        className="w-1/3 rounded bg-slate-950 py-1.5 px-2.5 text-xs text-white border border-slate-700"
                      />
                      <input
                        type="text"
                        value={btn.url}
                        onChange={(e) => handleUpdateButton(index, 'url', e.target.value)}
                        placeholder="https://..."
                        className="w-1/2 font-mono rounded bg-slate-950 py-1.5 px-2.5 text-xs text-white border border-slate-700"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveButton(index)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBotModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={registerBotMutation.isPending || updateBotMutation.isPending}
                  className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 shadow-lg shadow-sky-600/30"
                >
                  {registerBotMutation.isPending || updateBotMutation.isPending
                    ? 'Doğrulanıyor & Kaydediliyor...'
                    : editingBot
                    ? 'Ayarları Güncelle & Kaydet'
                    : 'Botu Doğrula & Veritabanına Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Queued Bulk Import Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileSpreadsheet className="h-6 w-6 text-sky-400" />
                CSV / Kuyruk (BullMQ) ile Güvenli Toplu Bot Yükleme
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            {bulkError && (
              <div className="rounded-lg bg-red-500/10 p-3.5 text-xs text-red-400 border border-red-500/20">
                {bulkError}
              </div>
            )}

            {!activeImportId ? (
              <form onSubmit={handleBulkSubmit} className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4" /> CSV Format & Standart Sütunlar
                    </span>
                    <button
                      type="button"
                      onClick={copyTemplateToClipboard}
                      className="flex items-center gap-1 text-xs text-sky-400 hover:underline bg-sky-500/10 px-2.5 py-1 rounded border border-sky-500/20"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copySuccess ? 'Kopyalandı!' : 'Örnek CSV Kopyala'}
                    </button>
                  </div>
                  <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto bg-slate-900 p-2.5 rounded border border-slate-800">
                    token,brand_code,groups,active,start_message_template_name,default_redirect_url,notes
                  </pre>
                  <p className="text-[11px] text-slate-400">
                    Sütunlar: <code>token</code>, <code>brand_code</code>, <code>groups</code>, <code>active</code>, <code>start_message_template_name</code>, <code>default_redirect_url</code>, <code>notes</code>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                      Varsayılan Marka (brand_code boş ise kullanılır)
                    </label>
                    <select
                      value={selectedBrandId}
                      onChange={(e) => setSelectedBrandId(e.target.value)}
                      className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                    >
                      {brands.map((b: any) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                      .csv / .txt Dosyası Yükle
                    </label>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="w-full text-xs text-slate-400 bg-slate-950 p-2 rounded-lg border border-slate-700 file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-sky-600 file:text-white hover:file:bg-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1">
                    veya CSV İçeriğini Buraya Yapıştırın
                  </label>
                  <textarea
                    rows={6}
                    value={bulkCsvText}
                    onChange={(e) => setBulkCsvText(e.target.value)}
                    placeholder={csvTemplateHeader}
                    className="w-full rounded-lg bg-slate-950 p-3 font-mono text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={queueBulkImportMutation.isPending}
                    className="flex items-center gap-2 rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 shadow-lg shadow-sky-600/30"
                  >
                    {queueBulkImportMutation.isPending ? 'Kuyruğa Ekleniyor...' : 'Kuyruk Üzerinden İşlemi Başlat'}
                  </button>
                </div>
              </form>
            ) : (
              /* Real-Time Progress View */
              <div className="space-y-5">
                <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Görev Durumu</span>
                      <div className="flex items-center gap-2 text-lg font-bold text-white pt-0.5">
                        {importProgress?.status === 'PROCESSING' && (
                          <>
                            <Loader2 className="h-5 w-5 text-sky-400 animate-spin" />
                            <span>İşleniyor...</span>
                          </>
                        )}
                        {importProgress?.status === 'QUEUED' && (
                          <span className="text-sky-400 font-mono">Kuyrukta Bekliyor</span>
                        )}
                        {importProgress?.status === 'COMPLETED' && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                            <CheckCircle className="h-5 w-5" /> İçe Aktarma Tamamlandı
                          </span>
                        )}
                        {importProgress?.status === 'CANCELLED' && (
                          <span className="text-amber-400 font-bold flex items-center gap-1.5">
                            <XCircle className="h-5 w-5" /> İptal Edildi
                          </span>
                        )}
                      </div>
                    </div>

                    {importProgress?.status === 'PROCESSING' && (
                      <button
                        onClick={handleCancelImport}
                        className="flex items-center gap-1.5 rounded-lg bg-red-600/20 border border-red-500/30 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition"
                      >
                        <XCircle className="h-4 w-4" /> İçe Aktarmayı İptal Et
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {importProgress?.total > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-mono text-slate-400">
                        <span>İlerleme: {importProgress.processed} / {importProgress.total} Satır</span>
                        <span>%{Math.round((importProgress.processed / importProgress.total) * 100)}</span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 transition-all duration-300 rounded-full"
                          style={{ width: `${Math.round((importProgress.processed / importProgress.total) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 text-center pt-2">
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800">
                      <span className="text-xs text-slate-400">Toplam Satır</span>
                      <div className="text-lg font-bold text-white">{importProgress?.total || 0}</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-emerald-500/30">
                      <span className="text-xs text-emerald-400">Başarılı Kayıt</span>
                      <div className="text-lg font-bold text-emerald-400">{importProgress?.successCount || 0}</div>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-red-500/30">
                      <span className="text-xs text-red-400">Hatalı Satır</span>
                      <div className="text-lg font-bold text-red-400">{importProgress?.failedCount || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Error Log & Export */}
                {importProgress?.failedRows?.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" /> Hatalı Satırlar Detayı ({importProgress.failedRows.length})
                      </span>

                      <a
                        href={getBulkImportFailedCsvUrl(activeImportId)}
                        download={`hatali_bot_satirlari_${activeImportId.slice(0, 8)}.csv`}
                        className="flex items-center gap-1.5 text-xs font-bold text-sky-400 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-500/20 hover:bg-sky-500 hover:text-white transition"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Hatalı Satırları CSV Olarak İndir
                      </a>
                    </div>

                    <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2 font-mono text-xs">
                      {importProgress.failedRows.map((r: any, idx: number) => (
                        <div key={idx} className="p-2 rounded bg-slate-900 border border-red-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-slate-300 font-semibold">Satır #{r.rowNumber} ({r.token})</span>
                          <span className="text-red-400 text-right">{r.error}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsBulkModalOpen(false);
                      setActiveImportId(null);
                      setImportProgress(null);
                    }}
                    className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
                  >
                    Tamamla & Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
