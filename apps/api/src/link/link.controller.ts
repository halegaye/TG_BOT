import { Controller, Get, Post, Param, Body, Res, Req, UseGuards, Query, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { LinkService } from './link.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@tg-bot/database';

@Controller()
export class LinkController {
  constructor(private linkService: LinkService) {}

  // Takipli Link Yönlendirme Endpoint'i (Public)
  @Get('r/:shortCode')
  async handleRedirect(
    @Param('shortCode') shortCode: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const targetUrl = await this.linkService.processRedirect(shortCode, ipAddress, userAgent);
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, targetUrl);
  }

  // Tüm Kısa Linkleri Listeleme Endpoint'i (Korumalı)
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR, Role.ANALYST, Role.VIEW_ONLY)
  @Get('api/v1/links')
  async getLinks(@Query('brandId') brandId?: string) {
    return this.linkService.getShortLinks(brandId);
  }

  // Yeni Kısa Link Üretme Endpoint'i (Korumalı)
  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR)
  @Post('api/v1/links')
  async createLink(
    @Req() req: any,
    @Body() body: { botId?: string; targetUrl: string },
  ) {
    const brandId = req.validatedBrandId || req.user?.brandId;
    return this.linkService.createShortLink(brandId, body.botId, body.targetUrl);
  }
}
