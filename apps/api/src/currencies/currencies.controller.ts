import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('currencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  getAllCurrencies() {
    return this.currenciesService.getAllCurrencies();
  }

  @Get('enabled')
  getEnabledCurrencies() {
    return this.currenciesService.getEnabledCurrencies();
  }

  @Put(':code')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateCurrency(
    @Param('code') code: string,
    @Body() data: { exchangeRate?: number; isEnabled?: boolean }
  ) {
    return this.currenciesService.updateCurrency(code, data);
  }

  @Put(':code/base')
  @Roles(Role.ADMIN)
  setBaseCurrency(@Param('code') code: string) {
    return this.currenciesService.setBaseCurrency(code);
  }
}
