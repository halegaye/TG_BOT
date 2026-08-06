import { PrismaClient, Role } from '@tg-bot/database';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding initial system data...');

  const passwordHash = await argon2.hash('AdminPassword123!', {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  });

  const superAdmin = await prisma.panelUser.upsert({
    where: { email: 'admin@platform.com' },
    update: {
      passwordHash,
      isActive: true,
    },
    create: {
      email: 'admin@platform.com',
      username: 'superadmin_main',
      firstName: 'System',
      lastName: 'SuperAdmin',
      passwordHash,
      isActive: true,
    },
  });

  const defaultBrand = await prisma.brand.upsert({
    where: { code: 'default' },
    update: {},
    create: {
      name: 'Default Platform Brand',
      code: 'default',
      brandColor: '#0088cc',
      timezone: 'Europe/Istanbul',
    },
  });

  await prisma.brandMembership.upsert({
    where: {
      brandId_userId: {
        brandId: defaultBrand.id,
        userId: superAdmin.id,
      },
    },
    update: { role: Role.SUPER_ADMIN },
    create: {
      brandId: defaultBrand.id,
      userId: superAdmin.id,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log('Seed completed successfully! SuperAdmin user created: admin@platform.com / AdminPassword123!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
