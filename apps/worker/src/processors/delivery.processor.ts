import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RedisRateLimiterService } from '../rate-limiter/redis-limiter.service';
import { EncryptionService, sanitizeMediaUrl, interpolateTemplate, buildInlineKeyboard } from '@tg-bot/shared';
import { Redis } from 'ioredis';

@Processor('telegram-send')
@Injectable()
export class DeliveryProcessor extends WorkerHost {
  private readonly logger = new Logger(DeliveryProcessor.name);
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private rateLimiter: RedisRateLimiterService,
    private encryptionService: EncryptionService,
  ) {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  }

  async process(job: Job<any>): Promise<any> {
    const {
      campaignRunId,
      botId,
      subscriberId,
      chatId,
      text,
      parseMode,
      replyMarkup,
      brandId,
      campaignId,
      mediaType,
      mediaUrl,
      telegramFileId: inputTelegramFileId,
      templateId,
    } = job.data;

    const actualIdempotencyKey = job.data.idempotencyKey || `${campaignRunId}:${botId}:${subscriberId}`;

    this.logger.log(`🚀 [DELIVERY JOB PROCESSING] BotId [${botId}] -> ChatId [${chatId}] (Key: ${actualIdempotencyKey})`);

    let deliveryRecord: any = null;

    try {
      // 0. Acil Durum Durdurma Kontrolü
      const isGlobalStopped = await this.redis.get('system:emergency_stop:global');
      const isBrandStopped = brandId ? await this.redis.get(`system:emergency_stop:brand:${brandId}`) : null;

      if (isGlobalStopped === 'true' || isBrandStopped === 'true') {
        this.logger.warn(`Acil durum durdurma aktif! İş durduruldu. BrandId: ${brandId}`);
        throw new Error('Acil durum durdurma aktif. Gönderim ertelendi.');
      }

      // 1. Bot ve Marka Bilgilerini Getir
      const bot = await this.prisma.telegramBot.findUnique({
        where: { id: botId },
        include: { brand: true },
      });

      if (!bot) {
        this.logger.error(`❌ [DELIVERY ERROR] Bot bulunamadı: ${botId}`);
        return { status: 'failed', reason: 'bot_not_found' };
      }

      let effectiveBrandId = brandId || bot.brandId;
      if (!effectiveBrandId) {
        const firstBrand = await this.prisma.brand.findFirst();
        effectiveBrandId = firstBrand?.id;
      }

      // 2. Mükerrer Gönderim Kontrolü
      const existingDelivery = await this.prisma.delivery.findUnique({
        where: { idempotencyKey: actualIdempotencyKey },
      });

      if (existingDelivery && (existingDelivery.status === 'SENT' || existingDelivery.status === 'SKIPPED_FREQUENCY_CAP')) {
        this.logger.warn(`Job atlandı! Mükerrer gönderim engellendi: ${actualIdempotencyKey}`);
        return { status: 'skipped', reason: 'idempotency_match' };
      }

      // 3. Veritabanında Durumu PROCESSING Yap
      deliveryRecord = await this.prisma.delivery.upsert({
        where: { idempotencyKey: actualIdempotencyKey },
        update: { status: 'PROCESSING' },
        create: {
          brandId: effectiveBrandId,
          campaignId: campaignId || null,
          campaignRunId: campaignRunId || null,
          botId,
          subscriberId,
          idempotencyKey: actualIdempotencyKey,
          status: 'PROCESSING',
        },
      });

      // 4. Token Çöz
      let rawToken: string;
      try {
        rawToken = this.encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
      } catch (decryptErr: any) {
        this.logger.error(`❌ [TOKEN DECRYPTION ERROR] Bot [${bot.username}] token çözülemedi: ${decryptErr.message}`);
        await this.prisma.delivery.update({
          where: { id: deliveryRecord.id },
          data: { status: 'PERMANENTLY_FAILED', lastError: `Token decryption error: ${decryptErr.message}` },
        });
        return { status: 'failed', reason: 'token_decryption_error' };
      }

      // 5. Abone ve Kullanıcı Bilgilerini Çek
      const subscriber = subscriberId
        ? await this.prisma.botSubscriber.findUnique({
            where: { id: subscriberId },
            include: { user: true },
          })
        : null;

      // 6. Şablon Değişkenlerini ({{first_name}}, {{brand_name}} vb.) Dönüştür
      const finalMessageText = interpolateTemplate(text || '', {
        first_name: subscriber?.user?.firstName || subscriber?.user?.username || 'Değerli Kullanıcımız',
        last_name: subscriber?.user?.lastName || '',
        username: subscriber?.user?.username ? `@${subscriber.user.username}` : '',
        bot_name: bot.username || '',
        brand_name: bot.brand?.name || 'Sistem',
      });

      // 7. Telegram Endpoint & Payload Hazırla
      let telegramEndpoint = 'sendMessage';
      const payload: any = {
        chat_id: chatId.toString(),
      };

      if (parseMode) payload.parse_mode = parseMode;

      let finalReplyMarkup = replyMarkup;
      if (!finalReplyMarkup && job.data.buttons && Array.isArray(job.data.buttons) && job.data.buttons.length > 0) {
        finalReplyMarkup = buildInlineKeyboard(job.data.buttons);
      }
      if (finalReplyMarkup) payload.reply_markup = finalReplyMarkup;

      const cleanMediaUrl = sanitizeMediaUrl(mediaUrl);
      const mediaRef = inputTelegramFileId || cleanMediaUrl;

      if (mediaType === 'PHOTO' && mediaRef) {
        telegramEndpoint = 'sendPhoto';
        payload.photo = mediaRef;
        if (finalMessageText) payload.caption = finalMessageText;
      } else if (mediaType === 'VIDEO' && mediaRef) {
        telegramEndpoint = 'sendVideo';
        payload.video = mediaRef;
        if (finalMessageText) payload.caption = finalMessageText;
      } else if (mediaType === 'DOCUMENT' && mediaRef) {
        telegramEndpoint = 'sendDocument';
        payload.document = mediaRef;
        if (finalMessageText) payload.caption = finalMessageText;
      } else {
        payload.text = finalMessageText || 'Kampanya Mesajı';
      }

      this.logger.log(`📡 [SENDING TELEGRAM] Bot [@${bot.username}] -> ChatId [${chatId}] Endpoint [${telegramEndpoint}]...`);

      const res = await fetch(`https://api.telegram.org/bot${rawToken}/${telegramEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as any;
      this.logger.log(`📩 [TELEGRAM RESPONSE] Status: ${res.status}, OK: ${data.ok}, Desc: ${data.description || 'N/A'}`);

      if (data.ok) {
        this.logger.log(`✅ [CAMPAIGN SENT SUCCESS] Bot [@${bot.username}] -> ChatId [${chatId}] MESAJ İLETİLDİ!`);
        await this.prisma.delivery.update({
          where: { id: deliveryRecord.id },
          data: { status: 'SENT', lastError: null },
        });
        return { status: 'sent' };
      }
      // Telegram 429 Hata Yönetimi
      if (res.status === 429) {
        const retryAfter = data.parameters?.retry_after || 5;
        await this.prisma.delivery.update({
          where: { id: deliveryRecord.id },
          data: { status: 'RATE_LIMITED', lastError: `Telegram 429: Retry after ${retryAfter}s` },
        });
        throw new Error(`Telegram 429 Rate Limit. Backoff: ${retryAfter}s`);
      }

      // Kalıcı Kullanıcı Hataları & Fallback Yönetimi
      if (!data.ok) {
        const desc = data.description || '';
        const descLower = desc.toLowerCase();
        this.logger.warn(`⚠️ [TELEGRAM API HATA] Bot [@${bot.username}] -> ChatId [${chatId}]: ${desc}`);

        // Fallback 1: Medya Yükleme Hatası Varsa (Görsel bağlantısı bozuk, web sayfası veya geçersiz format)
        if (telegramEndpoint !== 'sendMessage' && (
          descLower.includes('file identifier') ||
          descLower.includes('http url') ||
          descLower.includes('get http') ||
          descLower.includes('parse input media') ||
          descLower.includes('photo') ||
          descLower.includes('media') ||
          descLower.includes('invalid') ||
          descLower.includes('failed')
        )) {
          this.logger.warn(
            `⚠️ [MEDIA FALLBACK ATTEMPT] Görsel/Medya yükleme hatası (${desc}). Mesaj Düz Metin (sendMessage) olarak iletiliyor...`,
          );
          const fallbackText = text ? (cleanMediaUrl ? `${text}\n\n🖼️ Görsel Bağlantısı: ${cleanMediaUrl}` : text) : (cleanMediaUrl || '');
          const textPayload: any = {
            chat_id: chatId.toString(),
            text: fallbackText,
          };
          if (parseMode) textPayload.parse_mode = parseMode;
          if (replyMarkup) textPayload.reply_markup = replyMarkup;

          const textRes = await fetch(`https://api.telegram.org/bot${rawToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(textPayload),
          });
          const textData = (await textRes.json()) as any;

          if (textData.ok) {
            this.logger.log(`✅ [MEDIA FALLBACK SUCCESS] Mesaj metni Telegram'a başarıyla iletildi.`);
            await this.prisma.delivery.update({
              where: { id: deliveryRecord.id },
              data: { status: 'SENT', lastError: `Görsel hatası (${desc}), metin olarak iletildi.` },
            });
            return { status: 'sent', mediaFallbackUsed: true };
          }
        }

        // Fallback 2: Parse mode hatası varsa (HTML/Markdown syntax hatası)
        if (parseMode && (descLower.includes('parse') || descLower.includes('entities')) && !descLower.includes('chat not found') && !descLower.includes('blocked')) {
          this.logger.warn(
            `⚠️ [FALLBACK ATTEMPT] Parse Mode (${parseMode}) hatası nedeniyle Düz Metin olarak tekrar deneniyor...`,
          );
          const fallbackPayload = { ...payload };
          delete fallbackPayload.parse_mode;

          const fallbackRes = await fetch(`https://api.telegram.org/bot${rawToken}/${telegramEndpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackPayload),
          });
          const fallbackData = (await fallbackRes.json()) as any;

          if (fallbackData.ok) {
            this.logger.log(`✅ [FALLBACK SUCCESS] Mesaj düz metin olarak Telegram'a iletildi.`);
            await this.prisma.delivery.update({
              where: { id: deliveryRecord.id },
              data: { status: 'SENT', lastError: null },
            });
            return { status: 'sent', fallbackUsed: true };
          }
        }

        let finalStatus: any = 'PERMANENTLY_FAILED';
        if (
          descLower.includes('blocked') ||
          descLower.includes('deactivated') ||
          descLower.includes('chat not found') ||
          descLower.includes('user is deactivated')
        ) {
          finalStatus = 'SKIPPED_INACTIVE';
          await this.prisma.botSubscriber.update({
            where: { id: subscriberId },
            data: { isBlocked: true },
          });
        }

        await this.prisma.delivery.update({
          where: { id: deliveryRecord.id },
          data: { status: finalStatus, lastError: desc },
        });
        return { status: 'failed', reason: desc };
      }

      // 7. Telegram file_id Saklama ve Önbellekleme (Aynı medyayı tekrar yüklememe)
      if (templateId && mediaType && mediaType !== 'NONE') {
        let extractedFileId: string | null = null;
        if (mediaType === 'PHOTO' && Array.isArray(data.result?.photo)) {
          const photos = data.result.photo;
          extractedFileId = photos[photos.length - 1]?.file_id || null;
        } else if (mediaType === 'VIDEO' && data.result?.video) {
          extractedFileId = data.result.video.file_id || null;
        } else if (mediaType === 'DOCUMENT' && data.result?.document) {
          extractedFileId = data.result.document.file_id || null;
        }

        if (extractedFileId && !inputTelegramFileId) {
          this.logger.log(
            `💾 [TELEGRAM FILE_ID CACHED] Template [${templateId}] için Telegram file_id saklandı: ${extractedFileId}`,
          );
          await this.prisma.messageTemplate.update({
            where: { id: templateId },
            data: { telegramFileId: extractedFileId },
          });
        }
      }

      // 8. Başarılı Gönderim Güncellemesi
      this.logger.log(`✅ [CAMPAIGN MSG SENT] Bot [@${bot.username}] -> ChatId [${chatId}]`);
      await this.prisma.delivery.update({
        where: { id: deliveryRecord.id },
        data: { status: 'SENT', lastError: null },
      });

      return { status: 'sent' };
    } catch (error: any) {
      this.logger.error(`❌ [DELIVERY ERROR] BotId: ${botId} -> ChatId: ${chatId}: ${error.message}`);
      if (deliveryRecord?.id) {
        await this.prisma.delivery.update({
          where: { id: deliveryRecord.id },
          data: { status: 'RETRY_SCHEDULED', lastError: error.message },
        });
      }
      throw error;
    }
  }
}
