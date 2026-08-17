"use client";

import { useState } from "react";
import useSWR from "swr";
import api from "@/lib/api";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function BusinessSourcesPage() {
  const [isMutating, setIsMutating] = useState(false);

  const fetcher = (url: string) => api.get(url).then(res => res.data);
  const { data: sources = [], isLoading, mutate: fetchSources } = useSWR<any[]>("/business-sources", fetcher);
  const loading = isLoading || isMutating;

  // Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    commissionRate: 0,
    isActive: true,
  });

  const openForm = (source?: any) => {
    if (source) {
      setEditingId(source.id);
      setFormData({
        name: source.name,
        commissionRate: source.commissionRate,
        isActive: source.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        commissionRate: 0,
        isActive: true,
      });
    }
    setIsOpen(true);
  };

  const closeForm = () => {
    setIsOpen(false);
    setEditingId(null);
  };

  const saveSource = async () => {
    try {
      if (!formData.name.trim()) {
        alert("Please enter a Source Name.");
        return;
      }
      
      setIsMutating(true);
      const payload = {
        ...formData,
        commissionRate: parseFloat(String(formData.commissionRate)) || 0
      };

      if (editingId) {
        await api.put(`/business-sources/${editingId}`, payload);
      } else {
        await api.post("/business-sources", payload);
      }
      closeForm();
      await fetchSources();
    } catch (err) {
      console.error(err);
      alert("Failed to save business source.");
    } finally {
      setIsMutating(false);
    }
  };

  const toggleActive = async (source: any) => {
    try {
      setIsMutating(true);
      await api.put(`/business-sources/${source.id}`, {
        isActive: !source.isActive
      });
      await fetchSources();
    } catch (err) {
      console.error("Failed to toggle status", err);
    } finally {
      setIsMutating(false);
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this business source?")) return;
    try {
      setIsMutating(true);
      await api.delete(`/business-sources/${id}`);
      await fetchSources();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to delete business source. It may be in use.");
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between">
        <h1 className="font-semibold text-lg">Business Sources</h1>
        <Button variant="ghost" size="icon" onClick={() => openForm()} className="h-8 w-8 text-muted-foreground">
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : sources.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-white rounded-lg border">
              No business sources found. Click the + button to create one.
            </div>
          ) : (
            <div className="divide-y divide-border border-b border-t">
              {sources.map((source) => (
                <div key={source.id} className="py-4 flex items-center justify-between group transition-colors">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900">{source.name}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      Commission Rate: {Number(source.commissionRate).toFixed(1)}%
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => openForm(source)}
                      className="text-blue-500 hover:text-blue-700 transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    
                    <Switch
                      checked={source.isActive}
                      onCheckedChange={() => toggleActive(source)}
                      className="data-[state=checked]:bg-teal-600"
                    />
                    
                    <button 
                      onClick={() => deleteSource(source.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Delete Source"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-out Form Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-xl">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-xl font-bold">
              {editingId ? "Edit Business Source" : "Add Business Source"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-6 py-2">
            <div className="grid gap-2 relative">
              <Label className="text-xs font-semibold text-muted-foreground bg-white px-1 absolute -top-2 left-2 z-10">
                Source Name
              </Label>
              <Input
                className="pt-2 pb-2 px-3 border-teal-500 rounded-md shadow-sm h-12 focus-visible:ring-1 focus-visible:ring-teal-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid gap-2 relative">
              <Label className="text-xs font-semibold text-muted-foreground bg-white px-1 absolute -top-2 left-2 z-10">
                Commission Rate (%)
              </Label>
              <div className="relative">
                <Input
                  className="pt-2 pb-2 px-3 border-border rounded-md shadow-sm h-12 text-gray-800"
                  type="number"
                  step="0.1"
                  value={formData.commissionRate}
                  onChange={(e) => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) || 0 })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                  %
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-none gap-2 sm:justify-end flex-row">
            <Button variant="ghost" onClick={closeForm} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 font-semibold px-6">
              Cancel
            </Button>
            <Button onClick={saveSource} className="bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm font-medium px-6">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
