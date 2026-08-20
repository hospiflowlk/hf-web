import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Simple in-process TTL cache
interface CacheEntry<T> { data: T; expiresAt: number }
function createCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;
  return {
    get(): T | null {
      if (entry && Date.now() < entry.expiresAt) return entry.data;
      return null;
    },
    set(data: T) { entry = { data, expiresAt: Date.now() + ttlMs }; },
    invalidate() { entry = null; },
  };
}

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  // 60-second cache — currencies change only when admin edits exchange rates
  private allCurrenciesCache   = createCache<any[]>(60_000);
  private enabledCurrenciesCache = createCache<any[]>(60_000);

  async getAllCurrencies() {
    const cached = this.allCurrenciesCache.get();
    if (cached) return cached;

    const currencies = await this.prisma.currency.findMany({ orderBy: { code: 'asc' } });
    this.allCurrenciesCache.set(currencies);
    return currencies;
  }

  async getEnabledCurrencies() {
    const cached = this.enabledCurrenciesCache.get();
    if (cached) return cached;

    const currencies = await this.prisma.currency.findMany({
      where: { isEnabled: true },
      orderBy: { code: 'asc' },
    });
    this.enabledCurrenciesCache.set(currencies);
    return currencies;
  }

  private invalidateCaches() {
    this.allCurrenciesCache.invalidate();
    this.enabledCurrenciesCache.invalidate();
  }

  async updateCurrency(code: string, data: { exchangeRate?: number; isEnabled?: boolean }) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    if (currency.isBase && data.isEnabled === false) {
      throw new BadRequestException('Cannot disable the base currency');
    }

    if (currency.isBase && data.exchangeRate !== undefined && data.exchangeRate !== 1.0) {
      throw new BadRequestException('Base currency exchange rate must remain 1.0');
    }

    const updated = await this.prisma.currency.update({
      where: { code },
      data: {
        exchangeRate: data.exchangeRate,
        isEnabled: data.isEnabled,
      },
    });

    if (data.exchangeRate !== undefined && data.exchangeRate !== currency.exchangeRate) {
      await this.prisma.currencyRateHistory.create({
        data: { currencyCode: code, rate: data.exchangeRate },
      });
    }

    this.invalidateCaches();
    return updated;
  }

  async setBaseCurrency(code: string) {
    const currency = await this.prisma.currency.findUnique({ where: { code } });
    if (!currency) {
      throw new NotFoundException(`Currency ${code} not found`);
    }

    if (!currency.isEnabled) {
      throw new BadRequestException('Cannot set a disabled currency as base. Enable it first.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Remove base status from all
      await tx.currency.updateMany({
        where: { isBase: true },
        data: { isBase: false },
      });

      // 2. Set new base currency and enforce rate = 1.0
      const updatedBase = await tx.currency.update({
        where: { code },
        data: { isBase: true, exchangeRate: 1.0 },
      });

      // 3. Record history if rate changed to 1.0
      if (currency.exchangeRate !== 1.0) {
        await tx.currencyRateHistory.create({
          data: { currencyCode: code, rate: 1.0 },
        });
      }

      // 4. Update BusinessSettings base currency
      await tx.businessSettings.update({
        where: { id: 'default' },
        data: { baseCurrencyCode: code },
      });

      return updatedBase;
    });

    this.invalidateCaches();
    return result;
  }
}
