import { NestFactory } from '@nestjs/core';
import { AppModule } from '../apps/api/src/app.module';

async function test() {
  try {
    const app = await NestFactory.create(AppModule, { logger: false });
    console.log('✅ NestApp initialized successfully!');
    await app.close();
  } catch (err: any) {
    console.error('❌ NestApp initialization error:', err.stack || err.message);
  }
}
test();
