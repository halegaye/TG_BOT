import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from '@tg-bot/database';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getOverviewMetrics(brandId?: string, user?: any) {
    return this.getAdvancedDashboardMetrics(brandId, user);
  }

  async getAdvancedDashboardMetrics(brandId?: string, user?: any) {
    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    let effectiveBrandId = brandId;

    if (user && !isSuperAdmin) {
      const userBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      if (brandId && !userBrandIds.includes(brandId)) {
        throw new ForbiddenException('Bu markanın analitik verilerini görme yetkiniz yok.');
      }
      effectiveBrandId = brandId || userBrandIds[0];
    }

    if (effectiveBrandId) {
      const brandExists = await this.prisma.brand.findUnique({ where: { id: effectiveBrandId } });
      if (!brandExists) {
        effectiveBrandId = undefined;
      }
    }

    const brandWhere = effectiveBrandId ? { brandId: effectiveBrandId } : {};

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalBrands,
      totalBots,
      activeBots,
      unhealthyBots,
      totalActiveSubscribers,
      todayNewSubscribers,
      todaySent,
      todaySuccess,
      todayFailed,
      todayPending,
      todayRateLimited,
      activeCampaigns,
      todayUniqueClicks,
      systemErrors24h,
      hourlyMetrics,
      allTimeSent,
      allTimeSuccess,
      recentBroadcasts,
      allTimeClicks,
      allTimeFailed,
    ] = await Promise.all([
      this.prisma.brand.count(),
      this.prisma.telegramBot.count({ where: brandWhere }),
      this.prisma.telegramBot.count({ where: { ...brandWhere, status: 'ACTIVE' } }),
      this.prisma.telegramBot.count({
        where: { ...brandWhere, status: { in: ['DRAFT', 'INVALID_TOKEN', 'WEBHOOK_ERROR', 'TELEGRAM_UNREACHABLE', 'ARCHIVED'] } },
      }),
      this.prisma.botSubscriber.count({
        where: effectiveBrandId
          ? { bot: { brandId: effectiveBrandId }, isBlocked: false }
          : { isBlocked: false },
      }),
      this.prisma.botSubscriber.count({
        where: effectiveBrandId
          ? { bot: { brandId: effectiveBrandId }, subscribedAt: { gte: startOfDay } }
          : { subscribedAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: { ...brandWhere, createdAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: { ...brandWhere, status: 'SENT', createdAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: { ...brandWhere, status: 'PERMANENTLY_FAILED', createdAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: { ...brandWhere, status: { in: ['PENDING', 'PROCESSING'] }, createdAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: { ...brandWhere, status: 'RATE_LIMITED', createdAt: { gte: startOfDay } },
      }),
      this.prisma.campaign.count({
        where: { ...brandWhere, status: { in: ['ACTIVE', 'SCHEDULED'] } },
      }),
      this.prisma.clickEvent.count({
        where: effectiveBrandId
          ? { link: { brandId: effectiveBrandId }, createdAt: { gte: startOfDay } }
          : { createdAt: { gte: startOfDay } },
      }),
      this.prisma.delivery.count({
        where: { ...brandWhere, status: 'PERMANENTLY_FAILED', createdAt: { gte: twentyFourHoursAgo } },
      }),
      this.prisma.hourlyMetric.findMany({
        where: brandWhere,
        orderBy: { date: 'desc' },
        take: 24,
      }),
      this.prisma.delivery.count({ where: brandWhere }),
      this.prisma.delivery.count({ where: { ...brandWhere, status: 'SENT' } }),
      this.prisma.broadcastLog.findMany({
        where: brandWhere,
        orderBy: { dispatchedAt: 'desc' },
        take: 10,
      }),
      this.prisma.clickEvent.count({
        where: effectiveBrandId ? { link: { brandId: effectiveBrandId } } : {},
      }),
      this.prisma.delivery.count({ where: { ...brandWhere, status: 'PERMANENTLY_FAILED' } }),
    ]);

    const ctrRate =
      todaySuccess > 0 ? ((todayUniqueClicks / todaySuccess) * 100).toFixed(1) + '%' : '0.0%';

    const allTimeCtrRate =
      allTimeSuccess > 0 ? ((allTimeClicks / allTimeSuccess) * 100).toFixed(1) + '%' : '0.0%';

    const result = {
      totalBrands,
      totalBots,
      activeBots,
      unhealthyBots,
      totalActiveSubscribers,
      todayNewSubscribers,
      todaySent,
      todaySuccess,
      todayFailed,
      todayPending,
      todayRateLimited,
      allTimeSent,
      allTimeSuccess,
      allTimeFailed,
      allTimeClicks,
      activeCampaigns,
      todayUniqueClicks,
      ctrRate,
      allTimeCtrRate,
      systemErrors24h,
      recentBroadcasts: recentBroadcasts.map((b) => ({
        id: b.id,
        title: b.title,
        messageText: b.messageText,
        targetBotCount: b.targetBotCount,
        recipientCount: b.recipientCount,
        dispatchedAt: b.dispatchedAt,
      })),
      hourlyMetrics: hourlyMetrics.map((h) => {
        const d = new Date(h.date);
        const dateStr = d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        const timeStr = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        return {
          id: h.id,
          hour: `${dateStr} ${timeStr}`,
          sentCount: h.totalSent,
          failedCount: h.totalFailed,
          clickCount: h.totalClicks,
        };
      }),
    };

    if (result.hourlyMetrics.length === 0) {
      const deliveries = await this.prisma.delivery.findMany({
        where: brandWhere,
        select: { status: true, createdAt: true },
      });
      const clicks = await this.prisma.clickEvent.findMany({
        where: effectiveBrandId ? { link: { brandId: effectiveBrandId } } : {},
        select: { createdAt: true },
      });

      const hourlyMap = new Map<string, { id: string; hour: string; sentCount: number; failedCount: number; clickCount: number; timestamp: number }>();

      for (const d of deliveries) {
        const dateObj = new Date(d.createdAt);
        const dateStr = dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
        const timeStr = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
        const label = `${dateStr} ${timeStr}`;
        const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}-${dateObj.getHours()}`;

        if (!hourlyMap.has(key)) {
          hourlyMap.set(key, {
            id: key,
            hour: label,
            sentCount: 0,
            failedCount: 0,
            clickCount: 0,
            timestamp: dateObj.getTime(),
          });
        }

        const bucket = hourlyMap.get(key)!;
        if (d.status === 'SENT') {
          bucket.sentCount++;
        } else if (d.status === 'PERMANENTLY_FAILED') {
          bucket.failedCount++;
        }
      }

      for (const c of clicks) {
        const dateObj = new Date(c.createdAt);
        const key = `${dateObj.getFullYear()}-${dateObj.getMonth()}-${dateObj.getDate()}-${dateObj.getHours()}`;
        if (hourlyMap.has(key)) {
          hourlyMap.get(key)!.clickCount++;
        }
      }

      result.hourlyMetrics = Array.from(hourlyMap.values())
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 24);
    }

    return result;
  }

  async getBotReport(botId: string, user?: any) {
    const bot = await this.prisma.telegramBot.findUnique({
      where: { id: botId },
      include: {
        brand: true,
        _count: { select: { subscribers: true, deliveries: true } },
      },
    });

    if (!bot) {
      throw new NotFoundException(`Bot bulunamadı (ID: ${botId}).`);
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [newSubscribers, blockedSubscribers, totalSent, totalFailed, totalClicks, lastDelivery] = await Promise.all([
      this.prisma.botSubscriber.count({ where: { botId, subscribedAt: { gte: startOfDay } } }),
      this.prisma.botSubscriber.count({ where: { botId, isBlocked: true } }),
      this.prisma.delivery.count({ where: { botId, status: 'SENT' } }),
      this.prisma.delivery.count({ where: { botId, status: 'PERMANENTLY_FAILED' } }),
      this.prisma.clickEvent.count({ where: { link: { botId } } }),
      this.prisma.delivery.findFirst({ where: { botId }, orderBy: { updatedAt: 'desc' } }),
    ]);

    const totalDeliveries = totalSent + totalFailed;
    const deliverySuccessRate = totalDeliveries > 0 ? parseFloat(((totalSent / totalDeliveries) * 100).toFixed(1)) : 100.0;
    const ctrRate = totalSent > 0 ? parseFloat(((totalClicks / totalSent) * 100).toFixed(1)) : 0.0;

    return {
      botId: bot.id,
      username: bot.username,
      displayName: bot.displayName,
      brandName: bot.brand?.name || '',
      subscriberCount: bot._count.subscribers,
      newSubscribers,
      blockedSubscribers,
      deliverySuccessRate,
      ctrRate,
      lastWebhookAt: bot.updatedAt ? bot.updatedAt.toISOString() : null,
      lastError: lastDelivery?.lastError || null,
      queueLatencyMs: 15,
    };
  }

  async generateAnalyticsCsv(brandId?: string): Promise<string> {
    const brandWhere = brandId ? { brandId } : {};
    const deliveries = await this.prisma.delivery.findMany({
      where: brandWhere,
      orderBy: { createdAt: 'desc' },
      take: 1000,
      include: {
        bot: { select: { displayName: true, username: true } },
        campaign: { select: { title: true } },
      },
    });

    let csv = 'DeliveryId,BrandId,BotName,CampaignTitle,Status,LastError,DispatchedAt\n';
    for (const d of deliveries) {
      const botName = d.bot?.displayName || d.bot?.username || 'N/A';
      const campaignTitle = d.campaign?.title || 'N/A';
      const lastErr = (d.lastError || '').replace(/,/g, ';').replace(/\n/g, ' ');
      csv += `${d.id},${d.brandId},"${botName}","${campaignTitle}",${d.status},"${lastErr}",${d.createdAt.toISOString()}\n`;
    }

    return csv;
  }
}
