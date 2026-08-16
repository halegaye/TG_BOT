'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ShieldCheck, User, ArrowRight, KeyRound, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { setStoredToken, setStoredBrandId, getStoredToken, fetchMe, getApiBaseUrl } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('admin@enterprise.com');
  const [password, setPassword] = useState('SuperAdminSecret2026!');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const existingToken = getStoredToken();
    if (existingToken && existingToken.length > 20) {
      fetchMe()
        .then(() => {
          window.location.href = '/dashboard';
        })
        .catch(() => {
          localStorage.removeItem('access_token');
          document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
        });
    }
  }, []);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier || !password) {
      setError('Lütfen e-posta / kullanıcı adı ve şifre giriniz.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body = {
        identifier,
        email: identifier,
        password,
        ...(requiresTwoFactor ? { twoFactorCode } : {}),
      };

      const res = await fetch(`${getApiBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any = {};
      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 502
            ? 'Sunucu servisi başlatılıyor (502). Lütfen 10 saniye bekleyip tekrar deneyin.'
            : `Sunucu beklenmeyen bir yanıt döndürdü (${res.status}): ${text.substring(0, 100)}`
        );
      }

      if (!res.ok) {
        throw new Error(data.message || 'Giriş başarısız.');
      }

      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setLoading(false);
        return;
      }

      const token = data.access_token || data.accessToken;
      if (token) {
        setStoredToken(token);
        document.cookie = `access_token=${token}; path=/; max-age=86400; SameSite=Lax`;
        if (data.user?.memberships?.[0]?.brandId) {
          setStoredBrandId(data.user.memberships[0].brandId);
        }
      }
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Giriş yapılamadı. Tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-slate-100 relative overflow-hidden">
      {/* Background Decorator */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 rounded-2xl bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl border border-slate-800 relative z-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 text-white shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Yönetim Paneli Giriş</h2>
          <p className="mt-1 text-xs text-slate-400">Telegram Çoklu Bot & Kampanya Yönetim Platformu</p>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/10 p-3.5 text-xs font-semibold text-red-400 border border-red-500/20 text-center shadow-inner">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {!requiresTwoFactor ? (
            <>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  E-Posta veya Kullanıcı Adı
                </label>
                <div className="relative mt-1.5">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin@platform.com"
                    className="w-full rounded-xl bg-slate-950/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 border border-slate-700/80 focus:border-indigo-500 focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-300">
                  Parola
                </label>
                <div className="relative mt-1.5">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-slate-950/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-600 border border-slate-700/80 focus:border-indigo-500 focus:outline-none transition shadow-sm"
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3 rounded-2xl bg-indigo-500/10 p-5 border border-indigo-500/20 text-center">
              <div className="flex justify-center">
                <div className="h-10 w-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                  <Smartphone className="h-5 w-5" />
                </div>
              </div>
              <h3 className="text-sm font-bold text-white">2FA Doğrulama Kodu Gerekli</h3>
              <p className="text-xs text-slate-400">
                Google Authenticator uygulamanızdaki anlık 6 haneli doğrulama kodunu giriniz.
              </p>
              <input
                type="text"
                maxLength={6}
                autoFocus
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="000000"
                className="w-full text-center tracking-[0.5em] text-2xl font-black rounded-xl bg-slate-950 py-3 text-emerald-400 border border-indigo-500/40 focus:border-indigo-500 focus:outline-none shadow-inner"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-500 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-sky-400 transition focus:outline-none disabled:opacity-50"
          >
            {loading ? (
              'Giriş Yapılıyor...'
            ) : requiresTwoFactor ? (
              <>
                2FA Doğrula & Giriş Yap
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                Giriş Yap
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 text-center border-t border-slate-800">
          <p className="text-[11px] text-slate-500">
            © 2026 TG Bot Enterprise Platform — Tüm Hakları Saklıdır.
          </p>
        </div>
      </div>
    </main>
  );
}
