import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards, Req } from '@nestjs/common';
import { AccountingService } from './accounting.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.MANAGER, Role.USER)
@Controller('accounting')
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Post('accounts')
  createAccount(@Req() req, @Body() createAccountDto: CreateAccountDto) {
    return this.accountingService.createAccount(req.user?.userId || req.user?.id || req.user?.sub, createAccountDto);
  }

  @Get('accounts')
  getAccounts() {
    return this.accountingService.getAccounts();
  }

  @Get('accounts/:id/statement')
  getAccountStatement(@Param('id') id: string) {
    return this.accountingService.getAccountStatement(id);
  }

  @Put('accounts/:id')
  updateAccount(@Req() req, @Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.accountingService.updateAccount(req.user?.userId || req.user?.id || req.user?.sub, id, dto);
  }

  @Delete('accounts/:id')
  deleteAccount(@Req() req, @Param('id') id: string) {
    return this.accountingService.softDeleteAccount(req.user?.userId || req.user?.id || req.user?.sub, id);
  }

  @Post('transactions')
  createTransaction(@Req() req, @Body() createTransactionDto: CreateTransactionDto) {
    return this.accountingService.createTransaction(req.user.userId, createTransactionDto);
  }

  @Get('transactions')
  getTransactions() {
    return this.accountingService.getTransactions();
  }

  @Put('transactions/:id')
  updateTransaction(@Req() req, @Param('id') id: string, @Body() dto: UpdateTransactionDto) {
    return this.accountingService.updateTransaction(req.user.userId, id, dto);
  }

  @Delete('transactions/:id')
  deleteTransaction(@Req() req, @Param('id') id: string) {
    return this.accountingService.softDeleteTransaction(req.user.userId, id);
  }
}
