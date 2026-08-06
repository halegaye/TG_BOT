import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { PrismaService } from '../prisma.service';
import { HashService } from '../auth/hash.service';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, HashService, PrismaService],
  exports: [ProfileService],
})
export class ProfileModule {}
