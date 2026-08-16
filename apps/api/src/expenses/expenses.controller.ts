import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  findAll(
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.expensesService.findAll(cursor, parsedLimit);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.expensesService.findOne(id);
  }

  @Post()
  create(@Body() data: any) {
    return this.expensesService.create(data);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() data: any) {
    return this.expensesService.update(id, data);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.expensesService.remove(id);
  }

  // --- Settlements ---

  @Get(':id/settlements')
  getSettlements(@Param('id') id: string) {
    return this.expensesService.getSettlements(id);
  }

  @Post(':id/settlements')
  recordSettlement(@Param('id') id: string, @Body() data: any) {
    return this.expensesService.recordSettlement(id, data);
  }

  @Post(':id/reset-status')
  resetStatus(@Param('id') id: string) {
    return this.expensesService.resetStatus(id);
  }

  @Delete('settlements/:settlementId')
  deleteSettlement(@Param('settlementId') settlementId: string) {
    return this.expensesService.deleteSettlement(settlementId);
  }
}
