'use client';

import { useState } from 'react';
import { ShieldCheck, ArrowRight, KeyRound } from 'lucide-react';
import Link from 'next/link';

export default function TwoFactorAuthPage() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Lütfen 6 haneli doğrulama kodunu girin.');
      return;
    }
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-400">
            <ShieldCheck className="h-8 w-8" />
          </div>
        </div>

        <h2 className="mt-6 text-center text-2xl font-bold text-white">İki Adımlı Doğrulama (2FA)</h2>
        <p className="mt-2 text-center text-xs text-slate-400">
          Lütfen authenticator uygulamanızdaki 6 haneli doğrulama kodunu girin.
        </p>

        {error && (
          <div className="mt-4 rounded-xl bg-red-500/10 p-3 text-xs font-semibold text-red-400 border border-red-500/20 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300">2FA Doğrulama Kodu</label>
            <div className="relative mt-1">
              <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                className="w-full rounded-xl bg-slate-950 py-2.5 pl-10 pr-4 text-center font-mono text-lg font-bold tracking-widest text-sky-400 border border-slate-700 focus:border-sky-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition"
          >
            Doğrula ve Giriş Yap
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-300">
            Giriş ekranına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
