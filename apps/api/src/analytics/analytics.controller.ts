import { Controller, Get, Query, Param, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('overview')
  async getOverviewMetrics(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.analyticsService.getOverviewMetrics(brandId, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-advanced')
  async getAdvancedDashboardMetrics(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.analyticsService.getAdvancedDashboardMetrics(brandId, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bot-report/:botId')
  async getBotReport(@Param('botId') botId: string, @Request() req?: any) {
    return this.analyticsService.getBotReport(botId, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export-csv')
  async exportAnalyticsCsv(@Res() res: Response, @Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    const csvContent = await this.analyticsService.generateAnalyticsCsv(brandId);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="analytics_report_${Date.now()}.csv"`);
    return res.send(csvContent);
  }
}
