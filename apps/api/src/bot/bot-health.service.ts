import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { Redis } from 'ioredis';

export interface BotHealthSummary {
  botId: string;
  username: string;
  displayName: string;
  brandId: string;
  brandName: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED' | 'UNKNOWN';
  isTokenValid: boolean;
  isGetMeSuccess: boolean;
  isWebhookValid: boolean;
  isSecretValid: boolean;
  pendingUpdateCount: number;
  lastWebhookAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  errorRate1h: number;
  successRate24h: number;
  queueLatencyMs: number;
  rateLimitStatus: 'NORMAL' | 'RATE_LIMITED';
  subscribersCount: number;
  checkedAt: string;
}

@Injectable()
export class BotHealthService {
  private readonly logger = new Logger(BotHealthService.name);
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
  ) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`[Redis Connection Guard] BotHealthService: ${err.message}`);
    });
  }

  async runHealthCheckForBot(botId: string): Promise<BotHealthSummary> {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id: botId },
      include: {
        brand: true,
        _count: { select: { subscribers: true } },
      },
    });

    if (!bot) {
      throw new NotFoundException(`Bot bulunamadı (ID: ${botId}).`);
    }

    const checkedAt = new Date().toISOString();
    let isTokenValid = false;
    let isGetMeSuccess = false;
    let isWebhookValid = false;
    let isSecretValid = true;
    let pendingUpdateCount = 0;
    let lastError: string | null = null;
    let rawToken: string | null = null;

    // 1. Token Decryption & Validation
    try {
      rawToken = this.encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
      if (rawToken && rawToken.includes(':')) {
        isTokenValid = true;
      }
    } catch (e: any) {
      lastError = `Token Decryption Error: ${e.message}`;
    }

    // 2. Telegram getMe & getWebhookInfo Live API Checks
    if (isTokenValid && rawToken) {
      try {
        const getMeRes = await fetch(`https://api.telegram.org/bot${rawToken}/getMe`, { method: 'GET' });
        const getMeData = (await getMeRes.json()) as any;
        if (getMeData.ok) {
          isGetMeSuccess = true;
        } else {
          lastError = getMeData.description || 'getMe failed';
        }
      } catch (err: any) {
        lastError = `Telegram getMe Connection Error: ${err.message}`;
      }

      try {
        const webhookRes = await fetch(`https://api.telegram.org/bot${rawToken}/getWebhookInfo`, { method: 'GET' });
        const webhookData = (await webhookRes.json()) as any;
        if (webhookData.ok && webhookData.result) {
          pendingUpdateCount = webhookData.result.pending_update_count || 0;
          if (webhookData.result.last_error_message) {
            lastError = `Webhook Error: ${webhookData.result.last_error_message}`;
          }
          isWebhookValid = true;
        }
      } catch (err: any) {
        this.logger.warn(`Webhook info check failed for bot ${bot.username}: ${err.message}`);
      }
    }

    // 3. 1 Saatlik & 24 Saatlik Gönderim Performansı Hesabı
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [total1h, failed1h, total24h, sent24h, lastSuccessDelivery, lastFailedDelivery] = await Promise.all([
      this.prisma.delivery.count({ where: { botId, createdAt: { gte: oneHourAgo } } }),
      this.prisma.delivery.count({ where: { botId, status: 'PERMANENTLY_FAILED', createdAt: { gte: oneHourAgo } } }),
      this.prisma.delivery.count({ where: { botId, createdAt: { gte: twentyFourHoursAgo } } }),
      this.prisma.delivery.count({ where: { botId, status: 'SENT', createdAt: { gte: twentyFourHoursAgo } } }),
      this.prisma.delivery.findFirst({ where: { botId, status: 'SENT' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.delivery.findFirst({ where: { botId, status: 'PERMANENTLY_FAILED' }, orderBy: { updatedAt: 'desc' } }),
    ]);

    const errorRate1h = total1h > 0 ? parseFloat(((failed1h / total1h) * 100).toFixed(1)) : 0.0;
    const successRate24h = total24h > 0 ? parseFloat(((sent24h / total24h) * 100).toFixed(1)) : 100.0;

    if (!lastError && lastFailedDelivery?.lastError) {
      lastError = lastFailedDelivery.lastError;
    }

    // 4. Redis Rate Limit Durumu Kontrolü
    const isRateLimited = await this.redis.get(`rate_limit:bot:${botId}:lock`);
    const rateLimitStatus = isRateLimited ? 'RATE_LIMITED' : 'NORMAL';

    // 5. Gerçek Redis Kuyruk Latans Ölçümü
    const startPing = Date.now();
    await this.redis.ping();
    const queueLatencyMs = Math.max(1, Date.now() - startPing);

    // 6. Sağlık Seviyesi Sınıflandırma Mantığı (Health Classifier)
    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'DISABLED' | 'UNKNOWN' = 'HEALTHY';

    if (bot.status === 'ARCHIVED' || bot.status === 'DRAFT' || bot.status === 'INVALID_TOKEN' || bot.status === 'WEBHOOK_ERROR') {
      healthStatus = 'DISABLED';
    } else if (!isTokenValid || !isGetMeSuccess || errorRate1h >= 50.0) {
      healthStatus = 'CRITICAL';
    } else if (errorRate1h >= 10.0 || pendingUpdateCount > 500 || rateLimitStatus === 'RATE_LIMITED') {
      healthStatus = 'WARNING';
    }

    // 7. Sağlık Geçmişini DB'ye Kaydet (BotHealthCheck)
    await this.prisma.botHealthCheck.create({
      data: {
        botId,
        status: healthStatus,
        isTokenValid,
        isGetMeSuccess,
        isWebhookValid,
        isSecretValid,
        pendingUpdateCount,
        lastError,
        errorRate1h,
        successRate24h,
        queueLatencyMs,
        rateLimitStatus,
      },
    });

    return {
      botId: bot.id,
      username: bot.username || 'BilinmeyenBot',
      displayName: bot.displayName,
      brandId: bot.brandId,
      brandName: bot.brand?.name || 'Bilinmeyen Marka',
      status: healthStatus,
      isTokenValid,
      isGetMeSuccess,
      isWebhookValid,
      isSecretValid,
      pendingUpdateCount,
      lastWebhookAt: bot.updatedAt ? bot.updatedAt.toISOString() : null,
      lastSuccessAt: lastSuccessDelivery ? lastSuccessDelivery.updatedAt.toISOString() : null,
      lastError,
      errorRate1h,
      successRate24h,
      queueLatencyMs,
      rateLimitStatus,
      subscribersCount: bot._count.subscribers,
      checkedAt,
    };
  }

  async getHealthCenterOverview(brandId?: string, user?: any) {
    let botWhere: any = {};
    if (user) {
      const isSuperAdmin = user.memberships?.some(
        (m: any) => m.role === 'SUPER_ADMIN' || m.role === 'SYSTEM_ADMIN',
      );
      if (!isSuperAdmin) {
        const allowedBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
        if (brandId) {
          botWhere.brandId = brandId;
        } else {
          botWhere.brandId = { in: allowedBrandIds };
        }
      } else if (brandId) {
        botWhere.brandId = brandId;
      }
    } else if (brandId) {
      botWhere.brandId = brandId;
    }

    const bots = await this.prisma.telegramBot.findMany({
      where: botWhere,
      select: { id: true },
    });

    const summaries = await Promise.all(
      bots.map((b) => this.runHealthCheckForBot(b.id).catch(() => null)),
    );

    const validSummaries = summaries.filter(Boolean) as BotHealthSummary[];

    const summaryCounts = {
      totalBots: validSummaries.length,
      healthyCount: validSummaries.filter((s) => s.status === 'HEALTHY').length,
      warningCount: validSummaries.filter((s) => s.status === 'WARNING').length,
      criticalCount: validSummaries.filter((s) => s.status === 'CRITICAL').length,
      disabledCount: validSummaries.filter((s) => s.status === 'DISABLED').length,
      unknownCount: validSummaries.filter((s) => s.status === 'UNKNOWN').length,
    };

    return {
      summaryCounts,
      botHealthList: validSummaries,
    };
  }
}
