import { PrismaClient } from '@tg-bot/database';
import { Queue } from 'bullmq';
import { interpolateTemplate, buildInlineKeyboard } from '@tg-bot/shared';

const prisma = new PrismaClient();
const sendQueue = new Queue('telegram-send', {
  connection: { host: '127.0.0.1', port: 6379 },
});

async function main() {
  console.log('--- TEST DISPATCH STARTING ---');
  const bots = await prisma.telegramBot.findMany({ where: { status: 'ACTIVE' }, include: { brand: true } });
  console.log(`Bulunan aktif bot sayısı: ${bots.length}`);

  if (bots.length === 0) {
    console.log('Aktif bot yok!');
    return;
  }

  const campaign = await prisma.campaign.create({
    data: {
      brandId: bots[0].brandId,
      title: 'Test Duyurusu ' + new Date().toLocaleTimeString(),
      status: 'ACTIVE',
    },
  });

  const run = await prisma.campaignRun.create({
    data: {
      campaignId: campaign.id,
      startedAt: new Date(),
    },
  });

  let enqueued = 0;
  for (const bot of bots) {
    const subs = await prisma.botSubscriber.findMany({
      where: { botId: bot.id, isBlocked: false },
      include: { user: true },
    });

    console.log(`Bot [${bot.username}] için ${subs.length} abone bulundu.`);

    for (const sub of subs) {
      const formattedText = `🔔 <b>Test Duyurusu</b>\n\nMerhaba ${sub.user?.firstName || 'Kullanıcı'}! Kampanya metni başarıyla ulaştı 🎉\n\n<i>Zaman: ${new Date().toLocaleTimeString('tr-TR')}</i>`;

      const jobData = {
        brandId: bot.brandId,
        campaignId: campaign.id,
        campaignRunId: run.id,
        botId: bot.id,
        subscriberId: sub.id,
        chatId: sub.chatId.toString(),
        text: formattedText,
        parseMode: 'HTML',
        replyMarkup: buildInlineKeyboard([{ text: 'Detaylar 🚀', url: 'https://telegram.org', sameRow: false }]),
      };

      await sendQueue.add('send-campaign-message', jobData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });

      enqueued++;
    }
  }

  console.log(`✅ Toplam ${enqueued} mesaj kuyruğa eklendi. Worker işlenmesini bekleyin...`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await sendQueue.close();
    await prisma.$disconnect();
  });
