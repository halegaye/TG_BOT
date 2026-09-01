import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Role } from '@tg-bot/database';
import { EncryptionService } from '@tg-bot/shared';
import { syncBotProfileWithBrand, syncBotPhotoBuffer } from './bot-profile.helper';
import * as argon2 from 'argon2';

@Injectable()
export class BrandService {
  private encryptionService = new EncryptionService();

  constructor(private prisma: PrismaService) {}

  private checkBrandAccess(brandId: string, user?: any) {
    if (!user) return;
    const isSuperAdmin = user.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    if (isSuperAdmin) return;

    const hasMembership = user.memberships?.some((m: any) => m.brandId === brandId);
    if (!hasMembership) {
      throw new ForbiddenException('Bu markanın verilerine erişim veya işlem yapma yetkiniz yok.');
    }
  }

  async createBrand(data: {
    name: string;
    code: string;
    logoUrl?: string;
    brandColor?: string;
    timezone?: string;
    messageRateLimitPerSec?: number;
    monthlyDeliveryQuota?: number;
    botDescription?: string;
    botShortDescription?: string;
    botPhotoUrl?: string;
    defaultStartMessage?: string;
    defaultStartButtons?: any[];
    adminEmail?: string;
  }) {
    const existing = await this.prisma.brand.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictException(`'${data.code}' kodlu marka zaten mevcut!`);
    }

    const brand = await this.prisma.brand.create({
      data: {
        name: data.name,
        code: data.code.toLowerCase().trim(),
        logoUrl: data.logoUrl || null,
        brandColor: data.brandColor || '#0088cc',
        timezone: data.timezone || 'Europe/Belgrade',
        messageRateLimitPerSec: data.messageRateLimitPerSec || 30,
        monthlyDeliveryQuota: data.monthlyDeliveryQuota || 1000000,
        botDescription: data.botDescription || null,
        botShortDescription: data.botShortDescription || null,
        botPhotoUrl: data.botPhotoUrl || null,
        defaultStartMessage: data.defaultStartMessage || null,
        defaultStartButtons: data.defaultStartButtons ? (data.defaultStartButtons as any) : undefined,
      },
    });

    // Marka Yöneticisi (BRAND_ADMIN) Ataması
    if (data.adminEmail) {
      await this.addUserToBrand(brand.id, {
        email: data.adminEmail,
        password: 'BrandAdmin2026!',
        role: Role.BRAND_ADMIN,
        firstName: 'Brand',
        lastName: 'Admin',
      });
    }

