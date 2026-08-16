import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { BusinessSourcesService } from './business-sources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('business-sources')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BusinessSourcesController {
  constructor(private readonly businessSourcesService: BusinessSourcesService) {}

  @Get()
  findAll() {
    return this.businessSourcesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.businessSourcesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@Body() data: any) {
    return this.businessSourcesService.create(data);
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(@Param('id') id: string, @Body() data: any) {
    return this.businessSourcesService.update(id, data);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  remove(@Param('id') id: string) {
    return this.businessSourcesService.remove(id);
  }
}
