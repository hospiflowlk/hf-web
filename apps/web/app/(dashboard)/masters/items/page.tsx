"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { Plus, Search, Edit2, Trash2, Check, MoreVertical, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "react-hot-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

export default function ItemMasterPage() {
  const [search, setSearch] = useState("");
  const [isMutating, setIsMutating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetcher = (url: string) => api.get(url).then(res => res.data);
  const { data: masterData, isLoading: loadingItems, mutate: fetchData } = useSWR<any>("/items/master-data", fetcher);
  
  const items: any[] = masterData?.items || [];
  const categories: any[] = masterData?.categories || [];
  const taxes: any[] = masterData?.taxes || [];
  const posCategories: any[] = masterData?.posCategories || [];
  
  const loading = loadingItems || isMutating;

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    defaultPrice: "",
    categoryId: "",
    posCategoryId: "",
    useInInvoices: true,
    useInExpenses: true,
    useInPos: true,
    exemptTaxes: [] as string[],
    itemType: "none",
    trackStock: false,
    unit: "unit",
    reorderLevel: "0.0",
    costPrice: "0.0",
    stockQuantity: 0,
    ingredients: [] as { ingredientItemId: string, quantity: string, unit: string }[],
  });

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setFormData({
        name: item.name,
        defaultPrice: item.defaultPrice?.toString() || "",
        categoryId: item.categoryId || "",
        posCategoryId: item.posCategoryId || "",
        useInInvoices: item.useInInvoices !== false,
        useInExpenses: item.useInExpenses !== false,
        useInPos: item.useInPos !== false,
        exemptTaxes: item.exemptTaxes?.map((t: any) => t.id) || [],
        itemType: item.itemType || "none",
        trackStock: item.trackStock || false,
        unit: item.unit || "unit",
        reorderLevel: item.reorderLevel?.toString() || "0.0",
        costPrice: item.costPrice?.toString() || "0.0",
        stockQuantity: item.stockQuantity || 0,
        ingredients: item.compositeOf?.map((i: any) => ({
          ingredientItemId: i.ingredientItemId,
          quantity: i.quantity.toString(),
          unit: i.unit,
        })) || [],
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        defaultPrice: "",
        categoryId: "",
        posCategoryId: "",
        useInInvoices: true,
        useInExpenses: true,
        useInPos: true,
        exemptTaxes: taxes.map((t: any) => t.id),
        itemType: "none",
        trackStock: false,
        unit: "unit",
        reorderLevel: "0.0",
        costPrice: "0.0",
        stockQuantity: 0,
        ingredients: [],
      });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
  };

  const saveItem = async () => {
    if (formData.useInPos && !formData.posCategoryId) {
      toast.error("POS Category is required when 'Use in POS' is checked.");
      return;
    }

    try {
      setIsMutating(true);
      const payload = {
        ...formData,
        posCategoryId: formData.useInPos ? (formData.posCategoryId || null) : null,
        defaultPrice: parseFloat(formData.defaultPrice) || 0,
        reorderLevel: parseFloat(formData.reorderLevel) || 0,
        costPrice: parseFloat(formData.costPrice) || 0,
        ingredients: formData.itemType === "composite" ? formData.ingredients.map(i => ({
          ...i,
          quantity: parseFloat(i.quantity) || 0,
        })) : [],
      };

      // remove readonly stockQuantity
      delete (payload as any).stockQuantity;
      if (editingId) {
        await api.put(`/items/${editingId}`, payload);
      } else {
        await api.post("/items", payload);
      }
      closeForm();
      await fetchData();
      toast.success(editingId ? "Item updated successfully" : "Item created successfully");
    } catch (err: any) {
      console.error(err.message || err);
      toast.error(err.response?.data?.message || "Failed to save item. Item name may already exist.");
    } finally {
      setIsMutating(false);
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    try {
      setIsMutating(true);
      await api.delete(`/items/${id}`);
      await fetchData();
    } catch (err: any) {
      console.error(err.message || err);
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL items? This action cannot be undone.")) return;
    try {
      setIsMutating(true);
      // Always fetch fresh IDs from the API to avoid empty-array bug
      const res = await api.get('/items');
      const allItems: any[] = res.data;
      if (!allItems || allItems.length === 0) {
        toast.error("No items to delete.");
        return;
      }
      const ids = allItems.map((item: any) => item.id);
      await api.post('/items/bulk-delete', { ids });
      await fetchData();
      toast.success(`Deleted ${ids.length} items successfully.`);
    } catch (err: any) {
      console.error(err);
      const msg = err.response?.data?.message || err.message || "Unknown error";
      toast.error(`Error deleting all items: ${msg}`);
    } finally {
      setIsMutating(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = items.map((item) => ({
      Name: item.name,
      Category: item.category?.name || "",
      "POS Category": item.posCategory?.name || "",
      Price: item.defaultPrice,
      "Use In Invoices": item.useInInvoices ? "Yes" : "No",
      "Use In Expenses": item.useInExpenses ? "Yes" : "No",
      "Use In POS": item.useInPos !== false ? "Yes" : "No",
      "Item Type": item.itemType,
      "Track Stock": item.trackStock ? "Yes" : "No",
      Unit: item.unit || "unit",
      "Reorder Level": item.reorderLevel || 0,
      "Cost Price": item.costPrice || 0,
      "Current Stock": item.stockQuantity || 0,
      Taxes: taxes.filter(t => !item.exemptTaxes?.find((et: any) => et.id === t.id)).map((t: any) => t.name).join(", "),
      Ingredients: item.compositeOf?.map((i: any) => `${i.ingredient?.name || i.ingredientItemId}:${i.quantity}:${i.unit}`).join(" | ") || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Items");
    XLSX.writeFile(workbook, "Items_Export.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setIsMutating(true);
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found in workbook");
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error("Worksheet not found");
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        for (const row of json) {
          if (!row.Name) continue;
          
          // Try to find category ID if category name is provided
          let catId = "";
          if (row.Category) {
            const cat = categories.find((c: any) => c.name.toLowerCase() === String(row.Category).toLowerCase());
            if (cat) catId = cat.id;
          }

          // Try to find pos category ID if pos category name is provided
          let posCatId = null;
          if (row["POS Category"]) {
            const pcat = posCategories.find((c: any) => c.name.toLowerCase() === String(row["POS Category"]).toLowerCase());
            if (pcat) posCatId = pcat.id;
          }

          // Try to map taxes
          let exemptTaxes: string[] = [];
          if (row.Taxes) {
            const taxNames = String(row.Taxes).split(",").map(t => t.trim().toLowerCase());
            exemptTaxes = taxes.filter(t => !taxNames.includes(t.name.toLowerCase())).map(t => t.id);
          } else if (row.Taxes === undefined || row.Taxes === "") {
             exemptTaxes = taxes.map(t => t.id);
          }

          // Try to map ingredients
          let ingredients: any[] = [];
          if (row.Ingredients) {
            const ingParts = String(row.Ingredients).split("|").map(p => p.trim());
            for (const p of ingParts) {
               const [ingName, qty, unit] = p.split(":").map(x => x?.trim());
               if (ingName && qty && unit) {
                 const ingItem = items.find(i => i.name.toLowerCase() === ingName.toLowerCase());
                 if (ingItem) {
                    ingredients.push({
                      ingredientItemId: ingItem.id,
                      quantity: parseFloat(qty) || 0,
                      unit: unit
                    });
                 }
               }
            }
          }

          const payload = {
            name: row.Name || row.name,
            defaultPrice: parseFloat(row.Price) || 0,
            categoryId: catId,
            posCategoryId: posCatId,
            useInInvoices: row["Use In Invoices"] === "No" ? false : true,
            useInExpenses: row["Use In Expenses"] === "No" ? false : true,
            useInPos: row["Use In POS"] === "No" ? false : true,
            itemType: row["Item Type"] || "none",
            trackStock: row["Track Stock"] === "Yes" ? true : false,
            unit: row.Unit || "unit",
            reorderLevel: parseFloat(row["Reorder Level"]) || 0,
            costPrice: parseFloat(row["Cost Price"]) || 0,
            exemptTaxes: exemptTaxes,
            ingredients: ingredients
          };


          await api.post("/items", payload).catch((err: any) => console.error("Skip dup", err.message || err));
        }
        await fetchData();
        toast.success("Items imported successfully!");
      } catch (err: any) {
        console.error(err.message || err);
        toast.error("Error importing Excel file.");
      } finally {
        setIsMutating(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <svg
              width="15"
              height="15"
              viewBox="0 0 15 15"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-muted-foreground"
            >
              <path
                d="M6.85355 3.14645C7.04882 3.34171 7.04882 3.65829 6.85355 3.85355L3.70711 7H12.5C12.7761 7 13 7.22386 13 7.5C13 7.77614 12.7761 8 12.5 8H3.70711L6.85355 11.1464C7.04882 11.3417 7.04882 11.6583 6.85355 11.8536C6.65829 12.0488 6.34171 12.0488 6.14645 11.8536L2.14645 7.85355C1.95118 7.65829 1.95118 7.34171 2.14645 7.14645L6.14645 3.14645C6.34171 2.95118 6.65829 2.95118 6.85355 3.14645Z"
                fill="currentColor"
                fillRule="evenodd"
                clipRule="evenodd"
              ></path>
            </svg>
          </Button>
          <h1 className="font-semibold text-lg">Item Master</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openForm()}>
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                <FileUp className="mr-2 h-4 w-4" />
                <span>Import Excel</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileDown className="mr-2 h-4 w-4" />
                <span>Export Excel</span>
              </DropdownMenuItem>
              <div className="h-px bg-border my-1" />
              <DropdownMenuItem onClick={handleDeleteAll} className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete All</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Hidden file input for import */}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx, .xls" 
            onChange={handleImportExcel} 
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="bg-card rounded-md shadow-sm border border-border p-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Items"
              className="pl-9 bg-transparent border-0 focus-visible:ring-0 shadow-none h-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-md shadow-sm border border-border divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No items found.</div>
          ) : (
            filteredItems.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-sm text-foreground">{item.name}</span>
                    
                    {/* Category Tag */}
                    {item.category && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                        {item.category.name}
                      </span>
                    )}

                    {/* POS Category Tag */}
                    {item.posCategory && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100">
                        {item.posCategory.name}
                      </span>
                    )}

                    {/* Tax Tags */}
                    {taxes.filter(t => !item.exemptTaxes?.find((et: any) => et.id === t.id)).map((tax: any) => (
                      <span key={tax.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                        {tax.name}
                        <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </span>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Price: {item.defaultPrice?.toFixed(2) || "0.00"}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openForm(item)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteItem(item.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Item" : "Add Item"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* General Settings */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs text-muted-foreground mb-1 block">Item Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="border-emerald-500 focus-visible:ring-emerald-500"
                />
              </div>

              <div>
                <Label htmlFor="price" className="text-xs text-muted-foreground mb-1 block">Default Sell Price</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.defaultPrice}
                  onChange={(e) => setFormData({ ...formData, defaultPrice: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="category" className="text-xs text-muted-foreground mb-1 block">Default Expense Category</Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({ ...formData, categoryId: val })}>
                  <SelectTrigger className={!formData.categoryId ? "border-red-400" : ""}>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!formData.categoryId && <span className="text-[10px] text-red-500 mt-1 block">Required</span>}
              </div>

              {formData.useInPos && (
                <div>
                  <Label htmlFor="posCategory" className="text-xs text-muted-foreground mb-1 block">
                    POS Category <span className="text-red-500">*</span>
                  </Label>
                  <Select value={formData.posCategoryId} onValueChange={(val) => setFormData({ ...formData, posCategoryId: val })}>
                    <SelectTrigger className={!formData.posCategoryId ? "border-red-400" : ""}>
                      <SelectValue placeholder="Select POS Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {posCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {!formData.posCategoryId && <span className="text-[10px] text-red-500 mt-1 block">Required for POS</span>}
                </div>
              )}
            </div>

            {/* Item Usage */}
            <div>
              <h3 className="font-medium mb-3">Item Usage</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="useInInvoices"
                    checked={formData.useInInvoices}
                    onCheckedChange={(c) => setFormData({ ...formData, useInInvoices: !!c })}
                    className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="useInInvoices" className="text-sm font-medium leading-none cursor-pointer">Use in Invoices</label>
                    <p className="text-xs text-muted-foreground">Show when creating invoices</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="useInExpenses"
                    checked={formData.useInExpenses}
                    onCheckedChange={(c) => setFormData({ ...formData, useInExpenses: !!c })}
                    className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="useInExpenses" className="text-sm font-medium leading-none cursor-pointer">Use in Expenses</label>
                    <p className="text-xs text-muted-foreground">Show when recording expenses</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="useInPos"
                    checked={formData.useInPos}
                    onCheckedChange={(c) => setFormData({ ...formData, useInPos: !!c })}
                    className="mt-1 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor="useInPos" className="text-sm font-medium leading-none cursor-pointer">Use in POS</label>
                    <p className="text-xs text-muted-foreground">Show on POS ordering screen</p>
                  </div>
                </div>
              </div>
            </div>


            {/* Relevant Taxes */}
            <div>
              <h3 className="font-medium mb-3">Relevant Taxes</h3>
              <div className="flex flex-wrap gap-2">
                {taxes.map((tax) => {
                  const isRelevant = !formData.exemptTaxes.includes(tax.id);
                  return (
                    <button
                      key={tax.id}
                      onClick={() => {
                        const newExempt = isRelevant
                          ? [...formData.exemptTaxes, tax.id] // Mark as exempt (not relevant)
                          : formData.exemptTaxes.filter((id) => id !== tax.id); // Remove exemption (make relevant)
                        setFormData({ ...formData, exemptTaxes: newExempt });
                      }}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isRelevant ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-secondary text-muted-foreground border border-transparent"
                      }`}
                    >
                      {isRelevant && <Check className="w-3 h-3" />}
                      {tax.name} ({tax.rate}%)
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inventory Settings */}
            <div>
              <h3 className="font-medium mb-3">Inventory Settings</h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Item Type</Label>
                  <Select value={formData.itemType} onValueChange={(val) => setFormData({ ...formData, itemType: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="direct">Direct</SelectItem>
                      <SelectItem value="composite">Composite (Recipe)</SelectItem>
                      <SelectItem value="ingredient">Ingredient</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.itemType === "none" && "No inventory tracking needed."}
                    {formData.itemType === "direct" && "Bought and sold directly without modification."}
                    {formData.itemType === "ingredient" && "Raw material used to make other items (not sold directly)."}
                    {formData.itemType === "composite" && "Made from ingredients - recipe required (e.g., Cocktails)."}
                  </p>
                </div>

                {formData.itemType === "composite" && (
                  <div className="bg-secondary/30 p-3 rounded-md border border-border">
                    <p className="text-sm font-medium mb-3">Ingredients Configuration</p>
                    
                    <div className="space-y-3 mb-3">
                      {formData.ingredients.map((ing, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground mb-1 block">Ingredient</Label>
                            <Select 
                              value={ing.ingredientItemId} 
                              onValueChange={(val) => {
                                const newIng = [...formData.ingredients];
                                if (newIng[idx]) {
                                  newIng[idx].ingredientItemId = val;
                                  setFormData({ ...formData, ingredients: newIng });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {items.filter(i => i.id !== editingId).map(i => (
                                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="w-20">
                            <Label className="text-xs text-muted-foreground mb-1 block">Qty</Label>
                            <Input 
                              type="number" 
                              value={ing.quantity}
                              onChange={(e) => {
                                const newIng = [...formData.ingredients];
                                if (newIng[idx]) {
                                  newIng[idx].quantity = e.target.value;
                                  setFormData({ ...formData, ingredients: newIng });
                                }
                              }}
                            />
                          </div>
                          <div className="w-24">
                            <Label className="text-xs text-muted-foreground mb-1 block">Unit</Label>
                            <Select 
                              value={ing.unit} 
                              onValueChange={(val) => {
                                const newIng = [...formData.ingredients];
                                if (newIng[idx]) {
                                  newIng[idx].unit = val;
                                  setFormData({ ...formData, ingredients: newIng });
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {["pcs", "ml", "g", "kg", "bottle", "shot", "unit"].map((u) => (
                                  <SelectItem key={u} value={u}>{u}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => {
                              const newIng = [...formData.ingredients];
                              newIng.splice(idx, 1);
                              setFormData({ ...formData, ingredients: newIng });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setFormData({
                        ...formData, 
                        ingredients: [...formData.ingredients, { ingredientItemId: "", quantity: "1", unit: "pcs" }]
                      })}
                      className="w-full text-xs border-dashed"
                    >
                      <Plus className="w-3 h-3 mr-1" /> Add Ingredient
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium">Track Stock</label>
                    <p className="text-xs text-muted-foreground">Enable inventory tracking for this item</p>
                  </div>
                  <Checkbox
                    checked={formData.trackStock}
                    onCheckedChange={(c) => setFormData({ ...formData, trackStock: !!c })}
                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Unit</Label>
                    <Select value={formData.unit} onValueChange={(val) => setFormData({ ...formData, unit: val })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["pcs", "ml", "g", "kg", "bottle", "shot", "unit"].map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-1 block">Reorder Level</Label>
                    <Input
                      type="number"
                      value={formData.reorderLevel}
                      onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">Cost Price (per unit)</Label>
                    <Input
                      type="number"
                      value={formData.costPrice}
                      onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
                    />
                  </div>
                </div>

                <p className="font-medium mt-4 text-sm text-muted-foreground">Current Stock: <span className="text-foreground">{formData.stockQuantity} {formData.unit}</span></p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-2">
            <Button variant="ghost" onClick={closeForm} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">Cancel</Button>
            <Button onClick={saveItem} disabled={!formData.categoryId || !formData.name}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
