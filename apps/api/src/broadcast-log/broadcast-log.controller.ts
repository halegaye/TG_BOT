import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { BroadcastLogService } from './broadcast-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/broadcast-logs')
export class BroadcastLogController {
  constructor(private broadcastLogService: BroadcastLogService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getBroadcastLogs(@Request() req: any, @Query('brandId') queryBrandId?: string) {
    const brandId = queryBrandId || req.validatedBrandId;
    return this.broadcastLogService.getLogsForUser(req.user, brandId);
  }
}
