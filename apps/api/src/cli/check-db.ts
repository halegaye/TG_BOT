import { PrismaClient } from '@tg-bot/database';

const prisma = new PrismaClient();

async function main() {
  const bots = await prisma.telegramBot.findMany();
  console.log('\n--- BOTS (' + bots.length + ') ---');
  bots.forEach((b: any) =>
    console.log(`- ID: ${b.id}, Username: ${b.username}, BrandId: ${b.brandId}, Status: ${b.status}`),
  );

  const subs = await prisma.botSubscriber.findMany({ include: { user: true } });
  console.log('\n--- SUBSCRIBERS (' + subs.length + ') ---');
  subs.forEach((s: any) =>
    console.log(
      `- ID: ${s.id}, BotId: ${s.botId}, ChatId: ${s.chatId.toString()}, User: ${s.user?.firstName} (@${s.user?.username}), Blocked: ${s.isBlocked}`,
    ),
  );

  const delis = await prisma.delivery.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  console.log('\n--- DELIVERIES (' + delis.length + ') ---');
  delis.forEach((d: any) =>
    console.log(`- ID: ${d.id}, BotId: ${d.botId}, Status: ${d.status}, Error: ${d.lastError}`),
  );

  const runs = await prisma.campaignRun.findMany({ take: 5, orderBy: { startedAt: 'desc' } });
  console.log('\n--- CAMPAIGN RUNS (' + runs.length + ') ---');
  runs.forEach((r: any) =>
    console.log(`- ID: ${r.id}, CampaignId: ${r.campaignId}, Started: ${r.startedAt}`),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
