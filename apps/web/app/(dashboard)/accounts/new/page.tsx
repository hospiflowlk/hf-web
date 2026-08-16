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
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

const formSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  currency: z.string().default("LKR"),
  type: z.string().default("Bank"),
  balance: z.coerce.number().default(0),
  startingBalance: z.coerce.number().default(0),
  startingBalanceDate: z.string().optional(),
  cardChargePercent: z.coerce.number().default(0),
  onlineTransferFee: z.coerce.number().default(0),
  isCardAccount: z.boolean().default(false),
  isCardPaymentPriority: z.boolean().optional().default(false),
  isLiquid: z.boolean().default(true),
  isStarred: z.boolean().default(false),
  isActive: z.boolean().default(true),
  feeCategoryId: z.string().optional(),
  feeSupplierId: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewAccountPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      currency: "LKR",
      type: "Bank",
      balance: 0,
      startingBalance: 0,
      cardChargePercent: 0,
      onlineTransferFee: 0,
      isCardAccount: false,
      isLiquid: true,
      isStarred: false,
      isActive: true,
    }
  });

  useEffect(() => {
    Promise.all([
      api.get("/categories").catch(() => ({ data: [] })),
      api.get("/suppliers").catch(() => ({ data: [] })),
      api.get("/currencies").catch(() => ({ data: [] }))
    ]).then(([catRes, supRes, curRes]) => {
      setCategories(catRes.data);
      setSuppliers(supRes.data);
      setCurrencies(curRes.data.filter((c: any) => c.isEnabled));
    });
  }, []);

  const onSubmit = async (data: FormValues) => {
    try {
      // Clean up empty optional fields
      const payload = { ...data };
      if (!payload.feeCategoryId) delete payload.feeCategoryId;
      if (!payload.feeSupplierId) delete payload.feeSupplierId;
      if (!payload.startingBalanceDate) delete payload.startingBalanceDate;
      else payload.startingBalanceDate = new Date(payload.startingBalanceDate).toISOString();

      await api.post("/accounting/accounts", payload);
      toast.success("Account created successfully");
      router.push("/accounts");
      router.refresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create account");
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-50/50">
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/accounts" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="font-semibold text-lg">Create New Account</h1>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white">
          <Save className="w-4 h-4 mr-2" /> Save Account
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
