const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.item.findMany({
    take: 5
  });
  console.log("ALL ITEMS SAMPLE:", items.map(i => ({ name: i.name, useInInvoices: i.useInInvoices, isActive: i.isActive })));
  
  const posItems = await prisma.item.findMany({
    where: {
      isDeleted: false,
      isActive: true,
      useInInvoices: true
    }
  });
  console.log("POS ITEMS COUNT:", posItems.length);
}

main().catch(console.error).finally(() => prisma.$disconnect());
