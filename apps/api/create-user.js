const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'owner@property.com' },
    update: { passwordHash, role: 'OWNER', isActive: true },
    create: {
      email: 'owner@property.com',
      name: 'Owner',
      passwordHash,
      role: 'OWNER',
      isActive: true,
    }
  });
  console.log('User owner@property.com created/updated successfully with password: password123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
