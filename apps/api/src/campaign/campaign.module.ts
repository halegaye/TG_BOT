import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CampaignService } from './campaign.service';
import { CampaignController } from './campaign.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'telegram-send',
    }),
  ],
  controllers: [CampaignController],
  providers: [CampaignService, PrismaService],
  exports: [CampaignService],
})
export class CampaignModule {}
