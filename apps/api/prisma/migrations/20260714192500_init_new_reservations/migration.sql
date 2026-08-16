-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "InventoryItem";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Currency" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "isBase" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CurrencyRateHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "currencyCode" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CurrencyRateHistory_currencyCode_fkey" FOREIGN KEY ("currencyCode") REFERENCES "Currency" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "baseCurrencyCode" TEXT NOT NULL DEFAULT 'LKR',
    "invoiceDefaultCurrency" TEXT NOT NULL DEFAULT 'USD',
    "expenseDefaultCurrency" TEXT NOT NULL DEFAULT 'LKR',
    "reportDefaultCurrency" TEXT NOT NULL DEFAULT 'LKR',
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isRevenue" BOOLEAN NOT NULL DEFAULT false,
    "isExpense" BOOLEAN NOT NULL DEFAULT true,
    "isAsset" BOOLEAN NOT NULL DEFAULT false,
    "isLiability" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'Other',
    "calculationBase" TEXT NOT NULL DEFAULT 'Net',
    "calculationOrder" INTEGER NOT NULL DEFAULT 1,
    "isTurnoverTax" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "categoryId" TEXT,
    "defaultPrice" REAL DEFAULT 0.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "useInInvoices" BOOLEAN NOT NULL DEFAULT true,
    "useInExpenses" BOOLEAN NOT NULL DEFAULT true,
    "itemType" TEXT NOT NULL DEFAULT 'none',
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "stockQuantity" REAL NOT NULL DEFAULT 0.0,
    "reorderLevel" REAL NOT NULL DEFAULT 0.0,
    "costPrice" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ItemIngredient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "compositeItemId" TEXT NOT NULL,
    "ingredientItemId" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    CONSTRAINT "ItemIngredient_compositeItemId_fkey" FOREIGN KEY ("compositeItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ItemIngredient_ingredientItemId_fkey" FOREIGN KEY ("ingredientItemId") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "bankName" TEXT,
    "accountName" TEXT,
    "accountNumber" TEXT,
    "branch" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "taxNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BusinessSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "commissionRate" REAL NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RoomCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CLEAN',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Room_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoomCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RoomOutOfOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roomId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "resolvedAt" DATETIME,
    "resolvedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    CONSTRAINT "RoomOutOfOrder_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RoomOutOfOrder_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RoomOutOfOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "RoomOutOfOrder_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Guest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "documentId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "LegacyReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT,
    "roomId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "checkIn" DATETIME NOT NULL,
    "checkOut" DATETIME NOT NULL,
    "source" TEXT,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "companyName" TEXT,
    "contactPerson" TEXT,
    "releaseDate" DATETIME,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegacyReservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "LegacyReservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guestId" TEXT,
    "roomId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "tax" REAL NOT NULL DEFAULT 0,
    "total" REAL NOT NULL DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'LKR',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "originalTotal" REAL,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNum" TEXT NOT NULL,
    "guestName" TEXT,
    "guestPhone" TEXT,
    "guestEmail" TEXT,
    "guestAddress" TEXT,
    "guestTinVat" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "roundOff" REAL NOT NULL DEFAULT 0.0,
    "globalDiscount" REAL NOT NULL DEFAULT 0.0,
    "totalAmount" REAL NOT NULL,
    "invoiceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "businessSource" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "InvoiceSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "cardChargeAmount" REAL NOT NULL DEFAULT 0.0,
    "paidDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "InvoiceSettlement_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceSettlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceId" TEXT NOT NULL,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" REAL NOT NULL,
    "unitPrice" REAL NOT NULL,
    "discountType" TEXT,
    "discountValue" REAL,
    "taxIds" TEXT,
    "netAmount" REAL,
    "scAmount" REAL,
    "vatAmount" REAL,
    "total" REAL NOT NULL,
    CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "InvoiceItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "supplierId" TEXT,
    "reference" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "status" TEXT NOT NULL,
    "roundOff" REAL NOT NULL DEFAULT 0.0,
    "totalAmount" REAL NOT NULL,
    "description" TEXT,
    "note" TEXT,
    "expenseDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Expense_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "itemId" TEXT,
    "categoryId" TEXT NOT NULL,
    "description" TEXT,
    "quantity" REAL NOT NULL DEFAULT 1.0,
    "unitPrice" REAL NOT NULL,
    "vatAmount" REAL NOT NULL DEFAULT 0.0,
    "amount" REAL NOT NULL,
    "lineTotal" REAL NOT NULL,
    "note" TEXT,
    CONSTRAINT "ExpenseItem_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ExpenseItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpenseSettlement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expenseId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "amountPaid" REAL NOT NULL,
    "reference" TEXT,
    "batchId" TEXT,
    "paidDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "ExpenseSettlement_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ExpenseSettlement_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "maxActiveRooms" INTEGER NOT NULL DEFAULT 20,
    "defaultCheckInTime" TEXT NOT NULL DEFAULT '14:00',
    "defaultCheckOutTime" TEXT NOT NULL DEFAULT '12:00',
    "tentativeBlocksInventory" BOOLEAN NOT NULL DEFAULT true,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Colombo',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingReference" TEXT,
    "bookingSource" TEXT NOT NULL DEFAULT 'DIRECT_LOCAL',
    "travelAgent" TEXT,
    "tourNo" TEXT,
    "groupName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "checkInDatetime" DATETIME NOT NULL,
    "checkOutDatetime" DATETIME NOT NULL,
    "isDayRoom" BOOLEAN NOT NULL DEFAULT false,
    "ratePlan" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "mealPlan" TEXT,
    "parentTotalMinor" INTEGER NOT NULL DEFAULT 0,
    "guestId" TEXT,
    "guestTitle" TEXT,
    "guestName" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "country" TEXT,
    "guestRemarks" TEXT,
    "internalRemarks" TEXT,
    "externalBookingId" TEXT,
    "channelName" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'NOT_APPLICABLE',
    "lastSyncedAt" DATETIME,
    "channelPayloadJson" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "cancelledAt" DATETIME,
    "cancellationReason" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "cancelledById" TEXT,
    CONSTRAINT "Reservation_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationRoomAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "checkInDatetime" DATETIME NOT NULL,
    "checkOutDatetime" DATETIME NOT NULL,
    "usesCustomStayDates" BOOLEAN NOT NULL DEFAULT false,
    "occupancy" INTEGER NOT NULL DEFAULT 1,
    "bedType" TEXT,
    "adults" INTEGER NOT NULL DEFAULT 1,
    "children" INTEGER NOT NULL DEFAULT 0,
    "rateAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "totalAmountMinor" INTEGER NOT NULL DEFAULT 0,
    "isFoc" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ReservationRoomAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationRoomAllocation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ItemTaxExemptions" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ItemTaxExemptions_A_fkey" FOREIGN KEY ("A") REFERENCES "Item" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ItemTaxExemptions_B_fkey" FOREIGN KEY ("B") REFERENCES "Tax" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'LKR',
    "type" TEXT NOT NULL DEFAULT 'Bank',
    "balance" REAL NOT NULL DEFAULT 0.0,
    "startingBalance" REAL NOT NULL DEFAULT 0.0,
    "startingBalanceDate" DATETIME,
    "cardChargePercent" REAL NOT NULL DEFAULT 0.0,
    "onlineTransferFee" REAL NOT NULL DEFAULT 0.0,
    "isCardAccount" BOOLEAN NOT NULL DEFAULT false,
    "isCardPaymentPriority" BOOLEAN NOT NULL DEFAULT false,
    "isLiquid" BOOLEAN NOT NULL DEFAULT true,
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "feeCategoryId" TEXT,
    "feeSupplierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Account_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Account_feeSupplierId_fkey" FOREIGN KEY ("feeSupplierId") REFERENCES "Supplier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Account" ("balance", "createdAt", "id", "isDeleted", "name", "type", "updatedAt") SELECT "balance", "createdAt", "id", "isDeleted", "name", "type", "updatedAt" FROM "Account";
DROP TABLE "Account";
ALTER TABLE "new_Account" RENAME TO "Account";
CREATE UNIQUE INDEX "Account_name_key" ON "Account"("name");
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "currencyCode" TEXT NOT NULL DEFAULT 'LKR',
    "exchangeRate" REAL NOT NULL DEFAULT 1.0,
    "originalAmount" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Transaction" ("accountId", "amount", "category", "createdAt", "date", "description", "id", "isDeleted", "updatedAt") SELECT "accountId", "amount", "category", "createdAt", "date", "description", "id", "isDeleted", "updatedAt" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Tax_name_key" ON "Tax"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Item_name_key" ON "Item"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_name_key" ON "Supplier"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_name_key" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessSource_name_key" ON "BusinessSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Room_number_key" ON "Room"("number");

-- CreateIndex
CREATE INDEX "RoomOutOfOrder_roomId_startDate_idx" ON "RoomOutOfOrder"("roomId", "startDate");

-- CreateIndex
CREATE INDEX "RoomOutOfOrder_roomId_endDate_idx" ON "RoomOutOfOrder"("roomId", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNum_key" ON "Invoice"("invoiceNum");

-- CreateIndex
CREATE INDEX "Reservation_checkInDatetime_idx" ON "Reservation"("checkInDatetime");

-- CreateIndex
CREATE INDEX "Reservation_checkOutDatetime_idx" ON "Reservation"("checkOutDatetime");

-- CreateIndex
CREATE INDEX "Reservation_status_idx" ON "Reservation"("status");

-- CreateIndex
CREATE INDEX "Reservation_bookingReference_idx" ON "Reservation"("bookingReference");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_channelName_externalBookingId_key" ON "Reservation"("channelName", "externalBookingId");

-- CreateIndex
CREATE INDEX "ReservationRoomAllocation_reservationId_idx" ON "ReservationRoomAllocation"("reservationId");

-- CreateIndex
CREATE INDEX "ReservationRoomAllocation_roomId_idx" ON "ReservationRoomAllocation"("roomId");

-- CreateIndex
CREATE INDEX "ReservationRoomAllocation_roomId_checkInDatetime_idx" ON "ReservationRoomAllocation"("roomId", "checkInDatetime");

-- CreateIndex
CREATE INDEX "ReservationRoomAllocation_roomId_checkOutDatetime_idx" ON "ReservationRoomAllocation"("roomId", "checkOutDatetime");

-- CreateIndex
CREATE INDEX "ReservationRoomAllocation_checkInDatetime_checkOutDatetime_idx" ON "ReservationRoomAllocation"("checkInDatetime", "checkOutDatetime");

-- CreateIndex
CREATE UNIQUE INDEX "_ItemTaxExemptions_AB_unique" ON "_ItemTaxExemptions"("A", "B");

-- CreateIndex
CREATE INDEX "_ItemTaxExemptions_B_index" ON "_ItemTaxExemptions"("B");

