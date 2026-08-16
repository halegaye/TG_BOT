import { Injectable, BadRequestException, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class EmergencyStopService implements OnModuleDestroy {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
      maxRetriesPerRequest: null,
      enableOfflineQueue: false,
    });
    this.redis.on('error', (err) => {
      console.warn(`[Redis Connection Guard] EmergencyStopService: ${err.message}`);
    });
  }

  async onModuleDestroy() {
    try {
      await this.redis.quit();
    } catch (_) {}
  }

  async triggerEmergencyStop(brandId?: string, confirmationText?: string) {
    if (confirmationText !== 'ACIL DURDUR') {
      throw new BadRequestException('Acil durum durdurma işlemi için onay metni "ACIL DURDUR" olmalıdır.');
    }

    const key = brandId ? `system:emergency_stop:brand:${brandId}` : 'system:emergency_stop:global';
    await this.redis.set(key, 'true');

    return {
      success: true,
      message: brandId
        ? `[BRAND:${brandId}] Markaya ait tüm gönderimler acilen durduruldu.`
        : 'Tüm sistem genelindeki gönderimler acilen durduruldu.',
      stoppedAt: new Date().toISOString(),
    };
  }

  async resumeSystem(brandId?: string) {
    const key = brandId ? `system:emergency_stop:brand:${brandId}` : 'system:emergency_stop:global';
    await this.redis.del(key);

    return {
      success: true,
      message: brandId
        ? `[BRAND:${brandId}] Marka gönderimleri tekrar başlatıldı.`
        : 'Sistem geneli gönderimler tekrar başlatıldı.',
      resumedAt: new Date().toISOString(),
    };
  }

  async isStopped(brandId?: string): Promise<boolean> {
    const globalKey = 'system:emergency_stop:global';
    const isGlobalStopped = await this.redis.get(globalKey);
    if (isGlobalStopped === 'true') return true;

    if (brandId) {
      const brandKey = `system:emergency_stop:brand:${brandId}`;
      const isBrandStopped = await this.redis.get(brandKey);
      if (isBrandStopped === 'true') return true;
    }

    return false;
  }
}
