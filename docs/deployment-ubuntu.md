# 🚀 Ubuntu 24.04 LTS Production Deployment & Operations Guide

Bu doküman, **Telegram Multi-Tenant Bot & Campaign Platform** projesini Ubuntu 24.04 LTS sunucu üzerinde prodüksiyon ortamına canlıya alma, Docker konteynerlerini yapılandırma, SSL alma ve yedekleme prosedürlerini içerir.

---

## 📋 1. Sunucu Hazırlığı & Güvenlik (UFW Firewall)

Sunucunuza SSH ile bağlandıktan sonra paket listesini güncelleyin ve temel güvenlik duvarı ayarlarını yapılandırın:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw htop ca-certificates gnupg

# Güvenlik Duvarı (UFW) Ayarları
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

> ⚠️ **NOT:** PostgreSQL (5432) ve Redis (6379) portları dış dünyaya kapalıdır. Yalnızca Nginx (80/443) ve SSH (22) açık kalmalıdır.

---

## 🐳 2. Docker & Docker Compose V2 Kurulumu

Ubuntu 24.04 üzerine resmi Docker motorunu kurun:

```bash
# Docker GPG anahtarı ve reposu ekleme
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Docker servisini başlatma
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
```

---

## 📁 3. Proje Kurulumu & Environment Yapılandırması

Projeyi sunucuya klonlayın ve prodüksiyon `.env` dosyasını oluşturun:

```bash
cd /var/www
git clone https://github.com/YourOrg/TG_BOT.git
cd TG_BOT

# Prodüksiyon Environment Dosyası
cp .env.example .env.production
nano .env.production
```

`.env.production` içeriğini şu şekilde güncelleyin:

```env
NODE_ENV=production

POSTGRES_USER=tg_prod_user
POSTGRES_PASSWORD=UltraSecurePostgresPassword2026!
POSTGRES_DB=tg_bot_prod_db
POSTGRES_PORT=5432
DATABASE_URL=postgresql://tg_prod_user:UltraSecurePostgresPassword2026!@postgres:5432/tg_bot_prod_db?schema=public

REDIS_PORT=6379
REDIS_PASSWORD=UltraSecureRedisPassword2026!
REDIS_URL=redis://:UltraSecureRedisPassword2026!@redis:6379

PORT_API=4000
PORT_WEB=3000

TOKEN_ENCRYPTION_KEY=super_secret_encryption_key_32_bytes_min_length_enterprise_2026
JWT_SECRET=super-secret-jwt-key-enterprise-production-2026
WEBHOOK_BASE_URL=https://hooks.yourdomain.com
```

---

## 🗄️ 4. Veritabanı Migration & Super Admin Oluşturma

İlk dağıtımda PostgreSQL veritabanını yayına hazırlayın ve ilk Super Admin hesabını oluşturun:

```bash
# Node bağımlılıklarını yükleyin
pnpm install

# Prisma Migration'larını çalıştırın
pnpm --filter @tg-bot/database exec prisma migrate deploy

# CLI ile İlk Super Admin Hesabını Oluşturun
ADMIN_EMAIL="admin@yourdomain.com" \
ADMIN_USERNAME="superadmin" \
ADMIN_PASSWORD="SecureSuperPassword2026!" \
npx ts-node apps/api/src/cli/create-super-admin.ts
```

---

## 🔒 5. SSL Sertifikası (Certbot / Let's Encrypt) Kurulumu

Nginx üzerinden domaininize ücretsiz Let's Encrypt SSL sertifikası tanımlayın:

```bash
sudo apt install -y certbot python3-certbot-nginx

# Certbot ile SSL alma
sudo certbot --nginx -d hooks.yourdomain.com -d panel.yourdomain.com

# Sertifika Otomatik Yenileme Testi
sudo certbot renew --dry-run
```

---

## 🚀 6. Production Konteynerlerini Başlatma

Docker Compose prodüksiyon dosyasını arka planda ayağa kaldırın:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Konteyner durumlarını ve logları kontrol edin:

```bash
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api
```

---

## 💾 7. Otomatik Veritabanı Yedekleme (Backup Prosedürü)

Her gece saat 03:00'te PostgreSQL ve Redis veritabanını otomatik yedekleyen betik hazırlayın:

```bash
mkdir -p /var/backups/tg_bot
nano /var/backups/tg_bot/backup.sh
```

`backup.sh` içeriği:

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/tg_bot"

# PostgreSQL Dump
docker exec tg_bot_postgres_prod pg_dump -U tg_prod_user tg_bot_prod_db | gzip > "$BACKUP_DIR/postgres_$DATE.sql.gz"

# 7 Günden Eski Yedekleri Temizle
find "$BACKUP_DIR" -type f -name "*.gz" -mtime +7 -delete

echo "Yedekleme tamamlandı: $DATE"
```

Betiğe çalışma yetkisi verip `crontab`'a ekleyin:

```bash
chmod +x /var/backups/tg_bot/backup.sh

# Crontab Aç
crontab -e

# Ekleyin:
0 3 * * * /var/backups/tg_bot/backup.sh >> /var/backups/tg_bot/backup.log 2>&1
```

---

### 🎉 Tebrikler!
Projeniz **Ubuntu 24.04 LTS** üzerinde güvenli, ölçeklenebilir ve yedekli şekilde yayındadır!
