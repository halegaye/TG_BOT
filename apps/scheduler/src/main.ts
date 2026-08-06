import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  console.log('🚀 Scheduler Service initialized and running cron jobs...');
}
bootstrap();
