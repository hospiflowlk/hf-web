"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

const formSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  currency: z.string(),
  type: z.string(),
  balance: z.coerce.number(),
  startingBalance: z.coerce.number(),
  startingBalanceDate: z.string().optional(),
  cardChargePercent: z.coerce.number(),
  onlineTransferFee: z.coerce.number(),
  isCardAccount: z.boolean(),
  isCardPaymentPriority: z.boolean().optional().default(false),
  isLiquid: z.boolean(),
  isStarred: z.boolean(),
  isActive: z.boolean(),
  feeCategoryId: z.string().optional().nullable(),
  feeSupplierId: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export default function EditAccountPage() {
  const { id } = useParams();
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any
  });

  useEffect(() => {
    Promise.all([
      api.get("/categories").catch(() => ({ data: [] })),
      api.get("/suppliers").catch(() => ({ data: [] })),
      api.get("/accounting/accounts"),
      api.get("/currencies").catch(() => ({ data: [] }))
    ]).then(([catRes, supRes, accRes, curRes]) => {
      setCategories(catRes.data);
      setSuppliers(supRes.data);
      setCurrencies(curRes.data.filter((c: any) => c.isEnabled));
      
      const account = accRes.data.find((a: any) => a.id === id);
      if (account) {
        // format date for input type="date"
        let startingBalanceDate = "";
        if (account.startingBalanceDate) {
          startingBalanceDate = new Date(account.startingBalanceDate).toISOString().substring(0, 10);
        }
        
        reset({
          ...account,
          startingBalanceDate,
          feeCategoryId: account.feeCategoryId || "",
          feeSupplierId: account.feeSupplierId || "",
        });
      } else {
        toast.error("Account not found");
        router.push("/accounts");
      }
      setLoading(false);
    });
  }, [id, reset, router]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Explicitly pick only the fields defined in FormValues
      const payload: any = { 
        name: data.name,
        currency: data.currency,
        type: data.type,
        balance: data.balance,
        startingBalance: data.startingBalance,
        cardChargePercent: data.cardChargePercent,
        onlineTransferFee: data.onlineTransferFee,
        isCardAccount: data.isCardAccount,
        isCardPaymentPriority: data.isCardPaymentPriority,
        isLiquid: data.isLiquid,
        isStarred: data.isStarred,
        isActive: data.isActive,
        feeCategoryId: data.feeCategoryId || null,
        feeSupplierId: data.feeSupplierId || null,
        startingBalanceDate: data.startingBalanceDate ? new Date(data.startingBalanceDate).toISOString() : null,
      };

      await api.put(`/accounting/accounts/${id}`, payload);
      toast.success("Account updated successfully");
      router.push("/accounts");
      router.refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update account");
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading account details...</div>;
  }

  return (
    <div className="flex h-full flex-col bg-slate-50/50">
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounts" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="font-semibold text-lg">Edit Account</h1>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <form className="space-y-6 bg-white p-8 rounded-xl shadow-sm border border-slate-100">
            
            {/* Basic Info */}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Basic Information</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Account Name <span className="text-red-500">*</span></Label>
                  <Input {...register("name")} placeholder="e.g. SB LKR" />
                  {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <select {...register("type")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="Bank">Bank</option>
                    <option value="Cash">Cash</option>
                    <option value="Loan">Loan</option>
                    <option value="Director">Director</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <select {...register("currency")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="">Select Currency</option>
                    {currencies.map(c => (
                      <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                    ))}
                  </select>
                  {errors.currency && <p className="text-xs text-red-500">{errors.currency.message}</p>}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Balances & Fees</h2>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label>Starting Balance</Label>
                  <Input type="number" step="0.01" {...register("startingBalance")} />
                </div>
                <div className="space-y-2">
                  <Label>Starting Balance Date</Label>
                  <Input type="date" {...register("startingBalanceDate")} />
                </div>
                <div className="space-y-2">
                  <Label>Current Balance</Label>
                  <Input type="number" step="0.01" {...register("balance")} />
                </div>
                <div className="space-y-2">
                  <Label>Card Charge (%)</Label>
                  <Input type="number" step="0.01" {...register("cardChargePercent")} placeholder="e.g. 2.25" />
                </div>
                <div className="space-y-2">
                  <Label>Online Transfer Fee</Label>
                  <Input type="number" step="0.01" {...register("onlineTransferFee")} />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Auto-Expense Mapping</h2>
              <p className="text-sm text-slate-500 mb-4">Select where bank/card fees should be recorded automatically.</p>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Fee Expense Category</Label>
                  <select {...register("feeCategoryId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="">None</option>
                    {categories.filter(c => c.isExpense).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Fee Supplier (Bank/Gateway)</Label>
                  <select {...register("feeSupplierId")} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                    <option value="">None</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Flags</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isCardAccount" 
                    checked={watch("isCardAccount")} 
                    onCheckedChange={(c) => setValue("isCardAccount", c as boolean)}
                  />
                  <Label htmlFor="isCardAccount" className="cursor-pointer">Is Card Machine Account (Enables batch reconciliation)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isCardPaymentPriority" 
                    checked={watch("isCardPaymentPriority")} 
                    onCheckedChange={(c) => setValue("isCardPaymentPriority", c as boolean)}
                  />
                  <Label htmlFor="isCardPaymentPriority" className="cursor-pointer">Card Payment Settlement Priority</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isLiquid" 
                    checked={watch("isLiquid")} 
                    onCheckedChange={(c) => setValue("isLiquid", c as boolean)}
                  />
                  <Label htmlFor="isLiquid" className="cursor-pointer">Is Liquid Asset (Counted in cashflow)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isStarred" 
                    checked={watch("isStarred")} 
                    onCheckedChange={(c) => setValue("isStarred", c as boolean)}
                  />
                  <Label htmlFor="isStarred" className="cursor-pointer">Starred / Favorite</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="isActive" 
                    checked={watch("isActive")} 
                    onCheckedChange={(c) => setValue("isActive", c as boolean)}
                  />
                  <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
                </div>
              </div>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
