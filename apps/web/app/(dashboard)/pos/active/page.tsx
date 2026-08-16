"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ReceiptText, Trash2, ArrowLeft, ChefHat, CheckCircle2, Clock, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import api from "@/lib/api";

export default function KitchenDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [subTab, setSubTab] = useState<'PENDING' | 'PREPARING'>('PENDING');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchOrders();
    // In a real KDS, you would poll or use websockets here
    const interval = setInterval(fetchOrders, 10000); // poll every 10s
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get("/orders/active");
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    setSubmitting(true);
    try {
      await api.post(`/orders/${id}/status`, { status: newStatus });
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert("Failed to update status");
    }
    setSubmitting(false);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!confirm("Are you sure you want to cancel and delete this order?")) return;
    setSubmitting(true);
    try {
      await api.delete(`/orders/${id}`);
      fetchOrders();
    } catch (e) {
      console.error(e);
      alert("Failed to delete order");
    }
    setSubmitting(false);
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const preparingOrders = orders.filter(o => o.status === 'PREPARING');
  const activeOrders = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');
  const servedOrders = orders.filter(o => o.status === 'SERVED' || o.status === 'PAID');

  const renderOrderCard = (order: any, isCompleted: boolean) => {
    const isPending = order.status === 'PENDING';
    const isPreparing = order.status === 'PREPARING';

    return (
      <Card key={order.id} className={`overflow-hidden border-2 flex flex-col ${isPending ? 'border-yellow-200' : isPreparing ? 'border-blue-200' : 'border-green-200 opacity-70'}`}>
        <CardHeader className={`pb-2 ${isPending ? 'bg-yellow-50' : isPreparing ? 'bg-blue-50' : 'bg-green-50'}`}>
          <CardTitle className="text-base flex justify-between items-start gap-2">
            <span className="leading-tight">
              {order.orderType === 'ROOM' && order.legacyReservation ? (
                <>Room {order.legacyReservation.room?.number} <span className="text-xs font-normal text-muted-foreground block">({order.legacyReservation.guest?.firstName})</span></>
              ) : order.orderType === 'WALK_IN' && order.walkInSession ? (
                <>Walk-In <span className="text-xs font-normal text-muted-foreground block">({order.walkInSession.guestName})</span></>
              ) : (
                <span>Type: {order.orderType}</span>
              )}
            </span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide shrink-0
              ${isPending ? 'bg-yellow-200 text-yellow-800' : 
                isPreparing ? 'bg-blue-200 text-blue-800' : 
                'bg-green-200 text-green-800'}`}>
              {order.status}
            </span>
          </CardTitle>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" />
            {new Date(order.createdAt).toLocaleTimeString()}
          </div>
        </CardHeader>
        <CardContent className="pt-3 flex-1">
          <div className="space-y-2">
            {order.items.map((oi: any) => (
              <div key={oi.id} className="flex flex-col text-xs border-b pb-1.5 last:border-0">
                <div className="flex items-center flex-wrap gap-1.5 font-medium">
                  <span>{oi.quantity}x {oi.item?.name || 'Item'}</span>
                  {oi.note && (
                    <span className="text-[10px] text-red-600 bg-red-50 px-1 py-0.5 rounded font-semibold">
                      Note: {oi.note}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="bg-gray-50 border-t p-2.5 flex flex-col gap-2">
          {!isCompleted && (
            <div className="flex w-full gap-1.5">
              {isPending && (
                <Button 
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" 
                  onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                  disabled={submitting}
                >
                  <ChefHat className="w-3.5 h-3.5 mr-1.5" /> Start Preparing
                </Button>
              )}
              {isPreparing && (
                <>
                  <Button 
                    size="sm"
                    variant="outline"
                    className="px-2.5 h-8"
                    onClick={() => handleUpdateStatus(order.id, 'PENDING')}
                    title="Revert to Pending"
                    disabled={submitting}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button 
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-xs h-8" 
                    onClick={() => handleUpdateStatus(order.id, 'SERVED')}
                    disabled={submitting}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark as Served
                  </Button>
                </>
              )}
              <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 border-red-200 w-8 h-8 px-0 shrink-0" onClick={() => handleDeleteOrder(order.id)} disabled={submitting}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
          {isCompleted && (
            <div className="w-full flex flex-col gap-2">
              <div className="text-xs font-medium text-green-700 flex flex-col items-center justify-center gap-1 text-center">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Served at {new Date(order.updatedAt).toLocaleTimeString()}
                </div>
                {(() => {
                  const mins = Math.round((new Date(order.updatedAt).getTime() - new Date(order.createdAt).getTime()) / 60000);
                  return (
                    <div className="text-[10px] text-green-700 bg-green-100/70 border border-green-200 px-1.5 py-0.5 rounded-full">
                      Prep time: {mins === 0 ? '<1' : mins} min{mins !== 1 && mins !== 0 ? 's' : ''}
                    </div>
                  );
                })()}
              </div>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs h-8 flex-1"
                  onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                  disabled={submitting}
                >
                  <Undo2 className="w-3 h-3 mr-1" /> Preparing
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-xs h-8 flex-1"
                  onClick={() => handleUpdateStatus(order.id, 'PENDING')}
                  disabled={submitting}
                >
                  <Undo2 className="w-3 h-3 mr-1" /> Pending
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-[1600px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/pos">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 shrink-0">
              <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-primary shrink-0" /> Kitchen Dashboard
            </h1>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto overflow-x-auto">
            <button 
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === 'ACTIVE' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setTab('ACTIVE')}
            >
              Active ({pendingOrders.length + preparingOrders.length})
            </button>
            <button 
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === 'COMPLETED' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setTab('COMPLETED')}
            >
              Completed ({servedOrders.length})
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading kitchen orders...</p>
      ) : tab === 'ACTIVE' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {activeOrders.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-lg">No active orders right now</div>
          ) : (
            activeOrders.map(o => renderOrderCard(o, false))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
          {servedOrders.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-400 text-lg">No completed orders today</div>
          ) : (
            servedOrders.map(o => renderOrderCard(o, true))
          )}
        </div>
      )}
    </div>
  );
}
