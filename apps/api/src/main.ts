import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';

async function bootstrap() {
  // bodyParser: false → NestJS'in varsayılan 1MB limitli parser'ını KAPAT
  // Aşağıda manuel olarak 20MB limitli parser ekliyoruz
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Büyük fotoğraf (base64) için 20MB body limiti
  const express = require('express');
  app.use(express.json({ limit: '20mb' }));
  app.use(express.urlencoded({ extended: true, limit: '20mb' }));

  app.enableCors();
  app.useGlobalInterceptors(new BigIntInterceptor());

  const port = process.env.PORT_API || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Server running on port ${port} (bound to 0.0.0.0)`);
}
bootstrap();
