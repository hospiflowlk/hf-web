"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Package, AlertTriangle, DollarSign } from "lucide-react";

export default function InventoryDashboard() {
  const [stats, setStats] = useState({
    totalTrackedItems: 0,
    lowStockItems: 0,
    totalValue: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await api.get("/inventory/dashboard");
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold mb-6">Inventory Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Tracked Items */}
        <div className="bg-card rounded-xl p-6 border shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Tracked Items</p>
            <p className="text-2xl font-bold text-foreground">{stats.totalTrackedItems}</p>
          </div>
        </div>

        {/* Low Stock Items */}
        <div className="bg-card rounded-xl p-6 border shadow-sm flex items-center gap-4">
          <div className="bg-red-50 p-3 rounded-lg text-red-600">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-foreground">{stats.lowStockItems}</p>
          </div>
        </div>

        {/* Total Value */}
        <div className="bg-card rounded-xl p-6 border shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground font-medium">Inventory Value</p>
            <p className="text-2xl font-bold text-foreground">
              {stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
