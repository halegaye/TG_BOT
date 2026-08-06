import { PrismaClient } from '@tg-bot/database';
const prisma = new PrismaClient();

async function main() {
  const targetId = '7d7ebf09-c2ac-47b0-a67b-deaa087a333e';
  const c = await prisma.campaign.findUnique({
    where: { id: targetId },
    include: {
      deliveries: true,
      runs: true,
    },
  });
  console.log('--- CAMPAIGN DATA ---');
  console.log('ID:', c?.id);
  console.log('Title:', c?.title);
  console.log('Status:', c?.status);
  console.log('Type:', c?.type);
  console.log('Deliveries Count:', c?.deliveries?.length);
  console.log('Runs Count:', c?.runs?.length);

  const allCampaigns = await prisma.campaign.findMany({ select: { id: true, title: true, status: true } });
  console.log('\n--- ALL CAMPAIGNS IN DB ---');
  console.log(allCampaigns);

  const totalDeliveries = await prisma.delivery.count();
  console.log('\n--- TOTAL DELIVERIES IN DB ---', totalDeliveries);

  const totalBroadcastLogs = await prisma.broadcastLog.count();
  console.log('--- TOTAL BROADCAST LOGS IN DB ---', totalBroadcastLogs);

  await prisma.$disconnect();
}

main().catch(console.error);
