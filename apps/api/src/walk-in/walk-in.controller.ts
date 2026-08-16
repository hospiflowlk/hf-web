import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { WalkInService } from './walk-in.service';

@Controller('walk-in')
export class WalkInController {
  constructor(private readonly walkInService: WalkInService) {}

  @Post()
  create(@Body() data: { guestName: string; guestCount: number }) {
    return this.walkInService.create(data);
  }

  @Get('active')
  findAllActive() {
    return this.walkInService.findAllActive();
  }

  @Patch(':id/checkout')
  checkoutSession(@Param('id') id: string) {
    return this.walkInService.checkoutSession(id);
  }

  @Get('closed')
  findAllClosed() {
    return this.walkInService.findAllClosed();
  }

  @Post(':id/repost-bill')
  repostBill(@Param('id') id: string) {
    return this.walkInService.repostBill(id);
  }

  @Post(':id/un-checkout')
  unCheckout(@Param('id') id: string) {
    return this.walkInService.unCheckout(id);
  }

  @Delete('closed/:id')
  deleteSession(@Param('id') id: string) {
    return this.walkInService.deleteSession(id);
  }

  @Delete('closed')
  deleteAllSessions() {
    return this.walkInService.deleteAllSessions();
  }
}
