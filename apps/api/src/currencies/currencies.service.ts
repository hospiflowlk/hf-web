import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class CurrenciesService {
  async getAllCurrencies() {
    return await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getEnabledCurrencies() {
    return await prisma.currency.findMany({
      where: { isEnabled: true },
      orderBy: { code: 'asc' },
    });
  }

  async updateCurrency(code: string, data: { exchangeRate?: number; isEnabled?: boolean }) {
    const currency = await prisma.currency.findUnique({ where: { code } });
    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    if (currency.isBase && data.isEnabled === false) {
      throw new BadRequestException('Cannot disable the base currency');
    }

    if (currency.isBase && data.exchangeRate !== undefined && data.exchangeRate !== 1.0) {
      throw new BadRequestException('Base currency exchange rate must remain 1.0');
    }

    const updated = await prisma.currency.update({
      where: { code },
      data: {
        exchangeRate: data.exchangeRate,
        isEnabled: data.isEnabled,
      },
    });

    if (data.exchangeRate !== undefined && data.exchangeRate !== currency.exchangeRate) {
      await prisma.currencyRateHistory.create({
        data: {
          currencyCode: code,
          rate: data.exchangeRate,
        },
      });
    }

    return updated;
  }

  async setBaseCurrency(code: string) {
    const currency = await prisma.currency.findUnique({ where: { code } });
    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    if (!currency.isEnabled) {
      throw new BadRequestException('Cannot set a disabled currency as base. Enable it first.');
    }

    // Begin transaction to update all currencies
    return await prisma.$transaction(async (tx) => {
      // 1. Remove base status from all
      await tx.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });

      // 2. Set new base currency and enforce rate = 1.0
      const updatedBase = await tx.currency.update({
        where: { code },
        data: {
          isBase: true,
          exchangeRate: 1.0,
        },
      });

      // 3. Record history if rate changed to 1.0
      if (currency.exchangeRate !== 1.0) {
        await tx.currencyRateHistory.create({
          data: {
            currencyCode: code,
            rate: 1.0,
          },
        });
      }

      // 4. Update BusinessSettings base currency
      await tx.businessSettings.update({
        where: { id: 'default' },
        data: { baseCurrencyCode: code },
      });

      return updatedBase;
    });
  }
}
