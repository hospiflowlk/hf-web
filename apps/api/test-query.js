const { PrismaClient } = require('@prisma/client');
async function test() {
  const prisma = new PrismaClient();
  try {
    const suppliers = await prisma.supplier.findMany({ where: { isDeleted: false } });
    console.log('Success:', suppliers);
  } catch (err) {
    console.error('Error querying suppliers:', err);
  } finally {
    await prisma.$disconnect();
  }
}
test();
