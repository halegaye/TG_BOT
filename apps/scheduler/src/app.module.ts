import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { AnalyticsAggregationService } from './analytics-aggregation.service';
import { CampaignScheduleTaskService } from './campaign-schedule-task.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    PrismaService,
    AnalyticsAggregationService,
    CampaignScheduleTaskService,
  ],
})
export class AppModule {}
