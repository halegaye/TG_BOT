import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService, interpolateTemplate, buildInlineKeyboard, InlineButtonDto } from '@tg-bot/shared';

@Processor('telegram-webhook-events')
@Injectable()
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);
  private encryptionService = new EncryptionService();

  constructor(private prisma: PrismaService) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { botId, brandId, update, isSimulated } = job.data;

    this.logger.log(
      `📥 [Webhook Job #${job.id}] Telegram update alındı. BotId: ${botId}, Simüle: ${!!isSimulated}`,
    );

    // Yalnızca normal mesajları ve /start komutunu yakala
    if (!update || !update.message || !update.message.from) {
      this.logger.warn(`⚠️ [Webhook Job #${job.id}] Mesaj veya 'from' kullanıcısı içermeyen update atlandı.`);
      return;
    }

    const fromUser = update.message.from;
    const text = update.message.text || '';
    const chatId = update.message.chat.id;

    this.logger.log(
      `👤 [Update Detay] Kullanıcı: ${fromUser.first_name} (@${fromUser.username || 'username_yok'}) [ID: ${fromUser.id}], Mesaj: "${text}"`,
    );

    // 1. Telegram Kullanıcısını Upsert Et
    const user = await this.prisma.telegramUser.upsert({
      where: { telegramUserId: BigInt(fromUser.id) },
      update: {
        firstName: fromUser.first_name,
        lastName: fromUser.last_name,
        username: fromUser.username,
        languageCode: fromUser.language_code,
      },
      create: {
        brandId: brandId,
        telegramUserId: BigInt(fromUser.id),
        firstName: fromUser.first_name,
        lastName: fromUser.last_name,
        username: fromUser.username,
        languageCode: fromUser.language_code,
      },
    });

    // 2. Bot Aboneliğini (Subscriber) Kaydet/Güncelle
    let startParam: string | null = null;
    const isStartCommand = text.startsWith('/start');

    if (isStartCommand) {
      const parts = text.split(' ');
      if (parts.length > 1) startParam = parts[1]; // t.me/bot?start=campaign_x takibi
    }

    await this.prisma.botSubscriber.upsert({
      where: {
        botId_telegramUserId: {
          botId: botId,
          telegramUserId: user.telegramUserId,
        },
      },
      update: {
        isBlocked: false,
        lastActiveAt: new Date(),
      },
      create: {
        botId: botId,
        telegramUserId: user.telegramUserId,
        chatId: BigInt(chatId),
        startParameter: startParam,
      },
    });

    this.logger.log(`💾 [DB UPDATED] TelegramUser (${fromUser.id}) & BotSubscriber (${botId}) veritabanına başarıyla yazıldı.`);

    // 3. /start Mesajı İçin Otomatik Karşılama Yanıtı Dön
    if (isStartCommand) {
      const bot = await this.prisma.telegramBot.findUnique({
        where: { id: botId },
        include: { brand: true },
      });

      if (!bot) {
        this.logger.error(`❌ [BOT ERROR] Bot ID '${botId}' veritabanında bulunamadı!`);
        return;
      }

      try {
        let rawToken: string;
        try {
          rawToken = this.encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
        } catch (decryptErr: any) {
          this.logger.error(
            `🔑 [TOKEN DECRYPTION ERROR] Bot [${bot.username || botId}] için şifreli token çözülemedi! ` +
            `Hata: ${decryptErr.message}. Lütfen apps/worker ve apps/api .env TOKEN_ENCRYPTION_KEY değerlerinin aynı olduğunu kontrol edin!`,
          );
          return;
        }

        let rawTemplate =
          bot.startMessage ||
          bot.brand?.defaultStartMessage ||
          bot.brand?.botDescription ||
          `Merhaba {{first_name}}! 👋\n{{bot_name}} botuna hoş geldiniz.`;
        let parseModeToUse = bot.startParseMode || 'HTML';
        let buttons = (bot.buttonsJson as unknown as InlineButtonDto[]) || [];
        let mediaType = 'NONE';
        let mediaRef: string | null = null;

        if (bot.startMessage) {
          const rawName = bot.startMessage.trim();
          const normalize = (t: string) =>
            t
              .toLowerCase()
              .trim()
              .replace(/_/g, ' ')
              .replace(/\s+/g, ' ')
              .replace(/ı/g, 'i')
              .replace(/ğ/g, 'g')
              .replace(/ü/g, 'u')
              .replace(/ş/g, 's')
              .replace(/ö/g, 'o')
              .replace(/ç/g, 'c');

          const targetNormalized = normalize(rawName);
          const brandTemplates = await this.prisma.messageTemplate.findMany({
            where: { brandId: bot.brandId, isActive: true },
          });

          const dbTemplate = brandTemplates.find(
            (t) => normalize(t.name) === targetNormalized || t.id === rawName,
          );

          if (dbTemplate) {
            rawTemplate = dbTemplate.content;
            parseModeToUse = dbTemplate.parseMode || 'HTML';
            mediaType = dbTemplate.mediaType || 'NONE';
            mediaRef = dbTemplate.telegramFileId || dbTemplate.mediaUrl || null;
            if (dbTemplate.buttonsJson && Array.isArray(dbTemplate.buttonsJson)) {
              buttons = dbTemplate.buttonsJson as any[];
            }
          }
        }

        // Bota/şablona özel geçerli buton var mı kontrol et
        const botHasValidButtons =
          Array.isArray(buttons) &&
          buttons.some((b) => b && b.text && b.text.trim() && b.url && b.url.trim());

        // Eğer bota/şablona özel geçerli buton yoksa, markanın varsayılan butonlarını kullan
        if (!botHasValidButtons && bot.brand?.defaultStartButtons) {
          const brandBtns = bot.brand.defaultStartButtons as unknown as InlineButtonDto[];
          if (Array.isArray(brandBtns) && brandBtns.length > 0) {
            buttons = brandBtns;
          }
        }

        // Inline Buton matrisini oluştur
        const replyMarkup = buildInlineKeyboard(buttons);

        this.logger.log(
          `🔘 [BUTTONS] Bot [${bot.username}] -> Toplam ${buttons.length} adet buton işlendi. ` +
            `(Markup: ${replyMarkup ? replyMarkup.inline_keyboard.length + ' satır' : 'Buton yok'})`,
        );

        // Template Engine değişken giydirme
        const formattedMessage = interpolateTemplate(rawTemplate, {
          first_name: fromUser.first_name || '',
          last_name: fromUser.last_name || '',
          username: fromUser.username ? `@${fromUser.username}` : '',
          bot_name: bot.displayName || bot.username,
          brand_name: bot.brand?.name || '',
          start_parameter: startParam || '',
        });

        let telegramEndpoint = 'sendMessage';
        const payload: any = {
          chat_id: chatId,
        };

        if (parseModeToUse) payload.parse_mode = parseModeToUse;
        if (replyMarkup) payload.reply_markup = replyMarkup;

        if (mediaType === 'PHOTO' && mediaRef) {
          telegramEndpoint = 'sendPhoto';
          payload.photo = mediaRef;
          payload.caption = formattedMessage;
        } else if (mediaType === 'VIDEO' && mediaRef) {
          telegramEndpoint = 'sendVideo';
          payload.video = mediaRef;
          payload.caption = formattedMessage;
        } else if (mediaType === 'DOCUMENT' && mediaRef) {
          telegramEndpoint = 'sendDocument';
          payload.document = mediaRef;
          payload.caption = formattedMessage;
        } else {
          payload.text = formattedMessage;
        }

        this.logger.log(`🚀 [TELEGRAM SENDING] Bot [${bot.username}] -> Kullanıcı [${fromUser.id}] (Endpoint: ${telegramEndpoint}, ParseMode: ${parseModeToUse})...`);

        const tgRes = await fetch(`https://api.telegram.org/bot${rawToken}/${telegramEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const tgData = (await tgRes.json()) as any;

        if (!tgData.ok) {
          this.logger.error(
            `❌ [TELEGRAM API HATA ${tgData.error_code || 400}] Bot [${bot.username || botId}] - Mesaj Gönderilemedi! ` +
            `Açıklama: "${tgData.description || 'Bilinmeyen Hata'}". ` +
            `Gönderilen Mesaj Metni:\n"${formattedMessage}"`,
          );

          // Fallback: Parse mode veya medya yükleme hatası varsa düz metin olarak tekrar dene
          if (telegramEndpoint !== 'sendMessage' || tgData.description?.includes('parse') || tgData.error_code === 400) {
            this.logger.warn(`⚠️ [FALLBACK ATTEMPT] (${telegramEndpoint}) hatası nedeniyle Düz Metin (sendMessage) olarak tekrar deneniyor...`);
            const fallbackPayload: any = {
              chat_id: chatId,
              text: formattedMessage,
            };
            if (replyMarkup) fallbackPayload['reply_markup'] = replyMarkup;

            const fallbackRes = await fetch(`https://api.telegram.org/bot${rawToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fallbackPayload),
            });
            const fallbackData = (await fallbackRes.json()) as any;

            if (fallbackData.ok) {
              this.logger.log(`✅ [FALLBACK SUCCESS] Mesaj düz metin olarak Telegram'a iletildi.`);
            } else {
              this.logger.error(`❌ [FALLBACK FAILED] Düz metin denemesi de başarısız: ${fallbackData.description}`);
            }
          }
        } else {
          this.logger.log(`✅ [TELEGRAM SUCCESS] Bot [${bot.username}] -> Kullanıcıya [${fromUser.id}] karşılama mesajı başarıyla iletildi.`);
        }
      } catch (err: any) {
        this.logger.error(`❌ [PROCESSOR ERROR] Bot [${botId}] - Karşılama mesajı gönderilirken beklenmeyen hata: ${err.message}`);
      }
    }

    this.logger.log(`🎉 [Job #${job.id} COMPLETE] Bot [${botId}] - Kullanıcı [${fromUser.id}] güncellemesi başarıyla işlendi.`);
  }
}
