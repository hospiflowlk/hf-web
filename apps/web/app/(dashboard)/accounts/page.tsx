"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { 
  Building2, Plus, Search, MoreVertical, Edit, Trash, 
  CreditCard, Wallet, Landmark, Star, AlertCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { format } from "date-fns";
import toast from "react-hot-toast";

export default function AccountsListPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await api.get("/accounting/accounts");
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;
    try {
      await api.delete(`/accounting/accounts/${id}`);
      setAccounts(accounts.filter(a => a.id !== id));
      toast.success("Account deleted successfully");
    } catch (err) {
      toast.error("Failed to delete account");
    }
  };

  const filteredAccounts = accounts.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col">
      <div className="p-6 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-teal-600" /> Account Master
          </h1>
          <p className="text-muted-foreground mt-1">Manage your bank and cash accounts</p>
        </div>
        <Link href="/accounts/new">
          <Button className="bg-teal-600 hover:bg-teal-700">
            <Plus className="w-4 h-4 mr-2" /> New Account
          </Button>
        </Link>
      </div>

      <div className="p-6 flex-1 overflow-auto bg-slate-50/50">
        <div className="max-w-6xl mx-auto space-y-6">
          
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="relative w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Search accounts..." 
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-muted-foreground">Loading accounts...</div>
            ) : filteredAccounts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                <AlertCircle className="w-12 h-12 text-slate-300 mb-3" />
                <p>No accounts found.</p>
              </div>
            ) : (
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-border text-slate-500 font-medium">
                  <tr>
                    <th className="px-6 py-4">Account Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4 text-right">Balance</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${account.isCardAccount ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
                            {account.isCardAccount ? <CreditCard className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 flex items-center gap-2">
                              {account.name}
                              {account.isStarred && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">{account.currency}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                          {account.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {account.balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {account.currency}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          account.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {account.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/accounts/${account.id}/statement`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-blue-600 hover:bg-blue-50" title="View Statement">
                              <FileText className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Link href={`/accounts/${account.id}/edit`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-teal-600 hover:bg-teal-50" title="Edit Account">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(account.id)} className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50" title="Delete Account">
                            <Trash className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
