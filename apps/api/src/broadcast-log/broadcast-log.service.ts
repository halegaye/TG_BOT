import { Injectable, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from '@tg-bot/database';

@Injectable()
export class BroadcastLogService {
  private readonly logger = new Logger(BroadcastLogService.name);

  constructor(private prisma: PrismaService) {}

  async createLog(data: {
    brandId: string;
    userId?: string;
    campaignId?: string;
    templateId?: string;
    title: string;
    messageText: string;
    targetBotCount: number;
    targetBotNames: string[];
    recipientCount: number;
  }) {
    return this.prisma.broadcastLog.create({
      data: {
        brandId: data.brandId,
        userId: data.userId || null,
        campaignId: data.campaignId || null,
        templateId: data.templateId || null,
        title: data.title,
        messageText: data.messageText,
        targetBotCount: data.targetBotCount,
        targetBotNames: data.targetBotNames,
        recipientCount: data.recipientCount,
      },
    });
  }

  async getLogsForUser(user: any, brandIdQuery?: string) {
    if (!user) {
      throw new ForbiddenException('Kullanıcı kimliği doğrulanamadı.');
    }

    const isSuperAdmin = user.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    const userBrandIds: string[] = (user.memberships || [])
      .map((m: any) => m.brandId)
      .filter(Boolean);

    let whereCondition: any = {};

    if (isSuperAdmin) {
      // Süper Admin her markanın paylaşımlarını görebilir veya marka filtresi uygulayabilir
      if (brandIdQuery) {
        whereCondition.brandId = brandIdQuery;
      }
    } else {
      // İlgili firma ekibi YALNIZCA kendi markalarının paylaşımlarını görebilir!
      if (userBrandIds.length === 0) {
        throw new ForbiddenException('Herhangi bir markaya bağlı değilsiniz.');
      }

      if (brandIdQuery) {
        if (!userBrandIds.includes(brandIdQuery)) {
          throw new ForbiddenException('Bu markanın paylaşım kayıtlarını görüntüleme yetkiniz yoktur.');
        }
        whereCondition.brandId = brandIdQuery;
      } else {
        whereCondition.brandId = { in: userBrandIds };
      }
    }

    const logs = await this.prisma.broadcastLog.findMany({
      where: whereCondition,
      orderBy: { dispatchedAt: 'desc' },
      take: 100,
      include: {
        brand: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            username: true,
          },
        },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      brandId: log.brandId,
      brandName: log.brand?.name || 'Bilinmeyen Marka',
      brandCode: log.brand?.code || '',
      dispatchedBy: log.user
        ? `${log.user.firstName} ${log.user.lastName} (@${log.user.username || log.user.email})`
        : 'Sistem / Otomatik',
      userEmail: log.user?.email || 'Sistem',
      campaignId: log.campaignId,
      templateId: log.templateId,
      title: log.title,
      messageText: log.messageText,
      targetBotCount: log.targetBotCount,
      targetBotNames: log.targetBotNames,
      recipientCount: log.recipientCount,
      dispatchedAt: log.dispatchedAt,
    }));
  }
}
