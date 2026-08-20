"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import useSWRInfinite from "swr/infinite";
import Link from "next/link";
import { Plus, Search, Receipt, Download, Edit, Trash2, Eye, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import SettleExpenseDialog from "./components/SettleExpenseDialog";

export default function ExpensesListPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [settleExpense, setSettleExpense] = useState<any>(null);

  const fetcher = (url: string) => api.get(url).then(res => res.data);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && !previousPageData.nextCursor) return null; // reached the end
    const searchParam = debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : '';
    if (pageIndex === 0) return `/expenses?limit=25${searchParam}`;
    return `/expenses?cursor=${previousPageData.nextCursor}&limit=25${searchParam}`;
  };

  const { data, error, size, setSize, mutate } = useSWRInfinite(getKey, fetcher);

  const expenses = data ? data.flatMap(page => page.data) : [];
  const isLoadingInitialData = !data && !error;
  const isLoadingMore = isLoadingInitialData || (size > 0 && data && typeof data[size - 1] === "undefined");
  const isReachingEnd = data?.[0]?.data.length === 0 || (data && data[data.length - 1]?.nextCursor === null);


  const deleteExpense = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      mutate();
    } catch (err) {
      console.error("Failed to delete expense", err);
      alert("Failed to delete expense");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <h1 className="font-semibold text-lg flex items-center gap-2">
          <Receipt className="w-5 h-5 text-red-600" />
          Expenses
        </h1>
        <Link href="/expenses/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm">
            <Plus className="w-4 h-4 mr-2" />
            NEW EXPENSE
          </Button>
        </Link>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-6xl mx-auto space-y-4">
          
          {/* Controls */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search by reference or supplier..." 
                className="pl-9 bg-slate-50 border-border"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button variant="outline" className="text-muted-foreground">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-muted-foreground uppercase border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Reference</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold">Supplier</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingInitialData ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Receipt className="w-8 h-8 text-slate-300" />
                        <p>{debouncedSearch ? `No expenses matching "${debouncedSearch}"` : "No expenses found."}</p>
                        <Link href="/expenses/new">
                          <Button variant="outline" size="sm" className="mt-2 text-red-600 border-red-200 hover:bg-red-50">
                            Record your first expense
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr key={expense.id} onClick={() => router.push(`/expenses/${expense.id}/edit`)} className="hover:bg-slate-50/50 transition-colors cursor-pointer group">
                      <td className="px-6 py-4 font-medium text-red-700">{expense.reference || '-'}</td>
                      <td className="px-6 py-4 text-slate-600">
                        {expense.expenseDate ? format(new Date(expense.expenseDate), 'MMM dd, yyyy') : '-'}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{expense.supplier?.name || '-'}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          expense.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                          expense.status === 'Unpaid' ? 'bg-orange-100 text-orange-700' : 
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 text-right">
                        {expense.currency} {expense.totalAmount?.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/expenses/${expense.id}/edit`);
                            }}
                            title="Edit Expense"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            onClick={(e) => deleteExpense(expense.id, e)}
                            title="Delete Expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSettleExpense(expense);
                            }}
                            title="Manage Payments (Settle)"
                          >
                            <span className="text-xs font-bold px-1">$</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            
            {!isLoadingInitialData && !isReachingEnd && (
              <div className="p-4 border-t border-border flex justify-center bg-slate-50">
                <Button 
                  variant="outline" 
                  onClick={() => setSize(size + 1)}
                  disabled={isLoadingMore}
                  className="bg-white shadow-sm"
                >
                  {isLoadingMore ? "Loading..." : "Load More"}
                </Button>
              </div>
            )}
          </div>

        </div>
      </div>

      <SettleExpenseDialog 
        expense={settleExpense}
        isOpen={!!settleExpense}
        onClose={() => setSettleExpense(null)}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
