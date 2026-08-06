import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { SegmentService } from './segment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/segments')
export class SegmentController {
  constructor(private segmentService: SegmentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllSegments(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.segmentService.getAllSegments(brandId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async createSegment(
    @Request() req: any,
    @Body() body: { brandId?: string; name: string; description?: string; rulesJson?: any },
  ) {
    const brandId = body.brandId || req.validatedBrandId;
    return this.segmentService.createSegment(brandId, body.name, body.description, body.rulesJson);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getSegmentById(@Param('id') id: string) {
    return this.segmentService.getSegmentById(id);
  }
}
