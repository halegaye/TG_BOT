import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { EmergencyStopService } from './emergency-stop.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../auth/guards/rbac.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@tg-bot/database';

@Controller('api/v1/system/emergency-stop')
export class EmergencyStopController {
  constructor(private emergencyStopService: EmergencyStopService) {}

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Post()
  async triggerStop(
    @Req() req: any,
    @Body() body: { confirmationText: string; isGlobal?: boolean },
  ) {
    const brandId = body.isGlobal ? undefined : req.validatedBrandId;
    return this.emergencyStopService.triggerEmergencyStop(brandId, body.confirmationText);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.SUPER_ADMIN, Role.BRAND_ADMIN)
  @Post('resume')
  async resumeSystem(
    @Req() req: any,
    @Body() body: { isGlobal?: boolean },
  ) {
    const brandId = body.isGlobal ? undefined : req.validatedBrandId;
    return this.emergencyStopService.resumeSystem(brandId);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Get('status')
  async getStatus(@Req() req: any) {
    const brandId = req.validatedBrandId;
    const isStopped = await this.emergencyStopService.isStopped(brandId);
    return { isStopped };
  }
}
