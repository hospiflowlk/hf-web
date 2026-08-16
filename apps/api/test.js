const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const items = await prisma.item.findMany({ take: 5 });
  const ids = items.map(i => i.id);
  console.log('Testing bulk remove for ids:', ids);
  
  const timestamp = Date.now();
  try {
    const res = await prisma.$transaction(
      items.map((record, index) => 
        prisma.item.update({
          where: { id: record.id },
          data: {
            isDeleted: true, 
            isActive: false,
            name: `${record.name}_deleted_${timestamp}_${index}_${Math.random().toString(36).substring(7)}`
          }
        })
      )
    );
    console.log('Success:', res.length);
  } catch (err) {
    console.error('Prisma Error:', err);
  }
}
test();
