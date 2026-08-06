import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { InlineButtonDto, validateInlineButtonUrl } from '@tg-bot/shared';
import { Role } from '@tg-bot/database';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(private prisma: PrismaService) {}

  async getAllTemplates(brandId?: string, isActiveOnly: boolean = false, user?: any) {
    const where: any = {};
    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );

    if (user && !isSuperAdmin) {
      const userBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      if (brandId) {
        if (!userBrandIds.includes(brandId)) {
          throw new ForbiddenException('Bu markanın şablonlarını görüntüleme yetkiniz yok.');
        }
        where.brandId = brandId;
      } else {
        where.brandId = { in: userBrandIds };
      }
    } else if (brandId) {
      where.brandId = brandId;
    }

    if (isActiveOnly) where.isActive = true;

    const templates = await this.prisma.messageTemplate.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        brand: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    return templates.map((t) => ({
      ...t,
      buttons: t.buttonsJson,
      hasFileId: !!t.telegramFileId,
    }));
  }

  async getTemplateById(id: string, user?: any) {
    const template = await this.prisma.messageTemplate.findUnique({
      where: { id },
      include: {
        brand: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Mesaj şablonu bulunamadı (ID: ${id}).`);
    }

    const isSuperAdmin = user?.memberships?.some(
      (m: any) => m.role === Role.SUPER_ADMIN || m.role === 'SUPER_ADMIN',
    );
    if (user && !isSuperAdmin) {
      const userBrandIds = user.memberships?.map((m: any) => m.brandId) || [];
      if (!userBrandIds.includes(template.brandId)) {
        throw new ForbiddenException('Bu şablonun verilerini görüntüleme yetkiniz yok.');
      }
    }

    return {
      ...template,
      buttons: template.buttonsJson,
      hasFileId: !!template.telegramFileId,
    };
  }

  async createTemplate(
    brandId: string,
    dto: {
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
    userId?: string,
  ) {
    if (!brandId) {
      throw new BadRequestException('Marka ID zorunludur.');
    }
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('Şablon adı zorunludur.');
    }
    if (!dto.content || !dto.content.trim()) {
      throw new BadRequestException('Mesaj metni içeriği zorunludur.');
    }

    if (dto.buttons && Array.isArray(dto.buttons)) {
      for (const btn of dto.buttons) {
        if (!validateInlineButtonUrl(btn.url)) {
          throw new BadRequestException(`Geçersiz buton URL'si (${btn.url}).`);
        }
      }
    }

    const template = await this.prisma.messageTemplate.create({
      data: {
        brandId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        content: dto.content,
        parseMode: dto.parseMode || 'HTML',
        mediaType: dto.mediaType || 'NONE',
        mediaUrl: dto.mediaUrl?.trim() || null,
        buttonsJson: (dto.buttons as any) || null,
        variables: dto.variables && dto.variables.length > 0 ? dto.variables : ['first_name', 'username', 'bot_name', 'brand_name'],
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        createdByUserId: userId || null,
        approvalStatus: 'APPROVED', // Varsayılan olarak direkt onaylı oluşturulur
      },
    });

    await this.prisma.auditLog.create({
      data: {
        brandId,
        userId: userId || null,
        action: 'TEMPLATE_CREATED',
        resourceType: 'MessageTemplate',
        resourceId: template.id,
        payloadAfter: JSON.stringify({ name: template.name, mediaType: template.mediaType }),
      },
    });

    return this.getTemplateById(template.id);
  }

  async updateTemplate(
    id: string,
    dto: {
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
    user?: any,
  ) {
    const existing = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Mesaj şablonu bulunamadı (ID: ${id}).`);
    }

    const dataToUpdate: any = {};

    if (dto.name !== undefined) dataToUpdate.name = dto.name.trim();
    if (dto.description !== undefined) dataToUpdate.description = dto.description.trim() || null;
    if (dto.content !== undefined) dataToUpdate.content = dto.content;
    if (dto.parseMode !== undefined) dataToUpdate.parseMode = dto.parseMode;
    if (dto.mediaType !== undefined) {
      dataToUpdate.mediaType = dto.mediaType;
      // Medya değiştiyse Telegram file_id'yi sıfırla ki yeni medya yüklensin!
      if (dto.mediaType !== existing.mediaType || dto.mediaUrl !== existing.mediaUrl) {
        dataToUpdate.telegramFileId = null;
      }
    }
    if (dto.mediaUrl !== undefined) {
      dataToUpdate.mediaUrl = dto.mediaUrl.trim() || null;
      if (dto.mediaUrl !== existing.mediaUrl) {
        dataToUpdate.telegramFileId = null;
      }
    }

    if (dto.buttons !== undefined) {
      if (Array.isArray(dto.buttons)) {
        for (const btn of dto.buttons) {
          if (!validateInlineButtonUrl(btn.url)) {
            throw new BadRequestException(`Geçersiz buton URL'si (${btn.url}).`);
          }
        }
      }
      dataToUpdate.buttonsJson = dto.buttons;
    }

    if (dto.variables !== undefined) dataToUpdate.variables = dto.variables;
    if (dto.isActive !== undefined) dataToUpdate.isActive = dto.isActive;

    // Versiyon artır
    dataToUpdate.version = existing.version + 1;

    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: dataToUpdate,
    });

    await this.prisma.auditLog.create({
      data: {
        brandId: existing.brandId,
        userId: user?.id || null,
        action: 'TEMPLATE_UPDATED',
        resourceType: 'MessageTemplate',
        resourceId: id,
        payloadBefore: JSON.stringify({ version: existing.version, name: existing.name }),
        payloadAfter: JSON.stringify({ version: updated.version, name: updated.name }),
      },
    });

    return this.getTemplateById(updated.id);
  }

  async saveTelegramFileId(id: string, telegramFileId: string) {
    return this.prisma.messageTemplate.update({
      where: { id },
      data: { telegramFileId },
    });
  }

  async approveTemplate(id: string, userId?: string) {
    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: { approvalStatus: 'APPROVED', rejectionReason: null },
    });

    await this.prisma.auditLog.create({
      data: {
        brandId: updated.brandId,
        userId: userId || null,
        action: 'TEMPLATE_APPROVED',
        resourceType: 'MessageTemplate',
        resourceId: id,
      },
    });

    return this.getTemplateById(id);
  }

  async rejectTemplate(id: string, reason: string, userId?: string) {
    const updated = await this.prisma.messageTemplate.update({
      where: { id },
      data: { approvalStatus: 'REJECTED', rejectionReason: reason },
    });

    await this.prisma.auditLog.create({
      data: {
        brandId: updated.brandId,
        userId: userId || null,
        action: 'TEMPLATE_REJECTED',
        resourceType: 'MessageTemplate',
        resourceId: id,
        payloadAfter: JSON.stringify({ reason }),
      },
    });

    return this.getTemplateById(id);
  }

  async deleteTemplate(id: string, userId?: string) {
    const existing = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Mesaj şablonu bulunamadı (ID: ${id}).`);
    }

    await this.prisma.messageTemplate.delete({ where: { id } });

    await this.prisma.auditLog.create({
      data: {
        brandId: existing.brandId,
        userId: userId || null,
        action: 'TEMPLATE_DELETED',
        resourceType: 'MessageTemplate',
        resourceId: id,
      },
    });

    return { success: true, message: 'Şablon başarıyla silindi.' };
  }
}
