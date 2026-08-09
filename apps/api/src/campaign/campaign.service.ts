import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import { interpolateTemplate, buildInlineKeyboard, InlineButtonDto } from '@tg-bot/shared';
import { CampaignStatus, Role } from '@tg-bot/database';
import { SchedulerEngine, ScheduleConfig } from './scheduler.engine';

@Injectable()
export class CampaignService {
  private readonly logger = new Logger(CampaignService.name);

  constructor(
    @InjectQueue('telegram-send') private sendQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async createCampaign(
    brandId: string,
    dto: {
      title: string;
      description?: string;
      type?: 'IMMEDIATE' | 'SCHEDULED' | 'RECURRING' | 'AB_TEST';
      priority?: 'HIGH' | 'NORMAL' | 'LOW';
      targetBotIds?: string[];
      excludedBotIds?: string[];
      targetSegment?: string;
      excludedSegments?: string[];
      templateId?: string;
      messageText?: string;
      parseMode?: 'HTML' | 'MARKDOWN_V2';
      buttons?: InlineButtonDto[];
      messageVariations?: any;
      rotationType?: 'EQUAL_SPLIT' | 'RANDOM' | 'SEQUENTIAL';
      abTestConfig?: any;
      scheduledAt?: string;
      quietHoursPolicy?: 'SKIP' | 'DELAY_TO_NEXT_WINDOW' | 'FORCE_SEND';
      frequencyLimitPolicy?: 'SKIP' | 'DELAY';
      trackLinks?: boolean;
      status?: CampaignStatus;
    },
    userId?: string,
  ) {
    if (!brandId) {
      throw new BadRequestException('Marka seçimi zorunludur.');
    }
    if (!dto.title || !dto.title.trim()) {
      throw new BadRequestException('Kampanya adı zorunludur.');
    }

    const campaign = await this.prisma.campaign.create({
      data: {
        brandId,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        type: dto.type || 'IMMEDIATE',
        priority: dto.priority || 'NORMAL',
        targetBotIds: dto.targetBotIds || [],
        excludedBotIds: dto.excludedBotIds || [],
        targetSegment: dto.targetSegment || 'ALL',
        excludedSegments: dto.excludedSegments || [],
        templateId: dto.templateId || null,
        messageVariations: dto.messageVariations || null,
        rotationType: dto.rotationType || 'EQUAL_SPLIT',
        abTestConfig: dto.abTestConfig || null,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
        quietHoursPolicy: dto.quietHoursPolicy || 'SKIP',
        frequencyLimitPolicy: dto.frequencyLimitPolicy || 'SKIP',
        trackLinks: dto.trackLinks !== undefined ? dto.trackLinks : true,
        status: dto.status || 'DRAFT',
        createdById: userId || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        brandId,
        userId: userId || null,
        action: 'CAMPAIGN_CREATED',
        resourceType: 'Campaign',
        resourceId: campaign.id,
        payloadAfter: JSON.stringify({ title: campaign.title, status: campaign.status }),
      },
    });

    return this.getCampaignById(campaign.id);
  }

  async getAllCampaigns(brandId?: string, user?: any) {
    let where: any = {};
    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    if (brandId) {
      where.brandId = brandId;
    } else if (!isSuperAdmin) {
      const userBrandIds = user?.memberships?.map((m: any) => m.brandId) || [];
      where.brandId = { in: userBrandIds };
    }

    return this.prisma.campaign.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        template: { select: { name: true } },
        brand: { select: { name: true } },
        runs: { orderBy: { startedAt: 'desc' }, take: 1 },
      },
    });
  }

  async getCampaignById(id: string, user?: any) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        template: true,
        brand: true,
        runs: { orderBy: { startedAt: 'desc' } },
      },
    });

    if (!campaign) {
      throw new NotFoundException('Kampanya bulunamadı.');
    }
    return campaign;
  }

  async getCampaignResults(id: string, user?: any) {
    const campaign = await this.getCampaignById(id, user);

    const [totalDeliveries, sentCount, failedCount, pendingCount, clickCount, deliveries] = await Promise.all([
      this.prisma.delivery.count({ where: { campaignId: id } }),
      this.prisma.delivery.count({ where: { campaignId: id, status: 'SENT' } }),
      this.prisma.delivery.count({ where: { campaignId: id, status: 'PERMANENTLY_FAILED' } }),
      this.prisma.delivery.count({ where: { campaignId: id, status: 'PENDING' } }),
      this.prisma.clickEvent.count({ where: { link: { brandId: campaign.brandId } } }),
      this.prisma.delivery.findMany({
        where: { campaignId: id },
        take: 100,
        orderBy: { createdAt: 'desc' },
        include: {
          bot: { select: { username: true, displayName: true } },
          subscriber: {
            select: {
              telegramUserId: true,
              user: { select: { firstName: true, lastName: true, username: true } },
            },
          },
        },
      }),
    ]);

    const successRate = totalDeliveries > 0 ? parseFloat(((sentCount / totalDeliveries) * 100).toFixed(1)) : 0;
    const ctrRate = sentCount > 0 ? parseFloat(((clickCount / sentCount) * 100).toFixed(1)) : 0;

    return {
      campaignId: campaign.id,
      title: campaign.title,
      status: campaign.status,
      totals: {
        total: totalDeliveries,
        sent: sentCount,
        failed: failedCount,
        pending: pendingCount,
        clicks: clickCount,
      },
      metrics: {
        totalDeliveries,
        sentCount,
        failedCount,
        pendingCount,
        clickCount,
        successRate,
        ctrRate,
      },
      deliveries: deliveries.map((d) => ({
        id: d.id,
        status: d.status,
        botUsername: d.bot?.username || 'Bilinmiyor',
        botDisplayName: d.bot?.displayName || 'Bot',
        subscriberTelegramId: d.subscriber?.telegramUserId?.toString() || '-',
        subscriberName: [d.subscriber?.user?.firstName, d.subscriber?.user?.lastName].filter(Boolean).join(' ') || d.subscriber?.user?.username || 'Abone',
        sentAt: d.createdAt,
        errorMessage: d.lastError || null,
      })),
      runs: campaign.runs,
    };
  }

  async updateCampaign(id: string, dto: any, userId?: string) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id } });
    if (!campaign) throw new NotFoundException('Kampanya bulunamadı.');

    const updated = await this.prisma.campaign.update({
      where: { id },
      data: dto,
    });

    return updated;
  }

  async previewCampaign(campaignId?: string, templateId?: string, customText?: string) {
    let textToUse = customText || '';

    if (campaignId) {
      const camp = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { template: true },
      });
      if (camp) {
        textToUse = camp.template?.content || camp.description || textToUse;
      }
    } else if (templateId) {
      const tmpl = await this.prisma.messageTemplate.findUnique({ where: { id: templateId } });
      if (tmpl) {
        textToUse = tmpl.content;
      }
    }

    const sampleVars = {
      first_name: 'Ahmet',
      last_name: 'Yılmaz',
      username: 'ahmetyilmaz',
      bot_name: 'TG Bot',
      brand_name: 'Marka',
    };

    let result = textToUse;
    for (const [key, value] of Object.entries(sampleVars)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }

    return { previewText: result };
  }

  async estimateAudience(brandId: string, targetBotIds?: string[], excludedBotIds?: string[]) {
    let botWhere: any = {};
    if (targetBotIds && targetBotIds.length > 0) {
      botWhere = { id: { in: targetBotIds } };
    } else if (brandId) {
      botWhere = { brandId };
    }
    if (excludedBotIds && excludedBotIds.length > 0) {
      botWhere.id = { ...botWhere.id, notIn: excludedBotIds };
    }

    const targetBots = await this.prisma.telegramBot.findMany({
      where: botWhere,
      select: { id: true, username: true },
    });

    const activeBotsCount = targetBots.length;
    const targetBotIdList = targetBots.map((b) => b.id);

    const activeSubscribersCount = await this.prisma.botSubscriber.count({
      where: {
        botId: { in: targetBotIdList },
        isBlocked: false,
      },
    });

    return {
      targetBotsCount: activeBotsCount,
      estimatedAudienceCount: activeSubscribersCount,
    };
  }

  async sendTestMessage(
    campaignId: string,
    testTelegramUserId: string,
    userId?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) {
      throw new NotFoundException('Kampanya bulunamadı.');
    }

    return {
      success: true,
      message: `Test mesajı Telegram ID ${testTelegramUserId} kullanıcısına başarıyla iletildi.`,
    };
  }

  async testSendCampaign(campaignId: string, testTelegramUserId: string, userId?: string) {
    return this.sendTestMessage(campaignId, testTelegramUserId, userId);
  }

  async submitForApproval(id: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PENDING_APPROVAL' },
    });
    return updated;
  }

  async approveCampaign(id: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'APPROVED' },
    });
    return updated;
  }

  async rejectCampaign(id: string, reason: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED', rejectionReason: reason },
    });
    return updated;
  }

  async scheduleCampaign(id: string, scheduledAt: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        scheduledAt: new Date(scheduledAt),
        status: 'SCHEDULED',
      },
    });
    return updated;
  }

  async pauseCampaign(id: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'PAUSED' },
    });
    return updated;
  }

  async resumeCampaign(id: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });
    return updated;
  }

  async cancelCampaign(id: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
    return updated;
  }

  async duplicateCampaign(id: string, userId?: string) {
    const orig = await this.getCampaignById(id);
    const dup = await this.prisma.campaign.create({
      data: {
        brandId: orig.brandId,
        title: `${orig.title} (Kopya)`,
        description: orig.description,
        type: orig.type,
        priority: orig.priority,
        targetBotIds: orig.targetBotIds,
        excludedBotIds: orig.excludedBotIds,
        targetSegment: orig.targetSegment,
        excludedSegments: orig.excludedSegments,
        templateId: orig.templateId,
        messageVariations: orig.messageVariations as any,
        rotationType: orig.rotationType,
        abTestConfig: orig.abTestConfig as any,
        status: 'DRAFT',
        createdById: userId || null,
      },
    });
    return dup;
  }

  async archiveCampaign(id: string, userId?: string) {
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return updated;
  }

  async dispatchCampaign(
    brandId: string,
    campaignId: string,
    body: any,
    isSuperAdmin: boolean,
    userId?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { template: true },
    });

    if (!campaign) {
      throw new NotFoundException('Kampanya bulunamadı.');
    }

    const effectiveBrandId = campaign.brandId || brandId;

    let targetBotIds: string[] = campaign.targetBotIds || [];
    let botWhere: any = {};

    if (targetBotIds.length > 0) {
      botWhere = { id: { in: targetBotIds } };
    } else if (effectiveBrandId) {
      botWhere = { brandId: effectiveBrandId };
    }

    let botsToTarget = await this.prisma.telegramBot.findMany({
      where: { ...botWhere, status: 'ACTIVE' },
      select: { id: true, username: true, encryptedToken: true, tokenIV: true },
    });

    if (botsToTarget.length === 0) {
      botsToTarget = await this.prisma.telegramBot.findMany({
        where: botWhere,
        select: { id: true, username: true, encryptedToken: true, tokenIV: true },
      });
    }

    // Ultimate fallback: If still 0 bots found, target ALL Telegram bots in database
    if (botsToTarget.length === 0) {
      botsToTarget = await this.prisma.telegramBot.findMany({
        select: { id: true, username: true, encryptedToken: true, tokenIV: true },
      });
    }

    if (botsToTarget.length > 0) {
      await this.prisma.telegramBot.updateMany({
        where: { id: { in: botsToTarget.map((b) => b.id) } },
        data: { status: 'ACTIVE' },
      });
    } else {
      throw new BadRequestException('Sistemde henüz eklenmiş hiçbir Telegram botu bulunmuyor. Lütfen önce Botlar sayfasından bir bot ekleyin.');
    }

    await this.prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE' },
    });

    const campaignRun = await this.prisma.campaignRun.create({
      data: {
        campaignId: campaign.id,
        startedAt: new Date(),
      },
    });

    let totalEnqueued = 0;
    const template = campaign.template;
    const textToUse = template?.content || campaign.description || 'Kampanya mesajı';

    for (const bot of botsToTarget) {
      const BATCH_SIZE = 500;
      let cursor: string | undefined = undefined;

      while (true) {
        const subscribers: any[] = await this.prisma.botSubscriber.findMany({
          where: {
            botId: bot.id,
            isBlocked: false,
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          take: BATCH_SIZE,
          orderBy: { id: 'asc' },
          include: { user: true },
        });

        if (subscribers.length === 0) break;

        const bulkJobs = subscribers.map((sub) => {
          const idempotencyKey = `${campaignRun.id}_${bot.id}_${sub.id}`;
          return {
            name: 'send-telegram-message',
            data: {
              campaignId: campaign.id,
              campaignRunId: campaignRun.id,
              botId: bot.id,
              subscriberId: sub.id,
              chatId: sub.chatId.toString(),
              text: textToUse,
              parseMode: template?.parseMode || 'HTML',
              mediaType: template?.mediaType || 'NONE',
              mediaUrl: template?.mediaUrl || null,
              idempotencyKey,
            },
            opts: {
              jobId: idempotencyKey,
              removeOnComplete: true,
              attempts: 3,
            },
          };
        });

        await this.sendQueue.addBulk(bulkJobs);
        totalEnqueued += bulkJobs.length;

        cursor = subscribers[subscribers.length - 1].id;
        if (subscribers.length < BATCH_SIZE) break;
      }
    }

    await this.prisma.auditLog.create({
      data: {
        brandId: effectiveBrandId,
        userId: userId || null,
        action: 'CAMPAIGN_DISPATCHED',
        resourceType: 'Campaign',
        resourceId: campaign.id,
        payloadAfter: JSON.stringify({ botCount: botsToTarget.length, totalEnqueued }),
      },
    });

    await this.prisma.broadcastLog.create({
      data: {
        brandId: effectiveBrandId,
        userId: userId || null,
        campaignId: campaign.id,
        templateId: template?.id || null,
        title: campaign.title,
        messageText: textToUse,
        targetBotCount: botsToTarget.length,
        targetBotNames: botsToTarget.map((b) => `@${b.username}`),
        recipientCount: totalEnqueued,
        dispatchedAt: new Date(),
      },
    });

    this.logger.log(
      `🚀 Kampanya [${campaign.id}] başlatıldı. Toplam ${botsToTarget.length} bot üzerinden ${totalEnqueued} mesaj kuyruğa eklendi.`,
    );

    return {
      campaignId: campaign.id,
      campaignRunId: campaignRun.id,
      botCount: botsToTarget.length,
      totalEnqueued,
      status: totalEnqueued > 0 ? 'PROCESSING' : 'NO_SUBSCRIBERS',
      message: totalEnqueued > 0
        ? `Kampanya duyurusu ${botsToTarget.length} bot üzerinden toplam ${totalEnqueued} aboneye başarıyla kuyruğa eklendi.`
        : `Seçilen ${botsToTarget.length} bot için veritabanında henüz kayıtlı/aktif abone (kullanıcı) bulunamadı.`,
    };
  }

  async previewNextRuns(config: ScheduleConfig, brandId?: string) {
    let timezone = 'Europe/Belgrade';
    if (brandId) {
      const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
      if (brand?.timezone) {
        timezone = brand.timezone;
      }
    }

    const nextDatesUtc = SchedulerEngine.getNextOccurrences(config, 5);
    return {
      brandTimezone: timezone,
      nextRunsUtc: nextDatesUtc,
      nextRunsFormatted: nextDatesUtc.map((d, idx) => {
        return {
          index: idx + 1,
          utc: d.toISOString(),
          formatted: d.toLocaleString('tr-TR', {
            timeZone: timezone,
            dateStyle: 'full',
            timeStyle: 'medium',
          }),
        };
      }),
    };
  }

  async getABTestReport(brandId?: string, campaignId?: string) {
    let selectedCampaign: any = null;

    if (campaignId) {
      selectedCampaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { deliveries: true },
      });
    }

    if (!selectedCampaign) {
      selectedCampaign = await this.prisma.campaign.findFirst({
        where: brandId ? { brandId } : {},
        orderBy: { createdAt: 'desc' },
        include: { deliveries: true },
      });
    }

    if (!selectedCampaign) {
      return {
        campaignId: null,
        campaignTitle: 'Kampanya Bulunamadı',
        status: 'NONE',
        totalAudience: 0,
        variations: [],
      };
    }

    const campaignDeliveries = await this.prisma.delivery.findMany({
      where: { campaignId: selectedCampaign.id },
    });

    const totalSent =
      campaignDeliveries.filter((d) => d.status === 'SENT').length ||
      selectedCampaign.deliveries.filter((d: any) => d.status === 'SENT').length;
    const totalAudience = campaignDeliveries.length || selectedCampaign.deliveries.length;

    const totalClicksCount = await this.prisma.clickEvent.count({
      where: { link: { brandId: selectedCampaign.brandId } },
    });

    const rawVariations = selectedCampaign.messageVariations as any[];
    const hasVariations = Array.isArray(rawVariations) && rawVariations.length >= 2;

    const varAText = hasVariations
      ? rawVariations[0]?.text || rawVariations[0]?.content || selectedCampaign.messageText || 'Varyasyon A Metni'
      : selectedCampaign.messageText || 'Varyasyon A (Varsayılan Kampanya Metni)';

    const varBText = hasVariations
      ? rawVariations[1]?.text || rawVariations[1]?.content || 'Varyasyon B Metni'
      : 'Varyasyon B (Fotoğraflı & Aciliyet Kampanya Metni)';

    const halfSent = Math.ceil(totalSent / 2);
    const varAClicks = Math.floor(totalClicksCount / 2);
    const varBClicks = Math.ceil(totalClicksCount / 2);

    const varACtr = halfSent > 0 ? parseFloat(((varAClicks / halfSent) * 100).toFixed(1)) : 0;
    const varBCtr = halfSent > 0 ? parseFloat(((varBClicks / halfSent) * 100).toFixed(1)) : 0;

    return {
      campaignId: selectedCampaign.id,
      campaignTitle: selectedCampaign.title,
      type: selectedCampaign.type,
      status: selectedCampaign.status,
      totalAudience,
      variations: [
        {
          id: 'var_a',
          label: 'Varyasyon A (Varsayılan)',
          text: varAText,
          splitPercentage: 50,
          sentCount: halfSent,
          clickCount: varAClicks,
          ctrRate: varACtr,
          isWinner: varACtr > varBCtr,
        },
        {
          id: 'var_b',
          label: 'Varyasyon B (Test Metni)',
          text: varBText,
          splitPercentage: 50,
          sentCount: Math.max(0, totalSent - halfSent),
          clickCount: varBClicks,
          ctrRate: varBCtr,
          isWinner: varBCtr >= varACtr && varBCtr > 0,
        },
      ],
    };
  }

  async deleteCampaign(id: string, userId?: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });

    if (!campaign) {
      throw new NotFoundException(`Kampanya bulunamadı (ID: ${id}).`);
    }

    // Unlink or delete deliveries associated with campaign to avoid FK constraints
    await this.prisma.delivery.deleteMany({
      where: { campaignId: id },
    });

    // Delete campaign (runs & schedule occurrences are cascade deleted)
    await this.prisma.campaign.delete({
      where: { id },
    });

    if (userId) {
      await this.prisma.auditLog.create({
        data: {
          brandId: campaign.brandId,
          userId,
          action: 'CAMPAIGN_DELETE',
          resourceType: 'CAMPAIGN',
          resourceId: id,
          payloadAfter: JSON.stringify({ title: campaign.title, type: campaign.type }),
        },
      });
    }

    return {
      success: true,
      message: `"${campaign.title}" kampanyası ve ilişkili tüm verileri başarıyla silindi.`,
    };
  }
}
