"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Plus, Search, Edit2, Trash2, Percent, MoreVertical, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";

export default function TaxMasterPage() {
  const [taxes, setTaxes] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    rate: 0,
    type: "Other",
    calculationBase: "Net",
    calculationOrder: 1,
    isTurnoverTax: false,
    isActive: true,
  });

  useEffect(() => {
    fetchTaxes();
  }, []);

  const fetchTaxes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/taxes");
      setTaxes(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (tax?: any) => {
    if (tax) {
      setEditingId(tax.id);
      setFormData({
        name: tax.name,
        rate: tax.rate,
        type: tax.type || "Other",
        calculationBase: tax.calculationBase || "Net",
        calculationOrder: tax.calculationOrder || 1,
        isTurnoverTax: tax.isTurnoverTax || false,
        isActive: tax.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        rate: 0,
        type: "Other",
        calculationBase: "Net",
        calculationOrder: 1,
        isTurnoverTax: false,
        isActive: true,
      });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
  };

  const saveTax = async () => {
    try {
      if (editingId) {
        await api.put(`/taxes/${editingId}`, formData);
      } else {
        await api.post("/taxes", formData);
      }
      closeForm();
      fetchTaxes();
      toast.success(editingId ? "Tax updated successfully" : "Tax created successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save tax. Tax name may already exist.");
    }
  };

  const deleteTax = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tax?")) return;
    try {
      await api.delete(`/taxes/${id}`);
      fetchTaxes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL taxes? This action cannot be undone.")) return;
    try {
      setLoading(true);
      await Promise.all(taxes.map((t) => api.delete(`/taxes/${t.id}`)));
      await fetchTaxes();
    } catch (err) {
      console.error(err);
      alert("Error deleting all taxes.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = taxes.map((tax) => ({
      Name: tax.name,
      "Rate (%)": tax.rate,
      Type: tax.type,
      "Calculation Base": tax.calculationBase,
      "Calculation Order": tax.calculationOrder,
      "Turnover Tax": tax.isTurnoverTax ? "Yes" : "No",
      Active: tax.isActive ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Taxes");
    XLSX.writeFile(workbook, "Taxes_Export.xlsx");
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

        for (const row of json) {
          const payload = {
            name: row.Name || row.name,
            rate: parseFloat(row["Rate (%)"] || row.rate || 0),
            type: row.Type || row.type || "Other",
            calculationBase: row["Calculation Base"] || row.calculationBase || "Net",
            calculationOrder: parseInt(row["Calculation Order"] || row.calculationOrder || 1),
            isTurnoverTax: row["Turnover Tax"] === "Yes" || row.isTurnoverTax === true,
            isActive: row.Active === "No" || row.active === "No" ? false : true,
          };

          if (payload.name) {
            await api.post("/taxes", payload).catch((err) => console.error("Skip dup", err));
          }
        }
        await fetchTaxes();
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

  const filteredTaxes = taxes.filter((tax) =>
    tax.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Percent className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tax Master</h1>
            <p className="text-sm text-muted-foreground">Manage system-wide taxes and calculations</p>
          </div>
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

          <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Taxes"
          className="pl-9 bg-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground animate-pulse">Loading taxes...</div>
        ) : filteredTaxes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <Percent className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium">No taxes found</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">Add your first tax to get started.</p>
            <Button onClick={() => openForm()} variant="outline">
              Add Tax
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredTaxes.map((tax) => (
              <div key={tax.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-medium text-sm text-foreground">{tax.name}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      {tax.rate}%
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100">
                      {tax.type}
                    </span>
                    {tax.isTurnoverTax && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100">
                        Turnover Tax
                      </span>
                    )}
                    {!tax.isActive && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-4">
                    <span>Base: {tax.calculationBase}</span>
                    <span>Order: {tax.calculationOrder}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openForm(tax)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => deleteTax(tax.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Tax" : "Add Tax"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            
            <div className="grid gap-2">
              <Label htmlFor="name">Tax Name</Label>
              <Input id="name" placeholder="e.g. VAT 15%" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="rate">Rate (%)</Label>
                <Input id="rate" type="number" step="0.01" value={formData.rate} onChange={(e) => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VAT">VAT</SelectItem>
                    <SelectItem value="SC">Service Charge (SC)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="calculationBase">Calculation Base</Label>
              <Select value={formData.calculationBase} onValueChange={(val) => setFormData({ ...formData, calculationBase: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select base" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net">Net (Before all taxes)</SelectItem>
                  <SelectItem value="Gross">Gross (Inclusive)</SelectItem>
                  <SelectItem value="Net + Previous Taxes">Net + Previous Taxes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="calculationOrder">Calculation Order</Label>
              <Input id="calculationOrder" type="number" value={formData.calculationOrder} onChange={(e) => setFormData({ ...formData, calculationOrder: parseInt(e.target.value) || 1 })} />
              <p className="text-[10px] text-muted-foreground">Taxes with lower order are calculated first.</p>
            </div>

            <div className="flex gap-4 mt-2">
              <div className="flex items-center gap-2">
                <Checkbox id="isTurnoverTax" checked={formData.isTurnoverTax} onCheckedChange={(c) => setFormData({ ...formData, isTurnoverTax: !!c })} />
                <Label htmlFor="isTurnoverTax" className="cursor-pointer font-normal text-sm">Is Turnover Tax</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="isActive" checked={formData.isActive} onCheckedChange={(c) => setFormData({ ...formData, isActive: !!c })} />
                <Label htmlFor="isActive" className="cursor-pointer font-normal text-sm">Active</Label>
              </div>
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={saveTax} disabled={!formData.name || formData.rate < 0}>Save Tax</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
