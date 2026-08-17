import { Logger } from '@nestjs/common';

const logger = new Logger('BotProfileSync');

export interface BrandBotProfile {
  botDescription?: string | null;
  botShortDescription?: string | null;
  botPhotoUrl?: string | null;
}

/** Timeout destekli fetch */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Base64 data URI veya HTTP URL'den Buffer üretir.
 */
async function resolvePhotoBuffer(photoUrl: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (photoUrl.startsWith('data:image/')) {
    // data:image/png;base64,xxxx...
    const commaIdx = photoUrl.indexOf(',');
    if (commaIdx === -1) {
      logger.warn('[ProfileSync] Geçersiz base64 data URI formatı.');
      return null;
    }
    const header = photoUrl.substring(0, commaIdx); // "data:image/jpeg;base64"
    const b64 = photoUrl.substring(commaIdx + 1);
    const mime = header.split(':')[1]?.split(';')[0] || 'image/jpeg';
    const buffer = Buffer.from(b64, 'base64');
    logger.log(`[ProfileSync] Base64 çözüldü: ${buffer.length} bytes, mime: ${mime}`);
    return { buffer, mime };
  } else {
    // HTTP URL
    logger.log(`[ProfileSync] Fotoğraf indiriliyor: ${photoUrl}`);
    try {
      const imgRes = await fetchWithTimeout(photoUrl, {}, 15000);
      if (!imgRes.ok) {
        logger.warn(`[ProfileSync] HTTP ${imgRes.status}: Fotoğraf indirilemedi.`);
        return null;
      }
      const ab = await imgRes.arrayBuffer();
      const buffer = Buffer.from(ab);
      const mime = imgRes.headers.get('content-type') || 'image/jpeg';
      logger.log(`[ProfileSync] İndirildi: ${buffer.length} bytes, mime: ${mime}`);
      return { buffer, mime };
    } catch (err: any) {
      logger.warn(`[ProfileSync] Fotoğraf indirme hatası: ${err.message}`);
      return null;
    }
  }
}

/**
 * Telegram Bot API'ye bağlanarak botun açıklama ve profil fotoğrafını senkronize eder.
 */
export async function syncBotProfileWithBrand(
  rawToken: string,
  brand: BrandBotProfile,
) {
  if (!rawToken) return;

  // 1. setMyDescription
  if (brand.botDescription?.trim()) {
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: brand.botDescription.trim() }),
      });
      const data = (await res.json()) as any;
      if (data.ok) logger.log(`✅ [ProfileSync] Açıklama güncellendi.`);
      else logger.warn(`⚠️ [ProfileSync] setMyDescription: ${data.description}`);
    } catch (err: any) {
      logger.warn(`⚠️ [ProfileSync] setMyDescription error: ${err.message}`);
    }
  }

  // 2. setMyShortDescription
  if (brand.botShortDescription?.trim()) {
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: brand.botShortDescription.trim() }),
      });
      const data = (await res.json()) as any;
      if (data.ok) logger.log(`✅ [ProfileSync] Kısa açıklama güncellendi.`);
      else logger.warn(`⚠️ [ProfileSync] setMyShortDescription: ${data.description}`);
    } catch (err: any) {
      logger.warn(`⚠️ [ProfileSync] setMyShortDescription error: ${err.message}`);
    }
  }

  // 3. setMyProfilePhoto
  if (brand.botPhotoUrl?.trim()) {
    const photoUrl = brand.botPhotoUrl.trim();

    // Fotoğraf buffer'ı hazırla
    const resolved = await resolvePhotoBuffer(photoUrl);
    if (!resolved) {
      logger.warn(`[ProfileSync] Fotoğraf çözümlenemedi, atlanıyor.`);
      return;
    }

    const { buffer } = resolved;

    if (buffer.length > 5 * 1024 * 1024) {
      logger.warn(`[ProfileSync] Fotoğraf 5MB'ı aşıyor (${buffer.length} bytes). Telegram reddedebilir.`);
    }

    // YÖNTEM A: Bot API 7.0+ — InputProfilePhotoStatic (attach://)
    let photoUpdated = false;
    try {
      logger.log(`[ProfileSync] Yöntem A: InputProfilePhotoStatic...`);
      const fd = new FormData();
      // Her zaman JPEG olarak gönder (Telegram yalnızca JPEG kabul eder)
      fd.append('bot_profile_photo', new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' }), 'photo.jpg');
      fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://bot_profile_photo' }));

      const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
        method: 'POST',
        body: fd as any,
      });
      const data = (await res.json()) as any;
      logger.log(`[ProfileSync] Telegram yanıtı (A): ${JSON.stringify(data)}`);

      if (data.ok) {
        logger.log(`✅ [ProfileSync] Profil fotoğrafı güncellendi (Yöntem A).`);
        photoUpdated = true;
      } else {
        logger.warn(`⚠️ [ProfileSync] Yöntem A başarısız: [${data.error_code}] ${data.description}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ [ProfileSync] Yöntem A exception: ${err.message}`);
    }

    // YÖNTEM B: Eski basit multipart — bazı Bot API sürümlerinde çalışır
    if (!photoUpdated) {
      try {
        logger.log(`[ProfileSync] Yöntem B: Basit multipart...`);
        const fd2 = new FormData();
        fd2.append('photo', new Blob([new Uint8Array(buffer)], { type: 'image/jpeg' }), 'photo.jpg');

        const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
          method: 'POST',
          body: fd2 as any,
        });
        const data = (await res.json()) as any;
        logger.log(`[ProfileSync] Telegram yanıtı (B): ${JSON.stringify(data)}`);

        if (data.ok) {
          logger.log(`✅ [ProfileSync] Profil fotoğrafı güncellendi (Yöntem B).`);
          photoUpdated = true;
        } else {
          logger.warn(`⚠️ [ProfileSync] Yöntem B başarısız: [${data.error_code}] ${data.description}`);
        }
      } catch (err: any) {
        logger.warn(`⚠️ [ProfileSync] Yöntem B exception: ${err.message}`);
      }
    }

    // YÖNTEM C: URL ile gönder (sadece HTTP URL ise)
    if (!photoUpdated && !photoUrl.startsWith('data:')) {
      try {
        logger.log(`[ProfileSync] Yöntem C: URL referansı...`);
        const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photo: { type: 'static', photo: photoUrl } }),
        });
        const data = (await res.json()) as any;
        logger.log(`[ProfileSync] Telegram yanıtı (C): ${JSON.stringify(data)}`);

        if (data.ok) {
          logger.log(`✅ [ProfileSync] Profil fotoğrafı güncellendi (Yöntem C).`);
          photoUpdated = true;
        } else {
          logger.warn(`⚠️ [ProfileSync] Yöntem C başarısız: [${data.error_code}] ${data.description}`);
        }
      } catch (err: any) {
        logger.warn(`⚠️ [ProfileSync] Yöntem C exception: ${err.message}`);
      }
    }

    if (!photoUpdated) {
      logger.error(`❌ [ProfileSync] Tüm yöntemler başarısız! Profil fotoğrafı güncellenemedi.`);
    }
  }
}

