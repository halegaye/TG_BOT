import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SubscriberService {
  constructor(private prisma: PrismaService) {}

  async getAllSubscribers(brandId?: string, searchQuery?: string, isBlocked?: boolean) {
    const where: any = {};
    if (brandId) {
      where.bot = { brandId };
    }
    if (typeof isBlocked === 'boolean') {
      where.isBlocked = isBlocked;
    }
    if (searchQuery) {
      where.OR = [
        { user: { firstName: { contains: searchQuery, mode: 'insensitive' } } },
        { user: { lastName: { contains: searchQuery, mode: 'insensitive' } } },
        { user: { username: { contains: searchQuery, mode: 'insensitive' } } },
      ];
    }

    const items = await this.prisma.botSubscriber.findMany({
      where,
      take: 100,
      orderBy: { subscribedAt: 'desc' },
      include: {
        bot: { select: { id: true, displayName: true, username: true } },
        user: true,
      },
    });

    return items.map((sub) => ({
      id: sub.id,
      telegramUserId: sub.telegramUserId.toString(),
      chatId: sub.chatId.toString(),
      firstName: sub.user?.firstName || 'Bilinmiyor',
      lastName: sub.user?.lastName || '',
      username: sub.user?.username || '',
      botName: sub.bot?.displayName || sub.bot?.username || 'N/A',
      botId: sub.botId,
      isBlocked: sub.isBlocked,
      subscribedAt: sub.subscribedAt.toISOString(),
      lastActiveAt: sub.lastActiveAt.toISOString(),
    }));
  }

  async getSubscriberById(id: string) {
    const sub = await this.prisma.botSubscriber.findUnique({
      where: { id },
      include: {
        bot: { select: { id: true, displayName: true, username: true } },
        user: true,
        deliveries: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { campaign: { select: { title: true } } },
        },
      },
    });

    if (!sub) {
      throw new NotFoundException(`Abone bulunamadı (ID: ${id}).`);
    }

    return {
      id: sub.id,
      telegramUserId: sub.telegramUserId.toString(),
      chatId: sub.chatId.toString(),
      firstName: sub.user?.firstName || 'Bilinmiyor',
      lastName: sub.user?.lastName || '',
      username: sub.user?.username || '',
      languageCode: sub.user?.languageCode || 'tr',
      botName: sub.bot?.displayName || sub.bot?.username || 'N/A',
      botId: sub.botId,
      isBlocked: sub.isBlocked,
      subscribedAt: sub.subscribedAt.toISOString(),
      lastActiveAt: sub.lastActiveAt.toISOString(),
      deliveries: sub.deliveries.map((d) => ({
        id: d.id,
        campaignTitle: d.campaign?.title || 'Tekil İleti',
        status: d.status,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  }
}
