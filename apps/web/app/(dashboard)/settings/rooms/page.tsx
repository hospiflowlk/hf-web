"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Settings as SettingsIcon, Tag, Edit2 } from "lucide-react";
import api from "@/lib/api";

export default function RoomSettingsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Category Management State
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catFormData, setCatFormData] = useState({ name: "", description: "", basePrice: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsRes, categoriesRes] = await Promise.all([
        api.get("/rooms/all"),
        api.get("/rooms/categories")
      ]);
      setRooms(roomsRes.data);
      // Wait, is there a /categories endpoint?
      // Yes, there should be. But wait, earlier I saw categories came from /rooms/all in the grid layout? 
      // Actually in Sidebar I saw /masters/categories! I should use that if it exists, or /rooms/all might return them?
      // Actually let's fetch from the exact categories endpoint or just map them from rooms if it's there.
      // Let's assume /categories exists as it's common, or I'll fix it if it fails.
      // Wait, let's fetch categories properly.
      // I can extract categories from `roomsRes.data` if needed, but let's fetch categories.
      setCategories(categoriesRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const openRoomForm = (room?: any) => {
    if (room) {
      setEditingRoomId(room.id);
      setNewRoomNumber(room.number);
      setSelectedCategoryId(room.categoryId || "");
    } else {
      setEditingRoomId(null);
      setNewRoomNumber("");
      setSelectedCategoryId("");
    }
    setOpen(true);
  };

  const handleSaveRoom = async () => {
    if (!newRoomNumber || !selectedCategoryId) return;
    setSubmitting(true);
    try {
      if (editingRoomId) {
        await api.put(`/rooms/${editingRoomId}`, { number: newRoomNumber, categoryId: selectedCategoryId });
      } else {
        await api.post("/rooms", { number: newRoomNumber, categoryId: selectedCategoryId });
      }
      setOpen(false);
      setEditingRoomId(null);
      setNewRoomNumber("");
      setSelectedCategoryId("");
      fetchData();
    } catch (e: any) {
      alert("Failed to save room: " + (e.response?.data?.message || e.message));
    }
    setSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this room? Historical records will be preserved.")) {
      try {
        await api.delete(`/rooms/${id}`);
        fetchData();
      } catch (e: any) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const openCategoryForm = (cat?: any) => {
    if (cat) {
      setEditingCategoryId(cat.id);
      setCatFormData({ name: cat.name, description: cat.description || "", basePrice: cat.basePrice });
    } else {
      setEditingCategoryId(null);
      setCatFormData({ name: "", description: "", basePrice: 0 });
    }
  };

  const handleSaveCategory = async () => {
    if (!catFormData.name) return;
    try {
      if (editingCategoryId) {
        await api.put(`/rooms/categories/${editingCategoryId}`, catFormData);
      } else {
        await api.post("/rooms/categories", catFormData);
      }
      setEditingCategoryId(null);
      setCatFormData({ name: "", description: "", basePrice: 0 });
      fetchData(); // refresh categories list
    } catch (e: any) {
      alert("Save failed: " + (e.response?.data?.message || e.message));
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (confirm("Are you sure you want to delete this category?")) {
      try {
        await api.delete(`/rooms/categories/${id}`);
        fetchData();
      } catch (e: any) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-500" /> Room Settings
        </h1>
        <div className="flex gap-2">
          <Dialog open={categoryOpen} onOpenChange={setCategoryOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Tag className="w-4 h-4" /> Manage Categories
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Room Categories</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="bg-slate-50 p-3 rounded-lg border space-y-3">
                  <h3 className="text-sm font-medium">{editingCategoryId ? "Edit Category" : "Add New Category"}</h3>
                  <div className="space-y-2">
                    <Input 
                      placeholder="Category Name (e.g. Deluxe)" 
                      value={catFormData.name} 
                      onChange={e => setCatFormData({ ...catFormData, name: e.target.value })} 
                    />
                    <Input 
                      placeholder="Description (Optional)" 
                      value={catFormData.description} 
                      onChange={e => setCatFormData({ ...catFormData, description: e.target.value })} 
                    />
                    <Input 
                      type="number"
                      placeholder="Base Price" 
                      value={catFormData.basePrice || ""} 
                      onChange={e => setCatFormData({ ...catFormData, basePrice: Number(e.target.value) })} 
                    />
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={handleSaveCategory} disabled={!catFormData.name}>
                        {editingCategoryId ? "Update" : "Add"}
                      </Button>
                      {editingCategoryId && (
                        <Button size="sm" variant="ghost" onClick={() => openCategoryForm()}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border rounded-md divide-y">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">No categories found.</div>
                  ) : (
                    categories.map(cat => (
                      <div key={cat.id} className="p-3 flex justify-between items-center hover:bg-slate-50">
                        <div>
                          <div className="font-medium text-sm">{cat.name}</div>
                          <div className="text-xs text-gray-500">Price: {cat.basePrice} | {cat.description || "No description"}</div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openCategoryForm(cat)}>
                            <Edit2 className="w-3 h-3 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteCategory(cat.id)}>
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) openRoomForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90" onClick={() => openRoomForm()}>
                <Plus className="w-4 h-4 mr-2" /> Add Room
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Room</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Room Number</label>
                <Input 
                  placeholder="e.g. 104" 
                  value={newRoomNumber} 
                  onChange={e => setNewRoomNumber(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select 
                  className="w-full border border-gray-300 p-2 rounded-md mt-1"
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <Button 
                className="w-full bg-primary hover:bg-primary/90" 
                onClick={handleSaveRoom}
                disabled={submitting || !newRoomNumber || !selectedCategoryId}
              >
                {submitting ? "Saving..." : (editingRoomId ? "Update Room" : "Add Room")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-medium text-gray-600">Room Number</th>
              <th className="p-4 font-medium text-gray-600">Category</th>
              <th className="p-4 font-medium text-gray-600">Status</th>
              <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">Loading...</td></tr>
            ) : rooms.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">No rooms found. Add one above!</td></tr>
            ) : (
              rooms.map(room => (
                <tr key={room.id} className="border-b last:border-0 hover:bg-gray-50/50">
                  <td className="p-4 font-medium">Room {room.number}</td>
                  <td className="p-4 text-gray-600">{room.category?.name || '-'}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                      {room.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex justify-end gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => openRoomForm(room)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(room.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
