import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post(':id/checkin-test')
  createTestCheckIn(@Param('id') roomId: string, @Body() data: any) {
    return this.roomsService.createTestCheckIn(roomId, data);
  }

  @Post(':id/checkout')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  checkoutGuest(@Param('id') roomId: string) {
    return this.roomsService.checkoutGuest(roomId);
  }

  @Get('checked-in')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getCheckedInRooms() {
    return this.roomsService.getCheckedInRooms();
  }

  @Get('recent-checkouts')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getRecentCheckouts() {
    return this.roomsService.getRecentCheckouts();
  }

  @Post('repost-bill/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  repostBill(@Param('id') reservationId: string) {
    return this.roomsService.repostBill(reservationId);
  }

  @Post('un-checkout/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  unCheckoutGuest(@Param('id') reservationId: string) {
    return this.roomsService.unCheckoutGuest(reservationId);
  }

  @Delete('recent-checkouts/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  deleteCheckout(@Param('id') reservationId: string) {
    return this.roomsService.deleteCheckout(reservationId);
  }

  @Delete('recent-checkouts')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  deleteAllCheckouts() {
    return this.roomsService.deleteAllCheckouts();
  }

  @Get('all')
  getAllRooms() {
    return this.roomsService.getAllRooms();
  }

  @Delete('active-checkin/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  deleteActiveCheckin(@Param('id') reservationId: string) {
    return this.roomsService.deleteActiveCheckin(reservationId);
  }

  @Post('active-checkin/:id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  updateActiveCheckin(@Param('id') reservationId: string, @Body() data: any) {
    return this.roomsService.updateActiveCheckin(reservationId, data);
  }

  @Get('categories')
  getRoomCategories() {
    return this.roomsService.getRoomCategories();
  }

  @Get('grid')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getGrid(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('tab') tab?: string,
    @Query('dayUse') dayUse?: string,
    @Query('statuses') statuses?: string,
    @Query('search') search?: string,
  ) {
    if (!startDate || !endDate) {
      // Provide defaults if not provided (e.g. today to today + 15 days)
      const now = new Date();
      startDate = now.toISOString();
      const future = new Date(now);
      future.setDate(future.getDate() + 15);
      endDate = future.toISOString();
    }
    return this.roomsService.getGrid(startDate, endDate, {
      tab,
      dayUse: dayUse === 'true',
      statuses: statuses ? statuses.split(',') : undefined,
      search,
    });
  }

  @Post(':roomId/out-of-order')
  @Roles(Role.ADMIN, Role.MANAGER)
  createOutOfOrder(@Param('roomId') roomId: string, @Body() data: any) {
    return this.roomsService.createOutOfOrder(roomId, data);
  }

  @Delete('out-of-order/:id')
  @Roles(Role.ADMIN, Role.MANAGER)
  removeOutOfOrder(@Param('id') id: string) {
    return this.roomsService.removeOutOfOrder(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  createRoom(@Body() data: { number: string; categoryId: string }) {
    return this.roomsService.createRoom(data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  deleteRoom(@Param('id') id: string) {
    return this.roomsService.deleteRoom(id);
  }
}

