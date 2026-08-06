import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/audit-logs')
export class AuditLogController {
  constructor(private auditLogService: AuditLogService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAuditLogs(@Query('brandId') queryBrandId?: string, @Request() req?: any) {
    const brandId = queryBrandId || req?.validatedBrandId;
    return this.auditLogService.getAuditLogs(brandId);
  }
}
