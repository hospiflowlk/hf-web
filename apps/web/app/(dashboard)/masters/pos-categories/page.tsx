"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { Plus, Search, Edit2, Trash2, Tag, Loader2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function PosCategoryMasterPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get("/pos-categories");
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
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
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
        await api.put(`/pos-categories/${editingId}`, formData);
      } else {
        await api.post("/pos-categories", formData);
      }
      closeForm();
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to save POS category.");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this POS category?")) return;
    try {
      await api.delete(`/pos-categories/${id}`);
      fetchCategories();
    } catch (err) {
      console.error(err);
      alert("Failed to delete POS category.");
    }
  };

  const handleReorder = async (direction: 'up' | 'down', index: number) => {
    if (search !== "") return; // Disable reordering while searching
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === categories.length - 1) return;

    const newCategories = [...categories];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    // Swap items
    [newCategories[index], newCategories[swapIndex]] = [newCategories[swapIndex], newCategories[index]];
    
    // Update local state immediately for snappy UI
    setCategories(newCategories);

    // Call API in background
    try {
      await api.post('/pos-categories/reorder', {
        orderedIds: newCategories.map(c => c.id)
      });
    } catch (err) {
      console.error(err);
      alert("Failed to save new order.");
      fetchCategories(); // Revert on failure
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-emerald-600" />
            POS Categories
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage categories used specifically for grouping items in the POS.
          </p>
        </div>
        <Button onClick={() => openForm()} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
          <Plus className="w-4 h-4 mr-2" /> Add POS Category
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search POS categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 font-semibold">Category Name</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-6 py-8 text-center text-slate-500">
                      No POS categories found.
                    </td>
                  </tr>
                ) : (
                  filteredCategories.map((cat, index) => (
                    <tr key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{cat.name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {search === "" && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                disabled={index === 0}
                                onClick={() => handleReorder('up', index)} 
                                className="text-slate-400 hover:text-slate-800"
                              >
                                <ArrowUp className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                disabled={index === filteredCategories.length - 1}
                                onClick={() => handleReorder('down', index)} 
                                className="text-slate-400 hover:text-slate-800"
                              >
                                <ArrowDown className="w-4 h-4" />
                              </Button>
                              <div className="w-px h-4 bg-slate-200 mx-1"></div>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => openForm(cat)} className="text-slate-400 hover:text-blue-600">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteCategory(cat.id)} className="text-slate-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit POS Category" : "New POS Category"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Mains, Beverages"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button onClick={saveCategory} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