    return brand;
  }

  async updateBrand(
    id: string,
    data: {
      name?: string;
      logoUrl?: string;
      brandColor?: string;
      timezone?: string;
      messageRateLimitPerSec?: number;
      monthlyDeliveryQuota?: number;
      botDescription?: string;
      botShortDescription?: string;
      botPhotoUrl?: string;
      defaultStartMessage?: string;
      defaultStartButtons?: any[];
      adminEmail?: string;
    },
    user?: any,
  ) {
    this.checkBrandAccess(id, user);

    const brand = await this.prisma.brand.findUnique({ where: { id } });
    if (!brand) throw new NotFoundException('Marka bulunamadı.');

    const updated = await this.prisma.brand.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.logoUrl !== undefined && { logoUrl: data.logoUrl }),
        ...(data.brandColor !== undefined && { brandColor: data.brandColor }),
        ...(data.timezone !== undefined && { timezone: data.timezone }),
        ...(data.messageRateLimitPerSec !== undefined && {
          messageRateLimitPerSec: data.messageRateLimitPerSec,
        }),
        ...(data.monthlyDeliveryQuota !== undefined && {
          monthlyDeliveryQuota: data.monthlyDeliveryQuota,
        }),
        ...(data.botDescription !== undefined && { botDescription: data.botDescription }),
        ...(data.botShortDescription !== undefined && { botShortDescription: data.botShortDescription }),
        ...(data.botPhotoUrl !== undefined && { botPhotoUrl: data.botPhotoUrl }),
        ...(data.defaultStartMessage !== undefined && { defaultStartMessage: data.defaultStartMessage }),
        ...(data.defaultStartButtons !== undefined && { defaultStartButtons: data.defaultStartButtons as any }),
      },
    });

    if (data.adminEmail) {
      await this.addUserToBrand(
        id,
        {
          email: data.adminEmail,
          password: 'BrandAdmin2026!',
          role: Role.BRAND_ADMIN,
          firstName: 'Brand',
          lastName: 'Admin',
        },
        user,
      );
    }

    // Markaya bağlı tüm botların profil açıklamasını ve profil fotoğrafını Telegram API ile otomatik senkronize et
    this.syncBrandBotProfiles(id, user).catch((err) => {
      console.warn(`[Auto Sync Bot Profiles Warning] Marka [${id}] bot profilleri güncellenirken hata: ${err.message}`);
    });

    return updated;
  }

  async syncBrandBotProfiles(brandId: string, user?: any) {
    this.checkBrandAccess(brandId, user);

    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new NotFoundException('Marka bulunamadı.');

    const activeBots = await this.prisma.telegramBot.findMany({
      where: { brandId },
    });

    let syncedCount = 0;
    for (const bot of activeBots) {
      try {
        const rawToken = this.encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
        await syncBotProfileWithBrand(rawToken, {
          botDescription: brand.botDescription,
        });
        syncedCount++;
      } catch (err: any) {
        console.warn(`[Sync Bot Profile Error] Bot @${bot.username} profili senkronize edilemedi: ${err.message}`);
      }
    }

    return {
      success: true,
      syncedCount,
      message: `${syncedCount} adet botun açıklamaları ve profil fotoğrafı Telegram'a başarıyla senkronize edildi.`,
    };
  }

  /**
   * Multipart olarak gelen fotoğraf buffer'ını Telegram'a doğrudan gönderir.
   * JSON body size limitini tamamen bypass eder.
   */
  async uploadAndSyncBotPhoto(brandId: string, photoBuffer: Buffer, mime: string, user?: any) {
    this.checkBrandAccess(brandId, user);

    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new NotFoundException('Marka bulunamadı.');

    const activeBots = await this.prisma.telegramBot.findMany({ where: { brandId } });
    if (activeBots.length === 0) {
      return { success: true, syncedCount: 0, message: 'Bu markaya ait bot bulunamadı.' };
    }

    // Base64 olarak DB'ye kaydet (sonraki sync'lerde de kullanılsın)
    const base64DataUri = `data:${mime};base64,${photoBuffer.toString('base64')}`;
    await this.prisma.brand.update({
      where: { id: brandId },
      data: { botPhotoUrl: base64DataUri },
    });

    let syncedCount = 0;
    const errors: string[] = [];

    for (const bot of activeBots) {
      try {
        const rawToken = this.encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
        await syncBotPhotoBuffer(rawToken, photoBuffer, mime);
        syncedCount++;
      } catch (err: any) {
        errors.push(`@${bot.username}: ${err.message}`);
        console.warn(`[Upload Bot Photo Error] Bot @${bot.username}: ${err.message}`);
      }
    }

    return {
      success: syncedCount > 0,
      syncedCount,
      message: syncedCount > 0
        ? `${syncedCount} botun profil fotoğrafı başarıyla güncellendi.`
        : `Fotoğraf güncellenemedi: ${errors.join(', ')}`,
    };
  }

  async addUserToBrand(
    brandId: string,
    data: {
      email: string;
      username?: string;
      password: string;
      role?: Role;
      firstName?: string;
      lastName?: string;
    },
    user?: any,
  ) {
    this.checkBrandAccess(brandId, user);

    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    // Güvenlik Koruması: Marka yöneticileri Süper Admin veya Sistem Admin atayamaz!
    if (user && !isSuperAdmin && (data.role === Role.SUPER_ADMIN || data.role === Role.SYSTEM_ADMIN)) {
      throw new ForbiddenException('Marka yöneticileri Süper Admin veya Sistem Admin rolü veremez.');
    }

    const brand = await this.prisma.brand.findUnique({ where: { id: brandId } });
    if (!brand) throw new NotFoundException('Marka bulunamadı.');

    if (!data.email || !data.password) {
      throw new BadRequestException('E-posta ve şifre zorunludur.');
    }

    const passwordHash = await argon2.hash(data.password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 4,
    });

    const username = data.username || data.email.split('@')[0] + '_' + Math.floor(Math.random() * 1000);

    const panelUser = await this.prisma.panelUser.upsert({
      where: { email: data.email },
      update: {
        passwordHash,
        isActive: true,
      },
      create: {
        email: data.email,
        username,
        firstName: data.firstName || 'Panel',
        lastName: data.lastName || 'User',
        passwordHash,
        isActive: true,
      },
    });

    const membership = await this.prisma.brandMembership.upsert({
      where: {
        brandId_userId: {
          brandId,
          userId: panelUser.id,
        },
      },
      update: { role: data.role || Role.EDITOR },
      create: {
        brandId,
        userId: panelUser.id,
        role: data.role || Role.EDITOR,
      },
    });

    return {
      membershipId: membership.id,
      brandId,
      userId: panelUser.id,
      email: panelUser.email,
      username: panelUser.username,
      role: membership.role,
      createdAt: membership.createdAt,
    };
  }

  async getBrandUsers(brandId: string, user?: any) {
    this.checkBrandAccess(brandId, user);

    const memberships = await this.prisma.brandMembership.findMany({
      where: { brandId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
            isActive: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      brandId: m.brandId,
      userId: m.user.id,
      email: m.user.email,
      username: m.user.username,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      role: m.role,
      isActive: m.user.isActive,
      createdAt: m.createdAt,
    }));
  }

  async updateBrandUser(
    brandId: string,
    targetUserId: string,
    data: {
      role?: Role;
      firstName?: string;
      lastName?: string;
      password?: string;
      isActive?: boolean;
    },
    user?: any,
  ) {
    this.checkBrandAccess(brandId, user);

    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    // Güvenlik Koruması: Marka yöneticisi Süper Admin veya Sistem Admin rolü veremez
    if (user && !isSuperAdmin && (data.role === Role.SUPER_ADMIN || data.role === Role.SYSTEM_ADMIN)) {
      throw new ForbiddenException('Marka yöneticileri Süper Admin veya Sistem Admin rolü atayamaz.');
    }

    // Hedef kullanıcının Süper Admin olup olmadığını kontrol et
    const targetUserMemberships = await this.prisma.brandMembership.findMany({
      where: { userId: targetUserId },
    });
    const targetIsSuperAdmin = targetUserMemberships.some(
      (m) => m.role === Role.SUPER_ADMIN || m.role === Role.SYSTEM_ADMIN,
    );

    if (targetIsSuperAdmin && !isSuperAdmin) {
      throw new ForbiddenException('Marka yöneticileri Süper Admin hesaplarını güncelleyemez.');
    }

    // Rol Güncellemesi
    if (data.role) {
      await this.prisma.brandMembership.updateMany({
        where: { brandId, userId: targetUserId },
        data: { role: data.role },
      });
    }

    // Kullanıcı Detay Güncellemesi
    const userUpdateData: any = {};
    if (data.firstName !== undefined) userUpdateData.firstName = data.firstName;
    if (data.lastName !== undefined) userUpdateData.lastName = data.lastName;
    if (data.isActive !== undefined) userUpdateData.isActive = data.isActive;
    if (data.password && data.password.trim()) {
      userUpdateData.passwordHash = await argon2.hash(data.password, {
        type: argon2.argon2id,
        memoryCost: 2 ** 16,
        timeCost: 3,
        parallelism: 4,
      });
    }

    if (Object.keys(userUpdateData).length > 0) {
      await this.prisma.panelUser.update({
        where: { id: targetUserId },
        data: userUpdateData,
      });
    }

    return { success: true, message: 'Kullanıcı bilgileri güncellendi.' };
  }

  async removeUserFromBrand(brandId: string, targetUserId: string, user?: any) {
    this.checkBrandAccess(brandId, user);

    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    // Hedef kullanıcının Süper Admin olup olmadığını kontrol et
    const targetUserMemberships = await this.prisma.brandMembership.findMany({
      where: { userId: targetUserId },
    });
    const targetIsSuperAdmin = targetUserMemberships.some(
      (m) => m.role === Role.SUPER_ADMIN || m.role === Role.SYSTEM_ADMIN,
    );

    if (targetIsSuperAdmin && !isSuperAdmin) {
      throw new ForbiddenException('Marka yöneticileri Süper Admin hesaplarını markadan çıkaramaz.');
    }

    await this.prisma.brandMembership.deleteMany({
      where: { brandId, userId: targetUserId },
    });

    return { success: true, message: 'Kullanıcı markadan çıkarıldı.' };
  }

  async getAllBrands(user?: any) {
    let where: any = {};
    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    if (user && !isSuperAdmin) {
      const allowedBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      where = { id: { in: allowedBrandIds } };
    }

    return this.prisma.brand.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        memberships: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: {
            bots: true,
            campaigns: true,
            memberships: true,
          },
        },
      },
    });
  }

  async getBrandById(id: string, user?: any) {
    this.checkBrandAccess(id, user);

    const brand = await this.prisma.brand.findUnique({
      where: { id },
      include: {
        bots: true,
        memberships: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
        _count: {
          select: {
            bots: true,
            campaigns: true,
          },
        },
      },
    });

    if (!brand) {
      throw new NotFoundException('Marka bulunamadı.');
    }

    return brand;
  }
}
