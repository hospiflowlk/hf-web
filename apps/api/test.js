const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const item = await prisma.item.findFirst({
      where: { name: 'Cream of Chicken Soup' }
    });
    if (!item) {
      console.log('Item not found');
      return;
    }
    
    // Simulate what the backend receives in the update payload
    const payload = {
      name: item.name,
      defaultPrice: 4.5,
      categoryId: item.categoryId,
      posCategoryId: null,
      useInInvoices: true,
      useInExpenses: true,
      exemptTaxes: [],
      itemType: "none",
      trackStock: false,
      unit: "pcs",
      reorderLevel: 0,
      costPrice: 0,
      ingredients: []
    };
    
    const { categoryId, exemptTaxes, ingredients, ...rest } = payload;
    
    await prisma.item.update({
      where: { id: item.id },
      data: {
        ...rest,
        ...(categoryId && { category: { connect: { id: categoryId } } }),
      }
    });
    console.log('OK - Update Succeeded');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
