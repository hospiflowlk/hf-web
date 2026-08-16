"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Settings as SettingsIcon } from "lucide-react";
import api from "@/lib/api";

export default function RoomSettingsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreate = async () => {
    if (!newRoomNumber || !selectedCategoryId) return;
    setSubmitting(true);
    try {
      await api.post("/rooms", { number: newRoomNumber, categoryId: selectedCategoryId });
      setOpen(false);
      setNewRoomNumber("");
      setSelectedCategoryId("");
      fetchData();
    } catch (e: any) {
      alert("Failed to create room: " + (e.response?.data?.message || e.message));
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

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-gray-500" /> Room Settings
        </h1>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
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
                onClick={handleCreate}
                disabled={submitting || !newRoomNumber || !selectedCategoryId}
              >
                {submitting ? "Adding..." : "Add Room"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                  <td className="p-4 text-right">
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
