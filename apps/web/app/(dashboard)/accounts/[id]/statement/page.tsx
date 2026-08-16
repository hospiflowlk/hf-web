"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "@/lib/api";
import { format } from "date-fns";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, FileText, Wallet, Landmark, CreditCard, Loader2, Download, Search, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export default function AccountStatementPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return {
      from: firstDay,
      to: lastDay
    };
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchStatement();
    }
  }, [params.id]);

  const fetchStatement = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/accounting/accounts/${params.id}/statement`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load statement", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!data || !data.account) {
    return (
      <div className="p-8 text-center text-slate-500">
        Account not found or failed to load.
      </div>
    );
  }

  const { account, statement, closingBalance } = data;

  // Filter statement
  let filteredStatement = statement || [];
  if (dateRange?.from) {
    filteredStatement = filteredStatement.filter((r: any) => new Date(r.date) >= dateRange.from!);
  }
  if (dateRange?.to) {
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999);
    filteredStatement = filteredStatement.filter((r: any) => new Date(r.date) <= toDate);
  }
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filteredStatement = filteredStatement.filter((r: any) => 
      (r.description || "").toLowerCase().includes(q) ||
      (r.type || "").toLowerCase().includes(q) ||
      (r.debit?.toString() || "").includes(q) ||
      (r.credit?.toString() || "").includes(q) ||
      (r.details?.invoiceNum || "").toLowerCase().includes(q)
    );
  }

  // Calculate totals for summary cards based on filtered data
  const actualFilteredIn = filteredStatement.filter((r: any) => r.type !== 'Opening Balance').reduce((sum: number, row: any) => sum + (row.debit || 0), 0);
  const actualFilteredOut = filteredStatement.filter((r: any) => r.type !== 'Opening Balance').reduce((sum: number, row: any) => sum + (row.credit || 0), 0);
  
  const openingBal = filteredStatement.length > 0 
    ? filteredStatement[0].balance - (filteredStatement[0].debit || 0) + (filteredStatement[0].credit || 0)
    : account.startingBalance;
    
  const closingBal = filteredStatement.length > 0
    ? filteredStatement[filteredStatement.length - 1].balance
    : openingBal;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-start gap-4">
          <button 
            onClick={() => router.push('/accounts')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 mt-1"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1.5 rounded-md ${account.isCardAccount ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
                {account.isCardAccount ? <CreditCard className="w-4 h-4" /> : <Wallet className="w-4 h-4" />}
              </div>
              <h1 className="text-2xl font-bold text-slate-900">{account.name}</h1>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                {account.type}
              </span>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <Landmark className="w-3.5 h-3.5" /> Account Statement
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-[#eafaf4] border border-teal-100/50 rounded-lg p-4 flex flex-col md:flex-row justify-between items-center gap-4 text-center divide-y md:divide-y-0 md:divide-x divide-teal-200/50 shadow-sm">
        <div className="flex-1 w-full py-2 md:py-0">
          <div className="text-xs font-semibold text-teal-600/80 uppercase mb-1">Opening Bal.</div>
          <div className="text-xl font-bold text-teal-900">{account.currency} {openingBal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="flex-1 w-full py-2 md:py-0">
          <div className="text-xs font-semibold text-teal-600/80 uppercase mb-1">Total Income</div>
          <div className="text-xl font-bold text-emerald-600">{account.currency} {actualFilteredIn.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="flex-1 w-full py-2 md:py-0">
          <div className="text-xs font-semibold text-teal-600/80 uppercase mb-1">Total Expense</div>
          <div className="text-xl font-bold text-red-600">{account.currency} {actualFilteredOut.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
        <div className="flex-1 w-full py-2 md:py-0">
          <div className="text-xs font-semibold text-teal-600/80 uppercase mb-1">Closing Bal.</div>
          <div className="text-xl font-bold text-teal-900">{account.currency} {closingBal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-200 space-y-4">
        <div className="relative">
          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500 uppercase z-10">Date Range</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-full justify-start text-left font-normal bg-white border-slate-200 h-[42px] px-3 py-2.5",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                    </>
                  ) : (
                    format(dateRange.from, "dd/MM/yyyy")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar

                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="relative">
          <label className="absolute -top-2 left-3 bg-white px-1 text-[10px] font-semibold text-slate-500 uppercase z-10">Search Transactions</label>
          <div className="flex items-center w-full bg-white border border-slate-200 rounded-md focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 transition-all overflow-hidden">
             <div className="pl-3 text-slate-400"><Search className="w-4 h-4" /></div>
             <input 
               type="text"
               placeholder="Search by description, reference, or amount..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full px-3 py-2.5 text-sm bg-transparent border-0 focus:ring-0 outline-none text-slate-700"
             />
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Transaction Ledger
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 font-semibold">Date</th>
                <th className="px-6 py-3 font-semibold">Details</th>
                <th className="px-6 py-3 font-semibold">Type</th>
                <th className="px-6 py-3 font-semibold text-right">Debit (In)</th>
                <th className="px-6 py-3 font-semibold text-right">Credit (Out)</th>
                <th className="px-6 py-3 font-semibold text-right bg-slate-50">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStatement.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No transactions found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredStatement.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-3 text-slate-600 whitespace-nowrap">
                      {format(new Date(row.date), 'dd MMM yyyy, HH:mm')}
                    </td>
                    <td className="px-6 py-3">
                      <div className="font-medium text-slate-900">{row.description}</div>
                      {row.type === 'Invoice Settlement' && row.details?.invoiceNum && (
                         <div className="text-xs text-slate-500 mt-0.5">
                           Rate: {row.details.exchangeRate} | Base: {row.details.paidAmount} | Card Chg: {row.details.cardCharge}
                         </div>
                      )}
                      {row.type === 'Expense Settlement' && row.details?.expenseId && row.details.exchangeRate && row.details.exchangeRate !== 1 && (
                         <div className="text-xs text-slate-500 mt-0.5">
                           Rate: {row.details.exchangeRate} | Original Amount: {row.details.originalAmount?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        row.type === 'Invoice Settlement' ? 'bg-blue-50 text-blue-700' :
                        row.type === 'Opening Balance' ? 'bg-purple-50 text-purple-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {row.type}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-emerald-600">
                      {row.debit > 0 ? row.debit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-red-600">
                      {row.credit > 0 ? row.credit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) : '-'}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-slate-900 bg-slate-50/30 group-hover:bg-transparent transition-colors">
                      {row.balance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
