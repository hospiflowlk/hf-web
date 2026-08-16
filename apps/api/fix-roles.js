const { PrismaClient } = require('@prisma/client');

async function fixRoles() {
  const prisma = new PrismaClient();
  await prisma.$executeRaw`UPDATE User SET role = 'ADMIN' WHERE role = 'OWNER'`;
  await prisma.$executeRaw`UPDATE User SET role = 'USER' WHERE role IN ('RECEPTION', 'RESTAURANT_STAFF', 'ACCOUNTANT')`;
  console.log('Roles updated in DB');
}

fixRoles()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
