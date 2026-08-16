"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileText, ShoppingCart, Info, Package, Plus, ArrowRightLeft, Wallet, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
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
  const [bankBalance, setBankBalance] = useState(361630.78);
  const [usdBalance, setUsdBalance] = useState(681.28);
  const [cashAvailable, setCashAvailable] = useState(4885113.41);
  const [lowStockCount, setLowStockCount] = useState(5);

  useEffect(() => {
    // Fetch real data for Accounts and Inventory
    const loadData = async () => {
      try {
        const [accRes, invRes] = await Promise.all([
          api.get("/accounting/accounts").catch(() => ({ data: [] })),
          api.get("/inventory").catch(() => ({ data: [] }))
        ]);

        const accounts = accRes.data;
        const mainBank = accounts.find((a: any) => a.name.includes("Bank"));
        if (mainBank) {
          setBankBalance(mainBank.balance);
          setCashAvailable(mainBank.balance + (usdBalance * 334.67)); // rough calc
        }

        const items = invRes.data;
        const lowStock = items.filter((i: any) => i.quantity < 5).length;
        setLowStockCount(lowStock);
      } catch (err) {
        console.error("Failed to load dashboard data", err);
      }
    };
    loadData();
  }, [usdBalance]);

  return (
    <div className="space-y-6">
      
      {/* Alerts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unpaid Invoices */}
        <div className="bg-red-50/50 border-l-4 border-l-red-500 border border-red-100 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-500 w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground font-medium">Unpaid Invoices</p>
            <p className="font-bold text-gray-900">1 invoices</p>
            <p className="text-xs text-muted-foreground mt-1">USD 67.32 • LKR 0.00</p>
          </div>
        </div>

        {/* Unpaid Expenses */}
        <div className="bg-red-50/50 border-l-4 border-l-red-500 border border-red-100 rounded-lg p-4 flex items-start gap-3">
          <FileText className="text-red-500 w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground font-medium">Unpaid Expenses</p>
            <p className="font-bold text-gray-900">9 expenses</p>
            <p className="text-xs text-muted-foreground mt-1">LKR 344,995.91</p>
          </div>
        </div>

        {/* Source Commissions */}
        <div className="bg-blue-50/50 border-l-4 border-l-blue-500 border border-blue-100 rounded-lg p-4 flex items-start gap-3">
          <Info className="text-blue-500 w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground font-medium">Source Commissions</p>
            <p className="font-bold text-gray-900">Commission due</p>
            <p className="text-xs text-muted-foreground mt-1">USD 182.53 • LKR 0.00</p>
          </div>
        </div>

        {/* Low Stock */}
        <div className="bg-orange-50/50 border-l-4 border-l-orange-500 border border-orange-100 rounded-lg p-4 flex items-start gap-3">
          <Package className="text-orange-500 w-5 h-5 mt-0.5" />
          <div>
            <p className="text-sm text-muted-foreground font-medium">Low Stock</p>
            <p className="font-bold text-gray-900">{lowStockCount} items</p>
            <p className="text-xs text-muted-foreground mt-1">Needs replenishment</p>
          </div>
        </div>
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
              <Button className="bg-primary hover:bg-primary/90 text-white rounded-md px-6 shadow-sm">
                <Plus className="w-4 h-4 mr-2" /> New Expense
              </Button>
              <Button className="bg-slate-600 hover:bg-slate-700 text-white rounded-md px-6 shadow-sm">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> New Transfer
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-4">
              <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                <FileText className="w-4 h-4 mr-2" /> Invoices
              </Button>
              <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                <ShoppingCart className="w-4 h-4 mr-2" /> Expenses
              </Button>
              <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                <ArrowRightLeft className="w-4 h-4 mr-2" /> Transfers
              </Button>
              <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                <Wallet className="w-4 h-4 mr-2" /> Advances
              </Button>
              <Button variant="outline" className="bg-white rounded-md text-gray-600 font-medium">
                <Package className="w-4 h-4 mr-2" /> Inventory
              </Button>
            </div>
          </div>

          {/* Financial Trends Chart */}
          <Card className="shadow-sm border-border rounded-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-700">Financial Trends</CardTitle>
              <CardDescription>Revenue vs Expenses (Last 6 Months)</CardDescription>
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
            <a href="/accounting" className="text-sm font-medium text-emerald-600 hover:text-emerald-700">All Accounts</a>
          </div>

          {/* Account Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="shadow-sm border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">SB LKR</p>
                  <p className="text-[10px] text-muted-foreground">LKR {bankBalance.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-border rounded-xl hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800">SB USD</p>
                  <p className="text-[10px] text-muted-foreground">USD {usdBalance.toLocaleString()}</p>
                </div>
              </CardContent>
            </Card>
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
              <p className="font-bold text-lg">LKR {cashAvailable.toLocaleString()}</p>
              <p className="text-[10px] text-white/70">Rate: 334.67</p>
            </div>
          </div>

          {/* Profit Overview */}
          <Card className="shadow-sm border-border rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold text-gray-800">Profit Overview <span className="text-xs text-muted-foreground font-normal">(This Month)</span></h3>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Revenue</span>
                <span className="text-emerald-600 font-bold">LKR 584,388.30</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Expenses</span>
                <span className="text-red-500 font-bold">LKR 604,954.53</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium">Net Profit</span>
                <span className="text-blue-600 font-bold">LKR -20,566.23</span>
              </div>
            </CardContent>
          </Card>

          {/* Cash Flow */}
          <Card className="shadow-sm border-border rounded-xl">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-emerald-500 bg-emerald-50 rounded" />
                <h3 className="font-semibold text-gray-800">Cash Flow <span className="text-xs text-muted-foreground font-normal">(This Month)</span></h3>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Cash In</span>
                <span className="text-emerald-600 font-bold">LKR 564,744.90</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 font-medium">Cash Out</span>
                <span className="text-red-500 font-bold">LKR 441,760.41</span>
              </div>
              <div className="pt-3 border-t border-border flex justify-between items-center text-sm">
                <span className="text-blue-600 font-medium">Net Cash Flow</span>
                <span className="text-blue-600 font-bold">LKR 122,984.49</span>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

    </div>
  );
}