/**
 * Raw Buffer'ı doğrudan Telegram Bot API'ye yükler.
 * Multipart upload endpoint'inden çağrılır — JSON body limitini bypass eder.
 */
export async function syncBotPhotoBuffer(rawToken: string, photoBuffer: Buffer, mime: string): Promise<void> {
  if (!rawToken || !photoBuffer || photoBuffer.length === 0) return;

  logger.log(`[PhotoUpload] Başlatılıyor: ${photoBuffer.length} bytes, token: ${rawToken.slice(0, 10)}...`);

  // YÖNTEM A: InputProfilePhotoStatic (Bot API 7.0+)
  try {
    const fd = new FormData();
    fd.append('bot_profile_photo', new Blob([new Uint8Array(photoBuffer)], { type: 'image/jpeg' }), 'photo.jpg');
    fd.append('photo', JSON.stringify({ type: 'static', photo: 'attach://bot_profile_photo' }));

    const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
      method: 'POST',
      body: fd as any,
    });
    const data = (await res.json()) as any;
    logger.log(`[PhotoUpload] Telegram yanıt (A): ${JSON.stringify(data)}`);

    if (data.ok) {
      logger.log(`✅ [PhotoUpload] Profil fotoğrafı güncellendi (Yöntem A).`);
      return;
    }
    logger.warn(`⚠️ [PhotoUpload] Yöntem A: [${data.error_code}] ${data.description}`);
  } catch (err: any) {
    logger.warn(`⚠️ [PhotoUpload] Yöntem A exception: ${err.message}`);
  }

  // YÖNTEM B: Eski basit multipart
  try {
    const fd2 = new FormData();
    fd2.append('photo', new Blob([new Uint8Array(photoBuffer)], { type: 'image/jpeg' }), 'photo.jpg');

    const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
      method: 'POST',
      body: fd2 as any,
    });
    const data = (await res.json()) as any;
    logger.log(`[PhotoUpload] Telegram yanıt (B): ${JSON.stringify(data)}`);

    if (data.ok) {
      logger.log(`✅ [PhotoUpload] Profil fotoğrafı güncellendi (Yöntem B).`);
      return;
    }
    logger.warn(`⚠️ [PhotoUpload] Yöntem B: [${data.error_code}] ${data.description}`);
  } catch (err: any) {
    logger.warn(`⚠️ [PhotoUpload] Yöntem B exception: ${err.message}`);
  }

  logger.error(`❌ [PhotoUpload] Tüm yöntemler başarısız.`);
}
