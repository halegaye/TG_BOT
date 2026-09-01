import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from './prisma.service';
import { WebhookProcessor } from './processors/webhook.processor';
import { DeliveryProcessor } from './processors/delivery.processor';
import { BulkImportProcessor } from './processors/bulk-import.processor';
import { RedisRateLimiterService } from './rate-limiter/redis-limiter.service';
import { EncryptionService } from '@tg-bot/shared';

function parseRedisConnection() {
  const baseOptions = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times: number) {
      return Math.min(times * 100, 3000);
    },
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
    BullModule.registerQueue(
      { name: 'telegram-webhook-events' },
      { name: 'telegram-send' },
      { name: 'bot-bulk-import' },
    ),
  ],
  providers: [
    PrismaService,
    WebhookProcessor,
    DeliveryProcessor,
    BulkImportProcessor,
    RedisRateLimiterService,
    EncryptionService,
  ],
})
export class AppModule {}
