import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminName = 'admin';
  const pin = '1234';

  const existing = await prisma.user.findUnique({ where: { name: adminName } });
  
  if (!existing) {
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);
    
    await prisma.user.create({
      data: {
        name: adminName,
        pinHash: pinHash,
        role: Role.ADMIN,
        isActive: true,
      }
    });
    console.log(`Created admin user. Name: ${adminName}, PIN: ${pin}`);
  } else {
    const salt = await bcrypt.genSalt(10);
    const pinHash = await bcrypt.hash(pin, salt);
    
    await prisma.user.update({
      where: { name: adminName },
      data: { pinHash: pinHash }
    });
    console.log(`Updated admin user. Name: ${adminName}, PIN: ${pin}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
