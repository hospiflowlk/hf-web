import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

@Injectable()
export class SettingsService {
  async getSettings() {
    let settings = await prisma.businessSettings.findUnique({
      where: { id: 'default' },
    });
    if (!settings) {
      settings = await prisma.businessSettings.create({
        data: {
          id: 'default',
          baseCurrencyCode: 'LKR',
          invoiceDefaultCurrency: 'USD',
          expenseDefaultCurrency: 'LKR',
          reportDefaultCurrency: 'LKR',
        },
      });
    }
    return settings;
  }

  async updateSettings(data: any) {
    return await prisma.businessSettings.upsert({
      where: { id: 'default' },
      update: data,
      create: {
        id: 'default',
        ...data,
      },
    });
  }
}
