import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { PosCategoriesService } from './pos-categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('pos-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PosCategoriesController {
  constructor(private readonly posCategoriesService: PosCategoriesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.USER)
  findAll() {
    return this.posCategoriesService.findAll();
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() data: any) {
    return this.posCategoriesService.create(data);
  }

  @Post('reorder')
  @Roles(Role.ADMIN, Role.MANAGER)
  reorder(@Body() data: { orderedIds: string[] }) {
    return this.posCategoriesService.reorder(data.orderedIds);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: any) {
    return this.posCategoriesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.posCategoriesService.remove(id);
  }
}
