import { Module } from '@nestjs/common';
import { SystemHealthService } from './system-health.service';
import { SystemHealthController } from './system-health.controller';
import { PrismaService } from '../prisma.service';

@Module({
  controllers: [SystemHealthController],
  providers: [SystemHealthService, PrismaService],
  exports: [SystemHealthService],
})
export class SystemModule {}
