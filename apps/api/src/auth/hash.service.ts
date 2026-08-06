import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashService {
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id, // Şartname gereği Argon2id kullanımı zorunlu
      memoryCost: 2 ** 16,   // 64MB
      timeCost: 3,
      parallelism: 4,
    });
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return argon2.verify(hash, password);
  }
}
