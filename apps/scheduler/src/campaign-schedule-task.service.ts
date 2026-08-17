import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import Redis from 'ioredis';

@Injectable()
export class CampaignScheduleTaskService {
  private readonly logger = new Logger(CampaignScheduleTaskService.name);
  private redis: Redis;

  constructor(private prisma: PrismaService) {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) => {
      this.logger.warn(`[Redis Connection Guard] Scheduler: ${err.message}`);
    });
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledCampaigns() {
    const now = new Date();
    // 1 dakikalık pencere yuvarlaması
    const occurrenceKey = new Date(
      Math.floor(now.getTime() / 60000) * 60000,
    ).toISOString();

    try {
      const activeCampaigns = await this.prisma.campaign.findMany({
        where: {
          status: { in: ['SCHEDULED', 'ACTIVE'] },
          OR: [
            { endsAt: null },
            { endsAt: { gte: now } },
          ],
        },
        include: { brand: true, template: true },
      });

      for (const campaign of activeCampaigns) {
        // Süresiz değilse ve maxExecutions dolmuşsa pas geç ve COMPLETED yap
        if (
          !campaign.isIndefinite &&
          campaign.maxExecutions &&
          campaign.executionCount >= campaign.maxExecutions
        ) {
          await this.prisma.campaign.update({
            where: { id: campaign.id },
            data: { status: 'COMPLETED' },
          });
          continue;
        }

        const lockKey = `lock:schedule:${campaign.id}:${occurrenceKey}`;
        // Redis Distributed Lock (5 dakika TTL)
        const acquiredLock = await this.redis.set(lockKey, 'LOCKED', 'PX', 300000, 'NX');

        if (!acquiredLock) {
          this.logger.debug(
            `🔒 Kampanya [${campaign.id}] için Redis Kilidi başka bir Scheduler nodu tarafından alındı. Pas geçiliyor.`,
          );
          continue;
        }

        // Transaction & Unique Constraint ile Çifte Çalıştırmayı Önleme
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.campaignScheduleOccurrence.create({
              data: {
                campaignId: campaign.id,
                occurrenceKey,
              },
            });

            await tx.campaign.update({
              where: { id: campaign.id },
              data: {
                lastRunAt: now,
                executionCount: { increment: 1 },
                status:
                  campaign.scheduleType === 'ONCE' || campaign.scheduleType === 'IMMEDIATE'
                    ? 'COMPLETED'
                    : campaign.status,
              },
            });

            await tx.auditLog.create({
              data: {
                brandId: campaign.brandId,
                action: 'CAMPAIGN_SCHEDULE_EXECUTED',
                resourceType: 'Campaign',
                resourceId: campaign.id,
                payloadAfter: JSON.stringify({ occurrenceKey, executedAt: now }),
              },
            });
          });

          this.logger.log(
            `🚀 HA Idempotent Zamanlayıcı Tetiklendi: Kampanya [${campaign.title}] (ID: ${campaign.id}) -> Occurrence Key: ${occurrenceKey}`,
          );
        } catch (err: any) {
          // P2002: Unique constraint failed
          if (err.code === 'P2002') {
            this.logger.warn(
              `⚠️ Kampanya [${campaign.id}] bu çalışma zamanı (${occurrenceKey}) için zaten veritabanında işlendi. Çifte tetikleme engellendi.`,
            );
          } else {
            this.logger.error(
              `❌ Kampanya zamanlaması çalıştırılırken hata: ${err.message}`,
              err.stack,
            );
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`❌ Cron zamanlayıcı ana döngü hatası: ${err.message}`);
    }
  }
}
