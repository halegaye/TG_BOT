'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBrands, fetchMe, createBrand, updateBrand, setStoredBrandId } from '@/lib/api';
import { Building2, Plus, CheckCircle, Clock, Radio, Users, Bot as BotIcon, Mail, Palette, Image as ImageIcon, Edit2 } from 'lucide-react';

export default function BrandsPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [brandColor, setBrandColor] = useState('#0088cc');
  const [timezone, setTimezone] = useState('Europe/Belgrade');
  const [adminEmail, setAdminEmail] = useState('');
  const [error, setError] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
  });

  const isSuperAdmin = currentUser?.memberships?.some(
    (m: any) => m.role === 'SUPER_ADMIN' || m.role === 'SYSTEM_ADMIN'
  );

  const { data: brands = [], isLoading } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  });

  const createBrandMutation = useMutation({
    mutationFn: createBrand,
    onSuccess: (newBrand) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsAddModalOpen(false);
      resetForm();
      if (newBrand?.id) {
        setStoredBrandId(newBrand.id);
      }
    },
    onError: (err: any) => {
      setError(err.message || 'Marka oluşturulurken hata oluştu.');
    },
  });

  const updateBrandMutation = useMutation({
    mutationFn: (data: any) => updateBrand(data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setEditingBrand(null);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.message || 'Marka güncellenirken hata oluştu.');
    },
  });

  const resetForm = () => {
    setName('');
    setCode('');
    setLogoUrl('');
    setBrandColor('#0088cc');
    setTimezone('Europe/Belgrade');
    setAdminEmail('');
    setError('');
  };

  const handleAddBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) {
      setError('Marka adı ve benzersiz kodu zorunludur.');
      return;
    }
    createBrandMutation.mutate({ name, code, logoUrl, brandColor, timezone, adminEmail });
  };

  const handleEditBrandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBrand) return;
    updateBrandMutation.mutate({
      id: editingBrand.id,
      name,
      logoUrl,
      brandColor,
      timezone,
      adminEmail,
    });
  };

  const openEditModal = (brand: any) => {
    setEditingBrand(brand);
    setName(brand.name || '');
    setCode(brand.code || '');
    setLogoUrl(brand.logoUrl || '');
    setBrandColor(brand.brandColor || '#0088cc');
    setTimezone(brand.timezone || 'Europe/Belgrade');
    setAdminEmail(brand.memberships?.[0]?.user?.email || '');
    setError('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="h-6 w-6 text-sky-400" />
            Marka & Firma Yönetimi (Multi-Tenant)
          </h1>
          <p className="text-sm text-slate-400">
            Sistemdeki tüm alt firmalar, logo/renk özelleştirmeleri ve Marka Yöneticisi (BRAND_ADMIN) atamaları
          </p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition shadow-lg shadow-sky-600/30"
          >
            <Plus className="h-5 w-5" />
            Yeni Marka / Firma Ekle
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">Markalar yükleniyor...</div>
      ) : brands.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center text-slate-400">
          Henüz eklenmiş bir marka bulunmuyor. Yeni marka ekleyerek başlayabilirsiniz!
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {brands.map((brand: any) => {
            const adminUser = brand.memberships?.find((m: any) => m.role === 'BRAND_ADMIN' || m.role === 'SUPER_ADMIN')?.user;

            return (
              <div
                key={brand.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4 hover:border-slate-700 transition relative"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt={brand.name} className="h-12 w-12 rounded-xl object-cover border border-slate-700" />
                    ) : (
                      <div
                        style={{ backgroundColor: brand.brandColor || '#0088cc' }}
                        className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg shadow-md"
                      >
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white text-base">{brand.name}</h3>
                      <p className="text-xs text-sky-400 font-mono">Kod: {brand.code}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(brand)}
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition"
                      title="Markayı Düzenle"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                      <CheckCircle className="h-3 w-3" />
                      Aktif
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 font-mono">
                  {adminUser && (
                    <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-sky-300">
                      <Mail className="h-4 w-4 text-sky-400 flex-shrink-0" />
                      <span className="truncate">Yönetici: {adminUser.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <Clock className="h-4 w-4 text-slate-500" />
                    <span>Timezone: {brand.timezone}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                    <Radio className="h-4 w-4 text-slate-500" />
                    <span>Rate Limit: {brand.messageRateLimitPerSec} msg/sec</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-slate-400 border-t border-slate-800">
                  <span className="flex items-center gap-1.5">
                    <BotIcon className="h-4 w-4 text-sky-400" />
                    Botlar: <strong className="text-white">{brand._count?.bots || 0}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-emerald-400" />
                    Kampanyalar: <strong className="text-white">{brand._count?.campaigns || 0}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Brand Modal */}
      {(isAddModalOpen || editingBrand) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white">
              {editingBrand ? `${editingBrand.name} — Markayı Düzenle` : 'Yeni Marka / Firma Ekle'}
            </h3>
            <p className="text-sm text-slate-400">
              Formu doldurduğunuzda marka profili ve Marka Yöneticisi (BRAND_ADMIN) PostgreSQL veritabanına kaydedilecektir.
            </p>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <form onSubmit={editingBrand ? handleEditBrandSubmit : handleAddBrandSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Marka / Firma Adı (Zorunlu)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Örn: Acme Holding"
                  className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              {!editingBrand && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Benzersiz Marka Kodu (Zorunlu, Harf/Rakam)
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toLowerCase().trim())}
                    placeholder="Örn: acme"
                    className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-950 py-2.5 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-sky-400" />
                  Marka Yöneticisi E-postası (BRAND_ADMIN Ataması)
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="brandadmin@acme.com"
                  className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-950 py-2.5 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-sky-400" />
                    Logo URL
                  </label>
                  <input
                    type="text"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://..."
                    className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-950 py-2.5 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Palette className="h-3.5 w-3.5 text-sky-400" />
                    Marka Rengi
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="h-9 w-12 rounded bg-slate-950 p-1 cursor-pointer border border-slate-700"
                    />
                    <input
                      type="text"
                      value={brandColor}
                      onChange={(e) => setBrandColor(e.target.value)}
                      className="w-full font-mono text-xs rounded-lg bg-slate-950 py-2 px-2.5 text-white border border-slate-700"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Zaman Dilimi (Timezone)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-sm text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                >
                  <option value="Europe/Belgrade">Europe/Belgrade (UTC+1/+2)</option>
                  <option value="Europe/Istanbul">Europe/Istanbul (UTC+3)</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingBrand(null);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={createBrandMutation.isPending || updateBrandMutation.isPending}
                  className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {createBrandMutation.isPending || updateBrandMutation.isPending
                    ? 'Kaydediliyor...'
                    : editingBrand
                    ? 'Değişiklikleri Kaydet'
                    : 'Markayı Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
