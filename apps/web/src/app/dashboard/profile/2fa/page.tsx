'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { fetchProfile, toggle2FA, setupTwoFactor, verifyTwoFactorCode } from '@/lib/api';
import { useState } from 'react';
import { ShieldCheck, ArrowLeft, CheckCircle2, XCircle, QrCode, Lock, Key, Copy, Check } from 'lucide-react';
import Link from 'next/link';

export default function TwoFactorSettingsPage() {
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeDataUrl: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });

  const setupMutation = useMutation({
    mutationFn: setupTwoFactor,
    onSuccess: (data) => {
      setSetupData(data);
      setErrorMsg('');
    },
    onError: (err: any) => {
      setErrorMsg(err.message || '2FA kurulumu başlatılamadı.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (code: string) => verifyTwoFactorCode(code),
    onSuccess: () => {
      setSetupData(null);
      setVerifyCode('');
      setSuccessMsg('2FA başarıyla aktifleştirildi!');
      setErrorMsg('');
      refetch();
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Geçersiz doğrulama kodu.');
    },
  });

  const disableMutation = useMutation({
    mutationFn: () => toggle2FA(false),
    onSuccess: () => {
      setSetupData(null);
      setSuccessMsg('2FA devre dışı bırakıldı.');
      setErrorMsg('');
      refetch();
    },
  });

  if (isLoading) {
    return <div className="p-12 text-center text-slate-400 text-sm">2FA ayarları yükleniyor...</div>;
  }

  const isEnabled = profile?.twoFactorEnabled || false;

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
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
            <ShieldCheck className="h-6 w-6 text-sky-400" />
            İki Adımlı Doğrulama (2FA) Yönetimi
          </h1>
          <p className="text-sm text-slate-400">Google Authenticator veya TOTP uygulamaları ile tam korumalı güvenlik</p>
        </div>
      </div>

      {successMsg && (
        <div className="rounded-xl bg-emerald-500/10 p-4 text-xs font-semibold text-emerald-400 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="rounded-xl bg-red-500/10 p-4 text-xs font-semibold text-red-400 border border-red-500/20">
          {errorMsg}
        </div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">2FA Durumu</h3>
            <p className="text-xs text-slate-400">
              Oturum açarken Google Authenticator 6 haneli kodu doğrulamasını zorunlu kılar.
            </p>
          </div>

          <div>
            {isEnabled ? (
              <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4" /> Aktif
              </span>
            ) : (
              <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold text-slate-400 border border-slate-700">
                <XCircle className="h-4 w-4" /> Pasif
              </span>
            )}
          </div>
        </div>

        {/* 2FA Setup Flow */}
        {!isEnabled && setupData && (
          <div className="space-y-5 rounded-2xl border border-sky-500/30 bg-slate-950 p-6">
            <div className="text-center space-y-2">
              <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                <QrCode className="h-4 w-4 text-sky-400" />
                1. QR Kodu Taratın
              </h4>
              <p className="text-xs text-slate-400">
                Google Authenticator veya 2FA uygulamanızı açıp aşağıdaki QR kodu okutun.
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center p-3 bg-white rounded-xl w-48 h-48 mx-auto shadow-lg">
              <img src={setupData.qrCodeDataUrl} alt="2FA QR Code" className="w-full h-full object-contain" />
            </div>

            {/* Manual Secret Key */}
            <div className="space-y-1 text-center">
              <span className="text-[11px] text-slate-500 uppercase font-semibold">Veya Manuel Gizli Anahtarı Girin:</span>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-slate-900 px-3 py-1.5 rounded-lg text-xs font-mono text-amber-400 border border-slate-800">
                  {setupData.secret}
                </code>
                <button
                  type="button"
                  onClick={copySecret}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
                >
                  {copiedSecret ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Verification Code Input */}
            <div className="space-y-3 pt-3 border-t border-slate-800 text-center">
              <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                <Lock className="h-4 w-4 text-emerald-400" />
                2. Kodu Girip Doğrulayın
              </h4>
              <p className="text-xs text-slate-400">
                Google Authenticator uygulamanızdaki anlık 6 haneli kodu giriniz:
              </p>
              <input
                type="text"
                maxLength={6}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                placeholder="000000"
                className="w-48 mx-auto text-center tracking-[0.5em] text-2xl font-black rounded-xl bg-slate-900 py-2.5 text-emerald-400 border border-slate-700 focus:border-sky-500 focus:outline-none"
              />

              <button
                type="button"
                onClick={() => verifyMutation.mutate(verifyCode)}
                disabled={verifyCode.length < 6 || verifyMutation.isPending}
                className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 transition disabled:opacity-50"
              >
                {verifyMutation.isPending ? 'Doğrulanıyor...' : 'Doğrula & 2FA Aktifleştir'}
              </button>
            </div>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4">
          {isEnabled ? (
            <button
              onClick={() => disableMutation.mutate()}
              disabled={disableMutation.isPending}
              className="w-full rounded-xl bg-red-600/20 py-3 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition border border-red-500/30"
            >
              2FA Doğrulamayı Devre Dışı Bırak
            </button>
          ) : !setupData ? (
            <button
              onClick={() => setupMutation.mutate()}
              disabled={setupMutation.isPending}
              className="w-full rounded-xl bg-sky-600 py-3 text-xs font-bold text-white shadow-lg shadow-sky-600/30 hover:bg-sky-500 transition"
            >
              {setupMutation.isPending ? 'QR Kod Üretiliyor...' : '2FA Kurulumunu Başlat'}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
