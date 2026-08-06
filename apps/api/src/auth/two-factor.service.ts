import { Injectable } from '@nestjs/common';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';

authenticator.options = { window: 1 };

@Injectable()
export class TwoFactorService {
  generateSecret(username: string) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(username, 'TelegramSenderEnterprise', secret);
    return { secret, otpauthUrl };
  }

  async generateQrCodeDataUrl(otpauthUrl: string): Promise<string> {
    return QRCode.toDataURL(otpauthUrl);
  }

  verifyToken(token: string, secret: string): boolean {
    if (!token || !secret) return false;
    try {
      return authenticator.verify({ token: token.trim(), secret });
    } catch (_) {
      return false;
    }
  }
}
