import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BigIntInterceptor } from './common/interceptors/bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalInterceptors(new BigIntInterceptor());

  const port = process.env.PORT_API || 4000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API Server running on port ${port} (bound to 0.0.0.0)`);
}
bootstrap();
