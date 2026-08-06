import { PrismaClient } from '@tg-bot/database';
const prisma = new PrismaClient();

async function main() {
  const totalDeliveries = await prisma.delivery.count();
  const sentDeliveries = await prisma.delivery.count({ where: { status: 'SENT' } });
  const totalLinks = await prisma.clickLink.count();
  const totalClickEvents = await prisma.clickEvent.count();
  const clickEvents = await prisma.clickEvent.findMany({ include: { link: true } });

  console.log('--- CTR & LINK STATISTICS ---');
  console.log('Total Deliveries in DB:', totalDeliveries);
  console.log('Sent Deliveries in DB:', sentDeliveries);
  console.log('Total Click Links in DB:', totalLinks);
  console.log('Total Click Events in DB:', totalClickEvents);
  console.log('Click Events Details:', clickEvents);

  const broadcastLogs = await prisma.broadcastLog.findMany();
  console.log('\n--- BROADCAST LOGS ---');
  console.log(broadcastLogs);

  await prisma.$disconnect();
}

main().catch(console.error);
