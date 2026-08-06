import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RbacGuard } from './guards/rbac.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '@tg-bot/database';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(
    @Request() req: any,
    @Body() body: { identifier?: string; email?: string; username?: string; password: string; twoFactorCode?: string },
  ) {
    const identifier = body.identifier || body.email || body.username || '';
    const rawIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const ipAddress = Array.isArray(rawIp) ? rawIp[0] : String(rawIp).split(',')[0].trim();
    const userAgent = req.headers['user-agent'] || 'Unknown Browser / Device';

    return this.authService.login({
      identifier,
      password: body.password,
      twoFactorCode: body.twoFactorCode,
      ipAddress,
      userAgent,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/setup')
  async setupTwoFactor(@Request() req: any) {
    return this.authService.setupTwoFactor(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async verifyTwoFactor(@Request() req: any, @Body() body: { code: string }) {
    return this.authService.verifyAndEnableTwoFactor(req.user.id, body.code);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('check-reset-2fa')
  async checkReset2FA(@Body() body: { email?: string; token?: string }) {
    return this.authService.checkReset2FA(body.email, body.token);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { password: string; newPass?: string; token?: string; email?: string; twoFactorCode?: string }) {
    const passwordToUse = body.password || body.newPass || '';
    return this.authService.resetPassword(passwordToUse, body.token, body.email, body.twoFactorCode);
  }

  @UseGuards(JwtAuthGuard, RbacGuard)
  @Roles(Role.BRAND_ADMIN, Role.EDITOR)
  @Get('brand-test')
  async testBrandAccess(@Request() req: any) {
    return {
      message: 'Marka erişimi doğrulandı!',
      validatedBrandId: req.validatedBrandId,
      user: req.user.username,
    };
  }
}
