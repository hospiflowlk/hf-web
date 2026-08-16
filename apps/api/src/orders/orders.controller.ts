import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { OrdersService, CreateOrderDto } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  createOrder(@Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto);
  }

  @Get('active')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getActiveOrders() {
    return this.ordersService.getActiveOrders();
  }

  @Get('history')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getOrderHistory() {
    return this.ordersService.getOrderHistory();
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  deleteOrder(@Param('id') id: string) {
    return this.ordersService.deleteOrder(id);
  }

  @Post(':id/status')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  updateOrderStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateOrderStatus(id, status);
  }

  @Post(':id/sign')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  signOrder(@Param('id') id: string, @Body() body: { signatureData: string; tip: number }) {
    return this.ordersService.signOrder(id, body.signatureData, body.tip);
  }
}
