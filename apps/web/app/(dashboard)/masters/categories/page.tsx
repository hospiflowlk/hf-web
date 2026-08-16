"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Search, Edit2, Trash2, Tag, MoreVertical, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import { useRef } from "react";

export default function CategoryMasterPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    isRevenue: false,
    isExpense: true,
    isAsset: false,
    isLiability: false,
    isActive: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (cat?: any) => {
    if (cat) {
      setEditingId(cat.id);
      setFormData({
        name: cat.name,
        isRevenue: cat.isRevenue,
        isExpense: cat.isExpense,
        isAsset: cat.isAsset,
        isLiability: cat.isLiability,
        isActive: cat.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        isRevenue: false,
        isExpense: true,
        isAsset: false,
        isLiability: false,
        isActive: true,
      });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
  };

  const saveCategory = async () => {
    try {
      if (editingId) {
        await api.put(`/categories/${editingId}`, formData);
      } else {
        await api.post("/categories", formData);
      }
      closeForm();
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to save category.");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      await api.delete(`/categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL categories? This action cannot be undone.")) return;
    try {
      setLoading(true);
      const ids = categories.map(c => c.id);
      await api.post('/categories/bulk-delete', { ids });
      await fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Error deleting all categories.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = categories.map((cat) => {
      const types = [];
      if (cat.isRevenue) types.push("Revenue");
      if (cat.isExpense) types.push("Expense");
      if (cat.isAsset) types.push("Asset");
      if (cat.isLiability) types.push("Liability");

      return {
        Name: cat.name,
        Type: types.join(", "),
        Active: cat.isActive ? "Yes" : "No",
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Categories");
    XLSX.writeFile(workbook, "Categories_Export.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setLoading(true);
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        if (!sheetName) throw new Error("No sheets found in workbook");
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) throw new Error("Worksheet not found");
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        // Map and save to API sequentially to avoid overwhelming it
        for (const row of json) {
          const typeStr = String(row.Type || row.type || "").toLowerCase();
          const payload = {
            name: row.Name || row.name,
            isRevenue: typeStr.includes("revenue"),
            isExpense: typeStr.includes("expense"),
            isAsset: typeStr.includes("asset"),
            isLiability: typeStr.includes("liability"),
            isActive: row.Active === "No" || row.active === "No" ? false : true,
          };
          // default to expense if nothing is set
          if (!payload.isRevenue && !payload.isExpense && !payload.isAsset && !payload.isLiability) {
            payload.isExpense = true;
          }

          if (payload.name) {
            await api.post("/categories", payload).catch(err => console.error("Skip dup", err));
          }
        }
        await fetchCategories();
      } catch (err) {
        console.error(err);
        alert("Error importing Excel file.");
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Tag className="h-4 w-4 text-muted-foreground" />
          </Button>
          <h1 className="font-semibold text-lg">Category Master</h1>
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
              placeholder="Search Categories"
              className="pl-9 bg-transparent border-0 focus-visible:ring-0 shadow-none h-10"
            />
          </div>
        </div>

        <div className="bg-card rounded-md shadow-sm border border-border divide-y divide-border">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No categories found.</div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.id} className="p-4 flex items-center justify-between group hover:bg-slate-50/50 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-sm text-foreground">{cat.name}</span>
                    <div className="flex gap-1">
                      {cat.isRevenue && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-600 border-emerald-100">REVENUE</span>}
                      {cat.isAsset && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-emerald-50 text-emerald-600 border-emerald-100">ASSET</span>}
                      {cat.isExpense && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-amber-50 text-amber-600 border-amber-100">EXPENSE</span>}
                      {cat.isLiability && <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border bg-amber-50 text-amber-600 border-amber-100">LIABILITY</span>}
                    </div>
                    {!cat.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Items linked: {cat._count?.items || 0}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openForm(cat)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteCategory(cat.id)}>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Beverages"
              />
            </div>

            <div className="grid gap-3">
              <Label>Category Types</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="isRevenue" checked={formData.isRevenue} onCheckedChange={(c) => setFormData({ ...formData, isRevenue: !!c })} />
                  <Label htmlFor="isRevenue" className="cursor-pointer font-normal text-sm">Revenue (Income)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isExpense" checked={formData.isExpense} onCheckedChange={(c) => setFormData({ ...formData, isExpense: !!c })} />
                  <Label htmlFor="isExpense" className="cursor-pointer font-normal text-sm">Expense</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isAsset" checked={formData.isAsset} onCheckedChange={(c) => setFormData({ ...formData, isAsset: !!c })} />
                  <Label htmlFor="isAsset" className="cursor-pointer font-normal text-sm">Asset</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="isLiability" checked={formData.isLiability} onCheckedChange={(c) => setFormData({ ...formData, isLiability: !!c })} />
                  <Label htmlFor="isLiability" className="cursor-pointer font-normal text-sm">Liability</Label>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(c) => setFormData({ ...formData, isActive: !!c })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeForm}>Cancel</Button>
            <Button onClick={saveCategory} disabled={!formData.name}>Save Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
