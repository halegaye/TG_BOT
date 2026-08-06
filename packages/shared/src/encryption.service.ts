import * as crypto from 'crypto';

export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor() {
    const secretKey = process.env.TOKEN_ENCRYPTION_KEY || 'super_secret_encryption_key_32_bytes_min_length_enterprise_2026';
    if (!secretKey || secretKey.length < 32) {
      throw new Error('TOKEN_ENCRYPTION_KEY en az 32 karakter olmalıdır.');
    }
    this.key = crypto.scryptSync(secretKey, 'salt-enterprise-tg', 32);
  }

  encrypt(text: string): { encryptedData: string; iv: string; fingerprint: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    const encryptedData = `${encrypted}:${authTag}`;
    const fingerprint = crypto.createHash('sha256').update(text).digest('hex');

    return {
      encryptedData,
      iv: iv.toString('hex'),
      fingerprint,
    };
  }

  decrypt(encryptedData: string, ivHex: string): string {
    const [encryptedText, authTagHex] = encryptedData.split(':');
    if (!encryptedText || !authTagHex) {
      throw new Error('Geçersiz şifreli veri formatı.');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
