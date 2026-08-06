import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class AnalyticsAggregationService {
  private readonly logger = new Logger(AnalyticsAggregationService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async aggregateHourlyMetrics() {
    this.logger.log('Saatlik analitik verileri toplama görevi başlatıldı...');

    const brands = await this.prisma.brand.findMany({ select: { id: true } });
    const now = new Date();
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);

    for (const brand of brands) {
      try {
        const sentCount = await this.prisma.delivery.count({
          where: {
            brandId: brand.id,
            status: 'SENT',
            updatedAt: { gte: currentHour },
          },
        });

        const failedCount = await this.prisma.delivery.count({
          where: {
            brandId: brand.id,
            status: { in: ['PERMANENTLY_FAILED', 'CANCELLED', 'SKIPPED_INACTIVE'] },
            updatedAt: { gte: currentHour },
          },
        });

        const clickCount = await this.prisma.clickEvent.count({
          where: {
            link: { brandId: brand.id },
            createdAt: { gte: currentHour },
          },
        });

        await this.prisma.hourlyMetric.upsert({
          where: {
            brandId_date: {
              brandId: brand.id,
              date: currentHour,
            },
          },
          update: {
            totalSent: sentCount,
            totalFailed: failedCount,
            totalClicks: clickCount,
          },
          create: {
            brandId: brand.id,
            date: currentHour,
            totalSent: sentCount,
            totalFailed: failedCount,
            totalClicks: clickCount,
          },
        });
      } catch (err: any) {
        this.logger.error(`Brand [${brand.id}] için saatlik metrik hesaplanırken hata: ${err.message}`);
      }
    }

    this.logger.log('Saatlik analitik metrik toplama tamamlandı.');
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async aggregateDailyMetrics() {
    this.logger.log('Günlük analitik metrik toplama görevi başlatıldı...');

    const brands = await this.prisma.brand.findMany({ select: { id: true } });
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    for (const brand of brands) {
      try {
        const sentCount = await this.prisma.delivery.count({
          where: {
            brandId: brand.id,
            status: 'SENT',
            updatedAt: { gte: today },
          },
        });

        const failedCount = await this.prisma.delivery.count({
          where: {
            brandId: brand.id,
            status: { in: ['PERMANENTLY_FAILED', 'CANCELLED', 'SKIPPED_INACTIVE'] },
            updatedAt: { gte: today },
          },
        });

        const clickCount = await this.prisma.clickEvent.count({
          where: {
            link: { brandId: brand.id },
            createdAt: { gte: today },
          },
        });

        await this.prisma.dailyMetric.upsert({
          where: {
            brandId_date: {
              brandId: brand.id,
              date: today,
            },
          },
          update: {
            totalSent: sentCount,
            totalFailed: failedCount,
            totalClicks: clickCount,
          },
          create: {
            brandId: brand.id,
            date: today,
            totalSent: sentCount,
            totalFailed: failedCount,
            totalClicks: clickCount,
          },
        });
      } catch (err: any) {
        this.logger.error(`Brand [${brand.id}] için günlük metrik hesaplanırken hata: ${err.message}`);
      }
    }

    this.logger.log('Günlük analitik metrik toplama tamamlandı.');
  }
}
