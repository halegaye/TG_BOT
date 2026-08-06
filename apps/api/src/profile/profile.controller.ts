import { Controller, Get, Patch, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getProfile(@Request() req: any) {
    return this.profileService.getProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateProfile(@Request() req: any, @Body() body: { firstName?: string; lastName?: string; email?: string }) {
    return this.profileService.updateProfile(req.user.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Request() req: any, @Body() body: { currentPass: string; newPass: string }) {
    return this.profileService.changePassword(req.user.id, body.currentPass, body.newPass);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/toggle')
  async toggle2FA(@Request() req: any, @Body() body: { enable: boolean }) {
    return this.profileService.toggle2FA(req.user.id, body.enable);
  }

  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  async getActiveSessions(@Request() req: any) {
    return this.profileService.getActiveSessions(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('sessions/:id')
  async revokeSession(@Request() req: any, @Param('id') sessionId: string) {
    return this.profileService.revokeSession(req.user.id, sessionId);
  }
}
