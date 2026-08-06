import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class RedisRateLimiterService implements OnModuleDestroy {
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Botun mesaj gönderim hakkı olup olmadığını Redis Lua Script ile atomic olarak kontrol eder.
   */
  async checkRateLimit(botId: string, limitPerSec: number): Promise<{ allowed: boolean; retryAfterMs: number }> {
    const key = `ratelimit:bot:${botId}`;
    const now = Date.now();

    // Lua 5.1 script: Token Bucket algoritması (const/let yerine local kullanılmalıdır)
    const luaScript = `
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      
      local last_check = tonumber(redis.call('HGET', key, 'last_check') or now)
      local tokens = tonumber(redis.call('HGET', key, 'tokens') or limit)
      
      -- Geçen süreye göre token ekle
      local elapsed = now - last_check
      tokens = math.min(limit, tokens + (elapsed * (limit / 1000)))
      
      if tokens >= 1 then
        redis.call('HSET', key, 'tokens', tokens - 1, 'last_check', now)
        return {1, 0}
      else
        local wait_ms = math.ceil((1 - tokens) / (limit / 1000))
        return {0, wait_ms}
      end
    `;

    const result = (await this.redis.eval(
      luaScript,
      1,
      key,
      now.toString(),
      limitPerSec.toString(),
    )) as [number, number];

    return {
      allowed: result[0] === 1,
      retryAfterMs: result[1],
    };
  }
}
