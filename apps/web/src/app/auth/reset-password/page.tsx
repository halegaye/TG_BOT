'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Lock, CheckCircle2, ArrowRight, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking2FA, setChecking2FA] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function check2FA() {
      try {
        const res = await fetch(`${getApiBaseUrl()}/auth/check-reset-2fa`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailParam || undefined, token: token || undefined }),
        });
        const data = await res.json();
        if (data.requiresTwoFactor) {
          setRequiresTwoFactor(true);
        }
        if (data.email && !email) {
          setEmail(data.email);
        }
      } catch (_) {
      } finally {
        setChecking2FA(false);
      }
    }
    check2FA();
  }, [emailParam, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pass.length < 8) {
      setError('Şifre en az 8 karakter olmalıdır.');
      return;
    }
    if (pass !== confirmPass) {
      setError('Şifreler eşleşmiyor.');
      return;
    }
    if (requiresTwoFactor && (!twoFactorCode || twoFactorCode.length < 6)) {
      setError('Lütfen 6 haneli 2FA doğrulama kodunu giriniz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: pass,
          token,
          email,
          twoFactorCode: requiresTwoFactor ? twoFactorCode : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Şifre güncellenemedi.');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
      <div className="flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400">
          <Lock className="h-8 w-8" />
        </div>
      </div>

      <h2 className="mt-6 text-center text-2xl font-bold text-white">Yeni Şifre Belirleyin</h2>
      <p className="mt-2 text-center text-xs text-slate-400">
        Hesabınız için güçlü ve güvenli yeni bir şifre girin.
      </p>

      {error && (
        <div className="mt-4 rounded-xl bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 border border-red-500/20 text-center">
          {error}
        </div>
      )}

      {success ? (
        <div className="mt-6 rounded-2xl bg-emerald-500/10 p-6 text-center border border-emerald-500/20 space-y-4">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
          <h4 className="font-bold text-emerald-400">Şifreniz Başarıyla Yenilendi!</h4>
          <p className="text-xs text-slate-300">Yeni şifrenizle hemen yönetim paneline giriş yapabilirsiniz.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/30"
          >
            Giriş Yap
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {!emailParam && (
            <div>
              <label className="block text-xs font-medium text-slate-300">E-Posta Adresi</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@platform.com"
                className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          )}

          {requiresTwoFactor && (
            <div className="rounded-2xl bg-indigo-500/10 p-4 border border-indigo-500/20 text-center space-y-2">
              <div className="flex justify-center">
                <div className="h-9 w-9 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
              <h4 className="text-xs font-bold text-white">2FA Doğrulama Kodu Gerekli</h4>
              <p className="text-[11px] text-slate-400">
                Bu hesapta 2FA aktiftir. Google Authenticator uygulamanızdaki anlık 6 haneli kodunuzu giriniz:
              </p>
              <input
                type="text"
                maxLength={6}
                required
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="000000"
                className="w-full text-center tracking-[0.4em] text-xl font-mono rounded-xl bg-slate-950 py-2.5 text-emerald-400 border border-indigo-500/40 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300">Yeni Şifre</label>
            <input
              type="password"
              required
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300">Yeni Şifre (Tekrar)</label>
            <input
              type="password"
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full rounded-xl bg-slate-950 py-2.5 px-4 text-xs text-white border border-slate-700 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || checking2FA}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-50"
          >
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs">Yükleniyor...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
