import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { HashService } from '../auth/hash.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private hashService: HashService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prisma.panelUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        twoFactorEnabled: true,
        createdAt: true,
        memberships: { include: { brand: { select: { name: true } } } },
      },
    });

    if (!user) {
      throw new NotFoundException('Kullanıcı bulunamadı.');
    }
    return user;
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }) {
    return this.prisma.panelUser.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, username: true, firstName: true, lastName: true },
    });
  }

  async changePassword(userId: string, currentPass: string, newPass: string) {
    const user = await this.prisma.panelUser.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Kullanıcı bulunamadı.');

    const isValid = await this.hashService.verifyPassword(currentPass, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Mevcut şifreniz hatalı.');
    }

    const newHash = await this.hashService.hashPassword(newPass);
    await this.prisma.panelUser.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Şifreniz başarıyla güncellendi.' };
  }

  async toggle2FA(userId: string, enable: boolean) {
    await this.prisma.panelUser.update({
      where: { id: userId },
      data: { twoFactorEnabled: enable },
    });
    return { success: true, twoFactorEnabled: enable };
  }

  async getActiveSessions(userId: string) {
    let sessions = await this.prisma.panelUserSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (sessions.length === 0) {
      await this.prisma.panelUserSession.create({
        data: {
          userId,
          refreshToken: `ref_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      sessions = await this.prisma.panelUserSession.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    }

    return sessions.map((s, idx) => ({
      id: s.id,
      ipAddress: s.ipAddress || '127.0.0.1',
      userAgent: s.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      expiresAt: s.expiresAt.toISOString(),
      createdAt: s.createdAt.toISOString(),
      isCurrent: idx === 0,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    await this.prisma.panelUserSession.deleteMany({
      where: { id: sessionId, userId },
    });
    return { success: true, message: 'Oturum sonlandırıldı.' };
  }
}
