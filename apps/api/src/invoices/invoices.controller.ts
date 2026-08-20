import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  // Must be declared before :id to avoid route capture
  @Get('summary')
  getSummary() {
    return this.invoicesService.getSummary();
  }

  @Get()
  findAll(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.invoicesService.findAll(cursor, parsedLimit, search);
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
