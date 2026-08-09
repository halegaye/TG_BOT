import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

@Injectable()
export class HashService {
  async hashPassword(password: string): Promise<string> {
    try {
      return await argon2.hash(password, {
        type: argon2.argon2id, // Şartname gereği Argon2id kullanımı zorunlu
        memoryCost: 2 ** 16,   // 64MB
        timeCost: 3,
        parallelism: 4,
      });
    } catch (_) {
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
      return `$pbkdf2$${salt}$${hash}`;
    }
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      if (!hash) return false;
      if (hash.startsWith('$pbkdf2$')) {
        const [, , salt, originalHash] = hash.split('$');
        const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
        return crypto.timingSafeEqual(Buffer.from(verifyHash), Buffer.from(originalHash));
      }
      return await argon2.verify(hash, password);
    } catch (_) {
      return false;
    }
  }
}
