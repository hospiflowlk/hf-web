const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.time('prisma-connect');
  await prisma.$connect();
  console.timeEnd('prisma-connect');

  console.time('query-items');
  const items = await prisma.item.findMany({
    where: { isDeleted: false },
    include: {
      category: true,
      posCategory: true,
      exemptTaxes: true,
      compositeOf: { include: { ingredient: true } },
      ingredientIn: { include: { compositeItem: true } }
    },
  });
  console.timeEnd('query-items');
  console.log(`Found ${items.length} items`);
  process.exit(0);
}
main().catch(console.error);
