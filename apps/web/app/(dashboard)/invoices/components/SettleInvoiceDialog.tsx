"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, CreditCard, Building2, Trash2, Banknote, Plus } from "lucide-react";

const settlementSchema = z.object({
  accountId: z.string().optional(),
  localAmount: z.coerce.number().optional(),
  exchangeRate: z.coerce.number().optional(),
  note: z.string().optional(),
  paidDate: z.string().optional(),
  payments: z.array(z.object({
    accountId: z.string().optional(),
    localAmount: z.coerce.number().optional(),
    exchangeRate: z.coerce.number().optional(),
    transferType: z.enum(['bank', 'card', 'cash']).optional(),
  })).optional(),
});

type SettlementFormValues = z.infer<typeof settlementSchema>;

interface SettleInvoiceDialogProps {
  invoice: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SettleInvoiceDialog({ invoice, isOpen, onClose, onSuccess }: SettleInvoiceDialogProps) {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loadingSettlements, setLoadingSettlements] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'single' | 'split'>('single');
  const [transferType, setTransferType] = useState<'bank' | 'card' | 'cash'>('bank');
  const [currencies, setCurrencies] = useState<any[]>([]);

  const { register, handleSubmit, reset, watch, setValue, getValues, control, formState: { errors } } = useForm<SettlementFormValues>({
    resolver: zodResolver(settlementSchema) as any,
    defaultValues: {
      localAmount: 0,
      exchangeRate: 1.0,
      note: "",
      paidDate: format(new Date(), 'yyyy-MM-dd'),
      payments: [{ accountId: "", localAmount: 0, exchangeRate: 1.0, transferType: 'bank' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "payments"
  });

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      fetchSettlements();
      fetchCurrencies();
    }
  }, [isOpen, invoice]);

  const fetchCurrencies = async () => {
    try {
      const res = await api.get("/currencies");
      setCurrencies(res.data);
    } catch (err) {
      console.error("Failed to load currencies", err);
    }
  };

