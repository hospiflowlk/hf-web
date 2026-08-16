import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { TaxesService } from './taxes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('taxes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Get()
  findAll() {
    return this.taxesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.taxesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() data: any) {
    return this.taxesService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: any) {
    return this.taxesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.taxesService.remove(id);
  }

  @Post('bulk-delete')
  @Roles(Role.ADMIN, Role.MANAGER)
  bulkRemove(@Body() body: any) {
    if (!body.ids || !Array.isArray(body.ids)) return [];
    return this.taxesService.bulkRemove(body.ids);
  }
}
