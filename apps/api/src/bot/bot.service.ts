import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { InlineButtonDto, validateInlineButtonUrl } from '@tg-bot/shared';
import { Role, BotStatus } from '@tg-bot/database';
import { Redis } from 'ioredis';
import { syncBotProfileWithBrand } from '../brand/bot-profile.helper';
import * as crypto from 'crypto';

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);
  private redis: Redis;

  constructor(
    @InjectQueue('bot-bulk-import') private bulkImportQueue: Queue,
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`[Redis Connection Guard] BotService: ${err.message}`);
    });
  }

  async getAllBots(brandId?: string, user?: any) {
    let where: any = {};
    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    const cleanBrandId =
      brandId && brandId !== 'undefined' && brandId !== 'null' && brandId.trim() !== ''
        ? brandId.trim()
        : undefined;

    if (user && !isSuperAdmin) {
      const userBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      if (cleanBrandId) {
        if (userBrandIds.includes(cleanBrandId)) {
          where = { brandId: cleanBrandId };
        } else {
          where = { brandId: { in: userBrandIds } };
        }
      } else {
        where = { brandId: { in: userBrandIds } };
      }
    } else if (cleanBrandId) {
      const brandExists = await this.prisma.brand.findUnique({ where: { id: cleanBrandId } });
      if (brandExists) {
        where = { brandId: cleanBrandId };
      }
    }

    const bots = await this.prisma.telegramBot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            subscribers: true,
            deliveries: true,
          },
        },
      },
    });

    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://hooks.example.com';

    return bots.map((bot) => ({
      id: bot.id,
      brandId: bot.brandId,
      brandName: bot.brand?.name || 'Bilinmeyen Marka',
      username: bot.username,
      displayName: bot.displayName,
      status: bot.status,
      maskedToken: bot.tokenFingerprint ? `...${bot.tokenFingerprint.slice(0, 4)}` : '...****',
      webhookUrl: `${webhookBaseUrl}/webhook/${bot.webhookPathSecret}`,
      subscribers: bot._count?.subscribers || 0,
      startMessage: bot.startMessage,
      startParseMode: bot.startParseMode,
      buttons: bot.buttonsJson,
      disableNotification: bot.disableNotification || false,
      description: bot.description || '',
      tags: bot.tags || [],
      createdAt: bot.createdAt,
    }));
  }

  async getBotById(botId: string, user?: any) {
    const isBigIntId = /^\d+$/.test(botId);
    const where = isBigIntId ? { telegramBotId: BigInt(botId) } : { id: botId };

    const bot = await this.prisma.telegramBot.findFirst({
      where,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            subscribers: true,
            deliveries: true,
          },
        },
      },
    });

    if (!bot) {
      throw new NotFoundException('Bot bulunamadı.');
    }

    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    if (user && !isSuperAdmin) {
      const userBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      if (!userBrandIds.includes(bot.brandId)) {
        throw new ForbiddenException('Bu botun verilerini görüntüleme yetkiniz yok.');
      }
    }

    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://hooks.example.com';

    return {
      id: bot.id,
      brandId: bot.brandId,
      brandName: bot.brand?.name || 'Bilinmeyen Marka',
      username: bot.username,
      displayName: bot.displayName,
      status: bot.status,
      maskedToken: bot.tokenFingerprint ? `...${bot.tokenFingerprint.slice(0, 4)}` : '...****',
      webhookUrl: `${webhookBaseUrl}/webhook/${bot.webhookPathSecret}`,
      subscribers: bot._count.subscribers,
      startMessage: bot.startMessage,
      startParseMode: bot.startParseMode,
      buttons: bot.buttonsJson,
      disableNotification: bot.disableNotification || false,
      description: bot.description || '',
      tags: bot.tags || [],
      createdAt: bot.createdAt,
    };
  }

  async registerBot(
    brandId: string,
    rawToken: string,
    displayName?: string,
    extraOptions: {
      startMessage?: string;
      startParseMode?: string;
      buttons?: InlineButtonDto[];
      disableNotification?: boolean;
      description?: string;
      tags?: string[];
      status?: BotStatus;
    } = {},
  ) {
    let effectiveBrandId = brandId;
    if (!effectiveBrandId || effectiveBrandId === 'undefined' || effectiveBrandId === 'null' || effectiveBrandId.trim() === '') {
      const firstBrand = await this.prisma.brand.findFirst();
      if (firstBrand) {
        effectiveBrandId = firstBrand.id;
      } else {
        throw new BadRequestException('Sistemde henüz marka bulunmuyor. Lütfen önce Markalar sayfasından yeni bir marka ekleyin.');
      }
    }

    const cleanToken = rawToken?.trim();
    if (!cleanToken) {
      throw new BadRequestException('Telegram Bot Token zorunludur.');
    }

    // 1. Duplicate Token kontrolü
    const fingerprint = crypto.createHash('sha256').update(cleanToken).digest('hex');
    const existingBot = await this.prisma.telegramBot.findFirst({
      where: { tokenFingerprint: fingerprint },
    });

    if (existingBot) {
      throw new ConflictException(`Bu Telegram botu (@${existingBot.username}) zaten veritabanında kayıtlı!`);
    }

    // 2. Telegram API getMe doğrulaması
    let botInfo: any;
    try {
      const tgMeResponse = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
      const tgMeData = (await tgMeResponse.json()) as any;

      if (!tgMeData.ok) {
        throw new BadRequestException(`Geçersiz Telegram Bot Token: ${tgMeData.description}`);
      }
      botInfo = tgMeData.result;
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`Telegram API getMe bağlantı hatası: ${error.message}`);
    }

    const pathSecret = crypto.randomBytes(24).toString('hex');
    const headerSecret = crypto.randomBytes(32).toString('hex');
    const { encryptedData, iv } = this.encryptionService.encrypt(cleanToken);

    const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || 'https://hooks.example.com';
    const fullWebhookUrl = `${webhookBaseUrl}/webhook/${pathSecret}`;

    const isDevMode =
      process.env.NODE_ENV !== 'production' ||
      webhookBaseUrl.includes('localhost') ||
      webhookBaseUrl.includes('127.0.0.1') ||
      webhookBaseUrl.includes('example.com');

    let botStatus: BotStatus = extraOptions.status || 'ACTIVE';

    try {
      const setWebhookRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: fullWebhookUrl,
          secret_token: headerSecret,
          allowed_updates: ['message', 'my_chat_member'],
        }),
      });

      const setWebhookData = (await setWebhookRes.json()) as any;

      if (!setWebhookData.ok) {
        if (isDevMode) {
          this.logger.warn(
            `[Dev Mode] Webhook DNS hatası atlandı, bot yerel modda kaydediliyor: ${setWebhookData.description}`,
          );
        } else {
          botStatus = 'WEBHOOK_ERROR';
        }
      }
    } catch (error: any) {
      if (isDevMode) {
        this.logger.warn(
          `[Dev Mode] Webhook kaydı ağ/DNS hatası bypass edildi: ${error.message}`,
        );
      } else {
        botStatus = 'WEBHOOK_ERROR';
      }
    }

    const createdBot = await this.prisma.telegramBot.create({
      data: {
        brandId: effectiveBrandId,
        telegramBotId: BigInt(botInfo.id),
        username: botInfo.username,
        displayName: displayName || botInfo.first_name,
        encryptedToken: encryptedData,
        tokenIV: iv,
        tokenFingerprint: fingerprint,
        webhookPathSecret: pathSecret,
        webhookHeaderSecret: headerSecret,
        status: botStatus,
        startMessage: extraOptions.startMessage || null,
        startParseMode: extraOptions.startParseMode || 'HTML',
        buttonsJson: (extraOptions.buttons as any) || null,
        disableNotification: extraOptions.disableNotification || false,
        description: extraOptions.description || null,
        tags: extraOptions.tags || [],
      },
    });

    // Markaya ait profil fotoğrafı ve açıklaması varsa Telegram API ile bot profilini otomatik senkronize et
    const brand = await this.prisma.brand.findUnique({ where: { id: effectiveBrandId } });
    if (brand && (brand.botDescription || brand.botShortDescription || brand.botPhotoUrl)) {
      syncBotProfileWithBrand(cleanToken, {
        botDescription: brand.botDescription,
        botShortDescription: brand.botShortDescription,
        botPhotoUrl: brand.botPhotoUrl,
      }).catch((err) => {
        this.logger.warn(
          `[Auto Sync Bot Profile Warning] Yeni bot @${botInfo.username} profili senkronize edilemedi: ${err.message}`,
        );
      });
    }

    return this.getBotById(createdBot.id);
  }

  async updateBot(
    botId: string,
    dto: {
      token?: string;
      displayName?: string;
      brandId?: string;
      status?: BotStatus;
      startMessage?: string;
      startParseMode?: 'HTML' | 'MARKDOWN_V2';
      buttons?: InlineButtonDto[];
      disableNotification?: boolean;
      description?: string;
      tags?: string[];
    },
    user: any,
  ) {
    const isBigIntId = /^\d+$/.test(botId);
    const whereCondition = isBigIntId ? { telegramBotId: BigInt(botId) } : { id: botId };

    const bot = await this.prisma.telegramBot.findFirst({
      where: whereCondition,
    });

    if (!bot) {
      throw new NotFoundException(`Bot bulunamadı (ID: ${botId}).`);
    }

    // Yetki Kontrolü: Yalnızca SUPER_ADMIN veya ilgili markanın BRAND_ADMIN'i düzenleyebilir
    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    const isBrandAdmin = user?.memberships?.some(
      (m: any) =>
        m.brandId === bot.brandId &&
        (m.role === Role.BRAND_ADMIN || m.role === 'BRAND_ADMIN' || m.role === Role.SYSTEM_ADMIN),
    );

    if (!isSuperAdmin && !isBrandAdmin) {
      throw new ForbiddenException(
        'Bu botun ayarlarını yalnızca Süper Admin veya ilgili marka yöneticisi (BRAND_ADMIN) düzenleyebilir.',
      );
    }

    const dataToUpdate: any = {};

    if (dto.displayName !== undefined) dataToUpdate.displayName = dto.displayName;
    if (dto.brandId !== undefined && isSuperAdmin) dataToUpdate.brandId = dto.brandId;
    if (dto.status !== undefined) dataToUpdate.status = dto.status;
    if (dto.startMessage !== undefined) dataToUpdate.startMessage = dto.startMessage;
    if (dto.startParseMode !== undefined) dataToUpdate.startParseMode = dto.startParseMode;
    if (dto.disableNotification !== undefined) dataToUpdate.disableNotification = dto.disableNotification;
    if (dto.description !== undefined) dataToUpdate.description = dto.description;
    if (dto.tags !== undefined) dataToUpdate.tags = dto.tags;

    if (dto.buttons !== undefined) {
      if (Array.isArray(dto.buttons)) {
        for (const btn of dto.buttons) {
          if (!validateInlineButtonUrl(btn.url)) {
            throw new BadRequestException(
              `Geçersiz buton URL'si (${btn.url}). Yalnızca http:// ve https:// protokolleri kabul edilir.`,
            );
          }
        }
      }
      dataToUpdate.buttonsJson = dto.buttons;
    }

    if (dto.token && dto.token.trim()) {
      const rawToken = dto.token.trim();
      const fingerprint = crypto.createHash('sha256').update(rawToken).digest('hex');

      const existingOther = await this.prisma.telegramBot.findFirst({
        where: { tokenFingerprint: fingerprint, NOT: { id: bot.id } },
      });
      if (existingOther) {
        throw new ConflictException('Bu Telegram tokenı başka bir bot tarafından kullanılmaktadır!');
      }

      const tgMeResponse = await fetch(`https://api.telegram.org/bot${rawToken}/getMe`);
      const tgMeData = (await tgMeResponse.json()) as any;
      if (!tgMeData.ok) {
        throw new BadRequestException(`Geçersiz Telegram Bot Token: ${tgMeData.description}`);
      }

      const { encryptedData, iv } = this.encryptionService.encrypt(rawToken);
      dataToUpdate.encryptedToken = encryptedData;
      dataToUpdate.tokenIV = iv;
      dataToUpdate.tokenFingerprint = fingerprint;
      dataToUpdate.telegramBotId = BigInt(tgMeData.result.id);
      dataToUpdate.username = tgMeData.result.username;
    }

    const updated = await this.prisma.telegramBot.update({
      where: { id: bot.id },
      data: dataToUpdate,
    });

    return this.getBotById(updated.id);
  }

  async deleteBot(botId: string, user: any) {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id: botId },
    });

    if (!bot) {
      throw new NotFoundException('Bot bulunamadı!');
    }

    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    if (user && !isSuperAdmin) {
      const userBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      if (!userBrandIds.includes(bot.brandId)) {
        throw new ForbiddenException('Bu markanın botlarını silme yetkiniz yok!');
      }
    }

    await this.prisma.$transaction([
      this.prisma.botGroupMember.deleteMany({ where: { botId } }),
      this.prisma.botHealthCheck.deleteMany({ where: { botId } }),
      this.prisma.botDailyMetric.deleteMany({ where: { botId } }),
      this.prisma.clickLink.deleteMany({ where: { botId } }),
      this.prisma.delivery.deleteMany({ where: { botId } }),
      this.prisma.botSubscriber.deleteMany({ where: { botId } }),
      this.prisma.telegramBot.delete({ where: { id: botId } }),
    ]);

    return { success: true, message: `Bot @${bot.username} veritabanından başarıyla kaldırıldı.` };
  }

  // --- QUEUED BULK IMPORT SYSTEM ---
  async queueBulkImport(
    brandId: string,
    csvContent: string,
    userId?: string,
  ) {
    if (!csvContent || !csvContent.trim()) {
      throw new BadRequestException('CSV dosyası içeriği boş olamaz.');
    }

    const lines = csvContent.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      throw new BadRequestException('CSV içerisinde geçerli veri satırı bulunamadı.');
    }

    // Header analizi
    const firstLine = lines[0].toLowerCase();
    const hasHeader = firstLine.includes('token') || firstLine.includes('brand_code');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    if (dataLines.length === 0) {
      throw new BadRequestException('CSV içerisinde başlık dışında veri satırı bulunamadı.');
    }

    const rows: Array<{
      token: string;
      brandCode?: string;
      groups?: string;
      active?: string;
      startMessageTemplate?: string;
      defaultRedirectUrl?: string;
      notes?: string;
      rowNumber: number;
    }> = [];

    const parseCsvLine = (text: string): string[] => {
      let raw = text.trim();
      // Strip outer wrapping quotes if the whole line is in quotes
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

      // If no standard delimiter matched, try space/tab split
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

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const cols = parseCsvLine(line);

      let parsedToken = cols[0] || '';
      const tokenMatch = line.match(/\d+:[A-Za-z0-9_-]{30,}/);
      if (tokenMatch) {
        parsedToken = tokenMatch[0];
      }

      rows.push({
        token: parsedToken,
        brandCode: cols[1] || undefined,
        groups: cols[2] || undefined,
        active: cols[3] || undefined,
        startMessageTemplate: cols[4] || undefined,
        defaultRedirectUrl: cols[5] || undefined,
        notes: cols[6] || undefined,
        rowNumber: (hasHeader ? i + 2 : i + 1),
      });
    }

    const importId = crypto.randomUUID();
    const progressKey = `bulk_import:progress:${importId}`;

    const initialProgress = {
      importId,
      status: 'QUEUED',
      total: rows.length,
      processed: 0,
      successCount: 0,
      failedCount: 0,
      cancelled: false,
      createdAt: new Date().toISOString(),
      failedRows: [],
    };

    await this.redis.set(progressKey, JSON.stringify(initialProgress), 'EX', 86400);

    // BullMQ kuyruğuna ekle
    await this.bulkImportQueue.add(
      'process-bulk-import',
      {
        importId,
        defaultBrandId: brandId,
        rows,
        userId,
      },
      {
        removeOnComplete: true,
      },
    );

    return {
      importId,
      total: rows.length,
      status: 'QUEUED',
      message: `${rows.length} satır asenkron BullMQ kuyruğuna eklendi ve arka planda güvenle işleniyor.`,
    };
  }

  async getBulkImportStatus(importId: string) {
    const progressKey = `bulk_import:progress:${importId}`;
    const raw = await this.redis.get(progressKey);

    if (!raw) {
      throw new NotFoundException(`İçe aktarma görevi bulunamadı (ID: ${importId}).`);
    }

    return JSON.parse(raw);
  }

  async cancelBulkImport(importId: string) {
    const cancelKey = `bulk_import:cancel:${importId}`;
    await this.redis.set(cancelKey, 'true', 'EX', 86400);
    return { importId, status: 'CANCEL_REQUESTED', message: 'İçe aktarmayı iptal etme talebi iletildi.' };
  }

  async getBulkImportFailedCsv(importId: string): Promise<string> {
    const status = await this.getBulkImportStatus(importId);
    const failedRows = status.failedRows || [];

    // Prepend UTF-8 BOM (\uFEFF) and use semicolon (;) so Excel opens with 8 distinct columns
    const header = '\uFEFFtoken;brand_code;groups;active;start_message_template_name;default_redirect_url;notes;error\n';
    const csvLines = failedRows.map((r: any) => {
      const escape = (val: string) => `"${(val || '').toString().replace(/"/g, '""')}"`;
      return `${escape(r.token)};${escape(r.brandCode)};${escape(r.groups)};${escape(r.active)};${escape(r.startMessageTemplateName)};${escape(r.defaultRedirectUrl)};${escape(r.notes)};${escape(r.error)}`;
    });

    return header + csvLines.join('\n');
  }

  async updateStartMessage(
    botId: string,
    brandId: string | undefined,
    dto: {
      startMessage?: string;
      startParseMode?: 'HTML' | 'MARKDOWN_V2';
      buttons?: InlineButtonDto[];
    },
    isSuperAdmin: boolean = false,
  ) {
    return this.updateBot(
      botId,
      {
        startMessage: dto.startMessage,
        startParseMode: dto.startParseMode,
        buttons: dto.buttons,
      },
      { memberships: isSuperAdmin ? [{ role: Role.SUPER_ADMIN }] : [{ brandId, role: Role.BRAND_ADMIN }] },
    );
  }
}
