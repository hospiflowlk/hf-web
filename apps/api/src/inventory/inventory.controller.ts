import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN, Role.MANAGER)
  getDashboardStats() {
    return this.inventoryService.getDashboardStats();
  }

  @Get('items')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getTrackedItems() {
    return this.inventoryService.getTrackedItems();
  }

  @Get('transactions')
  @Roles(Role.ADMIN, Role.MANAGER)
  getTransactions(@Query('itemId') itemId?: string, @Query('limit') limit?: string) {
    return this.inventoryService.getTransactions(itemId, limit ? parseInt(limit) : undefined);
  }

  @Post('adjust')
  @Roles(Role.ADMIN, Role.MANAGER)
  adjustStock(@Body() data: { itemId: string; quantity: number; reason: string }) {
    return this.inventoryService.adjustStock(data);
  }
}
