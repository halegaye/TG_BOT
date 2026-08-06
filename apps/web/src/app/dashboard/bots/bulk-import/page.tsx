'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  queueBulkImportBots,
  fetchBulkImportStatus,
  cancelBulkImportJob,
  getBulkImportFailedCsvUrl,
  fetchBrands,
} from '@/lib/api';

interface ParsedRow {
  rowNumber: number;
  token: string;
  brandCode?: string;
  groups?: string;
  active?: string;
  startMessageTemplateName?: string;
  defaultRedirectUrl?: string;
  notes?: string;
  isValid: boolean;
  validationError?: string;
}

export default function BulkImportPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [selectedDefaultBrandId, setSelectedDefaultBrandId] = useState<string>('');
  const [csvContent, setCsvContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  
  // Client-side pre-validation state
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [preValidationSummary, setPreValidationSummary] = useState<{
    total: number;
    valid: number;
    duplicateInFile: number;
    emptyToken: number;
  } | null>(null);

  // Queue & Progress state
  const [activeImportId, setActiveImportId] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrands()
      .then((data) => {
        setBrands(data || []);
        if (data && data.length > 0) {
          setSelectedDefaultBrandId(data[0].id);
        }
      })
      .catch((err) => console.error('Markalar yüklenirken hata:', err));
  }, []);

  // Poll bulk import progress if activeImportId exists
  useEffect(() => {
    if (!activeImportId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetchBulkImportStatus(activeImportId);
        setImportStatus(res);

        if (res.status === 'COMPLETED' || res.status === 'CANCELLED') {
          clearInterval(interval);
          setIsSubmitting(false);
          if (res.status === 'COMPLETED') {
            setSuccessMsg(`Toplu içe aktarma tamamlandı! ${res.successCount} bot başarıyla yüklendi.`);
          } else {
            setErrorMsg('Toplu içe aktarma işlemi kullanıcı tarafından iptal edildi.');
          }
        }
      } catch (err: any) {
        console.error('Status polling hatası:', err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeImportId]);

  // Multi-format & RFC 4180 Compliant CSV Line Parser
  const parseCsvLine = (text: string): string[] => {
    let raw = text.trim();
    if (raw.startsWith('"') && raw.endsWith('"') && raw.length > 2) {
      const inner = raw.slice(1, -1).trim();
      if (inner.includes(';') || inner.includes(',') || inner.includes('\t') || inner.includes(' ')) {
        raw = inner;
      }
    }

    let delimiter = ',';
    let commaCount = 0;
    let semiCount = 0;
    let tabCount = 0;
    let inQ = false;
    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === '"') inQ = !inQ;
      else if (!inQ) {
        if (c === ',') commaCount++;
        if (c === ';') semiCount++;
        if (c === '\t') tabCount++;
      }
    }

    if (tabCount > 0 && tabCount >= commaCount && tabCount >= semiCount) {
      delimiter = '\t';
    } else if (semiCount > commaCount) {
      delimiter = ';';
    }

    let result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < raw.length; i++) {
      const c = raw[i];
      if (c === '"') {
        if (inQuotes && raw[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === delimiter && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);

    if (result.length <= 1 && (raw.includes(' ') || raw.includes('\t'))) {
      const spaceCols = raw.split(/[\t\s]+/);
      if (spaceCols.length > 1) {
        result = spaceCols;
      }
    }

    return result.map((v) => {
      let clean = v.trim();
      if ((clean.startsWith('"') && clean.endsWith('"')) || (clean.startsWith("'") && clean.endsWith("'"))) {
        clean = clean.slice(1, -1).trim();
      }
      return clean.replace(/""/g, '"');
    });
  };

  // Client-side pre-validation of CSV content
  const handleCsvChange = (content: string) => {
    setCsvContent(content);
    setErrorMsg('');

    if (!content.trim()) {
      setParsedRows([]);
      setPreValidationSummary(null);
      return;
    }

    const lines = content.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      setParsedRows([]);
      setPreValidationSummary(null);
      return;
    }

    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('token') || firstLine.includes('brand_code');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const seenTokens = new Set<string>();
    let validCount = 0;
    let duplicateInFileCount = 0;
    let emptyTokenCount = 0;

    const rows: ParsedRow[] = dataLines.map((line, idx) => {
      const cols = parseCsvLine(line);
      let token = cols[0] || '';
      const tokenMatch = line.match(/\d+:[A-Za-z0-9_-]{30,}/);
      if (tokenMatch) {
        token = tokenMatch[0];
      }
      const brandCode = cols[1] || undefined;
      const groups = cols[2] || undefined;
      const active = cols[3] || undefined;
      const startMessageTemplateName = cols[4] || undefined;
      const defaultRedirectUrl = cols[5] || undefined;
      const notes = cols[6] || undefined;
      const rowNumber = hasHeader ? idx + 2 : idx + 1;

      let isValid = true;
      let validationError: string | undefined;

      if (!token) {
        isValid = false;
        validationError = 'Token boş';
        emptyTokenCount++;
      } else if (seenTokens.has(token)) {
        isValid = false;
        validationError = 'Dosya içi mükerrer token';
        duplicateInFileCount++;
      } else {
        seenTokens.add(token);
        validCount++;
      }

      return {
        rowNumber,
        token,
        brandCode,
        groups,
        active,
        startMessageTemplateName,
        defaultRedirectUrl,
        notes,
        isValid,
        validationError,
      };
    });

    setParsedRows(rows);
    setPreValidationSummary({
      total: rows.length,
      valid: validCount,
      duplicateInFile: duplicateInFileCount,
      emptyToken: emptyTokenCount,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleCsvChange(text || '');
    };
    reader.readAsText(file);
  };

  const handleDownloadSampleCsv = () => {
    const sampleBrandCode = brands[0]?.code || 'system';

    // UTF-8 BOM (\uFEFF) + semicolon delimiter for guaranteed Excel 7-column layout
    const csvContent =
      `\uFEFFtoken;brand_code;groups;active;start_message_template_name;default_redirect_url;notes\n` +
      `"1234567890:ABCdefGHIjklMNOpqrsTUVwxyz_12345";"${sampleBrandCode}";"VIP";"true";"hoşgeldin_mesaji";"https://t.me/example";"Ana kampanya botu"\n` +
      `"9876543210:ZYXwvuTSRqpoNMLkjihGFEDcba_67890";"${sampleBrandCode}";"GENEL";"true";"";"https://t.me/example2";"Yedek bot"`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Ornek_Toplu_Bot_Yukleme.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleStartImport = async () => {
    if (!csvContent.trim()) {
      setErrorMsg('Lütfen önce yüklenecek CSV içeriğini girin veya dosya seçin.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      setSuccessMsg('');
      setImportStatus(null);

      const response = await queueBulkImportBots({
        brandId: selectedDefaultBrandId || undefined,
        csvContent,
      });

      setActiveImportId(response.importId);
      setImportStatus({
        status: 'QUEUED',
        total: response.total,
        processed: 0,
        successCount: 0,
        failedCount: 0,
      });
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Kuyruk yükleme sırasında bir hata oluştu.');
    }
  };

  const handleCancelImport = async () => {
    if (!activeImportId) return;
    try {
      await cancelBulkImportJob(activeImportId);
      setErrorMsg('İptal isteği gönderildi...');
    } catch (err: any) {
      console.error('İptal hatası:', err);
    }
  };

  const progressPercent = importStatus?.total
    ? Math.round((importStatus.processed / importStatus.total) * 100)
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/bots"
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition-colors text-xs font-semibold"
            >
              ← Geri
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              🤖 Toplu Bot İçe Aktarma <span className="text-sm font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full">CSV Bulk Import</span>
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Yüzlerce Telegram botunu asenkron BullMQ kuyruğu ile Telegram API oran sınırlarına takılmadan güvenle sisteme yükleyin.
          </p>
        </div>

        <button
          onClick={handleDownloadSampleCsv}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/10"
        >
          📥 Örnek CSV Dosyası İndir
        </button>
      </div>

      {/* Dynamic Notifications */}
      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-center justify-between">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-300">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-sm flex items-center justify-between">
          <span>✅ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300">✕</button>
        </div>
      )}

      {/* CSV Spec Guidelines */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 backdrop-blur-xl">
        <h2 className="text-sm font-semibold text-slate-200 mb-3 flex items-center gap-2">
          📋 Desteklenen 7 Sütunlu CSV Format Yapısı
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 text-[11px]">
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-blue-400 font-bold block mb-0.5">1. token *</code>
            <span className="text-slate-400">Telegram Bot Token</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-purple-400 font-bold block mb-0.5">2. brand_code</code>
            <span className="text-slate-400">Marka Kodu/Adı</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-amber-400 font-bold block mb-0.5">3. groups</code>
            <span className="text-slate-400">Gruplar (VIP,VB)</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-emerald-400 font-bold block mb-0.5">4. active</code>
            <span className="text-slate-400">true / false</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-cyan-400 font-bold block mb-0.5">5. start_template</code>
            <span className="text-slate-400">Başlangıç Şablonu</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-indigo-400 font-bold block mb-0.5">6. redirect_url</code>
            <span className="text-slate-400">Yönlendirme Linki</span>
          </div>
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/50">
            <code className="text-pink-400 font-bold block mb-0.5">7. notes</code>
            <span className="text-slate-400">Açıklama / Not</span>
          </div>
        </div>
      </div>

      {/* File Upload & Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-200">
                1. CSV Dosyası Yükleyin veya İçeriği Yapıştırın
              </label>
              {fileName && (
                <span className="text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-1 rounded-lg">
                  📄 {fileName}
                </span>
              )}
            </div>

            {/* File Drag Drop Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-blue-500/50 bg-slate-800/40 hover:bg-slate-800/80 rounded-xl p-6 text-center cursor-pointer transition-all group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📂</div>
              <p className="text-sm text-slate-300 font-medium">
                Bilgisayarınızdan CSV dosyası seçmek için <span className="text-blue-400 underline">tıklayın</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">.csv veya .txt uzantılı dosyalar desteklenir</p>
            </div>

            {/* Raw Text Input fallback */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">veya CSV İçeriğini Doğrudan Yapıştırın:</label>
              <textarea
                value={csvContent}
                onChange={(e) => handleCsvChange(e.target.value)}
                placeholder="token,brand_code,groups,active,start_message_template_name,default_redirect_url,notes&#10;1234567890:ABCdefGHIjklMNOpqrsTUVwxyz_12345,BRAND_A,VIP,true,,https://t.me/ref_link,Test"
                rows={6}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-y"
              />
            </div>
          </div>
        </div>

        {/* Configuration & Actions Sidebar */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-200">2. Varsayılan Ayarlar</h3>

            <div>
              <label className="text-xs font-medium text-slate-400 mb-1 block">
                Varsayılan Marka (CSV'de Belirtilmeyenler İçin)
              </label>
              <select
                value={selectedDefaultBrandId}
                onChange={(e) => setSelectedDefaultBrandId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-xl p-2.5 focus:outline-none focus:border-blue-500/50"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-validation Summary */}
            {preValidationSummary && (
              <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-slate-300 flex items-center justify-between border-b border-slate-700/50 pb-1.5">
                  <span>📊 Dosya Ön Doğrulaması</span>
                  <span className="text-blue-400 font-bold">{preValidationSummary.total} Satır</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Geçerli Format:</span>
                  <span className="font-mono font-bold">{preValidationSummary.valid}</span>
                </div>
                {preValidationSummary.duplicateInFile > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Dosya İçi Mükerrer Token:</span>
                    <span className="font-mono font-bold">{preValidationSummary.duplicateInFile}</span>
                  </div>
                )}
                {preValidationSummary.emptyToken > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Boş Token Satırı:</span>
                    <span className="font-mono font-bold">{preValidationSummary.emptyToken}</span>
                  </div>
                )}
              </div>
            )}

            {/* Start & Cancel Buttons */}
            <div className="pt-2 space-y-2">
              {!isSubmitting ? (
                <button
                  onClick={handleStartImport}
                  disabled={!csvContent.trim()}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                >
                  🚀 Kuyruğa Gönder ve İçe Aktar
                </button>
              ) : (
                <button
                  onClick={handleCancelImport}
                  className="w-full py-3 bg-red-600/90 hover:bg-red-500 text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  🛑 İşlemi İptal Et
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Progress & Queue Status Section */}
      {importStatus && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              ⚡ Canlı İşlem İlerleme Göstergesi
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                importStatus.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                importStatus.status === 'PROCESSING' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20 animate-pulse' :
                importStatus.status === 'CANCELLED' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                'bg-slate-800 text-slate-400'
              }`}>
                {importStatus.status}
              </span>
            </h3>

            {importStatus.failedCount > 0 && activeImportId && (
              <a
                href={getBulkImportFailedCsvUrl(activeImportId)}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                ⚠️ {importStatus.failedCount} Hatalı Satırı CSV İndir
              </a>
            )}
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-slate-300 font-medium">
              <span>
                İşlenen: <strong className="text-white">{importStatus.processed || 0}</strong> / {importStatus.total || 0} Bot
              </span>
              <span className="font-mono text-blue-400 font-bold">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800 p-0.5">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Live Metric Counters */}
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 text-center">
              <span className="text-xs text-slate-400 block">Toplam Satır</span>
              <span className="text-lg font-bold text-white font-mono">{importStatus.total || 0}</span>
            </div>
            <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 text-center">
              <span className="text-xs text-emerald-400 block">Başarılı Yüklenen</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">{importStatus.successCount || 0}</span>
            </div>
            <div className="bg-red-500/5 p-3 rounded-xl border border-red-500/10 text-center">
              <span className="text-xs text-red-400 block">Hatalı Satır</span>
              <span className="text-lg font-bold text-red-400 font-mono">{importStatus.failedCount || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Row-by-Row Results Table */}
      {parsedRows.length > 0 && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl space-y-4">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center justify-between">
            <span>🔍 Satır Bazlı Ön İzleme ve Sonuçlar ({parsedRows.length} Satır)</span>
          </h3>

          <div className="overflow-x-auto max-h-96 rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/90 text-slate-400 font-semibold uppercase sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">token</th>
                  <th className="p-3">brand_code</th>
                  <th className="p-3">groups</th>
                  <th className="p-3">active</th>
                  <th className="p-3">start_template</th>
                  <th className="p-3">redirect_url</th>
                  <th className="p-3">notes</th>
                  <th className="p-3">Açıklama</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 font-mono">
                {parsedRows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors text-[11px]">
                    <td className="p-3 text-slate-500 font-bold">{r.rowNumber}</td>
                    <td className="p-3">
                      {r.isValid ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          GEÇERLİ
                        </span>
                      ) : (
                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px] font-bold">
                          HATALI
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-semibold text-slate-200" title={r.token}>
                      {r.token ? `${r.token.slice(0, 10)}...` : '-'}
                    </td>
                    <td className="p-3 text-slate-300 font-semibold">{r.brandCode || '-'}</td>
                    <td className="p-3 text-slate-400">{r.groups || '-'}</td>
                    <td className="p-3 text-slate-400">{r.active || 'true'}</td>
                    <td className="p-3 text-slate-400">{r.startMessageTemplateName || '-'}</td>
                    <td className="p-3 text-blue-400 truncate max-w-[120px]" title={r.defaultRedirectUrl}>
                      {r.defaultRedirectUrl || '-'}
                    </td>
                    <td className="p-3 text-slate-400 truncate max-w-[100px]" title={r.notes}>
                      {r.notes || '-'}
                    </td>
                    <td className="p-3">
                      {r.validationError ? (
                        <span className="text-red-400 font-sans">{r.validationError}</span>
                      ) : (
                        <span className="text-slate-500 font-sans">Kuyruk işlenmeyi bekliyor...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
