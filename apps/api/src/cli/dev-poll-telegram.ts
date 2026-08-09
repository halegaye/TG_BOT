import { PrismaClient } from '@tg-bot/database';
import { EncryptionService } from '@tg-bot/shared';

async function startDevPolling() {
  const prisma = new PrismaClient();
  const encryptionService = new EncryptionService();

  console.log('🤖 [DEV TELEGRAM POLLER] Başlatılıyor...');
  console.log('🔍 Veritabanındaki aktif Telegram botları aranıyor...\n');

  const bots = await prisma.telegramBot.findMany({
    where: { status: 'ACTIVE' },
  });

  if (bots.length === 0) {
    console.log('⚠️ Veritabanında henüz aktif bot yok. Yeni bot eklenmesi bekleniyor...');
  } else {
    console.log(`✅ Toplam ${bots.length} adet aktif bot bulundu:`);
    for (const b of bots) {
      console.log(`  - @${b.username} (${b.displayName}) [ID: ${b.id}]`);
    }
    console.log('\n🔄 Botlar için Telegram Long Polling döngüsü başlatılıyor...\n');

    // Geliştirme modunda Telegram webhook'larını kaldır ki getUpdates çalışsın
    for (const bot of bots) {
      try {
        const rawToken = encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
        await fetch(`https://api.telegram.org/bot${rawToken}/deleteWebhook`);
        console.log(`🧹 Bot [@${bot.username}] - Webhook silindi (Long Polling moduna geçildi).`);
      } catch (err: any) {
        console.error(`❌ Bot [@${bot.username}] webhook silinirken hata: ${err.message}`);
      }
    }
  }

  console.log('\n📡 Telegram sunucularından /start ve mesaj güncellemeleri dinleniyor...\n');

  const API_LOCAL_URL = process.env.API_LOCAL_URL || 'http://api:4000';
  const knownBotIds = new Set<string>(bots.map((b) => b.id));
  const botOffsets: Record<string, number> = {};

  while (true) {
    // Dynamically fetch all ACTIVE bots from DB to automatically discover new bots added via CSV or UI
    try {
      const currentActiveBots = await prisma.telegramBot.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const bot of currentActiveBots) {
        if (!knownBotIds.has(bot.id)) {
          knownBotIds.add(bot.id);
          try {
            const rawToken = encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
            await fetch(`https://api.telegram.org/bot${rawToken}/deleteWebhook`);
            console.log(`🧹 [YENİ BOT EKLENDİ] Bot [@${bot.username}] - Webhook silindi, canlı dinlemeye alındı.`);
          } catch (err: any) {
            console.error(`❌ Yeni bot [@${bot.username}] webhook silinirken hata: ${err.message}`);
          }
        }
      }

      for (const bot of currentActiveBots) {
        try {
          const rawToken = encryptionService.decrypt(bot.encryptedToken, bot.tokenIV);
          const offset = botOffsets[bot.id] || 0;

          const res = await fetch(`https://api.telegram.org/bot${rawToken}/getUpdates?offset=${offset}&timeout=2`, {
            method: 'GET',
          });

          const data = (await res.json()) as any;

          if (data.ok && Array.isArray(data.result) && data.result.length > 0) {
            for (const update of data.result) {
              botOffsets[bot.id] = update.update_id + 1;

              console.log(`📥 [GELEN CANLI TELEGRAM MESAJI] Bot [@${bot.username}] -> Update ID: ${update.update_id}, Gönderen: ${update.message?.from?.first_name || 'Bilinmiyor'}, Metin: "${update.message?.text || ''}"`);

              // Yerel Webhook Endpoint'ine ilet
              try {
                const forwardRes = await fetch(`${API_LOCAL_URL}/webhook/${bot.webhookPathSecret}`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-telegram-bot-api-secret-token': bot.webhookHeaderSecret,
                  },
                  body: JSON.stringify(update),
                });

                if (forwardRes.ok) {
                  console.log(`🚀 [İLETİLDİ] Update başarıyla yerel BullMQ kuyruğuna iletildi!`);
                } else {
                  console.error(`❌ Yerel API'ye iletme hatası: ${forwardRes.statusText}`);
                }
              } catch (fErr: any) {
                console.error(`❌ Yerel API bağlantı hatası (${API_LOCAL_URL}): ${fErr.message}`);
              }
            }
          }
        } catch (err: any) {
          // Geçici ağ hatalarını yut
        }
      }
    } catch (dbErr: any) {
      console.error('❌ Polling DB hatası:', dbErr.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

startDevPolling().catch((err) => {
  console.error('❌ DEV Polling hatası:', err);
  process.exit(1);
});
