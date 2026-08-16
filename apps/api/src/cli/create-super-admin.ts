import { PrismaClient, Role } from '@tg-bot/database';
import * as argon2 from 'argon2';

async function createSuperAdmin() {
  const prisma = new PrismaClient();

  const email = process.env.ADMIN_EMAIL || 'admin@enterprise.com';
  const username = process.env.ADMIN_USERNAME || 'superadmin';
  const password = process.env.ADMIN_PASSWORD || 'SuperAdminSecret2026!';
  const firstName = process.env.ADMIN_FIRST_NAME || 'System';
  const lastName = process.env.ADMIN_LAST_NAME || 'Admin';

  console.log(`🔐 Super Admin hesabı oluşturuluyor: ${email} (${username})...`);

  // 1. Argon2id Şifreleme
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16, // 64MB
    timeCost: 3,
    parallelism: 4,
  });

  // 2. Varsayılan Sistem Markasını (System Brand) Oluştur/Bul
  const systemBrand = await prisma.brand.upsert({
    where: { code: 'system' },
    update: {},
    create: {
      name: 'System Administration',
      code: 'system',
      timezone: 'Europe/Belgrade',
      messageRateLimitPerSec: 50,
      monthlyDeliveryQuota: 10000000,
    },
  });

  // 3. PanelUser Oluştur/Güncelle
  const existingUser = await prisma.panelUser.findFirst({
    where: { OR: [{ email }, { username }] },
  });

  let user;
  if (existingUser) {
    user = await prisma.panelUser.update({
      where: { id: existingUser.id },
      data: {
        email,
        username,
        passwordHash,
        isActive: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  } else {
    user = await prisma.panelUser.create({
      data: {
        firstName,
        lastName,
        email,
        username,
        passwordHash,
        isActive: true,
      },
    });
  }

  // 4. SUPER_ADMIN Marka Üyeliği Tanımla
  await prisma.brandMembership.upsert({
    where: {
      brandId_userId: {
        brandId: systemBrand.id,
        userId: user.id,
      },
    },
    update: { role: Role.SUPER_ADMIN },
    create: {
      brandId: systemBrand.id,
      userId: user.id,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(`✅ Super Admin hesabı başarıyla oluşturuldu!`);
  console.log(`- Kullanıcı Adı: ${user.username}`);
  console.log(`- E-posta: ${user.email}`);
  console.log(`- Rol: SUPER_ADMIN`);
  console.log(`- Marka: ${systemBrand.name} (${systemBrand.code})`);

  await prisma.$disconnect();
}

createSuperAdmin().catch((err) => {
  console.error('❌ Super Admin oluşturulurken hata:', err);
  process.exit(1);
});
