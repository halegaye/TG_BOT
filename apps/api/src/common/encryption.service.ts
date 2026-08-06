import { Injectable } from '@nestjs/common';
import { EncryptionService as BaseEncryptionService } from '@tg-bot/shared';

@Injectable()
export class EncryptionService extends BaseEncryptionService {}
