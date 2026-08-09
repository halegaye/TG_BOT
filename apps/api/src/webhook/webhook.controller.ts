import { 
  Controller, 
  Post, 
  Param, 
  Headers, 
  Body, 
  HttpCode, 
  HttpStatus, 
  UnauthorizedException, 
  NotFoundException 
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import * as crypto from 'crypto';

@Controller(['webhook', 'api/v1/webhook'])
export class WebhookController {
  constructor(
    @InjectQueue('telegram-webhook-events') private webhookQueue: Queue,
    private prisma: PrismaService,
  ) {}

  @Post(':pathSecret')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Param('pathSecret') pathSecret: string,
    @Headers('x-telegram-bot-api-secret-token') secretHeader: string,
    @Body() update: any,
  ) {
    // 1. Path Secret üzerinden ilgili Botu bul
    const bot = await this.prisma.telegramBot.findUnique({
      where: { webhookPathSecret: pathSecret },
      select: { id: true, brandId: true, webhookHeaderSecret: true, status: true },
    });

    if (!bot || bot.status !== 'ACTIVE') {
      throw new NotFoundException('Bot bulunamadı veya pasif durumda.');
    }

    // 2. Header Secret Doğrulaması (Constant-Time Comparison - Timing Attack Koruması)
    const headerBuf = Buffer.from(secretHeader || '');
    const expectedBuf = Buffer.from(bot.webhookHeaderSecret || '');

    const isValidHeader =
      headerBuf.length === expectedBuf.length &&
      crypto.timingSafeEqual(headerBuf, expectedBuf);

    if (!isValidHeader) {
      throw new UnauthorizedException('Geçersiz Webhook Header Secret.');
    }

    // 3. İşi Asenkron Kuyruğa (BullMQ) Ekle
    await this.webhookQueue.add(
      'process-telegram-update',
      {
        botId: bot.id,
        brandId: bot.brandId,
        update: update,
        receivedAt: new Date().toISOString(),
      },
      {
        removeOnComplete: true, // Redis belleğini şişirmemek için
        attempts: 3,            // Geçici hatalarda 3 deneme
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    // 4. Anında HTTP 200 Dön
    return { status: 'ok' };
  }

  // --- DEVELOPER WEBHOOK SIMULATOR ENDPOINT ---
  @Post('test-simulate/:botId')
  @HttpCode(HttpStatus.OK)
  async simulateWebhook(
    @Param('botId') botId: string,
    @Body() customPayload?: any,
  ) {
    const isBigIntId = /^\d+$/.test(botId);
    const where = isBigIntId ? { telegramBotId: BigInt(botId) } : { id: botId };

    const bot = await this.prisma.telegramBot.findFirst({
      where,
      select: { id: true, brandId: true, username: true, displayName: true, status: true },
    });

    if (!bot) {
      throw new NotFoundException(`Simülasyon için bot bulunamadı (ID: ${botId}).`);
    }

    const testUserId = 99887766;
    const updatePayload = customPayload?.update || {
      update_id: Date.now(),
      message: {
        message_id: Math.floor(Math.random() * 10000),
        from: {
          id: testUserId,
          is_bot: false,
          first_name: 'TestKullanici',
          last_name: 'Simule',
          username: 'test_user_sim',
          language_code: 'tr',
        },
        chat: {
          id: testUserId,
          first_name: 'TestKullanici',
          last_name: 'Simule',
          username: 'test_user_sim',
          type: 'private',
        },
        date: Math.floor(Date.now() / 1000),
        text: customPayload?.text || '/start campaign_test',
      },
    };

    await this.webhookQueue.add(
      'process-telegram-update',
      {
        botId: bot.id,
        brandId: bot.brandId,
        update: updatePayload,
        receivedAt: new Date().toISOString(),
        isSimulated: true,
      },
      {
        removeOnComplete: true,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    );

    return {
      status: 'ok',
      simulated: true,
      botId: bot.id,
      botUsername: bot.username,
      testUserId,
      message: 'Sahte Telegram /start Update payload\'ı BullMQ `telegram-webhook-events` kuyruğuna başarıyla eklendi! Worker arka planda işleyecek ve Abone / Mesaj kayıtlarını veritabanına yazacak.',
    };
  }
}
