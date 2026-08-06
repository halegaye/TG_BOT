import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { BotService } from '../bot/bot.service';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const botService = app.get(BotService);

  const brand = await botService['prisma'].brand.findFirst();
  console.log('Testing with Brand:', brand?.id, brand?.code);

  const sampleCsv = `token,brand_code,groups,active,start_message_template_name,default_redirect_url,notes
1234567890:AAA_test_token_123,${brand?.code || 'SYSTEM'},TEST,true,,https://t.me/test,Sample Note`;

  try {
    const result = await botService.queueBulkImport(brand!.id, sampleCsv, 'system-user-id');
    console.log('Queue Bulk Import Result:', result);
  } catch (err) {
    console.error('Error in queueBulkImport:', err);
  }

  await app.close();
}

main().catch(console.error);
