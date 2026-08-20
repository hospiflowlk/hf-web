import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ItemsService } from './items.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get('master-data')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async getMasterData() {
    const [items, categories, taxes, posCategories] = await Promise.all([
      this.itemsService.findAll(),
      this.itemsService.getCategories(),
      this.itemsService.getTaxes(),
      this.itemsService['prisma'].posCategory.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return { items, categories, taxes, posCategories };

  }

  @Get('pos-master-data')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  async getPosMasterData() {
    return this.itemsService.getPosMasterData();
  }

  @Get('categories')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getCategories() {
    return this.itemsService.getCategories();
  }

  @Get('taxes')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  getTaxes() {
    return this.itemsService.getTaxes();
  }

  // bulk-delete must be before :id so NestJS doesn't treat "bulk-delete" as a param
  @Post('bulk-delete')
  @Roles(Role.ADMIN, Role.MANAGER)
  bulkRemove(@Body() body: any) {
    if (!body.ids || !Array.isArray(body.ids)) return [];
    return this.itemsService.bulkRemove(body.ids);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  findAll() {
    return this.itemsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
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
}
