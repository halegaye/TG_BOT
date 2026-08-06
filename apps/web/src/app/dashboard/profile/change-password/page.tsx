'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { changePassword } from '@/lib/api';
import { Lock, ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const changeMutation = useMutation({
    mutationFn: () => changePassword(currentPass, newPass),
    onSuccess: () => {
      setSuccess(true);
      setError('');
      setCurrentPass('');
      setNewPass('');
      setConfirmPass('');
    },
    onError: (err: any) => {
      setError(err.message || 'Şifre değiştirme başarısız oldu.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      setError('Yeni şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Yeni şifreler eşleşmiyor.');
      return;
    }
    changeMutation.mutate();
  };

  return (
    <div className="space-y-8 max-w-xl">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <Link
          href="/dashboard/profile"
          className="rounded-xl bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Lock className="h-6 w-6 text-sky-400" />
            Şifre Değiştirme
          </h1>
          <p className="text-sm text-slate-400">Hesap güvenliğiniz için şifrenizi periyodik olarak yenileyin</p>
        </div>
      </div>

      {success && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Şifreniz başarıyla değiştirildi.
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 p-4 text-xs font-semibold text-red-400 border border-red-500/20">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4 shadow-xl">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-300">Mevcut Şifre</label>
          <input
            type="password"
            required
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-300">Yeni Şifre</label>
          <input
            type="password"
            required
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-slate-300">Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            required
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-sky-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={changeMutation.isPending}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition disabled:opacity-50"
        >
          {changeMutation.isPending ? 'Değiştiriliyor...' : 'Şifreyi Güncelle'}
        </button>
      </form>
    </div>
  );
}
