import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService, validateInlineButtonUrl } from '@tg-bot/shared';
import { Redis } from 'ioredis';
import * as crypto from 'crypto';

export interface BulkImportRow {
  token: string;
  brandCode?: string;
  groups?: string;
  active?: string;
  startMessageTemplate?: string;
  defaultRedirectUrl?: string;
  notes?: string;
  rowNumber: number;
}

@Injectable()
@Processor('bot-bulk-import')
export class BulkImportProcessor extends WorkerHost {
  private readonly logger = new Logger(BulkImportProcessor.name);
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    super();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`[Redis Connection Guard] BulkImportProcessor: ${err.message}`);
    });
  }

  async process(job: Job<any>): Promise<any> {
    const { importId, defaultBrandId, rows, userId } = job.data as {
      importId: string;
      defaultBrandId: string;
      rows: BulkImportRow[];
      userId?: string;
    };

    this.logger.log(`🚀 [BULK BOT IMPORT START] ImportId: ${importId}, Toplam ${rows.length} satır işlenecek.`);

    const progressKey = `bulk_import:progress:${importId}`;
    const cancelKey = `bulk_import:cancel:${importId}`;

    const progressData: any = {
      importId,
      status: 'PROCESSING',
      total: rows.length,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      cancelled: false,
      createdAt: new Date().toISOString(),
      failedRows: [],
    };

    await this.redis.set(progressKey, JSON.stringify(progressData), 'EX', 86400);

    const seenTokensInFile = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      // 1. İptal Kontrolü (Cancel check)
      const isCancelled = await this.redis.get(cancelKey);
      if (isCancelled === 'true') {
        this.logger.warn(`🛑 [BULK BOT IMPORT CANCELLED] ImportId: ${importId} kullanıcı tarafından iptal edildi.`);
        progressData.status = 'CANCELLED';
        progressData.cancelled = true;
        await this.redis.set(progressKey, JSON.stringify(progressData), 'EX', 86400);

        await this.prisma.auditLog.create({
          data: {
            brandId: defaultBrandId || null,
            userId: userId || null,
            action: 'BOT_BULK_IMPORT_CANCELLED',
            resourceType: 'TelegramBot',
            resourceId: importId,
            payloadAfter: JSON.stringify({
              total: rows.length,
              processed: progressData.processed,
              successCount: progressData.successCount,
              failedCount: progressData.failedCount,
            }),
          },
        });
        return progressData;
      }

      const row = rows[i];
      let rawToken = row.token?.trim() || '';
      if ((rawToken.startsWith('"') && rawToken.endsWith('"')) || (rawToken.startsWith("'") && rawToken.endsWith("'"))) {
        rawToken = rawToken.slice(1, -1).trim();
      }
      const tokenMatch = rawToken.match(/\d+:[A-Za-z0-9_-]{30,}/);
      if (tokenMatch) {
        rawToken = tokenMatch[0];
      }
      let targetBrandCode = row.brandCode?.trim();
      if (targetBrandCode && ((targetBrandCode.startsWith('"') && targetBrandCode.endsWith('"')) || (targetBrandCode.startsWith("'") && targetBrandCode.endsWith("'")))) {
        targetBrandCode = targetBrandCode.slice(1, -1).trim();
      }
      const rowNum = row.rowNumber || i + 1;

      let rowError: string | null = null;

      // 2. Token boş mu kontrol et
      if (!rawToken) {
        rowError = 'Token boş';
      } else if (seenTokensInFile.has(rawToken)) {
        rowError = 'Mükerrer Token (Dosya İçi Tekrar)';
      } else {
        seenTokensInFile.add(rawToken);
      }

      // 3. Veritabanında Duplicate Token Kontrolü
      if (!rowError) {
        const fingerprint = crypto.createHash('sha256').update(rawToken).digest('hex');
        const existingInDb = await this.prisma.telegramBot.findFirst({
          where: { tokenFingerprint: fingerprint },
        });
        if (existingInDb) {
          rowError = `Mükerrer Token (Zaten Veritabanında Kayıtlı: @${existingInDb.username})`;
        }
      }

      // 4. Marka Kontrolü (Önce koda/isme bak, bulunamazsa varsayılan seçili markaya düş)
      let targetBrand: any = null;
      if (!rowError) {
        if (targetBrandCode) {
          targetBrand = await this.prisma.brand.findFirst({
            where: {
              OR: [
                { code: { equals: targetBrandCode, mode: 'insensitive' } },
                { id: targetBrandCode },
                { name: { equals: targetBrandCode, mode: 'insensitive' } },
              ],
            },
          });
        }

        if (!targetBrand && defaultBrandId) {
          targetBrand = await this.prisma.brand.findUnique({
            where: { id: defaultBrandId },
          });
        }

        if (!targetBrand) {
          rowError = `Geçerli bir marka bulunamadı (${targetBrandCode || 'Varsayılan marka seçilmemiş'})`;
        }
      }

      // 5. Telegram API getMe Doğrulaması
      let botInfo: any = null;
      if (!rowError) {
        try {
          const tgMeResponse = await fetch(`https://api.telegram.org/bot${rawToken}/getMe`);
          const tgMeData = (await tgMeResponse.json()) as any;

          if (!tgMeData.ok) {
            rowError = `Geçersiz Telegram Token (${tgMeData.description || 'API Reddedildi'})`;
          } else {
            botInfo = tgMeData.result;
          }
        } catch (netErr: any) {
          rowError = `Telegram API Bağlantı Hatası: ${netErr.message}`;
        }
      }

      // 6. Webhook & DB Kaydı
      if (!rowError && botInfo && targetBrand) {
        try {
          const fingerprint = crypto.createHash('sha256').update(rawToken).digest('hex');
          const pathSecret = crypto.randomBytes(24).toString('hex');
          const headerSecret = crypto.randomBytes(32).toString('hex');
          const { encryptedData, iv } = this.encryptionService.encrypt(rawToken);

          const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://hooks.example.com';
          const fullWebhookUrl = `${webhookBaseUrl}/webhook/${pathSecret}`;

          const isDevMode =
            process.env.NODE_ENV !== 'production' ||
            webhookBaseUrl.includes('localhost') ||
            webhookBaseUrl.includes('127.0.0.1') ||
            webhookBaseUrl.includes('example.com');

          let botStatus: 'ACTIVE' | 'PASSED' | 'DRAFT' | 'WEBHOOK_ERROR' = 'ACTIVE';
          const isActiveParam = row.active?.toString().toLowerCase().trim();
          if (isActiveParam === 'false' || isActiveParam === '0' || isActiveParam === 'pasif') {
            botStatus = 'PASSED';
          }

          // Webhook Kurulumu
          try {
            const setWebhookRes = await fetch(`https://api.telegram.org/bot${rawToken}/setWebhook`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                url: fullWebhookUrl,
                secret_token: headerSecret,
                allowed_updates: ['message', 'my_chat_member'],
              }),
            });
            const setWebhookData = (await setWebhookRes.json()) as any;
            if (!setWebhookData.ok && !isDevMode) {
              botStatus = 'WEBHOOK_ERROR';
            }
          } catch (_) {
            if (!isDevMode) botStatus = 'WEBHOOK_ERROR';
          }

          // Tags & Buttons Hazırla
          const tags = row.groups
            ? row.groups
                .split(/[,;]/)
                .map((g) => g.trim())
                .filter((g) => g.length > 0)
            : [];

          const buttons: any[] = [];
          if (row.defaultRedirectUrl && validateInlineButtonUrl(row.defaultRedirectUrl)) {
            buttons.push({ text: 'Hemen İncele 🚀', url: row.defaultRedirectUrl, sameRow: false });
          }

          // Template Resolution: If startMessageTemplate refers to a MessageTemplate in DB, resolve it
          let resolvedStartMessage: string | null = row.startMessageTemplate || null;
          let resolvedParseMode: string = 'HTML';

          if (row.startMessageTemplate && targetBrand) {
            const rawTplName = row.startMessageTemplate.trim();
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

            const targetNormalized = normalize(rawTplName);
            const brandTemplates = await this.prisma.messageTemplate.findMany({
              where: { brandId: targetBrand.id, isActive: true },
            });

            const matchedTemplate = brandTemplates.find(
              (t) => normalize(t.name) === targetNormalized || t.id === rawTplName,
            );

            if (matchedTemplate) {
              resolvedStartMessage = matchedTemplate.content;
              resolvedParseMode = matchedTemplate.parseMode || 'HTML';
              if (matchedTemplate.buttonsJson && Array.isArray(matchedTemplate.buttonsJson)) {
                const tplButtons = matchedTemplate.buttonsJson as any[];
                for (const tb of tplButtons) {
                  if (!buttons.some((b) => b.url === tb.url)) {
                    buttons.push(tb);
                  }
                }
              }
            }
          }

          await this.prisma.telegramBot.create({
            data: {
              brandId: targetBrand.id,
              telegramBotId: BigInt(botInfo.id),
              username: botInfo.username,
              displayName: botInfo.first_name || botInfo.username,
              encryptedToken: encryptedData,
              tokenIV: iv,
              tokenFingerprint: fingerprint,
              webhookPathSecret: pathSecret,
              webhookHeaderSecret: headerSecret,
              status: botStatus,
              startMessage: resolvedStartMessage,
              startParseMode: resolvedParseMode,
              buttonsJson: buttons.length > 0 ? (buttons as any) : null,
              description: row.notes || null,
              tags: tags,
            },
          });

          progressData.successCount++;
          this.logger.log(`✅ Satır #${rowNum} Başarılı: Bot @${botInfo.username} (${targetBrand.name}) kaydedildi.`);
        } catch (dbErr: any) {
          rowError = `DB Kayıt Hatası: ${dbErr.message}`;
        }
      }

      if (rowError) {
        progressData.failedCount++;
        progressData.failedRows.push({
          rowNumber: rowNum,
          token: rawToken ? `...${rawToken.slice(-4)}` : 'boş',
          brandCode: targetBrandCode || defaultBrandId || '-',
          groups: row.groups || '-',
          active: row.active || '-',
          startMessageTemplateName: row.startMessageTemplate || '-',
          defaultRedirectUrl: row.defaultRedirectUrl || '-',
          notes: row.notes || '-',
          error: rowError,
        });
        this.logger.warn(`❌ Satır #${rowNum} Hatalı: ${rowError}`);
      }

      progressData.processed = i + 1;
      await this.redis.set(progressKey, JSON.stringify(progressData), 'EX', 86400);

      // Rate limit protection: Her satır arasında 150ms bekle (Aynı anda kontrolsüz yüzlerce Telegram isteği yapılmaması için)
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    progressData.status = 'COMPLETED';
    await this.redis.set(progressKey, JSON.stringify(progressData), 'EX', 86400);

    // Audit Log Kaydı
    await this.prisma.auditLog.create({
      data: {
        brandId: defaultBrandId || null,
        userId: userId || null,
        action: 'BOT_BULK_IMPORT_COMPLETED',
        resourceType: 'TelegramBot',
        resourceId: importId,
        payloadAfter: JSON.stringify({
          total: rows.length,
          successCount: progressData.successCount,
          failedCount: progressData.failedCount,
        }),
      },
    });

    this.logger.log(
      `🎉 [BULK BOT IMPORT COMPLETED] ImportId: ${importId}. Başarılı: ${progressData.successCount}, Hatalı: ${progressData.failedCount}`,
    );

    return progressData;
  }
}
