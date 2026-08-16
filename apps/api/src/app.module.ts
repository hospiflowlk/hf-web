import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { AccountingModule } from './accounting/accounting.module';
import { PayrollModule } from './payroll/payroll.module';
import { RoomsModule } from './rooms/rooms.module';
import { OrdersModule } from './orders/orders.module';
import { ItemsModule } from './items/items.module';
import { CategoriesModule } from './categories/categories.module';
import { TaxesModule } from './taxes/taxes.module';
import { SettingsModule } from './settings/settings.module';
import { CurrenciesModule } from './currencies/currencies.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { CustomersModule } from './customers/customers.module';
import { BusinessSourcesModule } from './business-sources/business-sources.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReservationsModule } from './reservations/reservations.module';
import { PosCategoriesModule } from './pos-categories/pos-categories.module';
import { InventoryModule } from './inventory/inventory.module';
import { WalkInModule } from './walk-in/walk-in.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, AuditModule, AccountingModule, PayrollModule, RoomsModule, OrdersModule, ItemsModule, CategoriesModule, TaxesModule, SettingsModule, CurrenciesModule, SuppliersModule, CustomersModule, BusinessSourcesModule, InvoicesModule, ExpensesModule, ReservationsModule, PosCategoriesModule, InventoryModule, WalkInModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
