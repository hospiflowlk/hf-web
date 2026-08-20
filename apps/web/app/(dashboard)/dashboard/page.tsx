"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, ShoppingCart, Info, Package, Plus, ArrowRightLeft, Wallet, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import api from "@/lib/api";

const chartData = [
  { name: 'Jan', Revenue: 0, Expenses: 0 },
  { name: 'Feb', Revenue: 2600000, Expenses: 2200000 },
  { name: 'Mar', Revenue: 3800000, Expenses: 3800000 },
  { name: 'Apr', Revenue: 4200000, Expenses: 3200000 },
  { name: 'May', Revenue: 1500000, Expenses: 1800000 },
  { name: 'Jun', Revenue: 500000, Expenses: 500000 },
];

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [bankBalance, setBankBalance] = useState(0);
  const [usdBalance, setUsdBalance] = useState(0);
  const [cashAvailable, setCashAvailable] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);

  const [invoiceSummary, setInvoiceSummary] = useState({
    unpaidCount: 0,
    unpaidTotal: 0,
    paidTotal: 0,
  });

  const [expenseSummary, setExpenseSummary] = useState({
    unpaidCount: 0,
    unpaidTotal: 0,
    paidTotal: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [accRes, invRes, invSumRes, expSumRes] = await Promise.all([
          api.get("/accounting/accounts").catch(() => ({ data: [] })),
          api.get("/inventory").catch(() => ({ data: [] })),
          api.get("/invoices/summary").catch(() => ({ data: { unpaid: { count: 0, total: 0 }, paid: { total: 0 } } })),
          api.get("/expenses/summary").catch(() => ({ data: { unpaid: { count: 0, total: 0 }, paid: { total: 0 } } })),
        ]);

        const accList = accRes.data || [];
        setAccounts(accList);

        const mainLkrBank = accList.find((a: any) => (a.currency === 'LKR' || !a.currency) && a.name.toLowerCase().includes('bank')) || accList[0];
        const mainUsdAccount = accList.find((a: any) => a.currency === 'USD');

        const totalCash = accList.reduce((sum: number, a: any) => sum + (parseFloat(a.balance) || 0), 0);
        setCashAvailable(totalCash);

        if (mainLkrBank) setBankBalance(mainLkrBank.balance || 0);
        if (mainUsdAccount) setUsdBalance(mainUsdAccount.balance || 0);

        const items = invRes.data || [];
        const lowStock = items.filter((i: any) => (i.stockQuantity || i.quantity || 0) < 5).length;
        setLowStockCount(lowStock);

        if (invSumRes.data) {
          setInvoiceSummary({
            unpaidCount: (invSumRes.data.unpaid?.count || 0) + (invSumRes.data.partial?.count || 0),
            unpaidTotal: (invSumRes.data.unpaid?.total || 0) + (invSumRes.data.partial?.total || 0),
            paidTotal: invSumRes.data.paid?.total || 0,
          });
        }

        if (expSumRes.data) {
          setExpenseSummary({
            unpaidCount: (expSumRes.data.unpaid?.count || 0) + (expSumRes.data.partial?.count || 0),
            unpaidTotal: (expSumRes.data.unpaid?.total || 0) + (expSumRes.data.partial?.total || 0),
            paidTotal: expSumRes.data.paid?.total || 0,
          });
        }
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    loadData();
  }, []);

  const netProfit = invoiceSummary.paidTotal - expenseSummary.paidTotal;

  return (
    <div className="space-y-6">
      
      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unpaid Invoices */}
        <Link href="/invoices" className="block">
          <div className="bg-red-50/50 border-l-4 border-l-red-500 border border-red-100 rounded-lg p-4 flex items-start gap-3 hover:bg-red-50 transition-colors">
            <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Unpaid Invoices</p>
              <p className="font-bold text-gray-900">{invoiceSummary.unpaidCount} invoice{invoiceSummary.unpaidCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground mt-1">Total: LKR {invoiceSummary.unpaidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Link>

        {/* Unpaid Expenses */}
        <Link href="/expenses" className="block">
          <div className="bg-red-50/50 border-l-4 border-l-red-500 border border-red-100 rounded-lg p-4 flex items-start gap-3 hover:bg-red-50 transition-colors">
            <FileText className="text-red-500 w-5 h-5 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Unpaid Expenses</p>
              <p className="font-bold text-gray-900">{expenseSummary.unpaidCount} expense{expenseSummary.unpaidCount !== 1 ? 's' : ''}</p>
              <p className="text-xs text-muted-foreground mt-1">LKR {expenseSummary.unpaidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </Link>

        {/* Source Commissions */}
        <div className="bg-blue-50/50 border-l-4 border-blue-500 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <Info className="text-blue-500 w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground font-medium">Source Commissions</p>
            <p className="font-bold text-gray-900">Commission due</p>
            <p className="text-xs text-muted-foreground mt-1">Direct & OTA channels</p>
          </div>
        </div>

        {/* Low Stock */}
        <Link href="/inventory" className="block">
          <div className="bg-orange-50/50 border-l-4 border-orange-500 border border-orange-100 rounded-lg p-4 flex items-start gap-3 hover:bg-orange-50 transition-colors">
            <Package className="text-orange-500 w-5 h-5 mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground font-medium">Low Stock</p>
              <p className="font-bold text-gray-900">{lowStockCount} items</p>
              <p className="text-xs text-muted-foreground mt-1">Needs replenishment</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left Column (Charts & Actions) */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Quick Actions */}
          <div>
            <h2 className="text-lg font-semibold text-gray-700 mb-3">Quick Actions</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/invoices/new">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-md px-6 shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> New Invoice
                </Button>
              </Link>
              <Link href="/expenses/new">
                <Button className="bg-primary hover:bg-primary/90 text-white rounded-md px-6 shadow-sm">
                  <Plus className="w-4 h-4 mr-2" /> New Expense
                </Button>
              </Link>
              <Link href="/accounting">
                <Button className="bg-slate-600 hover:bg-slate-700 text-white rounded-md px-6 shadow-sm">
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> New Transfer
                </Button>
              </Link>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/invoices">
                <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                  <FileText className="w-4 h-4 mr-2" /> Invoices
                </Button>
              </Link>
              <Link href="/expenses">
                <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                  <ShoppingCart className="w-4 h-4 mr-2" /> Expenses
                </Button>
              </Link>
              <Link href="/accounting">
                <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                  <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfers
                </Button>
              </Link>
              <Link href="/accounting">
                <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                  <Wallet className="w-4 h-4 mr-2" /> Accounts
                </Button>
              </Link>
              <Link href="/inventory">
                <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                  <Package className="w-4 h-4 mr-2" /> Inventory
                </Button>
              </Link>
            </div>
          </div>

          {/* Financial Trends Chart */}
          <Card className="shadow-sm border-border rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-700">Financial Trends</CardTitle>
              <CardDescription>Revenue vs Expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280', fontSize: 12}} dy={10} />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#6B7280', fontSize: 12}}
                      tickFormatter={(value) => `${value / 1000000}M`}
                    />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                    <Bar dataKey="Revenue" fill="#22C55E" radius={[2, 2, 0, 0]} maxBarSize={15} />
                    <Bar dataKey="Expenses" fill="#EF4444" radius={[2, 2, 0, 0]} maxBarSize={15} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Right Column (Accounts & Summaries) */}
        <div className="space-y-6">
          
          {/* Accounts Header */}
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Accounts</h2>
            <Link href="/accounting" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">All Accounts</Link>
          </div>

          {/* Account Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Link href="/accounting">
              <Card className="shadow-sm border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">SB LKR</p>
                    <p className="text-[10px] text-muted-foreground">LKR {bankBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            
            <Link href="/accounting">
              <Card className="shadow-sm border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800">SB USD</p>
                    <p className="text-[10px] text-muted-foreground">USD {usdBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Total Cash */}
          <div className="bg-primary rounded-xl p-4 text-white shadow-md flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-white/20 flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm">Total Cash Available</span>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">LKR {cashAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              <p className="text-[10px] text-white/70">{accounts.length} Active Accounts</p>
            </div>
          </div>

          {/* Profit Overview */}
          <Card className="shadow-sm border-border rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">Profit Overview</h3>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Collected Revenue</span>
                <span className="text-emerald-600 font-bold">LKR {invoiceSummary.paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Settled Expenses</span>
                <span className="text-red-500 font-bold">LKR {expenseSummary.paidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium">Net Profit</span>
                <span className={`font-bold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  LKR {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow */}
          <Card className="shadow-sm border-border rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-emerald-500 bg-emerald-50 rounded" />
                <h3 className="font-semibold text-gray-800">Cash Flow</h3>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Total Cash Balance</span>
                <span className="text-emerald-600 font-bold">LKR {cashAvailable.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Pending Receivables</span>
                <span className="text-blue-600 font-bold">LKR {invoiceSummary.unpaidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center text-sm">
                <span className="text-slate-600 font-medium">Pending Payables</span>
                <span className="text-red-500 font-bold">LKR {expenseSummary.unpaidTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}
