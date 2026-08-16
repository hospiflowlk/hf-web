const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testUpdate() {
  try {
    const id = "5d7dc7d0-d7ca-4690-91a5-9d93bfbf8ac9"; // from user's screenshot
    const oldAccount = await prisma.account.findUnique({ where: { id } });
    console.log("Found old account?", !!oldAccount);

    const dto = {
        name: "CIH LKR",
        currency: "LKR",
        type: "Cash",
        balance: 500000,
        startingBalance: 0,
        cardChargePercent: 0,
        onlineTransferFee: 0,
        isCardAccount: false,
        isLiquid: true,
        isStarred: false,
        isActive: true,
        feeCategoryId: null,
        feeSupplierId: null,
        startingBalanceDate: null
      };

    const data = { ...dto };
    if (data.startingBalanceDate) {
      data.startingBalanceDate = new Date(data.startingBalanceDate);
    }

    const newAccount = await prisma.account.update({ where: { id, isDeleted: false }, data });
    
    const userId = "test-user-id"; // Dummy
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'UPDATE',
        entity: 'Account',
        entityId: id,
        oldValue: oldAccount ? JSON.stringify(oldAccount) : undefined,
        newValue: newAccount ? JSON.stringify(newAccount) : undefined,
      },
    });

    console.log("Updated account successfully!", newAccount.id);
  } catch (err) {
    console.error("Prisma Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testUpdate();
