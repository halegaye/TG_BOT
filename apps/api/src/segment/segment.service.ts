import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SegmentService {
  constructor(private prisma: PrismaService) {}

  async getAllSegments(brandId?: string) {
    const where = brandId ? { brandId } : {};
    return this.prisma.subscriberSegment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { brand: { select: { name: true } } },
    });
  }

  async createSegment(brandId: string, name: string, description?: string, rulesJson?: any) {
    return this.prisma.subscriberSegment.create({
      data: {
        brandId,
        name,
        description,
        rulesJson: rulesJson || {},
      },
    });
  }

  async getSegmentById(id: string) {
    const segment = await this.prisma.subscriberSegment.findUnique({
      where: { id },
      include: { brand: true },
    });

    if (!segment) {
      throw new NotFoundException(`Segment bulunamadı (ID: ${id}).`);
    }

    return segment;
  }
}
