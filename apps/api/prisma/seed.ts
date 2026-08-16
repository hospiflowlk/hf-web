import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding currencies and settings...');

  // 1. Seed currencies
  const currencies = [
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs', exchangeRate: 1.0, isBase: true, isEnabled: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', exchangeRate: 300.0, isBase: false, isEnabled: true },
    { code: 'GBP', name: 'British Pound', symbol: '£', exchangeRate: 380.0, isBase: false, isEnabled: true },
    { code: 'EUR', name: 'Euro', symbol: '€', exchangeRate: 320.0, isBase: false, isEnabled: true },
  ];

  for (const c of currencies) {
    await prisma.currency.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    
    // Add initial history
    await prisma.currencyRateHistory.create({
      data: {
        currencyCode: c.code,
        rate: c.exchangeRate,
      }
    });
  }

  // 2. Seed business settings
  await prisma.businessSettings.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      baseCurrencyCode: 'LKR',
      invoiceDefaultCurrency: 'USD',
      expenseDefaultCurrency: 'LKR',
      reportDefaultCurrency: 'LKR',
    },
  });

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
