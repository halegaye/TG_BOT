import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LinkService } from './link.service';
import { LinkController } from './link.controller';
import { PrismaService } from '../prisma.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'analytics-events',
    }),
  ],
  controllers: [LinkController],
  providers: [LinkService, PrismaService],
  exports: [LinkService],
})
export class LinkModule {}
