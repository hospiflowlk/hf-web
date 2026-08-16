"use client";

import { useState, useEffect, useRef } from "react";
import api from "@/lib/api";
import { Plus, Search, Edit2, Trash2, Users, MoreVertical, FileDown, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";

export default function CustomerMasterPage() {
  const [customers, setCustomers] = useState<any[]>([]);
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
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = (customer?: any) => {
    if (customer) {
      setEditingId(customer.id);
      setFormData({
        name: customer.name,
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        taxNumber: customer.taxNumber || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        taxNumber: "",
      });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
  };

  const saveCustomer = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Please enter a Customer Name.");
        return;
      }
      if (editingId) {
        await api.put(`/customers/${editingId}`, formData);
      } else {
        await api.post("/customers", formData);
      }
      closeForm();
      fetchCustomers();
    } catch (err: any) {
      console.warn(err);
      if (err.response?.status === 409) {
        alert("A customer with this name already exists.");
      } else {
        alert("Failed to save customer.");
      }
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;
    try {
      await api.delete(`/customers/${id}`);
      fetchCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm("Are you sure you want to delete ALL customers? This action cannot be undone.")) return;
    try {
      setLoading(true);
      await Promise.all(customers.map(c => api.delete(`/customers/${c.id}`)));
      await fetchCustomers();
    } catch (err) {
      console.error(err);
      alert("Error deleting all customers.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const dataToExport = customers.map((c) => ({
      Name: c.name,
      Email: c.email || "",
      Phone: c.phone || "",
      Address: c.address || "",
      "Tax Number": c.taxNumber || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "Customers_Export.xlsx");
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
            taxNumber: String(row["Tax Number"] || row.taxNumber || row.TaxNumber || row["TIN/VAT"] || ""),
          };

          if (!payload.name || payload.name.trim() === "" || payload.name === "undefined") continue;

          await api.post("/customers", payload).catch(err => console.warn("Skipped row due to error or duplicate:", err?.response?.data?.message || err.message));
        }
        await fetchCustomers();
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

  const filteredCustomers = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Users className="h-4 w-4 text-muted-foreground" />
          </Button>
          <h1 className="font-semibold text-lg">Customer Master</h1>
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
            Add Customer
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Customers..."
              className="pl-9 h-11 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-border/50 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading customers...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                No customers found. Click "Add Customer" to create one.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredCustomers.map((c) => (
                  <div key={c.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors group">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{c.name}</h3>
                        {!c.isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {c.phone && <span>Phone: {c.phone}</span>}
                        {c.email && <span>Email: {c.email}</span>}
                        {c.address && <span>Address: {c.address}</span>}
                        {c.taxNumber && <span>TIN/VAT: {c.taxNumber}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openForm(c)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => deleteCustomer(c.id)}>
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
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Customer" : "Add Customer"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Customer Name *</Label>
              <Input
                placeholder="e.g. Acme Corp"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label>Phone</Label>
              <Input
                placeholder="e.g. +94 112..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                placeholder="contact@customer.com"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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

            <div className="grid gap-2">
              <Label>TIN/VAT</Label>
              <Input
                placeholder="e.g. VAT-12345"
                value={formData.taxNumber}
                onChange={(e) => setFormData({ ...formData, taxNumber: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={saveCustomer}>{editingId ? "Save Changes" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
