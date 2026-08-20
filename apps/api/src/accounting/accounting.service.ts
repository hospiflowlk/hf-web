import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { AuditService } from '../audit/audit.service';

const round2 = (val: any) => Number((parseFloat(val) || 0).toFixed(2));

// Simple in-process TTL cache for the accounts list
// Invalidated on any create/update/delete so data stays consistent
interface CacheEntry<T> { data: T; expiresAt: number }

function createCache<T>(ttlMs: number) {
  let entry: CacheEntry<T> | null = null;
  return {
    get(): T | null {
      if (entry && Date.now() < entry.expiresAt) return entry.data;
      return null;
    },
    set(data: T) {
      entry = { data, expiresAt: Date.now() + ttlMs };
    },
    invalidate() {
      entry = null;
    },
  };
}

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // 30-second TTL cache — accounts change rarely, but we must invalidate on writes
  private accountsCache = createCache<any[]>(30_000);

  async createAccount(userId: string, dto: CreateAccountDto) {
    const data: any = { ...dto };
    if (data.balance) data.balance = round2(data.balance);
    if (data.startingBalance) data.startingBalance = round2(data.startingBalance);
    if (data.startingBalanceDate) {
      data.startingBalanceDate = new Date(data.startingBalanceDate);
    }
    const account = await this.prisma.account.create({ data });
    this.accountsCache.invalidate();
    await this.audit.logAction(userId, 'CREATE', 'Account', account.id, null, account);
    return account;
  }

  async getAccounts() {
    const cached = this.accountsCache.get();
    if (cached) return cached;

    const accounts = await this.prisma.account.findMany({
      where: { isDeleted: false },
      include: { feeCategory: true, feeSupplier: true }
    });
    this.accountsCache.set(accounts);
    return accounts;
  }

  async getAccountStatement(id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    if (!account) throw new NotFoundException('Account not found');

    // --- FIX: Run all 3 queries in parallel instead of sequentially ---
    // Use `select` to fetch only the fields we actually use, not full Invoice/Expense records
    const [transactions, settlements, expenseSettlements] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { accountId: id, isDeleted: false },
        orderBy: { date: 'asc' },
      }),
      this.prisma.invoiceSettlement.findMany({
        where: { accountId: id },
        select: {
          id: true,
          paidDate: true,
          amount: true,
          exchangeRate: true,
          cardChargeAmount: true,
          note: true,
          invoice: { select: { invoiceNum: true } },
        },
        orderBy: { paidDate: 'asc' },
      }),
      this.prisma.expenseSettlement.findMany({
        where: { accountId: id },
        select: {
          id: true,
          paidDate: true,
          amount: true,
          amountPaid: true,
          reference: true,
          expenseId: true,
          expense: { select: { reference: true } },
        },
        orderBy: { paidDate: 'asc' },
      }),
    ]);

    const statementEntries: any[] = [];

    transactions.forEach(t => {
      statementEntries.push({
        id: t.id,
        date: t.date,
        type: 'Transaction',
        category: t.category,
        description: t.description || 'Manual Transaction',
        amount: round2(t.amount),
        debit: t.amount > 0 ? round2(t.amount) : 0,
        credit: t.amount < 0 ? round2(Math.abs(t.amount)) : 0,
      });
    });

    settlements.forEach(s => {
      const netAmount = (s.amount * s.exchangeRate) - s.cardChargeAmount;
      statementEntries.push({
        id: s.id,
        date: s.paidDate,
        type: 'Invoice Settlement',
        category: 'Sales',
        description: `Payment for Invoice #${s.invoice.invoiceNum}` + (s.note ? ` - ${s.note}` : ''),
        amount: netAmount,
        debit: netAmount > 0 ? netAmount : 0,
        credit: netAmount < 0 ? Math.abs(netAmount) : 0,
        details: {
           invoiceNum: s.invoice.invoiceNum,
           paidAmount: s.amount,
           exchangeRate: s.exchangeRate,
           cardCharge: s.cardChargeAmount
        }
      });
    });

    expenseSettlements.forEach(s => {
      const netAmount = -s.amountPaid;
      statementEntries.push({
        id: s.id,
        date: s.paidDate,
        type: 'Expense Settlement',
        category: 'Expense',
        description: `Payment for Expense ${s.expense.reference ? '#' + s.expense.reference : ''}` + (s.reference ? ` (Ref: ${s.reference})` : ''),
        amount: netAmount,
        debit: netAmount > 0 ? netAmount : 0,
        credit: netAmount < 0 ? Math.abs(netAmount) : 0,
        details: {
           expenseId: s.expenseId,
           paidAmount: s.amountPaid,
           settlementRef: s.reference,
           originalAmount: s.amount,
           exchangeRate: s.amountPaid > 0 && s.amount !== s.amountPaid ? Number((s.amount / s.amountPaid).toFixed(4)) : 1.0
        }
      });
    });

    statementEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalTransactions = statementEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const calculatedStartingBalance = round2(account.balance - totalTransactions);

    let runningBalance = calculatedStartingBalance;
    const result: any[] = [];

    if (calculatedStartingBalance !== 0 || account.startingBalanceDate || statementEntries.length > 0) {
       result.push({
          id: 'start',
          date: account.startingBalanceDate || account.createdAt,
          type: 'Opening Balance',
          description: 'Opening Balance',
          debit: calculatedStartingBalance > 0 ? round2(calculatedStartingBalance) : 0,
          credit: calculatedStartingBalance < 0 ? round2(Math.abs(calculatedStartingBalance)) : 0,
          balance: runningBalance
       });
    }

    statementEntries.forEach(entry => {
       runningBalance = round2(runningBalance + entry.amount);
       result.push({
         ...entry,
         balance: runningBalance
       });
    });

    return {
      account,
      statement: result,
      closingBalance: runningBalance
    };
  }

  async updateAccount(userId: string, id: string, dto: UpdateAccountDto) {
    try {
      const oldAccount = await this.prisma.account.findUnique({ where: { id } });
      if (!oldAccount) throw new NotFoundException('Account not found');
      
      const data: any = { ...dto };
      if (data.balance !== undefined) data.balance = round2(data.balance);
      if (data.startingBalance !== undefined) data.startingBalance = round2(data.startingBalance);
      if (data.startingBalanceDate) {
        data.startingBalanceDate = new Date(data.startingBalanceDate);
      }

      const newAccount = await this.prisma.account.update({ where: { id, isDeleted: false }, data });
      this.accountsCache.invalidate();
      await this.audit.logAction(userId, 'UPDATE', 'Account', id, oldAccount, newAccount);
      return newAccount;
    } catch (e: any) {
      throw new InternalServerErrorException(e.message || e.toString());
    }
  }

  async softDeleteAccount(userId: string, id: string) {
    const oldAccount = await this.prisma.account.findUnique({ where: { id } });
    if (!oldAccount) throw new NotFoundException('Account not found');
    
    const newAccount = await this.prisma.account.update({
      where: { id },
      data: { isDeleted: true },
    });

    this.accountsCache.invalidate();
    await this.audit.logAction(userId, 'SOFT_DELETE', 'Account', id, oldAccount, newAccount);
    return newAccount;
  }

  async createTransaction(userId: string, dto: CreateTransactionDto) {
    const amount = round2(dto.amount);
    
    const trx = await this.prisma.$transaction(async (prisma) => {
      const createdTrx = await prisma.transaction.create({ 
        data: {
          ...dto,
          amount
        }
      });
      await prisma.account.update({
        where: { id: dto.accountId },
        data: { balance: { increment: amount } }
      });
      return createdTrx;
    });

    this.accountsCache.invalidate();
    await this.audit.logAction(userId, 'CREATE', 'Transaction', trx.id, null, trx);
    return trx;
  }

  async getTransactions() {
    return this.prisma.transaction.findMany({ where: { isDeleted: false }, include: { account: true } });
  }

  async updateTransaction(userId: string, id: string, dto: UpdateTransactionDto) {
    const oldTrx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!oldTrx) throw new NotFoundException('Transaction not found');
    
    const newTrx = await this.prisma.transaction.update({ where: { id, isDeleted: false }, data: dto });
    this.accountsCache.invalidate();
    await this.audit.logAction(userId, 'UPDATE', 'Transaction', id, oldTrx, newTrx);
    return newTrx;
  }

  async softDeleteTransaction(userId: string, id: string) {
    const oldTrx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!oldTrx || oldTrx.isDeleted) throw new NotFoundException('Transaction not found');

    const newTrx = await this.prisma.$transaction(async (prisma) => {
      const deletedTrx = await prisma.transaction.update({
        where: { id },
        data: { isDeleted: true },
      });
      await prisma.account.update({
        where: { id: oldTrx.accountId },
        data: { balance: { decrement: oldTrx.amount } }
      });
      return deletedTrx;
    });

    this.accountsCache.invalidate();
    await this.audit.logAction(userId, 'SOFT_DELETE', 'Transaction', id, oldTrx, newTrx);
    return newTrx;
  }
}
