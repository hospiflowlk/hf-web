"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { ArrowLeft, Save, FileText, CheckCircle, ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default function NewInvoicePage() {
  const router = useRouter();
  
  // Master Data
  const [items, setItems] = useState<any[]>([]);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageScrollRef = useRef<HTMLDivElement>(null);
  
  // Invoice Header
  const [invoiceNum, setInvoiceNum] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [guestName, setGuestName] = useState("");
  const [businessSource, setBusinessSource] = useState("");
  const [roundOff, setRoundOff] = useState<number>(0);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);

  // Guest Details Expansion
  const [isGuestDetailsExpanded, setIsGuestDetailsExpanded] = useState(false);
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [guestTinVat, setGuestTinVat] = useState("");
  const [invoiceNotes, setInvoiceNotes] = useState(`Guest Name: \nVoucher Number: \nCheck-in Date: \nCheck-out Date:`);
  
  // Current Line Item
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [note, setNote] = useState("");
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);
  
  // Invoice Lines
  const [lines, setLines] = useState<any[]>([]);

  // Auto-scroll to bottom of page when a new line is added
  useEffect(() => {
    if (pageScrollRef.current) {
      pageScrollRef.current.scrollTop = pageScrollRef.current.scrollHeight;
    }
  }, [lines.length]);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'summary' | 'preview'>('summary');

  useEffect(() => {
    fetchMasterData();
  }, []);

  const fetchMasterData = async () => {
    try {
      const [itemsRes, taxesRes, sourcesRes, customersRes] = await Promise.all([
        api.get("/items").catch(() => ({ data: [] })),
        api.get("/taxes").catch(() => ({ data: [] })),
        api.get("/business-sources").catch(() => ({ data: [] })),
        api.get("/customers").catch(() => ({ data: [] }))
      ]);
      setItems(itemsRes.data.filter((item: any) => item.useInInvoices !== false));
      setTaxes(taxesRes.data);
      setSources(sourcesRes.data);
      setCustomers(customersRes.data);
    } catch (err) {
      console.error("Failed to load master data", err);
    }
  };

  const handleItemSelect = (val: string) => {
    setSelectedItemId(val);
    const item = items.find(i => i.id === val);
    if (item) {
      setUnitPrice(item.defaultPrice || 0);
      
      // Auto-select active taxes that are not exempt for this item
      const exemptTaxIds = item.exemptTaxes?.map((t: any) => t.id) || [];
      const applicableTaxes = taxes
        .filter(t => t.isActive !== false && !exemptTaxIds.includes(t.id))
        .map(t => t.id);
      setSelectedTaxIds(applicableTaxes);
    }
  };

  const addLine = () => {
    if (!selectedItemId && !note) {
      alert("Please select an item or enter a description.");
      return;
    }
    
    let itemObj = items.find(i => i.id === selectedItemId);
    const desc = itemObj ? itemObj.name + (note ? ` - ${note}` : "") : note;
    
    // Calculate discounts
    const gross = unitPrice * quantity;
    let discAmount = 0;
    if (discountType === "percent") {
      discAmount = gross * ((discountValue || 0) / 100);
    } else {
      discAmount = discountValue || 0;
    }
    const taxable = gross - discAmount;
    
    // Calculate Taxes
    let vatAmount = 0;
    let scAmount = 0;
    let otherTaxAmount = 0;
    
    selectedTaxIds.forEach(tid => {
      const tax = taxes.find(t => t.id === tid);
      if (tax) {
        const taxVal = taxable * (tax.rate / 100);
        if (tax.type === "VAT") vatAmount += taxVal;
        else if (tax.type === "SC") scAmount += taxVal;
        else otherTaxAmount += taxVal;
      }
    });
    
    const total = taxable + vatAmount + scAmount + otherTaxAmount;

    const newLine = {
      id: Date.now().toString(),
      itemId: selectedItemId || null,
      description: desc,
      quantity,
      unitPrice,
      discountType,
      discountValue,
      taxIds: selectedTaxIds.length > 0 ? selectedTaxIds.join(',') : null,
      netAmount: taxable,
      vatAmount,
      scAmount,
      otherTaxAmount,
      total
    };

    setLines([...lines, newLine]);
    
    // Reset inputs
    setSelectedItemId("");
    setItemSearch("");
    setNote("");
    setUnitPrice(0);
    setQuantity(1);
    setDiscountValue(0);
    setSelectedTaxIds([]);

    // Focus back on search input
    setTimeout(() => {
      searchInputRef.current?.focus({ preventScroll: true });
    }, 100);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: 'quantity' | 'unitPrice', value: number) => {
    setLines(lines.map(line => {
      if (line.id !== id) return line;
      const updatedLine = { ...line, [field]: value };
      
      // Recalculate
      const discountVal = updatedLine.discountType === 'percent' 
        ? (updatedLine.unitPrice * updatedLine.quantity) * (updatedLine.discountValue / 100)
        : updatedLine.discountValue;
      
      const taxable = (updatedLine.unitPrice * updatedLine.quantity) - discountVal;
      
      let vatAmount = 0;
      let scAmount = 0;
      let otherTaxAmount = 0;
      
      if (updatedLine.taxIds) {
        const ids = updatedLine.taxIds.split(',');
        ids.forEach((tid: string) => {
          const tax = taxes.find(t => t.id === tid);
          if (tax) {
            const taxVal = taxable * (tax.rate / 100);
            if (tax.type === "VAT") vatAmount += taxVal;
            else if (tax.type === "SC") scAmount += taxVal;
            else otherTaxAmount += taxVal;
          }
        });
      }
      
      return {
        ...updatedLine,
        netAmount: taxable,
        vatAmount,
        scAmount,
        otherTaxAmount,
        total: taxable + vatAmount + scAmount + otherTaxAmount
      };
    }));
  };

  const netTotal = lines.reduce((acc, line) => acc + line.netAmount, 0);
  
  const aggregatedTaxes: Record<string, { name: string, rate: number, amount: number }> = {};
  lines.forEach(line => {
    if (line.taxIds) {
      const ids = line.taxIds.split(',');
      ids.forEach((tid: string) => {
        const tax = taxes.find(t => t.id === tid);
        if (tax) {
          if (!aggregatedTaxes[tid]) {
            aggregatedTaxes[tid] = { name: tax.name, rate: tax.rate, amount: 0 };
          }
          aggregatedTaxes[tid].amount += line.netAmount * (tax.rate / 100);
        }
      });
    }
  });

  const grandTotal = lines.reduce((acc, line) => acc + line.total, 0) + roundOff - globalDiscount;

  const handleSave = async (isDraft: boolean, status: string = 'Unpaid') => {
    if (lines.length === 0) {
      alert("Please add at least one item to the invoice.");
      return;
    }

    if (!invoiceNum.trim()) {
      alert("Please enter an Invoice #.");
      return;
    }

    if (!guestName.trim()) {
      alert("Please enter a guest name.");
      return;
    }

    if (!businessSource) {
      alert("Please select a business source.");
      return;
    }

    try {
      const payload = {
        invoiceNum,
        currency,
        invoiceDate,
        guestName,
        guestPhone,
        guestEmail,
        guestAddress,
        guestTinVat,
        notes: invoiceNotes,
        businessSource,
        isDraft,
        status,
        roundOff,
        globalDiscount,
        totalAmount: grandTotal,
        items: lines
      };

      await api.post("/invoices", payload);
      router.push("/invoices"); // redirect to /invoices instead of /dashboard!
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to save invoice.");
    }
  };

  const saveGuestToMaster = async () => {
    if (!guestName.trim()) {
      alert("Please enter a guest name to save.");
      return;
    }
    try {
      await api.post("/customers", {
        name: guestName,
        phone: guestPhone,
        email: guestEmail,
        address: guestAddress,
        taxNumber: guestTinVat,
      });
      alert("Guest successfully saved to Customer Master!");
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to save guest. They may already exist.");
    }
  };

  return (
    <div className="lg:h-[calc(100vh-64px)] h-auto min-h-screen flex flex-col bg-slate-50 lg:overflow-hidden overflow-visible">
      <div className="flex-none p-4 flex items-center justify-between bg-white border-b border-border z-10">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Invoice</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden overflow-y-auto">
        {/* Left Form Area */}
        <div className="flex-1 lg:overflow-y-auto overflow-visible p-4 md:p-8 hide-scrollbar" ref={pageScrollRef}>
          <div className="max-w-4xl mx-auto space-y-6">
            
            {/* Header Details */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Invoice #</label>
                  <Input value={invoiceNum} onChange={e => setInvoiceNum(e.target.value)} className="bg-slate-50 border-slate-200 focus:bg-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger tabIndex={-1} className="bg-slate-50 border-slate-200 focus:bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="LKR">LKR</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Date</label>
                  <Input type="date" tabIndex={-1} value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className="bg-slate-50 border-slate-200 focus:bg-white" />
                </div>
                <div className="space-y-1 relative">
                  <label className="text-xs font-semibold text-slate-500 uppercase">Guest Name</label>
                  <div className="relative">
                    <Input 
                      placeholder="Enter guest name" 
                      value={guestName} 
                      onChange={e => {
                        setGuestName(e.target.value);
                        setShowGuestDropdown(true);
                      }}
                      onFocus={() => setShowGuestDropdown(true)}
                      onBlur={() => setTimeout(() => setShowGuestDropdown(false), 200)}
                      className="bg-slate-50 border-slate-200 focus:bg-white pr-16" 
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10 bg-transparent">
                      <Button variant="ghost" size="icon" tabIndex={-1} onClick={saveGuestToMaster} className="h-6 w-6 text-slate-400 hover:text-teal-600 hover:bg-slate-200" title="Save Guest">
                        <Save className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" tabIndex={-1} onClick={() => setIsGuestDetailsExpanded(!isGuestDetailsExpanded)} className="h-6 w-6 text-slate-400 hover:text-slate-600 hover:bg-slate-200" title="Expand Details">
                        {isGuestDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {showGuestDropdown && guestName.trim().length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                      {customers
                        .filter(c => c.name.toLowerCase().includes(guestName.toLowerCase()))
                        .map((c) => (
                          <div
                            key={c.id}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 border-b border-slate-50 last:border-0 flex justify-between"
                            onClick={() => {
                              setGuestName(c.name);
                              if (c.phone) setGuestPhone(c.phone);
                              if (c.email) setGuestEmail(c.email);
                              if (c.address) setGuestAddress(c.address);
                              if (c.taxNumber) setGuestTinVat(c.taxNumber);
                              setShowGuestDropdown(false);
                            }}
                          >
                            <span className="font-medium text-gray-800">{c.name}</span>
                            {c.phone && <span className="text-xs text-slate-400">{c.phone}</span>}
                          </div>
                      ))}
                      {customers.filter(c => c.name.toLowerCase().includes(guestName.toLowerCase())).length === 0 && (
                        <div className="px-3 py-3 text-sm text-center text-muted-foreground">
                          No matching customers.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-teal-600 uppercase">Business Source *</label>
                  <Select value={businessSource} onValueChange={setBusinessSource}>
                    <SelectTrigger className="bg-white border-teal-200 focus:ring-teal-500"><SelectValue placeholder="Select Source" /></SelectTrigger>
                    <SelectContent onCloseAutoFocus={(e) => {
                      e.preventDefault();
                      searchInputRef.current?.focus();
                    }}>
                      {sources.filter((s: any) => s.isActive !== false).map((source: any) => (
                        <SelectItem key={source.id} value={source.name}>{source.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Collapsible Extended Guest Details */}
              <div className={`transition-all duration-300 overflow-hidden ${isGuestDetailsExpanded ? 'max-h-[500px] opacity-100 mt-6 pt-6 border-t border-slate-100' : 'max-h-0 opacity-0 mt-0'}`}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Phone</label>
                      <Input placeholder="Enter phone" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="bg-slate-50 border-slate-200 focus:bg-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Email</label>
                      <Input type="email" placeholder="Enter email" value={guestEmail} onChange={e => setGuestEmail(e.target.value)} className="bg-slate-50 border-slate-200 focus:bg-white" />
                    </div>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4">
                    <div className="space-y-1 flex-1 md:w-[70%]">
                      <label className="text-xs font-semibold text-slate-500 uppercase">Address</label>
                      <Input placeholder="Enter address" value={guestAddress} onChange={e => setGuestAddress(e.target.value)} className="bg-slate-50 border-slate-200 focus:bg-white" />
                    </div>
                    <div className="space-y-1 md:w-[30%]">
                      <label className="text-xs font-semibold text-slate-500 uppercase">TIN/VAT</label>
                      <Input placeholder="Enter TIN/VAT" value={guestTinVat} onChange={e => setGuestTinVat(e.target.value)} className="bg-slate-50 border-slate-200 focus:bg-white" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 uppercase">Notes</label>
                    <textarea 
                      rows={5} 
                      value={invoiceNotes} 
                      onChange={e => setInvoiceNotes(e.target.value)} 
                      className="flex w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm ring-offset-background focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {(() => {
              const filteredItems = items.filter(item => item.useInInvoices !== false && item.name.toLowerCase().includes(itemSearch.toLowerCase()));
              return (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm sticky top-0 z-30 shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-4 relative">
                      <Input 
                        ref={searchInputRef}
                        placeholder="Search Item..."
                        value={itemSearch}
                        onChange={(e) => {
                          setItemSearch(e.target.value);
                          setShowItemDropdown(true);
                          setFocusedIndex(-1);
                          if (selectedItemId) setSelectedItemId("");
                        }}
                        onFocus={() => setShowItemDropdown(true)}
                        onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !showItemDropdown && selectedItemId) {
                            e.preventDefault();
                            addLine();
                            return;
                          }
                          if (!showItemDropdown) return;
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setFocusedIndex(prev => prev < filteredItems.length - 1 ? prev + 1 : prev);
                          } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setFocusedIndex(prev => prev > 0 ? prev - 1 : 0);
                          } else if (e.key === "Enter") {
                            e.preventDefault();
                            if (focusedIndex >= 0 && focusedIndex < filteredItems.length) {
                              const selected = filteredItems[focusedIndex];
                              handleItemSelect(selected.id);
                              setItemSearch(selected.name);
                              setShowItemDropdown(false);
                            }
                          } else if (e.key === "Escape") {
                            setShowItemDropdown(false);
                          }
                        }}
                        className="bg-slate-50"
                      />
                      {showItemDropdown && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {filteredItems.map((item, index) => (
                              <div
                                key={item.id}
                                className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between ${focusedIndex === index ? 'bg-slate-100' : 'hover:bg-slate-100'}`}
                                onClick={() => {
                                  handleItemSelect(item.id);
                                  setItemSearch(item.name);
                                  setShowItemDropdown(false);
                                }}
                              >
                                <span>{item.name}</span>
                                <span className="text-muted-foreground">{currency} {item.defaultPrice}</span>
                              </div>
                          ))}
                          {filteredItems.length === 0 && (
                            <div className="px-3 py-3 text-sm text-center text-muted-foreground">
                              No items found.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                
                <div className="md:col-span-2 flex items-center bg-slate-50 rounded-md border border-input px-3">
                  <span className="text-slate-500 text-xs font-semibold mr-1">Qty:</span>
                  <Input 
                    type="number"
                    min="1"
                    value={quantity} 
                    onChange={e => setQuantity(parseFloat(e.target.value) || 1)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && selectedItemId) { e.preventDefault(); addLine(); } }}
                    className="border-0 bg-transparent shadow-none px-1 h-9 focus-visible:ring-0" 
                  />
                </div>

                <div className="md:col-span-2">
                  <Input 
                    placeholder="Note" 
                    value={note} 
                    onChange={e => setNote(e.target.value)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && selectedItemId) { e.preventDefault(); addLine(); } }}
                    className="bg-slate-50" 
                  />
                </div>

                <div className="md:col-span-2 flex items-center bg-slate-50 rounded-md border border-input px-3">
                  <Input 
                    type="number" 
                    value={discountValue} 
                    onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)} 
                    onKeyDown={(e) => { if (e.key === 'Enter' && selectedItemId) { e.preventDefault(); addLine(); } }}
                    className="border-0 bg-transparent shadow-none px-0 focus-visible:ring-0"
                  />
                  <Select value={discountType} onValueChange={(val: any) => setDiscountType(val)}>
                    <SelectTrigger className="w-[60px] border-0 bg-transparent shadow-none px-2 focus:ring-0 text-teal-600 font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">%</SelectItem>
                      <SelectItem value="fixed">$</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2 flex items-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full justify-between font-normal bg-white">
                        {selectedTaxIds.length === 0 ? "Applied Taxes" : `${selectedTaxIds.length} Taxes Applied`}
                        <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                      <DropdownMenuLabel>Select Taxes</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {taxes.map(tax => (
                        <DropdownMenuCheckboxItem
                          key={tax.id}
                          checked={selectedTaxIds.includes(tax.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTaxIds([...selectedTaxIds, tax.id]);
                            } else {
                              setSelectedTaxIds(selectedTaxIds.filter(id => id !== tax.id));
                            }
                          }}
                        >
                          {tax.name} ({tax.rate}%)
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="md:col-span-12 flex justify-end mt-4">
                  <Button onClick={addLine} disabled={!selectedItemId} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm w-32">
                    + ADD LINE
                  </Button>
                </div>
              </div>
            </div>
            );
            })()}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-4">Item</th>
                    <th className="px-4 py-4">Price</th>
                    <th className="px-4 py-4">Qty</th>
                    <th className="px-4 py-4">Disc</th>
                    <th className="px-4 py-4">SC</th>
                    <th className="px-4 py-4">Other</th>
                    <th className="px-4 py-4">VAT</th>
                    <th className="px-4 py-4 font-bold text-gray-900">Total</th>
                    <th className="px-4 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lines.map((line, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-gray-900">{line.description}</td>
                      <td className="px-4 py-3">
                        <Input 
                          type="number" 
                          value={line.unitPrice} 
                          onChange={(e) => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-20 h-8 text-xs bg-white"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Input 
                          type="number" 
                          value={line.quantity} 
                          onChange={(e) => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-16 h-8 text-xs bg-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-red-500">-{((line.discountType === 'percent' ? (line.unitPrice * line.quantity) * (line.discountValue/100) : line.discountValue) || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-slate-500">{line.scAmount?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{line.otherTaxAmount?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-3 text-slate-500">{line.vatAmount?.toFixed(2) || '-'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{line.total.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => removeLine(line.id)} className="text-red-400 hover:text-red-600 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-slate-400 italic">No items added yet.</td>
                    </tr>
                  )}
                </tbody>
                </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-border flex flex-col z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] h-auto lg:h-full lg:shrink-0 pb-16 lg:pb-0">
          <div className="flex border-b border-border">
            <button 
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'summary' ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/30' : 'text-muted-foreground hover:bg-slate-50'}`}
            >
              <FileText className="w-4 h-4" /> Summary
            </button>
            <button 
              onClick={() => setActiveTab('preview')}
              className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'preview' ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/30' : 'text-muted-foreground hover:bg-slate-50'}`}
            >
              <CheckCircle className="w-4 h-4" /> Preview
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col overflow-hidden">
            {activeTab === 'summary' ? (
              <>
                <h2 className="text-lg font-bold mb-4 shrink-0">Summary</h2>
                
                <div className="space-y-2.5 overflow-y-auto pr-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Net Total</span>
                    <span className="font-semibold text-gray-900">{currency} {netTotal.toFixed(2)}</span>
                  </div>

                  {lines.reduce((acc, line) => acc + ((line.unitPrice * line.quantity) - line.netAmount), 0) > 0 && (
                    <div className="flex justify-between items-center text-xs text-red-500 pt-2">
                      <span>Line Discounts</span>
                      <span className="font-semibold">-{currency} {lines.reduce((acc, line) => acc + ((line.unitPrice * line.quantity) - line.netAmount), 0).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs pt-2">
                    <span className="text-red-500">Extra Discount</span>
                    <Input 
                      type="number" 
                      className="w-20 h-7 text-right text-xs bg-slate-50 text-red-500" 
                      value={globalDiscount} 
                      onChange={e => setGlobalDiscount(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Created By:</span>
                    <span className="text-gray-900">Admin</span>
                  </div>

                  {Object.values(aggregatedTaxes).map((tax, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{tax.name} ({tax.rate}%)</span>
                      <span className="font-semibold text-gray-900">{currency} {tax.amount.toFixed(2)}</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center text-xs pt-3 border-t border-slate-100">
                    <span className="text-muted-foreground">Round Off</span>
                    <Input 
                      type="number" 
                      className="w-20 h-7 text-right text-xs bg-slate-50" 
                      value={roundOff} 
                      onChange={e => setRoundOff(parseFloat(e.target.value) || 0)} 
                    />
                  </div>
                  
                  <div className="pt-3 flex justify-between items-center">
                    <span className="font-bold text-sm text-gray-900">Grand Total</span>
                    <span className="font-bold text-lg text-gray-900">{currency} {grandTotal.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Total Items</span>
                    <span>{lines.reduce((acc, l) => acc + l.quantity, 0)} qty ({lines.length} lines)</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col h-full overflow-hidden">
                <h2 className="text-lg font-bold mb-3 shrink-0">Preview</h2>
                <div className="flex-1 overflow-y-auto">
                  <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs space-y-3">
                    <div className="text-center font-bold pb-2 border-b border-slate-200">
                      INVOICE PREVIEW
                      <div className="font-normal text-slate-500 mt-1">{invoiceNum}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between"><span>Date:</span> <span>{format(new Date(invoiceDate || new Date()), 'MMM dd, yyyy')}</span></div>
                      <div className="flex justify-between"><span>Guest:</span> <span className="font-semibold">{guestName || 'Walk-in'}</span></div>
                    </div>
                    <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-2">
                      {lines.length === 0 ? <div className="text-center text-slate-400 italic">No items</div> : lines.map((l, i) => (
                        <div key={i} className="flex justify-between">
                          <div>
                            <div>{l.quantity}x {l.description || 'Item'}</div>
                            <div className="text-slate-400">{currency} {l.unitPrice.toFixed(2)}</div>
                          </div>
                          <div className="font-medium">{l.total.toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1 font-semibold">
                      <div className="flex justify-between text-base pt-1"><span>Total</span> <span>{currency} {grandTotal.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto space-y-2.5 pt-4 shrink-0 border-t border-border mt-4">
              <Button 
                onClick={() => handleSave(true, 'Unpaid')}
                variant="outline" 
                className="w-full h-10 border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 font-semibold shadow-sm text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                SAVE AS DRAFT
              </Button>
              <div className="grid grid-cols-2 gap-2.5">
                <Button 
                  onClick={() => handleSave(false, 'Unpaid')}
                  className="h-10 bg-teal-700 hover:bg-teal-800 text-white font-semibold shadow-sm rounded-md text-xs"
                >
                  SAVE INVOICE
                </Button>
                <Button 
                  onClick={() => handleSave(false, 'Paid')}
                  className="h-10 bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm rounded-md text-xs"
                >
                  SAVE & PAY
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
