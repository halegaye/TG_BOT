import { Module } from '@nestjs/common';
import { SegmentService } from './segment.service';
import { SegmentController } from './segment.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SegmentController],
  providers: [SegmentService, PrismaService],
  exports: [SegmentService],
})
export class SegmentModule {}
