import { Injectable, UnauthorizedException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@tg-bot/database';
import { HashService } from './hash.service';
import { TwoFactorService } from './two-factor.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private prisma: PrismaClient;

  constructor(
    private hashService: HashService,
    private twoFactorService: TwoFactorService,
    private mailService: MailService,
    private jwtService: JwtService,
  ) {
    this.prisma = new PrismaClient();
  }

  async validateUser(identifier: string, pass: string) {
    const user = await this.prisma.panelUser.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('E-posta/kullanıcı adı veya şifre hatalı.');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException('Hesabınız geçici olarak kilitlenmiştir. Lütfen daha sonra tekrar deneyin.');
    }

    const isValid = await this.hashService.verifyPassword(pass, user.passwordHash);

    if (!isValid) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil = attempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.panelUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: attempts,
          lockedUntil,
        },
      });

      throw new UnauthorizedException('E-posta/kullanıcı adı veya şifre hatalı.');
    }

    await this.prisma.panelUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    return user;
  }

  async login(loginDto: { identifier: string; password: string; twoFactorCode?: string; ipAddress?: string; userAgent?: string }) {
    const user = await this.validateUser(loginDto.identifier, loginDto.password);

    if (user.twoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return {
          requiresTwoFactor: true,
          message: 'Lütfen 2FA doğrulama kodunu girin.',
        };
      }

      const isTwoFactorValid = this.twoFactorService.verifyToken(
        loginDto.twoFactorCode,
        user.twoFactorSecret || '',
      );

      if (!isTwoFactorValid) {
        throw new UnauthorizedException('Geçersiz 2FA doğrulama kodu.');
      }
    }

    const ipAddress = loginDto.ipAddress || '127.0.0.1';
    const userAgent = loginDto.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';

    // Record session into PanelUserSession table
    const refreshToken = `ref_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await this.prisma.panelUserSession.create({
      data: {
        userId: user.id,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Record login into AuditLog table
    await this.prisma.auditLog.create({
      data: {
        brandId: user.memberships?.[0]?.brandId || null,
        userId: user.id,
        action: 'USER_LOGIN',
        resourceType: 'PanelUser',
        resourceId: user.id,
        payloadAfter: JSON.stringify({
          email: user.email,
          username: user.username,
          ipAddress,
          loginTime: new Date().toISOString(),
        }),
        ipAddress,
        userAgent,
      },
    });

    const payload = { sub: user.id, email: user.email, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      access_token: accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        isTwoFactorEnabled: user.twoFactorEnabled,
        memberships: user.memberships,
      },
    };
  }

  async setupTwoFactor(userId: string) {
    const user = await this.prisma.panelUser.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Kullanıcı bulunamadı.');

    const { secret, otpauthUrl } = this.twoFactorService.generateSecret(user.email);
    const qrCodeDataUrl = await this.twoFactorService.generateQrCodeDataUrl(otpauthUrl);

    await this.prisma.panelUser.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { secret, qrCodeDataUrl };
  }

  async verifyAndEnableTwoFactor(userId: string, code: string) {
    const user = await this.prisma.panelUser.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      throw new BadRequestException('2FA kurulumu başlatılmamış.');
    }

    const isValid = this.twoFactorService.verifyToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new BadRequestException('Geçersiz doğrulama kodu.');
    }

    await this.prisma.panelUser.update({
      where: { id: userId },
      data: { twoFactorEnabled: true },
    });

    return { message: '2FA başarıyla aktifleştirildi.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.panelUser.findUnique({ where: { email } });
    if (!user) {
      return { success: true, message: 'Şifre sıfırlama yönergeleri e-posta adresinize iletildi.' };
    }

    const resetToken = `rst_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const resetLink = `http://localhost:3000/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await this.mailService.sendPasswordResetEmail(email, resetLink);

    return {
      success: true,
      message: 'Şifre sıfırlama bağlantısı e-posta adresinize iletildi.',
      resetLink,
      email,
    };
  }

  async checkReset2FA(email?: string, token?: string) {
    let user;
    if (email) {
      user = await this.prisma.panelUser.findUnique({ where: { email } });
    } else {
      user = await this.prisma.panelUser.findFirst();
    }
    return {
      requiresTwoFactor: user ? user.twoFactorEnabled : false,
      email: user?.email,
    };
  }

  async resetPassword(newPass: string, token?: string, email?: string, twoFactorCode?: string) {
    if (!newPass || newPass.length < 8) {
      throw new BadRequestException('Şifre en az 8 karakter olmalıdır.');
    }

    let user;
    if (email) {
      user = await this.prisma.panelUser.findUnique({ where: { email } });
    } else {
      user = await this.prisma.panelUser.findFirst();
    }

    if (!user) {
      throw new BadRequestException('Geçersiz veya süresi dolmuş sıfırlama talebi.');
    }

    if (user.twoFactorEnabled) {
      if (!twoFactorCode) {
        throw new BadRequestException('Bu hesapta 2FA aktiftir. Lütfen Google Authenticator 6 haneli doğrulama kodunuzu giriniz.');
      }
      const is2FAValid = this.twoFactorService.verifyToken(twoFactorCode, user.twoFactorSecret || '');
      if (!is2FAValid) {
        throw new BadRequestException('Geçersiz 2FA kodu. Lütfen Authenticator uygulamanızdaki anlık 6 haneli kodu giriniz.');
      }
    }

    const newHash = await this.hashService.hashPassword(newPass);
    await this.prisma.panelUser.update({
      where: { id: user.id },
      data: { passwordHash: newHash, failedLoginAttempts: 0, lockedUntil: null },
    });

    return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
  }
}
