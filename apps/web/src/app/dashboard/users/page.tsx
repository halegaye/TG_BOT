'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBrands, fetchBrandUsers, addUserToBrand, updateBrandUser, removeBrandUser, getStoredBrandId } from '@/lib/api';
import { Users, Plus, ShieldCheck, Mail, User, Lock, CheckCircle, Building2, Key, Edit2, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const activeBrandId = getStoredBrandId() || '';

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState(activeBrandId);

  // Form Fields
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch Real Brands for Dropdown
  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: fetchBrands,
  });

  const targetBrandId = selectedBrandId || activeBrandId || brands[0]?.id || '';

  // 2. Fetch Users Assigned to Target Brand
  const { data: users = [], isLoading, isError, error: fetchErr } = useQuery({
    queryKey: ['brandUsers', targetBrandId],
    queryFn: () => fetchBrandUsers(targetBrandId),
    enabled: !!targetBrandId,
  });

  // 3. Add User Mutation
  const addUserMutation = useMutation({
    mutationFn: (data: any) => addUserToBrand(data.brandId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandUsers', targetBrandId] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      setIsAddModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.message || 'Kullanıcı eklenirken hata oluştu.');
    },
  });

  // 4. Update User Mutation
  const updateUserMutation = useMutation({
    mutationFn: (data: any) => updateBrandUser(targetBrandId, data.userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandUsers', targetBrandId] });
      setEditingUser(null);
      resetForm();
    },
    onError: (err: any) => {
      setError(err.message || 'Kullanıcı güncellenirken hata oluştu.');
    },
  });

  // 5. Remove User Mutation
  const removeUserMutation = useMutation({
    mutationFn: (userId: string) => removeBrandUser(targetBrandId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brandUsers', targetBrandId] });
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Kullanıcı silinirken hata oluştu.');
    },
  });

  const resetForm = () => {
    setEmail('');
    setUsername('');
    setPassword('');
    setRole('EDITOR');
    setFirstName('');
    setLastName('');
    setError('');
  };

  const openEditUserModal = (u: any) => {
    setEditingUser(u);
    setEmail(u.email);
    setUsername(u.username || '');
    setFirstName(u.firstName || '');
    setLastName(u.lastName || '');
    setRole(u.role || 'EDITOR');
    setPassword('');
    setError('');
  };

  const handleAddUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('E-posta ve şifre zorunludur.');
      return;
    }
    if (!targetBrandId) {
      setError('Lütfen bir marka seçiniz.');
      return;
    }

    addUserMutation.mutate({
      brandId: targetBrandId,
      email,
      username,
      password,
      role,
      firstName,
      lastName,
    });
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    updateUserMutation.mutate({
      userId: editingUser.userId,
      role,
      firstName,
      lastName,
      password: password || undefined,
    });
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-sky-400" />
            Çoklu Marka Kullanıcı Yönetimi & İzolasyon (Argon2id)
          </h1>
          <p className="text-sm text-slate-400">
            Sınırsız marka kullanıcısı ekleme, yetkilendirme, Argon2id şifreleme ve marka bazlı izolasyon
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setSelectedBrandId(targetBrandId);
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 transition shadow-lg shadow-sky-600/30"
        >
          <Plus className="h-5 w-5" />
          Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* Brand Selection Tabs / Filter */}
      <div className="flex items-center gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <Building2 className="h-5 w-5 text-sky-400" />
        <span className="text-xs font-semibold text-slate-300">Marka Filtresi:</span>
        <select
          value={targetBrandId}
          onChange={(e) => setSelectedBrandId(e.target.value)}
          className="rounded-lg bg-slate-950 py-1.5 px-3 text-xs text-sky-400 font-medium border border-slate-700 focus:border-sky-500 focus:outline-none"
        >
          {brands.map((b: any) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.code}) — {b._count?.memberships || 0} Kullanıcı
            </option>
          ))}
        </select>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            Atanmış Marka Kullanıcıları ({users.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-sm">Kullanıcılar veritabanından yükleniyor...</div>
        ) : isError ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-400">
            {(fetchErr as any)?.message || 'Kullanıcılar yüklenirken hata oluştu.'}
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Bu markaya atanmış kullanıcı bulunmuyor. "Yeni Kullanıcı Ekle" butonuna basarak sınırsız kullanıcı ekleyebilirsiniz.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/50 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Ad Soyad</th>
                  <th className="px-4 py-3">E-posta</th>
                  <th className="px-4 py-3">Kullanıcı Adı</th>
                  <th className="px-4 py-3">Atanan Rol</th>
                  <th className="px-4 py-3">Şifreleme Standartı</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-mono text-xs">
                {users.map((u: any) => (
                  <tr key={u.membershipId} className="hover:bg-slate-800/40 transition">
                    <td className="px-4 py-3 font-sans font-semibold text-white">
                      {u.firstName} {u.lastName}
                    </td>
                    <td className="px-4 py-3 text-sky-400">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400">@{u.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : u.role === 'BRAND_ADMIN'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : u.role === 'CAMPAIGN_MANAGER'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 flex items-center gap-1.5">
                      <Key className="h-3.5 w-3.5 text-emerald-400" /> Argon2id (64MB)
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-emerald-400 font-sans">
                        <CheckCircle className="h-3.5 w-3.5" /> Aktif
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditUserModal(u)}
                          className="p-1.5 rounded-lg bg-sky-600/20 text-sky-300 hover:bg-sky-600 hover:text-white transition"
                          title="Kullanıcı Bilgilerini / Rolünü Düzenle"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`'${u.email}' kullanıcısını bu markadan çıkarmak istediğinize emin misiniz?`)) {
                              removeUserMutation.mutate(u.userId);
                            }
                          }}
                          disabled={removeUserMutation.isPending}
                          className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition disabled:opacity-50"
                          title="Markadan Çıkar"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-sky-400" />
              Markaya Yeni Kullanıcı Ekle
            </h3>
            <p className="text-sm text-slate-400">
              Kullanıcı şifresi backend'de Argon2id ile hash'lenecek ve seçtiğiniz markaya (Tenant) atanacaktır.
            </p>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <form onSubmit={handleAddUserSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Hedef Marka
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
                  E-posta Adresi (Zorunlu)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@acme.com"
                  className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-950 py-2.5 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Ahmet"
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Yılmaz"
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Kullanıcı Adı
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="ahmetyilmaz"
                    className="mt-1 w-full font-mono text-xs rounded-lg bg-slate-950 py-2.5 px-3 text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Marka İçi Rol
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  >
                    <option value="BRAND_ADMIN">BRAND_ADMIN (Marka Yöneticisi)</option>
                    <option value="CAMPAIGN_MANAGER">CAMPAIGN_MANAGER (Kampanya Yöneticisi)</option>
                    <option value="EDITOR">EDITOR (İçerik Editörü)</option>
                    <option value="ANALYST">ANALYST (Analiz Uzmanı)</option>
                    <option value="VIEW_ONLY">VIEW_ONLY (Sadece Görüntüleme)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Parola (Argon2id Hash)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={addUserMutation.isPending}
                  className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {addUserMutation.isPending ? 'Şifreleniyor & Kaydediliyor...' : 'Kullanıcıyı Kaydet (Argon2id)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Edit2 className="h-5 w-5 text-sky-400" />
              Kullanıcı Bilgilerini & Rolünü Düzenle
            </h3>
            <p className="text-xs text-slate-400">
              E-posta: <strong className="text-sky-300">{editingUser.email}</strong>
            </p>

            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                {error}
              </div>
            )}

            <form onSubmit={handleEditUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Marka İçi Rol
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                >
                  <option value="BRAND_ADMIN">BRAND_ADMIN (Marka Yöneticisi)</option>
                  <option value="CAMPAIGN_MANAGER">CAMPAIGN_MANAGER (Kampanya Yöneticisi)</option>
                  <option value="EDITOR">EDITOR (İçerik Editörü)</option>
                  <option value="ANALYST">ANALYST (Analiz Uzmanı)</option>
                  <option value="VIEW_ONLY">VIEW_ONLY (Sadece Görüntüleme)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Yeni Parola (Boş Bırakılırsa Değişmez)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Yenilemek için şifre girin..."
                  className="mt-1 w-full rounded-lg bg-slate-950 py-2.5 px-3 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={updateUserMutation.isPending}
                  className="rounded-lg bg-sky-600 px-5 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50"
                >
                  {updateUserMutation.isPending ? 'Güncelleniyor...' : 'Kullanıcıyı Güncelle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
