import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.invoicesService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.invoicesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.invoicesService.remove(id);
  }

  // --- Settlements ---

  @Get(':id/settlements')
  getSettlements(@Param('id') id: string) {
    return this.invoicesService.getSettlements(id);
  }

  @Post(':id/settlements')
  recordSettlement(@Param('id') id: string, @Body() data: any) {
    return this.invoicesService.recordSettlement(id, data);
  }

  @Delete('settlements/:settlementId')
  deleteSettlement(@Param('settlementId') settlementId: string) {
    return this.invoicesService.deleteSettlement(settlementId);
  }
}
