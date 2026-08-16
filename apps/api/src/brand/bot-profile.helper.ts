import { Logger } from '@nestjs/common';

const logger = new Logger('BotProfileSync');

export interface BrandBotProfile {
  botDescription?: string | null;
  botShortDescription?: string | null;
  botPhotoUrl?: string | null;
}

/**
 * Telegram Bot API'ye baglanarak botun aciklama, kisa aciklama ve profil fotografini senkronize eder.
 */
export async function syncBotProfileWithBrand(
  rawToken: string,
  brand: BrandBotProfile,
) {
  if (!rawToken) return;

  // 1. setMyDescription (Genel Açıklama - Bot sohbeti ilk açıldığında görünen)
  if (brand.botDescription !== undefined && brand.botDescription !== null && brand.botDescription.trim() !== '') {
    try {
      const res = await fetch(`https://api.telegram.org/bot${rawToken}/setMyDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: brand.botDescription.trim() }),
      });
      const data = (await res.json()) as any;
      if (data.ok) {
        logger.log(`✅ [Telegram Bot Profile Sync] Bot açıklaması başarıyla güncellendi.`);
      } else {
        logger.warn(`⚠️ [Telegram Bot Profile Sync] setMyDescription uyarısı: ${data.description}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ [Telegram Bot Profile Sync] setMyDescription hatası: ${err.message}`);
    }
  }

  // 2. setMyShortDescription (Kısa Açıklama - Profil detayında ve aramada görünen)
  if (brand.botShortDescription !== undefined && brand.botShortDescription !== null && brand.botShortDescription.trim() !== '') {
    try {
      const res = await fetch(`https://api.telegram.org/bot${rawToken}/setMyShortDescription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ short_description: brand.botShortDescription.trim() }),
      });
      const data = (await res.json()) as any;
      if (data.ok) {
        logger.log(`✅ [Telegram Bot Profile Sync] Bot kısa açıklaması başarıyla güncellendi.`);
      } else {
        logger.warn(`⚠️ [Telegram Bot Profile Sync] setMyShortDescription uyarısı: ${data.description}`);
      }
    } catch (err: any) {
      logger.warn(`⚠️ [Telegram Bot Profile Sync] setMyShortDescription hatası: ${err.message}`);
    }
  }

  // 3. setMyProfilePhoto (Profil Fotoğrafı)
  if (brand.botPhotoUrl && brand.botPhotoUrl.trim() !== '') {
    try {
      let photoBuffer: Buffer;
      let contentType = 'image/jpeg';

      if (brand.botPhotoUrl.startsWith('data:image/')) {
        const parts = brand.botPhotoUrl.split(';base64,');
        contentType = parts[0].replace('data:', '');
        photoBuffer = Buffer.from(parts[1], 'base64');
      } else {
        const imgRes = await fetch(brand.botPhotoUrl);
        if (imgRes.ok) {
          const arrayBuffer = await imgRes.arrayBuffer();
          photoBuffer = Buffer.from(arrayBuffer);
          contentType = imgRes.headers.get('content-type') || 'image/jpeg';
        } else {
          logger.warn(`⚠️ [Telegram Bot Profile Sync] Profil fotoğrafı URL'sinden resim indirilemedi: ${brand.botPhotoUrl}`);
          return;
        }
      }

      const formData = new FormData();
      const blob = new Blob([new Uint8Array(photoBuffer)], { type: contentType });
      formData.append('photo', blob, 'bot_profile_photo.jpg');

      const photoRes = await fetch(`https://api.telegram.org/bot${rawToken}/setMyProfilePhoto`, {
        method: 'POST',
        body: formData as any,
      });

      const photoData = (await photoRes.json()) as any;
      if (photoData.ok) {
        logger.log(`✅ [Telegram Bot Profile Sync] Bot profil fotoğrafı başarıyla Telegram'a yüklendi.`);
      } else {
        logger.warn(`⚠️ [Telegram Bot Profile Sync] setMyProfilePhoto uyarısı: ${photoData.description}`);
      }
    } catch (photoErr: any) {
      logger.warn(`⚠️ [Telegram Bot Profile Sync] Fotoğraf güncellenirken hata: ${photoErr.message}`);
    }
  }
}
