import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { TemplateService } from './template.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@tg-bot/database';
import { InlineButtonDto } from '@tg-bot/shared';

@Controller('api/v1/templates')
export class TemplateController {
  constructor(private templateService: TemplateService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllTemplates(
    @Query('brandId') queryBrandId?: string,
    @Query('activeOnly') activeOnly?: string,
    @Request() req?: any,
  ) {
    const brandId = queryBrandId || req?.validatedBrandId;
    const isActiveOnly = activeOnly === 'true';
    return this.templateService.getAllTemplates(brandId, isActiveOnly, req?.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getTemplateById(@Param('id') id: string, @Request() req?: any) {
    return this.templateService.getTemplateById(id, req?.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Post()
  async createTemplate(
    @Request() req: any,
    @Body()
    body: {
      brandId?: string;
      name: string;
      description?: string;
      content: string;
      parseMode?: 'HTML' | 'MARKDOWN_V2';
      mediaType?: 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
      mediaUrl?: string;
      buttons?: InlineButtonDto[];
      variables?: string[];
      isActive?: boolean;
    },
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    return this.templateService.createTemplate(brandId, body, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Patch(':id')
  async updateTemplate(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      description?: string;
      content?: string;
      parseMode?: 'HTML' | 'MARKDOWN_V2';
      mediaType?: 'NONE' | 'PHOTO' | 'VIDEO' | 'DOCUMENT';
      mediaUrl?: string;
      buttons?: InlineButtonDto[];
      variables?: string[];
      isActive?: boolean;
    },
  ) {
    return this.templateService.updateTemplate(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Post(':id/approve')
  async approveTemplate(@Request() req: any, @Param('id') id: string) {
    return this.templateService.approveTemplate(id, req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Post(':id/reject')
  async rejectTemplate(@Request() req: any, @Param('id') id: string, @Body('reason') reason: string) {
    return this.templateService.rejectTemplate(id, reason || 'Gerekçe belirtilmedi', req.user?.id);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER)
  @Delete(':id')
  async deleteTemplate(@Request() req: any, @Param('id') id: string) {
    return this.templateService.deleteTemplate(id, req.user?.id);
  }
}
