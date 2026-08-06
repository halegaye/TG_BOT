import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BotService } from './bot.service';
import { BotHealthService } from './bot-health.service';
import { BotController } from './bot.controller';
import { EncryptionService } from '../common/encryption.service';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'bot-bulk-import',
    }),
  ],
  controllers: [BotController],
  providers: [BotService, BotHealthService, EncryptionService, PrismaService],
  exports: [BotService, BotHealthService, EncryptionService],
})
export class BotModule {}
