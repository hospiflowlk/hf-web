"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Search, Edit2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import toast from "react-hot-toast";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function StockManagement() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Modal state
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [newStock, setNewStock] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get("/inventory/items");
      setItems(res.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load inventory items");
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustClick = (item: any) => {
    setSelectedItem(item);
    setNewStock("");
    setAdjustReason("");
    setIsAdjustOpen(true);
  };

  const handleSaveAdjustment = async () => {
    if (newStock === "" || isNaN(parseFloat(newStock))) {
      toast.error("Please enter a valid stock quantity");
      return;
    }
    
    const targetStock = parseFloat(newStock);
    const currentStock = selectedItem.stockQuantity;
    const diff = targetStock - currentStock;

    if (diff === 0) {
      toast.error("The new stock must be different from the current stock");
      return;
    }

    if (!adjustReason.trim()) {
      toast.error("Please enter a reason for the adjustment");
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/inventory/adjust", {
        itemId: selectedItem.id,
        quantity: diff,
        reason: adjustReason
      });
      toast.success("Stock adjusted successfully");
      setIsAdjustOpen(false);
      fetchItems(); // Refresh list
    } catch (err) {
      console.error(err);
      toast.error("Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.category?.name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="font-semibold text-lg text-slate-800">Stock Management</h1>
      </div>

      <div className="flex-1 p-6 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border p-2 flex items-center gap-2">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <Input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search items by name or category..." 
            className="border-0 focus-visible:ring-0 shadow-none text-base"
          />
        </div>

        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-slate-500">Loading stock...</div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-500">No tracked items found.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Cost Price</th>
                  <th className="px-4 py-3 text-right">Current Stock</th>
                  <th className="px-4 py-3 text-right">Reorder Lvl</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredItems.map(item => {
                  const isLowStock = item.stockQuantity <= item.reorderLevel;
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {item.category?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {item.costPrice?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {item.stockQuantity} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {item.reorderLevel} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-600 border border-red-100">
                            <AlertCircle className="w-3 h-3" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-8 gap-2 border-slate-200"
                          onClick={() => handleAdjustClick(item)}
                        >
                          <Edit2 className="w-3 h-3" />
                          Adjust
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Adjust Stock: {selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-slate-50 p-3 rounded-md border text-sm flex justify-between">
              <span className="text-slate-500">Current Stock:</span>
              <span className="font-medium text-slate-900">{selectedItem?.stockQuantity} {selectedItem?.unit}</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">New Total Stock</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="e.g. 0, 5, 10.5"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value)}
                />
                <div className="flex items-center px-3 bg-slate-100 border rounded-md text-sm text-slate-500">
                  {selectedItem?.unit}
                </div>
              </div>
              <p className="text-[11px] text-slate-500">
                Enter the actual physical count you have right now. The system will automatically calculate the difference.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Reason for Adjustment</label>
              <Input
                placeholder="e.g. Physical count discrepancy, Wastage"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveAdjustment} disabled={submitting}>
              {submitting ? "Saving..." : "Save Adjustment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
