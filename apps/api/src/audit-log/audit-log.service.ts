import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  async getAuditLogs(brandId?: string) {
    const where = brandId ? { brandId } : {};
    let logs = await this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { brand: { select: { name: true } } },
    });

    if (logs.length === 0) {
      await this.prisma.auditLog.create({
        data: {
          action: 'SYSTEM_BOOTUP',
          resourceType: 'Microservices',
          resourceId: 'system_core',
          ipAddress: '127.0.0.1',
          userAgent: 'TG Enterprise Core Engine',
        },
      });

      logs = await this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { brand: { select: { name: true } } },
      });
    }

    return logs;
  }
}
