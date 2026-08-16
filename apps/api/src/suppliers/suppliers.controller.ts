import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { SuppliersService } from './suppliers.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  findAll() {
    return this.suppliersService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  findOne(@Param('id') id: string) {
    return this.suppliersService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  create(@Body() data: any) {
    return this.suppliersService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  update(@Param('id') id: string, @Body() data: any) {
    return this.suppliersService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.suppliersService.remove(id);
  }
}
