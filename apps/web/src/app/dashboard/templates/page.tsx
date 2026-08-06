'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchTemplates,
  fetchBrands,
  createTemplate,
  updateTemplate,
  approveTemplate,
  rejectTemplate,
  deleteTemplate,
  getStoredBrandId,
} from '@/lib/api';
import {
  FileText,
  Plus,
  CheckCircle,
  Image as ImageIcon,
  Video,
  File,
  Tag,
  Trash2,
  Settings,
  AlertCircle,
  Zap,
  Check,
  X,
  Code,
  Link as LinkIcon,
} from 'lucide-react';

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const activeBrandId = getStoredBrandId() || '';

  const [selectedBrandId, setSelectedBrandId] = useState(activeBrandId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [parseMode, setParseMode] = useState<'HTML' | 'MARKDOWN_V2'>('HTML');
  const [mediaType, setMediaType] = useState<'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT'>('NONE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [buttons, setButtons] = useState<Array<{ text: string; url: string; sameRow?: boolean }>>([]);
  const [isActive, setIsActive] = useState(true);

  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // 1. Fetch Brands
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  });

  // 2. Fetch Templates
  const {
    data: templates = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['templates', selectedBrandId || activeBrandId],
    queryFn: () => fetchTemplates(selectedBrandId || activeBrandId),
  });

  const openNewModal = () => {
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setContent('Merhaba {{first_name}}! 👋\n\n{{brand_name}} duyurusudur.');
    setParseMode('HTML');
    setMediaType('NONE');
    setMediaUrl('');
    setButtons([{ text: 'Web Sitemiz 🌐', url: 'https://example.com', sameRow: false }]);
    setIsActive(true);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const openEditModal = (tmpl: any) => {
    setEditingTemplate(tmpl);
    setName(tmpl.name);
    setDescription(tmpl.description || '');
    setContent(tmpl.content);
    setParseMode(tmpl.parseMode || 'HTML');
    setMediaType(tmpl.mediaType || 'NONE');
    setMediaUrl(tmpl.mediaUrl || '');
    setButtons(Array.isArray(tmpl.buttons) ? tmpl.buttons : []);
    setIsActive(tmpl.isActive);
    setFormError('');
    setFormSuccess('');
    setIsModalOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: any) => createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setFormSuccess('Mesaj şablonu başarıyla oluşturuldu!');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 1000);
    },
    onError: (err: any) => setFormError(err.message || 'Şablon oluşturulurken hata.'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: any }) => updateTemplate(data.id, data.payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      setFormSuccess('Şablon başarıyla güncellendi (Versiyon artırıldı)!');
      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess('');
      }, 1000);
    },
    onError: (err: any) => setFormError(err.message || 'Şablon güncellenirken hata.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['templates'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!name.trim()) return setFormError('Şablon adı zorunludur.');
    if (!content.trim()) return setFormError('Mesaj metni zorunludur.');

    const payload = {
      brandId: selectedBrandId || activeBrandId || brands[0]?.id,
      name,
      description,
      content,
      parseMode,
      mediaType,
      mediaUrl: mediaType !== 'NONE' ? mediaUrl : undefined,
      buttons,
      isActive,
    };

    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const insertVariable = (varName: string) => {
    setContent((prev) => `${prev} {{${varName}}}`);
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
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-sky-400" />
            Marka Mesaj Şablonları Yönetimi
          </h1>
          <p className="text-sm text-slate-400">
            Tekrar kullanılabilir mesajlar, değişkenler, inline URL butonları ve Telegram <code>file_id</code> saklama optimizasyonu
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-2 text-sm text-white focus:outline-none"
          >
            <option value="">Tüm Markalar</option>
            {brands.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name} ({b.code})
              </option>
            ))}
          </select>

          <button
            onClick={openNewModal}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition shadow-lg shadow-sky-600/30"
          >
            <Plus className="h-5 w-5" />
            Yeni Şablon Oluştur
          </button>
        </div>
      </div>

      {/* Grid List */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Şablonlar yükleniyor...</div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400 text-sm">
          {(error as any)?.message || 'Şablonlar yüklenirken hata oluştu.'}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
          Henüz mesaj şablonu oluşturulmamış. "Yeni Şablon Oluştur" butonuna basarak ilk şablonunuzu ekleyebilirsiniz!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((tmpl: any) => (
            <div key={tmpl.id} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-400 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/20">
                    {tmpl.brand?.name || 'Marka'}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      v{tmpl.version}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-[11px] font-bold rounded ${
                        tmpl.approvalStatus === 'APPROVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {tmpl.approvalStatus}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    {tmpl.name}
                  </h3>
                  {tmpl.description && <p className="text-xs text-slate-400">{tmpl.description}</p>}
                </div>

                {/* Media & Telegram file_id Badge */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {tmpl.mediaType === 'PHOTO' && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      <ImageIcon className="h-3.5 w-3.5" /> Görsel
                    </span>
                  )}
                  {tmpl.mediaType === 'VIDEO' && (
                    <span className="inline-flex items-center gap-1 text-xs text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded border border-purple-500/20">
                      <Video className="h-3.5 w-3.5" /> Video
                    </span>
                  )}
                  {tmpl.mediaType === 'DOCUMENT' && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                      <File className="h-3.5 w-3.5" /> Doküman
                    </span>
                  )}

                  {tmpl.hasFileId && (
                    <span title="Telegram file_id kaydedildi. Medya tekrar yüklenmeden anında gönderilecek." className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/30">
                      <Zap className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Telegram file_id Saklı
                    </span>
                  )}
                </div>

                {/* Content Preview */}
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 line-clamp-4 whitespace-pre-wrap">
                  {tmpl.content}
                </div>

                {/* Buttons count */}
                {Array.isArray(tmpl.buttons) && tmpl.buttons.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <LinkIcon className="h-3.5 w-3.5 text-sky-400" />
                    <span>{tmpl.buttons.length} Adet Inline URL Buton</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 gap-2">
                <button
                  onClick={() => openEditModal(tmpl)}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-600/20 border border-sky-500/30 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:bg-sky-600 hover:text-white transition"
                >
                  <Settings className="h-3.5 w-3.5" /> Düzenle
                </button>

                <div className="flex items-center gap-1">
                  {tmpl.approvalStatus !== 'APPROVED' && (
                    <button
                      onClick={() => approveMutation.mutate(tmpl.id)}
                      className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/20"
                      title="Onayla"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm('Bu mesaj şablonunu silmek istediğinize emin misiniz?')) {
                        deleteMutation.mutate(tmpl.id);
                      }
                    }}
                    className="p-1.5 rounded text-red-400 hover:bg-red-500/20"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <FileText className="h-6 w-6 text-sky-400" />
                {editingTemplate ? `Şablonu Düzenle: ${editingTemplate.name} (v${editingTemplate.version})` : 'Yeni Mesaj Şablonu Oluştur'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            {formError && (
              <div className="rounded-lg bg-red-500/10 p-3.5 text-xs text-red-400 border border-red-500/20">
                {formError}
              </div>
            )}
            {formSuccess && (
              <div className="rounded-lg bg-emerald-500/10 p-3.5 text-xs text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Şablon Adı</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Örn: VIP Karşılama Duyurusu"
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Açıklama / Not</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Şablon hakkında açıklama..."
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Media Type & URL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Medya Türü</label>
                  <select
                    value={mediaType}
                    onChange={(e) => setMediaType(e.target.value as any)}
                    className="mt-1 w-full rounded-lg bg-slate-900 py-2 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="NONE">Metin (Medya Yok)</option>
                    <option value="PHOTO">Görsel + Caption (Fotoğraf)</option>
                    <option value="VIDEO">Video (İsteğe Bağlı / Genişletilebilir)</option>
                    <option value="DOCUMENT">Doküman / PDF (İsteğe Bağlı)</option>
                  </select>
                </div>

                {mediaType !== 'NONE' && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">Medya Görsel / Dosya URL'si</label>
                    <input
                      type="text"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://example.com/banner.jpg"
                      className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-900 py-2 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                    />
                    <p className="text-[11px] text-amber-400 mt-1">
                      ⚡ İlk gönderimde Telegram'dan gelen <code>file_id</code> veritabanında saklanır ve sonraki gönderimlerde dosya tekrar yüklenmez!
                    </p>
                  </div>
                )}
              </div>

              {/* Message Content & Variables */}
              <div className="space-y-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">Mesaj Metni Şablonu</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setParseMode('HTML')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded ${parseMode === 'HTML' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      HTML
                    </button>
                    <button
                      type="button"
                      onClick={() => setParseMode('MARKDOWN_V2')}
                      className={`px-2.5 py-1 text-xs font-semibold rounded ${parseMode === 'MARKDOWN_V2' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                    >
                      MarkdownV2
                    </button>
                  </div>
                </div>

                {/* Variable Quick Inserts */}
                <div className="flex flex-wrap items-center gap-2 pt-1 pb-1">
                  <span className="text-[11px] text-slate-400 font-semibold">Tıkla & Ekle:</span>
                  {['first_name', 'last_name', 'username', 'bot_name', 'brand_name'].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => insertVariable(v)}
                      className="text-[11px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 hover:bg-sky-500 hover:text-white"
                    >
                      {"{{" + v + "}}"}
                    </button>
                  ))}
                </div>

                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg bg-slate-900 p-3 text-sm text-white font-mono border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {/* Inline Buttons */}
              <div className="space-y-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">Inline URL Butonları</span>
                  <button
                    type="button"
                    onClick={handleAddButton}
                    className="text-xs font-semibold text-sky-400 hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> Buton Ekle
                  </button>
                </div>

                {buttons.map((btn, index) => (
                  <div key={index} className="flex items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-800">
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
                      className="text-red-400 p-1 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-lg bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 shadow-lg shadow-sky-600/30 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : editingTemplate ? 'Güncelle & Versiyon Artır' : 'Şablonu Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
