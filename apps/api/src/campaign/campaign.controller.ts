import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, CampaignStatus } from '@tg-bot/database';
import { InlineButtonDto } from '@tg-bot/shared';

@Controller('api/v1/campaigns')
export class CampaignController {
  constructor(private campaignService: CampaignService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllCampaigns(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.campaignService.getAllCampaigns(brandId, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('ab-test-report')
  async getABTestReport(@Query('brandId') queryBrandId?: string, @Query('campaignId') campaignId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.campaignService.getABTestReport(brandId, campaignId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getCampaignById(@Param('id') id: string, @Request() req?: any) {
    return this.campaignService.getCampaignById(id, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/results')
  async getCampaignResults(@Param('id') id: string, @Request() req?: any) {
    return this.campaignService.getCampaignResults(id, req?.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Post()
  async createCampaign(@Request() req: any, @Body() body: any) {
    const brandId = body.brandId || req.validatedBrandId;
    return this.campaignService.createCampaign(brandId, body, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Patch(':id')
  async updateCampaign(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.campaignService.updateCampaign(id, body, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('preview')
  async previewCampaign(
    @Body() body: { campaignId?: string; templateId?: string; customText?: string },
  ) {
    return this.campaignService.previewCampaign(body.campaignId, body.templateId, body.customText);
  }

  @UseGuards(JwtAuthGuard)
  @Post('estimate-audience')
  async estimateAudience(
    @Request() req: any,
    @Body() body: { brandId?: string; targetBotIds?: string[]; excludedBotIds?: string[] },
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    return this.campaignService.estimateAudience(brandId, body.targetBotIds, body.excludedBotIds);
  }

  @UseGuards(JwtAuthGuard)
  @Post('preview-next-runs')
  async previewNextRuns(@Request() req: any, @Body() body: any) {
    const brandId = body.brandId || req.validatedBrandId;
    return this.campaignService.previewNextRuns(body, brandId);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/test-send')
  async testSendCampaign(
    @Request() req: any,
    @Param('id') id: string,
    @Body('testTelegramUserId') testTelegramUserId: string,
  ) {
    return this.campaignService.testSendCampaign(id, testTelegramUserId, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Post(':id/submit-approval')
  async submitForApproval(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.submitForApproval(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Post(':id/approve')
  async approveCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.approveCampaign(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Post(':id/reject')
  async rejectCampaign(@Request() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.campaignService.rejectCampaign(id, reason || 'Gerekçe belirtilmedi', req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/schedule')
  async scheduleCampaign(@Request() req: any, @Param('id') id: string, @Body('scheduledAt') scheduledAt: string) {
    return this.campaignService.scheduleCampaign(id, scheduledAt, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/dispatch')
  async dispatchCampaign(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    const isSuperAdmin = req.user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    return this.campaignService.dispatchCampaign(brandId, id, body, isSuperAdmin, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/pause')
  async pauseCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.pauseCampaign(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/resume')
  async resumeCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.resumeCampaign(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/cancel')
  async cancelCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.cancelCampaign(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/duplicate')
  async duplicateCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.duplicateCampaign(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Post(':id/archive')
  async archiveCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.archiveCampaign(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Delete(':id')
  async deleteCampaign(@Request() req: any, @Param('id') id: string) {
    return this.campaignService.deleteCampaign(id, req.user?.id);
  }
}
