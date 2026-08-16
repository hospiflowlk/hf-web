import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deletedItems = await prisma.item.findMany({ where: { isDeleted: true } });
  for (const item of deletedItems) {
    if (!item.name.includes('_deleted_')) {
      await prisma.item.update({
        where: { id: item.id },
        data: { name: `${item.name}_deleted_${Date.now()}` }
      });
      console.log(`Renamed deleted item: ${item.name}`);
    }
  }

  // Same for categories
  const deletedCategories = await prisma.category.findMany({ where: { isActive: false } });
  for (const cat of deletedCategories) {
    if (!cat.name.includes('_deleted_')) {
        // Wait, Category doesn't have isDeleted, it just has isActive.
        // We shouldn't rename inactive categories unless we plan to soft-delete them.
        // Actually, Category has isDeleted? No, schema says it doesn't.
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
