import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request, Res } from '@nestjs/common';
import { Response } from 'express';
import { BotService } from './bot.service';
import { BotHealthService } from './bot-health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, BotStatus } from '@tg-bot/database';
import { InlineButtonDto } from '@tg-bot/shared';

@Controller('api/v1/bots')
export class BotController {
  constructor(
    private botService: BotService,
    private botHealthService: BotHealthService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('health-center')
  async getHealthCenterOverview(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.botHealthService.getHealthCenterOverview(brandId, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllBots(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.botService.getAllBots(brandId, req?.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.SYSTEM_ADMIN)
  @Post('bulk-import')
  async queueBulkImport(
    @Request() req: any,
    @Body() body: { brandId?: string; csvContent?: string; items?: any[] },
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    let csvContent = body.csvContent;

    if (!csvContent && Array.isArray(body.items)) {
      csvContent = body.items.map((i) => `${i.token},${i.displayName || ''}`).join('\n');
    }

    return this.botService.queueBulkImport(brandId, csvContent || '', req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bulk-import/:importId/status')
  async getBulkImportStatus(@Param('importId') importId: string) {
    return this.botService.getBulkImportStatus(importId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('bulk-import/:importId/cancel')
  async cancelBulkImport(@Param('importId') importId: string) {
    return this.botService.cancelBulkImport(importId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('bulk-import/:importId/failed-csv')
  async getBulkImportFailedCsv(@Param('importId') importId: string, @Res() res: Response) {
    const csvData = await this.botService.getBulkImportFailedCsv(importId);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="hatali_bot_satirlari_${importId.slice(0, 8)}.csv"`);
    return res.send(csvData);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/health-report')
  async getBotHealthReport(@Param('id') botId: string) {
    return this.botHealthService.runHealthCheckForBot(botId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/diagnose')
  async triggerBotDiagnose(@Param('id') botId: string) {
    return this.botHealthService.runHealthCheckForBot(botId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getBotById(@Param('id') botId: string, @Request() req?: any) {
    return this.botService.getBotById(botId, req?.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.SYSTEM_ADMIN)
  @Post('register')
  async registerBot(
    @Request() req: any,
    @Body()
    body: {
      token: string;
      displayName?: string;
      brandId?: string;
      startMessage?: string;
      startParseMode?: string;
      buttons?: InlineButtonDto[];
      disableNotification?: boolean;
      description?: string;
      tags?: string[];
      status?: BotStatus;
    },
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    const { token, displayName, ...extra } = body;
    return this.botService.registerBot(brandId, token, displayName, extra);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.SYSTEM_ADMIN)
  @Post()
  async registerBotAlias(
    @Request() req: any,
    @Body()
    body: {
      token: string;
      displayName?: string;
      brandId?: string;
      startMessage?: string;
      startParseMode?: string;
      buttons?: InlineButtonDto[];
      disableNotification?: boolean;
      description?: string;
      tags?: string[];
      status?: BotStatus;
    },
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    const { token, displayName, ...extra } = body;
    return this.botService.registerBot(brandId, token, displayName, extra);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async updateBot(
    @Request() req: any,
    @Param('id') botId: string,
    @Body()
    body: {
      token?: string;
      displayName?: string;
      brandId?: string;
      status?: BotStatus;
      startMessage?: string;
      startParseMode?: 'HTML' | 'MARKDOWN_V2';
      buttons?: InlineButtonDto[];
      disableNotification?: boolean;
      description?: string;
      tags?: string[];
    },
  ) {
    return this.botService.updateBot(botId, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Patch(':id/start-message')
  async updateStartMessage(
    @Request() req: any,
    @Param('id') botId: string,
    @Body()
    body: {
      startMessage?: string;
      startParseMode?: 'HTML' | 'MARKDOWN_V2';
      buttons?: InlineButtonDto[];
    },
  ) {
    const isSuperAdmin = req.user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    const brandId = req.validatedBrandId;
    return this.botService.updateStartMessage(botId, brandId, body, isSuperAdmin);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Delete(':id')
  async deleteBot(@Request() req: any, @Param('id') botId: string) {
    return this.botService.deleteBot(botId, req.user);
  }
}
