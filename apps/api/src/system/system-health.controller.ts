import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SystemHealthService } from './system-health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/system')
export class SystemHealthController {
  constructor(private systemHealthService: SystemHealthService) {}

  @UseGuards(JwtAuthGuard)
  @Get('health')
  async getSystemHealthStatus() {
    return this.systemHealthService.getSystemHealthStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get('queues')
  async getQueueStatus() {
    return this.systemHealthService.getQueueStatus();
  }

  @UseGuards(JwtAuthGuard)
  @Get('alerts')
  async getSystemAlerts() {
    return this.systemHealthService.getSystemAlerts();
  }

  @UseGuards(JwtAuthGuard)
  @Get('backups')
  async getBackupLogs() {
    return this.systemHealthService.getBackupLogs();
  }

  @UseGuards(JwtAuthGuard)
  @Post('backups/create')
  async createBackup() {
    return this.systemHealthService.createBackup();
  }

  @UseGuards(JwtAuthGuard)
  @Get('settings')
  async getSystemSettings() {
    return this.systemHealthService.getSystemSettings();
  }
}
