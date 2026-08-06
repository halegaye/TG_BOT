import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { BrandService } from './brand.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@tg-bot/database';

@Controller('api/v1/brands')
export class BrandController {
  constructor(private brandService: BrandService) {}

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN)
  @Post()
  async createBrand(
    @Body()
    body: {
      name: string;
      code: string;
      logoUrl?: string;
      brandColor?: string;
      timezone?: string;
      messageRateLimitPerSec?: number;
      monthlyDeliveryQuota?: number;
      adminEmail?: string;
    },
  ) {
    return this.brandService.createBrand(body);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN, Role.BRAND_ADMIN)
  @Patch(':id')
  async updateBrand(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      logoUrl?: string;
      brandColor?: string;
      timezone?: string;
      messageRateLimitPerSec?: number;
      monthlyDeliveryQuota?: number;
      adminEmail?: string;
    },
  ) {
    return this.brandService.updateBrand(id, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN, Role.BRAND_ADMIN)
  @Post(':id/users')
  async addUserToBrand(
    @Request() req: any,
    @Param('id') brandId: string,
    @Body()
    body: {
      email: string;
      username?: string;
      password: string;
      role?: Role;
      firstName?: string;
      lastName?: string;
    },
  ) {
    return this.brandService.addUserToBrand(brandId, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN, Role.BRAND_ADMIN, Role.CAMPAIGN_MANAGER, Role.EDITOR, Role.ANALYST, Role.VIEW_ONLY)
  @Get(':id/users')
  async getBrandUsers(@Request() req: any, @Param('id') brandId: string) {
    return this.brandService.getBrandUsers(brandId, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN, Role.BRAND_ADMIN)
  @Patch(':id/users/:userId')
  async updateBrandUser(
    @Request() req: any,
    @Param('id') brandId: string,
    @Param('userId') userId: string,
    @Body()
    body: {
      role?: Role;
      firstName?: string;
      lastName?: string;
      password?: string;
      isActive?: boolean;
    },
  ) {
    return this.brandService.updateBrandUser(brandId, userId, body, req.user);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.SYSTEM_ADMIN, Role.BRAND_ADMIN)
  @Delete(':id/users/:userId')
  async removeUserFromBrand(
    @Request() req: any,
    @Param('id') brandId: string,
    @Param('userId') userId: string,
  ) {
    return this.brandService.removeUserFromBrand(brandId, userId, req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllBrands(@Request() req: any) {
    return this.brandService.getAllBrands(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getBrandById(@Request() req: any, @Param('id') id: string) {
    return this.brandService.getBrandById(id, req.user);
  }
}
