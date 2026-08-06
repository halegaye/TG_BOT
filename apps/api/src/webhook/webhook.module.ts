import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WebhookController } from './webhook.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'telegram-webhook-events',
    }),
  ],
  controllers: [WebhookController],
  providers: [PrismaService],
})
export class WebhookModule {}
