import { Logger } from '@nestjs/common';

const logger = new Logger('BotProfileSync');

export interface BrandBotProfile {
  botDescription?: string | null;
  botShortDescription?: string | null;
  botPhotoUrl?: string | null;
}

/**
 * Verilen ms süresi içinde resolve olmazsa reject eden timeout promise'i.
 */
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Telegram Bot API'ye baglanarak botun aciklama, kisa aciklama ve profil fotografini senkronize eder.
 */
export async function syncBotProfileWithBrand(
  rawToken: string,
  brand: BrandBotProfile,
) {
  if (!rawToken) return;

  // 1. setMyDescription
  if (brand.botDescription !== undefined && brand.botDescription !== null && brand.botDescription.trim() !== '') {
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: brand.botDescription.trim() }),
      });
      const data = (await res.json()) as any;
      if (data.ok) {
        logger.log(`✅ [ProfileSync] Açıklama güncellendi.`);
      } else {
        logger.warn(`⚠️ [ProfileSync] setMyDescription: ${data.description}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ [ProfileSync] setMyDescription error: ${err.message}`);
    }
  }

  // 2. setMyShortDescription
  if (brand.botShortDescription !== undefined && brand.botShortDescription !== null && brand.botShortDescription.trim() !== '') {
    try {
      const res = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: brand.botShortDescription.trim() }),
      });
      const data = (await res.json()) as any;
      if (data.ok) {
        logger.log(`✅ [ProfileSync] Kısa açıklama güncellendi.`);
      } else {
        logger.warn(`⚠️ [ProfileSync] setMyShortDescription: ${data.description}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ [ProfileSync] setMyShortDescription error: ${err.message}`);
    }
  }

  // 3. setMyProfilePhoto - 3 farklı yöntem sırayla denenir
  if (brand.botPhotoUrl && brand.botPhotoUrl.trim() !== '') {
    let photoBuffer: Buffer | null = null;
    let contentType = 'image/jpeg';
    const photoUrl = brand.botPhotoUrl.trim();

    // Fotoğrafı hazırla (Base64 veya URL)
    try {
      if (photoUrl.startsWith('data:image/')) {
        // Base64 Data URI
        const parts = photoUrl.split(';base64,');
        contentType = parts[0].replace('data:', '');
        photoBuffer = Buffer.from(parts[1], 'base64');
        logger.log(`[ProfileSync] Fotoğraf kaynağı: base64 (${photoBuffer.length} bytes)`);
      } else {
        // HTTP URL - indir
        logger.log(`[ProfileSync] Fotoğraf indiriliyor: ${photoUrl}`);
        const imgRes = await fetchWithTimeout(photoUrl, {}, 15000);
        if (!imgRes.ok) {
          logger.warn(`⚠️ [ProfileSync] Fotoğraf indirilemedi: HTTP ${imgRes.status}`);
        } else {
          const ab = await imgRes.arrayBuffer();
          photoBuffer = Buffer.from(ab);
          contentType = imgRes.headers.get('content-type') || 'image/jpeg';
          logger.log(`[ProfileSync] Fotoğraf indirildi: ${photoBuffer.length} bytes`);
        }
      }
    } catch (prepErr: any) {
      logger.warn(`⚠️ [ProfileSync] Fotoğraf hazırlanırken hata: ${prepErr.message}`);
    }

    if (!photoBuffer || photoBuffer.length === 0) {
      logger.warn(`⚠️ [ProfileSync] Fotoğraf buffer boş, atlanıyor.`);
      return;
    }

    // YÖNTEM A: InputProfilePhotoStatic - Bot API 7.0+ (multipart + attach://)
    let photoUpdated = false;
    try {
      logger.log(`[ProfileSync] Yöntem A: InputProfilePhotoStatic (Bot API 7.0+)...`);
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(photoBuffer)], { type: 'image/jpeg' });
      formData.append('bot_profile_photo', blob, 'bot_profile_photo.jpg');
      formData.append('photo', JSON.stringify({
        type: 'static',
        photo: 'attach://bot_profile_photo',
      }));

      const photoRes = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
        method: 'POST',
        body: formData as any,
      });
      const photoData = (await photoRes.json()) as any;
      logger.log(`[ProfileSync] Telegram Yanıt (A): ${JSON.stringify(photoData)}`);

      if (photoData.ok) {
        logger.log(`✅ [ProfileSync] Profil fotoğrafı güncellendi (Yöntem A).`);
        photoUpdated = true;
      } else {
        logger.warn(`⚠️ [ProfileSync] Yöntem A başarısız: ${photoData.description}`);
      }
    } catch (errA: any) {
      logger.warn(`⚠️ [ProfileSync] Yöntem A error: ${errA.message}`);
    }

    // YÖNTEM B: Fallback - eski basit multipart
    if (!photoUpdated) {
      try {
        logger.log(`[ProfileSync] Yöntem B: Basit multipart (fallback)...`);
        const formDataB = new FormData();
        const blobB = new Blob([new Uint8Array(photoBuffer)], { type: 'image/jpeg' });
        formDataB.append('photo', blobB, 'photo.jpg');

        const resB = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
          method: 'POST',
          body: formDataB as any,
        });
        const dataB = (await resB.json()) as any;
        logger.log(`[ProfileSync] Telegram Yanıt (B): ${JSON.stringify(dataB)}`);

        if (dataB.ok) {
          logger.log(`✅ [ProfileSync] Profil fotoğrafı güncellendi (Yöntem B).`);
          photoUpdated = true;
        } else {
          logger.warn(`⚠️ [ProfileSync] Yöntem B başarısız: ${dataB.description}`);
        }
      } catch (errB: any) {
        logger.warn(`⚠️ [ProfileSync] Yöntem B error: ${errB.message}`);
      }
    }

    // YÖNTEM C: Fallback - URL doğrudan JSON ile gönder (HTTP URL ise)
    if (!photoUpdated && !photoUrl.startsWith('data:')) {
      try {
        logger.log(`[ProfileSync] Yöntem C: Direkt URL JSON...`);
        const resC = await fetchWithTimeout(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photo: { type: 'static', photo: photoUrl },
          }),
        });
        const dataC = (await resC.json()) as any;
        logger.log(`[ProfileSync] Telegram Yanıt (C): ${JSON.stringify(dataC)}`);

        if (dataC.ok) {
          logger.log(`✅ [ProfileSync] Profil fotoğrafı güncellendi (Yöntem C).`);
          photoUpdated = true;
        } else {
          logger.warn(`⚠️ [ProfileSync] Yöntem C başarısız: ${dataC.description}`);
        }
      } catch (errC: any) {
        logger.warn(`⚠️ [ProfileSync] Yöntem C error: ${errC.message}`);
      }
    }

    if (!photoUpdated) {
      logger.error(`❌ [ProfileSync] Tüm yöntemler başarısız - profil fotoğrafı güncellenemedi.`);
    }
  }
}
