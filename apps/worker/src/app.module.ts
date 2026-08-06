import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaService } from './prisma.service';
import { WebhookProcessor } from './processors/webhook.processor';
import { DeliveryProcessor } from './processors/delivery.processor';
import { BulkImportProcessor } from './processors/bulk-import.processor';
import { RedisRateLimiterService } from './rate-limiter/redis-limiter.service';
import { EncryptionService } from '@tg-bot/shared';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
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
