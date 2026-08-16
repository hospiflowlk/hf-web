const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
console.log('Keys:', Object.keys(prisma));
console.log('Has supplier?', typeof prisma.supplier);
prisma.$disconnect();
