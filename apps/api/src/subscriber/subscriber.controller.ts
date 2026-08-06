import { Controller, Get, Param, Query, UseGuards, Request } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/v1/subscribers')
export class SubscriberController {
  constructor(private subscriberService: SubscriberService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllSubscribers(
    @Query('brandId') queryBrandId?: string,
    @Query('search') searchQuery?: string,
    @Query('isBlocked') isBlockedStr?: string,
    @Request() req?: any,
  ) {
    const brandId = queryBrandId || req?.validatedBrandId;
    const isBlocked = isBlockedStr === 'true' ? true : isBlockedStr === 'false' ? false : undefined;
    return this.subscriberService.getAllSubscribers(brandId, searchQuery, isBlocked);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getSubscriberById(@Param('id') id: string) {
    return this.subscriberService.getSubscriberById(id);
  }
}
