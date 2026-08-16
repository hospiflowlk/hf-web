import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('items')\n@UseGuards(JwtAuthGuard, RolesGuard)\n\n

export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  findAll() {
    return this.itemsService.findAll();
  }

  @Get('categories')
  getCategories() {
    return this.itemsService.getCategories();
  }

  @Get('taxes')
  getTaxes() {
    return this.itemsService.getTaxes();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.itemsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() data: any) {
    return this.itemsService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: any) {
    return this.itemsService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.itemsService.remove(id);
  }

  @Post('bulk-delete')
  @Roles(Role.ADMIN, Role.MANAGER)
  bulkRemove(@Body() body: any) {
    if (!body.ids || !Array.isArray(body.ids)) return [];
    return this.itemsService.bulkRemove(body.ids);
  }
}
