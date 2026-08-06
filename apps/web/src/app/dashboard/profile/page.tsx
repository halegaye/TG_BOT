'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchProfile, updateProfile } from '@/lib/api';
import { useState, useEffect } from 'react';
import { User, Mail, ShieldCheck, CheckCircle2, Save } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setFirstName(profile.firstName || '');
      setLastName(profile.lastName || '');
      setEmail(profile.email || '');
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () => updateProfile({ firstName, lastName, email }),
    onSuccess: () => {
      setSuccess(true);
      refetch();
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">Profil bilgileri yükleniyor...</div>;
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <User className="h-6 w-6 text-sky-400" />
            Kullanıcı Profili (My Profile)
          </h1>
          <p className="text-sm text-slate-400">Kişisel bilgilerinizi, yetkilerinizi ve hesabınızı yönetin</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/dashboard/profile/change-password"
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition border border-slate-700"
          >
            Şifre Değiştir
          </Link>
          <Link
            href="/dashboard/profile/2fa"
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-500 transition shadow-md shadow-sky-600/30"
          >
            2FA Ayarları
          </Link>
        </div>
      </div>

      {success && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Profil bilgileriniz başarıyla güncellendi.
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-300">Ad</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-300">Soyad</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold uppercase text-slate-300">E-Posta Adresi</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => updateMutation.mutate()}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateMutation.isPending ? 'Güncelleniyor...' : 'Profil Bilgilerini Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
