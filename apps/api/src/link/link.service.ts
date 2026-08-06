import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class LinkService {
  constructor(
    @InjectQueue('analytics-events') private analyticsQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async createShortLink(brandId: string, botId?: string, targetUrl?: string) {
    if (!targetUrl) {
      throw new BadRequestException('Target URL (hedef bağlantı) zorunludur.');
    }

    const trimmedUrl = targetUrl.trim();
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      throw new BadRequestException('Hedef URL yalnızca http:// veya https:// şemasına sahip olmalıdır.');
    }

    let selectedBotId = botId;
    if (!selectedBotId) {
      const firstBot = await this.prisma.telegramBot.findFirst({
        where: { brandId },
      });
      if (!firstBot) {
        throw new BadRequestException('Sistemde bağlantı ilişkilendirilecek bir Telegram botu bulunamadı.');
      }
      selectedBotId = firstBot.id;
    }

    const shortCode = crypto.randomBytes(4).toString('hex'); // 8 karakterlik benzersiz kod

    const clickLink = await this.prisma.clickLink.create({
      data: {
        brandId,
        botId: selectedBotId,
        shortCode,
        targetUrl: trimmedUrl,
      },
      include: {
        bot: { select: { username: true, displayName: true } },
      },
    });

    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:4000';

    return {
      id: clickLink.id,
      shortCode: clickLink.shortCode,
      targetUrl: clickLink.targetUrl,
      trackingUrl: `${baseUrl}/r/${clickLink.shortCode}`,
      botName: clickLink.bot?.displayName || clickLink.bot?.username || 'Varsayılan Bot',
      clickCount: 0,
      createdAt: clickLink.createdAt.toISOString(),
    };
  }

  async getShortLinks(brandId?: string) {
    const where = brandId ? { brandId } : {};
    const links = await this.prisma.clickLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        bot: { select: { username: true, displayName: true } },
        _count: { select: { events: true } },
      },
    });

    const baseUrl = process.env.WEBHOOK_BASE_URL || 'http://localhost:4000';

    return links.map((l) => ({
      id: l.id,
      shortCode: l.shortCode,
      targetUrl: l.targetUrl,
      trackingUrl: `${baseUrl}/r/${l.shortCode}`,
      botName: l.bot?.displayName || l.bot?.username || 'Varsayılan Bot',
      clickCount: l._count.events,
      createdAt: l.createdAt.toISOString(),
    }));
  }

  async processRedirect(shortCode: string, ipAddress?: string, userAgent?: string) {
    const link = await this.prisma.clickLink.findUnique({
      where: { shortCode },
    });

    if (!link) {
      throw new NotFoundException('Kısa link bulunamadı.');
    }

    const targetUrl = link.targetUrl;
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      throw new BadRequestException('Geçersiz hedef URL şeması.');
    }

    // Tıklamayı Anında Veritabanına Kaydet (Real-time Click Recording)
    let deviceClass = 'DESKTOP';
    if (userAgent && /mobile|android|iphone|ipad/i.test(userAgent)) {
      deviceClass = 'MOBILE';
    }

    await this.prisma.clickEvent.create({
      data: {
        linkId: link.id,
        deviceClass,
      },
    });

    // Kuyruğa da Asenkron Olayı Gönder (Yedeklilik İçin)
    try {
      await this.analyticsQueue.add(
        'process-click-event',
        {
          linkId: link.id,
          brandId: link.brandId,
          ipAddress,
          userAgent,
          clickedAt: new Date().toISOString(),
        },
        { removeOnComplete: true, attempts: 3 },
      );
    } catch {
      // Queue add failures do not interrupt redirection
    }

    return targetUrl;
  }
}
