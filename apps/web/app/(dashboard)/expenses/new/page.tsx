"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { ArrowLeft, Save, Search, Trash2, FileText, CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";

type ExpenseFormValues = {
  description: string;
  supplierId: string;
  currency: string;
  reference: string;
  expenseDate: string;
  items: {
    itemId: string;
    categoryId: string;
    note: string;
    unitPrice: number;
    quantity: number;
    vatAmount: number;
  }[];
  roundOff: number;
  note: string;
  status: "Paid" | "Unpaid";
};

const ExpenseItemRow = ({ field, index, formItems, items, register, setValue, remove, append, fieldsLength, currency }: any) => {
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const currentItem = formItems[index];
  const lineTotal = (Number(currentItem?.unitPrice || 0) * Number(currentItem?.quantity || 1)) + Number(currentItem?.vatAmount || 0);

  useEffect(() => {
    if (currentItem?.itemId) {
      const itm = items.find((i: any) => i.id === currentItem.itemId);
      if (itm) setItemSearch(itm.name);
    }
  }, [currentItem?.itemId, items]);

  const filteredItems = items.filter((i: any) => i.useInExpenses && i.name.toLowerCase().includes(itemSearch.toLowerCase()));

  const handleItemSelect = (selectedItem: any) => {
    setValue(`items.${index}.itemId`, selectedItem.id);
    if (selectedItem.categoryId) {
      setValue(`items.${index}.categoryId`, selectedItem.categoryId);
    }
    // Also copy the default price to unitPrice to speed up data entry!
    if (selectedItem.defaultPrice) {
      setValue(`items.${index}.unitPrice`, selectedItem.defaultPrice);
    }
    setItemSearch(selectedItem.name);
    setShowItemDropdown(false);
  };

  return (
    <tr className="group">
      <td className="px-2 py-3 align-top relative">
        <Popover open={showItemDropdown} onOpenChange={setShowItemDropdown}>
          <PopoverAnchor asChild>
            <Input
              ref={searchInputRef}
              placeholder="Search Item..."
              value={itemSearch}
              onChange={(e) => {
                setItemSearch(e.target.value);
                setShowItemDropdown(true);
                setFocusedIndex(-1);
                if (currentItem?.itemId) setValue(`items.${index}.itemId`, "");
              }}
              onFocus={() => setShowItemDropdown(true)}
              onKeyDown={(e) => {
                if (!showItemDropdown) {
                  if (e.key === "Enter") {
                     e.preventDefault();
                     setShowItemDropdown(true);
                  }
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFocusedIndex(prev => prev < filteredItems.length - 1 ? prev + 1 : prev);
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
                    handleItemSelect(filteredItems[focusedIndex]);
                  } else if (filteredItems.length > 0) {
                    handleItemSelect(filteredItems[0]);
                  }
                  
                  // Automatically jump to the Note field in the same row
                  setTimeout(() => {
                    const tr = searchInputRef.current?.closest('tr');
                    if (tr) {
                      const noteInput = tr.querySelector('input[placeholder="Note..."]') as HTMLInputElement;
                      if (noteInput) noteInput.focus();
                    }
                  }, 0);
                } else if (e.key === "Escape") {
                  setShowItemDropdown(false);
                }
              }}
              className="bg-white"
            />
          </PopoverAnchor>
          <PopoverContent 
            className="p-0 w-[var(--radix-popover-trigger-width)]" 
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="max-h-60 overflow-y-auto">
              {filteredItems.map((item: any, i: number) => (
                <div
                  key={item.id}
                  className={`px-3 py-2 text-sm cursor-pointer flex justify-between ${focusedIndex === i ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                  onClick={() => handleItemSelect(item)}
                >
                  <span>{item.name}</span>
                  {item.defaultPrice ? <span className="text-muted-foreground">{currency} {item.defaultPrice}</span> : null}
                </div>
              ))}
              {filteredItems.length === 0 && (
                <div className="px-3 py-3 text-sm text-center text-muted-foreground">No items found.</div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </td>
      <td className="px-2 py-3 align-top">
        <Input 
          placeholder="Note..." 
          {...register(`items.${index}.note`)} 
          className="bg-white text-base" 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const tr = e.currentTarget.closest('tr');
              if (tr) {
                const nextInput = tr.querySelector(`input[name="items.${index}.unitPrice"]`) as HTMLInputElement;
                if (nextInput) {
                  nextInput.focus();
                  nextInput.select();
                }
              }
            }
          }}
        />
      </td>
      <td className="px-2 py-3 align-top">
        <Input 
          type="number" step="0.01" 
          className="text-right px-2 bg-white text-base font-medium" 
          {...register(`items.${index}.unitPrice`)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const tr = e.currentTarget.closest('tr');
              if (tr) {
                const nextInput = tr.querySelector(`input[name="items.${index}.quantity"]`) as HTMLInputElement;
                if (nextInput) {
                  nextInput.focus();
                  nextInput.select();
                }
              }
            }
          }}
        />
      </td>
      <td className="px-2 py-3 align-top">
        <Input 
          type="number" step="0.01" 
          className="text-right px-2 bg-white text-base font-medium" 
          {...register(`items.${index}.quantity`)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              const tr = e.currentTarget.closest('tr');
              if (tr) {
                const nextInput = tr.querySelector(`input[name="items.${index}.vatAmount"]`) as HTMLInputElement;
                if (nextInput) {
                  nextInput.focus();
                  nextInput.select();
                }
              }
            }
          }}
        />
      </td>
      <td className="px-2 py-3 align-top">
        <Input 
          type="number" step="0.01" 
          className="text-right px-2 bg-white text-base font-medium" 
          {...register(`items.${index}.vatAmount`)} 
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (append) {
                append({ itemId: "", categoryId: "", note: "", unitPrice: 0, quantity: 1, vatAmount: 0 });
                setTimeout(() => {
                  const searchInputs = document.querySelectorAll('input[placeholder="Search Item..."]');
                  const lastSearchInput = searchInputs[searchInputs.length - 1] as HTMLInputElement;
                  if (lastSearchInput) lastSearchInput.focus();
                }, 50);
              }
            }
          }}
        />
      </td>
      <td className="px-3 py-3 align-top text-right font-medium text-slate-700 pt-5">
        {lineTotal.toFixed(2)}
      </td>
      <td className="px-2 py-3 align-top pt-3">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="text-slate-400 hover:text-red-600 hover:bg-red-50"
          onClick={() => remove(index)}
          disabled={fieldsLength === 1}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </td>
    </tr>
  );
};

export default function NewExpensePage() {
  const router = useRouter();
  
  // Master Data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { register, control, handleSubmit, setValue, formState: { errors } } = useForm<ExpenseFormValues>({
    defaultValues: {
      description: "",
      supplierId: "",
      currency: "LKR",
      reference: "",
      expenseDate: new Date().toISOString().split('T')[0],
      items: [{ itemId: "", categoryId: "", note: "", unitPrice: 0, quantity: 1, vatAmount: 0 }],
      roundOff: 0,
      note: "",
      status: "Unpaid"
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  // Watch values for real-time calculations
  const formItems = useWatch({ control, name: "items" });
  const roundOff = useWatch({ control, name: "roundOff" }) || 0;
  const status = useWatch({ control, name: "status" });
  const currency = useWatch({ control, name: "currency" });
  const expenseDate = useWatch({ control, name: "expenseDate" });

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [suppRes, itemsRes, catRes] = await Promise.all([
        api.get("/suppliers").catch(() => ({ data: [] })),
        api.get("/items").catch(() => ({ data: [] })),
        api.get("/categories").catch(() => ({ data: [] }))
      ]);
      setSuppliers(suppRes.data);
      setItems(itemsRes.data);
      setCategories(catRes.data);
    } catch (err) {
      console.error("Failed to load master data", err);
    }
  };

  const calculateSubtotal = () => {
    return formItems.reduce((sum, item) => {
      const lineTotal = (Number(item.unitPrice) * Number(item.quantity)) + Number(item.vatAmount);
      return sum + lineTotal;
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const finalTotal = subtotal + Number(roundOff);

  const onSubmit = async (data: ExpenseFormValues) => {
    setLoading(true);
    try {
      if (!data.supplierId) {
        throw new Error("Please select a Supplier.");
      }
      for (let i = 0; i < data.items.length; i++) {
        const item = data.items[i];
        if (!item || !item.itemId) {
          throw new Error(`Row ${i + 1}: Please select a valid item from the dropdown list.`);
        }
        if (!item.categoryId) {
          throw new Error(`Row ${i + 1}: The selected item is missing a category in the Item Master. Please fix the item first.`);
        }
      }

      // Format payload for backend
      const payload = {
        ...data,
        totalAmount: finalTotal,
        roundOff: Number(data.roundOff),
        items: data.items.map(i => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          quantity: Number(i.quantity),
          vatAmount: Number(i.vatAmount),
          amount: Number(i.unitPrice) * Number(i.quantity),
          lineTotal: (Number(i.unitPrice) * Number(i.quantity)) + Number(i.vatAmount),
        }))
      };

      const res = await api.post("/expenses", payload);
      if (data.status === 'Paid') {
        router.push(`/expenses/${res.data.id}/edit?settle=true`);
      } else {
        router.push("/expenses");
      }
    } catch (err: any) {
      console.error("Failed to save expense", err);
      alert(err?.response?.data?.message || err.message || "Failed to save expense. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/expenses">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold text-lg">New Expense</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="max-w-7xl mx-auto flex gap-4 items-start">
          
          {/* Main Left Area */}
          <div className="flex-1 space-y-6">
            
            {/* Top Bar (Header Details) */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2 lg:col-span-2">
                  <Label>Expense Name <span className="text-red-500">*</span></Label>
                  <Input 
                    {...register("description")} 
                    placeholder="e.g. Office Supplies" 
                    className="bg-white text-base"
                    autoFocus
                  />
                  {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label>Supplier <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(val) => setValue("supplierId", val)}>
                    <SelectTrigger className="w-full text-base">
                      <SelectValue placeholder="Select Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select defaultValue="LKR" onValueChange={(val) => setValue("currency", val)}>
                    <SelectTrigger className="text-base">
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LKR">LKR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal border-slate-200 text-base",
                          !expenseDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {expenseDate ? format(new Date(expenseDate), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={new Date(expenseDate)}
                        onSelect={(date) => date && setValue("expenseDate", format(date, 'yyyy-MM-dd'))}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div className="space-y-2 lg:col-span-2">
                  <Label>Reference #</Label>
                  <Input 
                    {...register("reference")} 
                    placeholder="Bill/Invoice No" 
                    className="text-base"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const firstSearchInput = document.querySelector('input[placeholder="Search Item..."]') as HTMLInputElement;
                        if (firstSearchInput) firstSearchInput.focus();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Line Items Area */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-semibold text-slate-800">Line Items</h2>
                <Button 
                  type="button" 
                  onClick={() => append({ itemId: "", categoryId: "", note: "", unitPrice: 0, quantity: 1, vatAmount: 0 })}
                  className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                  size="sm"
                  tabIndex={-1}
                >
                  + Add Item Row
                </Button>
              </div>
              
              <div>
                <table className="w-full text-sm text-left">
                  <thead className="text-sm text-slate-600 font-semibold bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-2 py-3 min-w-[150px]">Item</th>
                      <th className="px-2 py-3 min-w-[100px]">Note</th>
                      <th className="px-2 py-3 w-32 min-w-[80px]">Price</th>
                      <th className="px-2 py-3 w-24 min-w-[60px]">Qty</th>
                      <th className="px-2 py-3 w-24 min-w-[60px]">VAT</th>
                      <th className="px-2 py-3 text-right w-24">Total</th>
                      <th className="px-2 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {fields.map((field, index) => (
                      <ExpenseItemRow 
                        key={field.id}
                        field={field}
                        index={index}
                        formItems={formItems}
                        items={items}
                        register={register}
                        setValue={setValue}
                        remove={remove}
                        append={append}
                        fieldsLength={fields.length}
                        currency={currency}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>

          {/* Right Summary Sidebar */}
          <div className="w-[260px] shrink-0 space-y-4 sticky top-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-4 bg-slate-50/50 border-b border-slate-100 font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-500" />
                Expense Summary
              </div>
              <div className="p-5 space-y-5">
                
                <div className="flex justify-between items-center text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-medium">{subtotal.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <Label className="text-sm text-slate-600">Round Off</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-24 text-right h-8" 
                    {...register("roundOff")} 
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <span className="text-slate-600 font-medium">Grand Total</span>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 mr-1">{currency}</span>
                    <span className="text-2xl font-bold text-slate-900 tracking-tight">{finalTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 space-y-5">
              <div className="space-y-2">
                <Label className="text-slate-600">Extra Notes</Label>
                <div className="relative">
                  <FileText className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <textarea 
                    className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 pl-9 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="General remarks..."
                    {...register("note")}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-600">Status:</Label>
                  <div className="flex items-center gap-3">
                    <Switch 
                      checked={status === "Paid"} 
                      onCheckedChange={(val) => setValue("status", val ? "Paid" : "Unpaid")}
                    />
                    <span className={`text-sm font-bold ${status === "Paid" ? "text-green-600" : "text-red-500"}`}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                </div>
                {status === "Paid" && (
                  <p className="text-xs text-blue-600 bg-blue-50 p-2 rounded-md mt-1 font-medium">
                    You will be prompted to record payment details immediately after saving.
                  </p>
                )}
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 shadow-md transition-all active:scale-[0.98]"
              disabled={loading}
            >
              <Save className="w-5 h-5 mr-2" />
              {loading ? "SAVING..." : "SAVE EXPENSE"}
            </Button>
          </div>
          
        </form>
      </div>
    </div>
  );
}