  const fetchAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await api.get("/accounting/accounts");
      setAccounts(res.data);
    } catch (err) {
      console.error("Failed to load accounts", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const fetchSettlements = async () => {
    if (!invoice?.id) return;
    try {
      setLoadingSettlements(true);
      const res = await api.get(`/invoices/${invoice.id}/settlements`);
      setSettlements(res.data);
      
      // Calculate remaining balance
      const totalPaid = res.data.reduce((sum: number, s: any) => sum + s.amount, 0);
      const balance = Math.max(0, (invoice.totalAmount || 0) - totalPaid);
      // We will set localAmount shortly using the first account's rate, or default rate
    } catch (err) {
      console.error("Failed to load settlements", err);
    } finally {
      setLoadingSettlements(false);
    }
  };

  const totalPaid = settlements.reduce((sum, s) => sum + s.amount, 0);
  const balanceDue = Math.max(0, Number(((invoice?.totalAmount || 0) - totalPaid).toFixed(2)));

  const accountId = watch("accountId");
  const localAmount = watch("localAmount") || 0;
  const exchangeRate = watch("exchangeRate") || 1;

  const selectedAccount = accounts.find(a => a.id === accountId);
  
  // Update rate when account changes
  useEffect(() => {
    if (selectedAccount && invoice?.currency && currencies.length > 0) {
      const invCurrency = currencies.find(c => c.code === invoice.currency);
      const accCurrency = currencies.find(c => c.code === selectedAccount.currency);
      
      if (invCurrency && accCurrency) {
        const rate = Number((invCurrency.exchangeRate / accCurrency.exchangeRate).toFixed(4));
        setValue('exchangeRate', rate);
        
        // Also auto-update localAmount based on balance due
        if (balanceDue > 0) {
          setValue('localAmount', Number((balanceDue * rate).toFixed(2)));
        }
      }
    }
  }, [selectedAccount?.id, invoice?.currency, currencies.length]); // Intentionally only reacting to account ID or data load

  // Set initial local amount based on selected account rate or default rate if no account
  useEffect(() => {
    if (balanceDue > 0 && !watch("localAmount") && !selectedAccount) {
      setValue('localAmount', Number((balanceDue * exchangeRate).toFixed(2)));
    }
  }, [balanceDue, selectedAccount, exchangeRate, setValue]);

  // Handle account selection changes for transfer type
  useEffect(() => {
    if (selectedAccount?.type === 'Cash') {
      setTransferType('cash');
    } else if (selectedAccount?.isCardPaymentPriority || selectedAccount?.isCardAccount) {
      setTransferType('card');
    } else {
      setTransferType('bank');
    }
  }, [selectedAccount]);

  // Force full payment amount if in single payment mode on mount/switch
  useEffect(() => {
    if (paymentMode === 'single' && balanceDue > 0) {
      setValue('localAmount', Number((balanceDue * exchangeRate).toFixed(2)));
    }
  }, [paymentMode]); // ONLY trigger on mode switch, otherwise it fights user input

  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value) || 0;
    if (paymentMode === 'single' && balanceDue > 0) {
      setValue('localAmount', Number((balanceDue * newRate).toFixed(2)), { shouldValidate: true });
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAmount = parseFloat(e.target.value) || 0;
    if (paymentMode === 'single' && balanceDue > 0) {
      const newRate = Number((newAmount / balanceDue).toFixed(4));
      setValue('exchangeRate', newRate, { shouldValidate: true });
    }
  };

  const equivalentUSD = Number((localAmount / exchangeRate).toFixed(2));
  const cardChargePercent = selectedAccount?.cardChargePercent || 0;
  const cardChargeAmount = transferType === 'card' ? (localAmount * (cardChargePercent / 100)) : 0;
  const netToBank = localAmount - cardChargeAmount;

  const currentPayments = watch("payments") || [];
  const totalSplitUSD = currentPayments.reduce((sum, p) => {
     if (p.accountId && p.localAmount && p.exchangeRate) {
        return sum + (p.localAmount / p.exchangeRate);
     }
     return sum;
  }, 0);
  const isOverpayment = paymentMode === 'split' && totalSplitUSD > balanceDue + 0.01;

  const onSubmit = async (data: SettlementFormValues) => {
    if (!invoice?.id) return;
    try {
      setIsSubmitting(true);
      
      if (paymentMode === 'single') {
        if (!data.accountId) {
          alert("Please select an account.");
          setIsSubmitting(false);
          return;
        }
        
        const invoiceAmount = Number((data.localAmount! / data.exchangeRate!).toFixed(2));
        if (invoiceAmount < balanceDue - 0.001) {
          alert(`Partial payments are not allowed in Single Payment mode. Please use Split Payment for amounts less than ${invoice?.currency} ${balanceDue.toFixed(2)}.`);
          setIsSubmitting(false);
          return;
        }
        
        const payload = {
          accountId: data.accountId,
          amount: invoiceAmount,
          exchangeRate: data.exchangeRate,
          cardChargeAmount: transferType === 'card' ? (data.localAmount! * ((selectedAccount?.cardChargePercent || 0) / 100)) : 0,
          note: data.note,
          paidDate: data.paidDate
        };
        await api.post(`/invoices/${invoice.id}/settlements`, payload);
      } else {
        // Split mode
        const validPayments = data.payments?.filter(p => p.accountId && p.localAmount && p.localAmount > 0) || [];
        if (validPayments.length === 0) {
          alert("Please enter at least one valid payment.");
          setIsSubmitting(false);
          return;
        }

        const totalSplitUSDSubmit = validPayments.reduce((sum, p) => sum + (p.localAmount! / p.exchangeRate!), 0);
        if (totalSplitUSDSubmit > balanceDue + 0.01) {
           alert(`Overpayment detected! The total payment (${invoice?.currency} ${totalSplitUSDSubmit.toFixed(2)}) exceeds the balance due (${invoice?.currency} ${balanceDue.toFixed(2)}). Please adjust the amounts or exchange rates.`);
           setIsSubmitting(false);
           return;
        }
        
        await Promise.all(validPayments.map(p => {
          const invoiceAmount = Number((p.localAmount! / p.exchangeRate!).toFixed(2));
          const acc = accounts.find(a => a.id === p.accountId);
          let charge = 0;
          if (p.transferType === 'card' && acc) {
            charge = p.localAmount! * ((acc.cardChargePercent || 0) / 100);
          }
          return api.post(`/invoices/${invoice.id}/settlements`, {
            accountId: p.accountId,
            amount: invoiceAmount,
            exchangeRate: p.exchangeRate,
            cardChargeAmount: charge,
            note: data.note,
            paidDate: data.paidDate
          });
        }));
      }
      
      onSuccess();
      onClose();
      reset();
    } catch (err: any) {
      console.error("Failed to record payment", err);
      alert(err.response?.data?.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSettlement = async (id: string) => {
    if (!confirm("Are you sure you want to undo this payment?")) return;
    try {
      await api.delete(`/invoices/settlements/${id}`);
      fetchSettlements();
      onSuccess();
    } catch (err: any) {
      console.error("Failed to delete settlement", err);
      alert(err.response?.data?.message || "Failed to delete payment");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-slate-50 max-h-[90vh] flex flex-col">
        <div className="p-6 bg-white border-b shrink-0 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-xl text-slate-900 font-bold flex items-center gap-2">
              Settle Invoice {invoice?.invoiceNum}
            </DialogTitle>
          </DialogHeader>

          {/* Payment Mode Tabs */}
          <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${paymentMode === 'single' ? 'bg-white text-teal-700 shadow-sm border border-teal-100' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setPaymentMode('single')}
            >
              <CreditCard className="w-4 h-4" /> Single Payment
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-semibold rounded-md flex items-center justify-center gap-2 transition-colors ${paymentMode === 'split' ? 'bg-white text-teal-700 shadow-sm border border-teal-100' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setPaymentMode('split')}
            >
              <Building2 className="w-4 h-4" /> Split Payment
            </button>
          </div>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Summary Box */}
          <div className="bg-red-50/50 border border-red-100 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Total Amount:</span>
              <span className="font-semibold text-slate-900">{invoice?.currency} {invoice?.totalAmount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid So Far:</span>
              <span className="font-semibold">{invoice?.currency} {totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-red-600 pt-2 border-t border-red-100/50">
              <span className="font-bold">Balance Due:</span>
              <span className="font-bold text-lg">{invoice?.currency} {balanceDue.toFixed(2)}</span>
            </div>
          </div>

          <form id="settlement-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-semibold text-slate-700">New Payment</Label>
              {paymentMode === 'single' ? (
                <div className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50/50">
                  <div className="space-y-2">
                    <Label className="text-slate-600 text-xs font-semibold">Account</Label>
                    <select 
                      {...register("accountId")} 
                      className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select Account...</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                      ))}
                    </select>
                    {errors.accountId && <p className="text-xs text-red-500">{errors.accountId.message}</p>}
                  </div>

                  {/* Transfer Type Toggle */}
                  {selectedAccount && selectedAccount.type !== 'Cash' && (
                    <div className="flex bg-white rounded-md border border-slate-200 overflow-hidden text-sm font-medium">
                      <button 
                        type="button"
                        className={`flex-1 py-2 flex items-center justify-center gap-2 transition-colors ${transferType === 'bank' ? 'bg-teal-50/50 text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}
                        onClick={() => setTransferType('bank')}
                      >
                        <Building2 className="w-4 h-4" /> Bank Transfer
                      </button>
                      <button 
                        type="button"
                        className={`flex-1 py-2 flex items-center justify-center gap-2 transition-colors ${transferType === 'card' ? 'bg-orange-50/50 text-orange-700 border-b-2 border-orange-500' : 'text-slate-500 hover:bg-slate-50'}`}
                        onClick={() => setTransferType('card')}
                      >
                        <CreditCard className="w-4 h-4" /> Card Payment
                      </button>
                    </div>
                  )}
                  {selectedAccount && selectedAccount.type === 'Cash' && (
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md py-2 px-4 text-sm font-medium flex items-center justify-center gap-2">
                      <Banknote className="w-4 h-4" /> Cash Payment
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-600 text-xs font-semibold">Rate</Label>
                      <Input 
                        {...register("exchangeRate")} 
                        onChange={(e) => {
                          register("exchangeRate").onChange(e);
                          handleRateChange(e);
                        }}
                        type="number" 
                        step="0.0001" 
                        className="bg-white" 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-600 text-xs font-semibold text-teal-700">Amount ({selectedAccount?.currency || '...'})</Label>
                      <Input 
                        {...register("localAmount")} 
                        onChange={(e) => {
                          register("localAmount").onChange(e);
                          handleAmountChange(e);
                        }}
                        type="number" 
                        step="0.01" 
                        className={`bg-white font-bold border-teal-500 focus-visible:ring-teal-500`} 
                      />
                      {errors.localAmount && <p className="text-xs text-red-500">{errors.localAmount.message}</p>}
                    </div>
                  </div>

                  {/* Real-time equivalents */}
                  {selectedAccount && (
                    <div className="text-sm space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-slate-500">
                        Equivalent: {invoice?.currency} {equivalentUSD.toFixed(2)}
                      </div>
                      
                      {transferType === 'card' && (
                        <div className="bg-orange-50 border border-orange-100 rounded p-3 space-y-1">
                          <div className="flex justify-between text-orange-600">
                            <span>Card Charge ({cardChargePercent}%):</span>
                            <span className="font-semibold">{selectedAccount.currency} {cardChargeAmount.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-green-700 font-medium pt-1 border-t border-orange-200/50">
                            <span>Net to Bank:</span>
                            <span>{selectedAccount.currency} {netToBank.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const accId = watch(`payments.${index}.accountId`);
                    const selAcc = accounts.find(a => a.id === accId);
                    const lAmnt = watch(`payments.${index}.localAmount`) || 0;
                    const exRate = watch(`payments.${index}.exchangeRate`) || 1;
                    const equiv = Number((lAmnt / exRate).toFixed(2));
                    
                    return (
                      <div key={field.id} className="border border-slate-200 rounded-lg p-4 space-y-4 bg-slate-50/50 relative">
                        {index > 0 && (
                          <button type="button" onClick={() => remove(index)} className="absolute -top-3 -right-3 text-slate-400 hover:text-red-500 bg-white rounded-full p-1.5 shadow-sm border border-slate-200">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <div className="space-y-2">
                          <Label className="text-slate-600 text-xs font-semibold">Account</Label>
                          <select 
                            {...register(`payments.${index}.accountId` as const)} 
                            onChange={(e) => {
                              register(`payments.${index}.accountId` as const).onChange(e);
                              const newAccId = e.target.value;
                              const acc = accounts.find(a => a.id === newAccId);
                              if (acc && invoice?.currency && currencies.length > 0) {
                                const invCurrency = currencies.find(c => c.code === invoice?.currency);
                                const accCurrency = currencies.find(c => c.code === acc.currency);
                                if (invCurrency && accCurrency) {
                                  const rate = Number((invCurrency.exchangeRate / accCurrency.exchangeRate).toFixed(4));
                                  setValue(`payments.${index}.exchangeRate` as const, rate);
                                  
                                  // Auto-calculate remaining balance for this new payment
                                  const currentPayments = getValues("payments") || [];
                                  let coveredUSD = 0;
                                  currentPayments.forEach((p, i) => {
                                    if (i !== index) {
                                      const pAmt = p.localAmount || 0;
                                      const pRate = p.exchangeRate || 1;
                                      coveredUSD += (pAmt / pRate);
                                    }
                                  });
                                  
                                  const remainingUSD = Math.max(0, balanceDue - coveredUSD);
                                  if (remainingUSD > 0) {
                                    setValue(`payments.${index}.localAmount` as const, Number((remainingUSD * rate).toFixed(2)));
                                  }
                                }
                              }
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <option value="">Select Account...</option>
                            {accounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs font-semibold">Rate</Label>
                            <Input {...register(`payments.${index}.exchangeRate` as const)} type="number" step="0.0001" className="bg-white" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-slate-600 text-xs font-semibold text-teal-700">Amount ({selAcc?.currency || '...'})</Label>
                            <Input {...register(`payments.${index}.localAmount` as const)} type="number" step="0.01" className="bg-white font-bold border-teal-500 focus-visible:ring-teal-500" />
                          </div>
                        </div>

                        {selAcc && selAcc.type !== 'Cash' && (
                          <div className="flex bg-white rounded-md border border-slate-200 overflow-hidden text-sm font-medium mt-2">
                            <button
                              type="button"
                              onClick={() => setValue(`payments.${index}.transferType` as const, 'bank')}
                              className={`flex-1 py-1.5 transition-colors ${watch(`payments.${index}.transferType`) !== 'card' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                              Bank Transfer
                            </button>
                            {(selAcc.isCardAccount || selAcc.isCardPaymentPriority) && (
                              <button
                                type="button"
                                onClick={() => setValue(`payments.${index}.transferType` as const, 'card')}
                                className={`flex-1 py-1.5 transition-colors ${watch(`payments.${index}.transferType`) === 'card' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                              >
                                Card Payment
                              </button>
                            )}
                          </div>
                        )}

                        {selAcc && (
                          <div className="text-sm space-y-2 pt-2 border-t border-slate-200">
                            <div className="flex justify-between items-center text-slate-500 font-medium">
                              <span>Equivalent:</span>
                              <span className="font-bold text-slate-700">{invoice?.currency} {equiv.toFixed(2)}</span>
                            </div>

                            {watch(`payments.${index}.transferType`) === 'card' && (
                              <div className="bg-orange-50 border border-orange-100 rounded p-3 space-y-1 mt-2">
                                <div className="flex justify-between text-orange-600">
                                  <span>Card Charge ({selAcc.cardChargePercent || 0}%):</span>
                                  <span className="font-semibold">{selAcc.currency} {(lAmnt * ((selAcc.cardChargePercent || 0) / 100)).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-green-700 font-medium pt-1 border-t border-orange-200/50">
                                  <span>Net to Bank:</span>
                                  <span>{selAcc.currency} {(lAmnt - (lAmnt * ((selAcc.cardChargePercent || 0) / 100))).toFixed(2)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <Button type="button" variant="outline" onClick={() => append({ accountId: "", localAmount: 0, exchangeRate: 1.0, transferType: 'bank' })} className="w-full border-dashed border-2">
                    <Plus className="w-4 h-4 mr-2" /> Add Payment Method
                  </Button>
                  {totalSplitUSD > 0 && (
                    <div className={`text-sm p-3 rounded border ${isOverpayment ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                      <div className="flex justify-between font-semibold">
                        <span>Total Split Equivalent:</span>
                        <span>{invoice?.currency} {totalSplitUSD.toFixed(2)}</span>
                      </div>
                      {isOverpayment && (
                        <div className="mt-1 text-xs text-red-600 font-medium">
                          Warning: The total amount exceeds the Balance Due ({invoice?.currency} {balanceDue.toFixed(2)}). Overpayments will not be recorded. Please adjust the amounts or exchange rates.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Note (Optional)</Label>
              <Input {...register("note")} className="bg-white" placeholder="Cheque #, Ref, etc." />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600 text-xs font-semibold uppercase tracking-wider">Settlement Date</Label>
              <Input {...register("paidDate")} type="date" className="bg-white" />
            </div>
          </form>

          {/* Payment History */}
          {settlements.length > 0 && (
            <div className="mt-6 pt-4 border-t border-border">
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Payment History</h4>
              <div className="space-y-2">
                {settlements.map((s: any) => (
                  <div key={s.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-100 text-sm group">
                    <div>
                      <div className="font-medium">{format(new Date(s.paidDate), 'MMM dd, yyyy')}</div>
                      <div className="text-xs text-slate-500">{s.account?.name}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-semibold text-green-600">
                        {invoice?.currency} {s.amount.toFixed(2)}
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleDeleteSettlement(s.id)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all"
                        title="Undo Payment"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-white border-t border-border sm:justify-between flex-row shrink-0">
          <Button variant="ghost" type="button" onClick={onClose} className="text-slate-500 hover:text-slate-700">
            Close
          </Button>
          <Button 
            type="submit" 
            form="settlement-form" 
            disabled={isSubmitting || balanceDue <= 0 || isOverpayment}
            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Record Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
