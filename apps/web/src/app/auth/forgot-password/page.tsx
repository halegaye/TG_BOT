'use client';

import { useState } from 'react';
import { KeyRound, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'İşlem gerçekleştirilemedi.');
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
            <KeyRound className="h-8 w-8" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-2xl font-bold text-white">Şifremi Unuttum</h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Kayıtlı e-posta adresinizi girin. Şifre sıfırlama talimatı e-postanıza gönderilecektir.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400 border border-red-500/20 text-center">
            {error}
          </div>
        )}

        {submitted ? (
          <div className="mt-6 rounded-2xl bg-emerald-500/10 p-6 text-center border border-emerald-500/20 space-y-3">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h4 className="font-bold text-emerald-400">Sıfırlama Bağlantısı İletildi</h4>
            <p className="text-xs text-slate-300">
              <strong>{email}</strong> adresine şifre yenileme yönergeleri iletildi. Lütfen gelen kutunuzu kontrol edin.
            </p>
            <div className="pt-2">
              <Link
                href="/auth/reset-password"
                className="inline-block text-xs font-bold text-indigo-400 hover:underline"
              >
                Doğrudan Şifre Sıfırlama Sayfasına Git →
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300">E-Posta Adresi</label>
              <div className="relative mt-1">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@platform.com"
                  className="w-full rounded-xl bg-slate-950 py-2.5 pl-10 pr-4 text-xs text-white border border-slate-700 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition disabled:opacity-50"
            >
              {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-3.5 w-3.5" />
            Giriş ekranına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
