import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from './auth/auth.module';
import { WebhookModule } from './webhook/webhook.module';
import { BotModule } from './bot/bot.module';
import { TemplateModule } from './template/template.module';
import { CampaignModule } from './campaign/campaign.module';
import { BroadcastLogModule } from './broadcast-log/broadcast-log.module';
import { LinkModule } from './link/link.module';
import { SystemModule } from './system/system.module';
import { BrandModule } from './brand/brand.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SubscriberModule } from './subscriber/subscriber.module';
import { SegmentModule } from './segment/segment.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ProfileModule } from './profile/profile.module';

function parseRedisConnection() {
  const baseOptions = {
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
  };
  if (process.env.REDIS_URL) {
    try {
      const url = new URL(process.env.REDIS_URL);
      return {
        ...baseOptions,
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        password: url.password ? decodeURIComponent(url.password) : undefined,
      };
    } catch (_) {}
  }
  return {
    ...baseOptions,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

@Module({
  imports: [
    BullModule.forRoot({
      connection: parseRedisConnection(),
    }),
    AuthModule,
    WebhookModule,
    BotModule,
    TemplateModule,
    CampaignModule,
    BroadcastLogModule,
    LinkModule,
    SystemModule,
    BrandModule,
    AnalyticsModule,
    SubscriberModule,
    SegmentModule,
    AuditLogModule,
    ProfileModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
