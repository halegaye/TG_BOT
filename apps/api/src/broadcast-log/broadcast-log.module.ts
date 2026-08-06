import { Module } from '@nestjs/common';
import { BroadcastLogService } from './broadcast-log.service';
import { BroadcastLogController } from './broadcast-log.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [BroadcastLogController],
  providers: [BroadcastLogService, PrismaService],
  exports: [BroadcastLogService],
})
export class BroadcastLogModule {}
