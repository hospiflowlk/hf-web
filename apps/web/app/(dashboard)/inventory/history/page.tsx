"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight, RefreshCcw } from "lucide-react";

export default function InventoryHistory() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await api.get("/inventory/transactions");
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="font-semibold text-lg text-slate-800">Movement History</h1>
      </div>

      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading history...</div>
          ) : transactions.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No inventory movements recorded yet.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3 text-center">Type</th>
                  <th className="px-4 py-3 text-right">Quantity Change</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {transactions.map(tx => {
                  let typeIcon = null;
                  let typeColor = "";
                  
                  if (tx.type === 'IN') {
                    typeIcon = <ArrowDownRight className="w-3.5 h-3.5" />;
                    typeColor = "text-emerald-600 bg-emerald-50 border-emerald-100";
                  } else if (tx.type === 'OUT') {
                    typeIcon = <ArrowUpRight className="w-3.5 h-3.5" />;
                    typeColor = "text-red-600 bg-red-50 border-red-100";
                  } else {
                    typeIcon = <RefreshCcw className="w-3.5 h-3.5" />;
                    typeColor = "text-blue-600 bg-blue-50 border-blue-100";
                  }

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-500">
                        {format(new Date(tx.createdAt), "MMM dd, yyyy HH:mm")}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {tx.item?.name || "Unknown Item"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${typeColor}`}>
                          {typeIcon}
                          {tx.type}
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        tx.quantity > 0 ? "text-emerald-600" : tx.quantity < 0 ? "text-red-600" : "text-slate-600"
                      }`}>
                        {tx.quantity > 0 ? "+" : ""}{tx.quantity} {tx.item?.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {tx.reference || "-"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {tx.remarks || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
