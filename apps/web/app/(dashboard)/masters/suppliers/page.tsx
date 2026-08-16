"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Plus, Search, Edit2, Trash2, Truck, MoreVertical, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

export default function SupplierMasterPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    taxNumber: "",
    bankName: "",
    accountName: "",
    accountNumber: "",
    branch: "",
    isActive: true,
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get("/suppliers");
      setSuppliers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (supplier?: any) => {
    if (supplier) {
      setEditingId(supplier.id);
      setFormData({
        name: supplier.name,
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        taxNumber: supplier.taxNumber || "",
        bankName: supplier.bankName || "",
        accountName: supplier.accountName || "",
        accountNumber: supplier.accountNumber || "",
        branch: supplier.branch || "",
        isActive: supplier.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        taxNumber: "",
        bankName: "",
        accountName: "",
        accountNumber: "",
        branch: "",
        isActive: true,
      });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
  };

  const saveSupplier = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Please enter a Supplier Name.");
        return;
      }
      if (editingId) {
        await api.put(`/suppliers/${editingId}`, formData);
      } else {
        await api.post("/suppliers", formData);
      }
      closeForm();
      fetchSuppliers();
    } catch (err: any) {
      console.warn(err);
      if (err.response?.status === 409) {
        alert("A supplier with this name already exists.");
      } else {
        alert("Failed to save supplier.");
      }
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await api.delete(`/suppliers/${id}`);
      fetchSuppliers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL suppliers? This action cannot be undone.")) return;
    try {
      setLoading(true);
      await Promise.all(suppliers.map(s => api.delete(`/suppliers/${s.id}`)));
      await fetchSuppliers();
    } catch (err) {
      console.error(err);
      alert("Error deleting all suppliers.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = suppliers.map((s) => ({
      Name: s.name,
      Email: s.email || "",
      Phone: s.phone || "",
      Address: s.address || "",
      "Tax Number": s.taxNumber || "",
      "Bank Name": s.bankName || "",
      "Account Name": s.accountName || "",
      "Account Number": s.accountNumber || "",
      "Branch": s.branch || "",
      Active: s.isActive ? "Yes" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Suppliers");
    XLSX.writeFile(workbook, "Suppliers_Export.xlsx");
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
        if (!worksheet) throw new Error("Worksheet is undefined");
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        for (const row of json) {
          const payload = {
            name: String(row.Name || row.name || ""),
            email: String(row.Email || row.email || ""),
            phone: String(row.Phone || row.phone || ""),
            address: String(row.Address || row.address || ""),
            taxNumber: String(row["Tax Number"] || row.taxNumber || row.TaxNumber || ""),
            bankName: String(row["Bank Name"] || row.bankName || ""),
            accountName: String(row["Account Name"] || row.accountName || ""),
            accountNumber: String(row["Account Number"] || row.accountNumber || ""),
            branch: String(row.Branch || row.branch || ""),
            isActive: row.Active === "No" || row.active === "No" ? false : true,
          };

          if (!payload.name || payload.name.trim() === "" || payload.name === "undefined") continue;

          await api.post("/suppliers", payload).catch(err => console.warn("Skipped row due to error or duplicate:", err?.response?.data?.message || err.message));
        }
        await fetchSuppliers();
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

  const filteredSuppliers = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Truck className="h-4 w-4 text-muted-foreground" />
          </Button>
          <h1 className="font-semibold text-lg">Supplier Master</h1>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="file"
            accept=".xlsx, .xls"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportExcel}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <MoreVertical className="h-4 w-4 mr-2" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer">
                <FileDown className="h-4 w-4 mr-2" /> Export to Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                <FileUp className="h-4 w-4 mr-2" /> Import from Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDeleteAll} className="cursor-pointer text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4 mr-2" /> Delete All
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={() => openForm()} size="sm" className="h-9">
            <Plus className="h-4 w-4 mr-2" />
            Add Supplier
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Suppliers..."
              className="pl-9 h-11 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading suppliers...</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No suppliers found. Click "Add Supplier" to create one.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredSuppliers.map((sup) => (
                  <div key={sup.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{sup.name}</h3>
                        {!sup.isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {sup.email && <span>{sup.email}</span>}
                        {sup.phone && <span>{sup.phone}</span>}
                        {sup.taxNumber && <span>Tax ID: {sup.taxNumber}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: 1 }}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openForm(sup)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteSupplier(sup.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Slide-out Form Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Supplier Name *</Label>
              <Input
                placeholder="e.g. Fresh Foods Ltd"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Phone Number</Label>
                <Input
                  placeholder="e.g. +94 112..."
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  placeholder="contact@supplier.com"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tax Number / VAT</Label>
              <Input
                placeholder="e.g. VAT-12345"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                placeholder="Full address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border mt-2">
              <div className="col-span-2">
                <Label className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Bank Details</Label>
              </div>
              <div className="grid gap-2">
                <Label>Bank Name</Label>
                <Input
                  placeholder="e.g. Commercial Bank"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Branch</Label>
                <Input
                  placeholder="e.g. City Office"
                  value={formData.branch}
                  onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Name</Label>
                <Input
                  placeholder="e.g. Fresh Foods Ltd"
                  value={formData.accountName}
                  onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Account Number</Label>
                <Input
                  placeholder="e.g. 1000 2344 5666"
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-4 border-t border-border mt-2">
              <Checkbox
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
              />
              <Label htmlFor="active" className="text-sm font-medium leading-none cursor-pointer">
                Active
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={saveSupplier}>{editingId ? "Save Changes" : "Add Supplier"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
