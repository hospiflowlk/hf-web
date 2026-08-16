"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { History, ArrowLeft, Download, Trash2, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";
import api from "@/lib/api";

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get("/orders/history");
      console.log("Orders API Response:", res.data);
      setOrders(res.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleWhatsApp = (order: any) => {
    if (!order.items || order.items.length === 0) return;
    
    const now = new Date(order.createdAt);
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const staffName = typeof window !== 'undefined' ? (localStorage.getItem('userName') || localStorage.getItem('userEmail') || 'Staff') : 'Staff';
    
    let roomText = "N/A";
    let guestText = "Walk-In";
    if (order.legacyReservation) {
      roomText = order.legacyReservation.room?.number || "N/A";
      guestText = `${order.legacyReservation.guest?.firstName || ''} ${order.legacyReservation.guest?.lastName || ''}`;
    } else if (order.walkInSession) {
      guestText = order.walkInSession.guestName || "Walk-In";
    }

    const isHB = order.originalTotal != null && order.total === 0;
    const stayId = order.roomId ? `${roomText}_${now.getTime()}` : `W_${now.getTime()}`;

    let msg = `*Hilldale KOT (Reprint)*\n`;
    msg += `Stay ID: ${stayId}\n`;
    msg += `Order Type: ${isHB ? 'HB' : (order.paymentMethod === 'ROOM_CHARGE' ? 'Charged' : order.paymentMethod)}\n`;
    msg += `Date: ${dateStr} Time: ${timeStr}\n`;
    msg += `Staff: ${staffName}\n`;
    msg += `Room: ${roomText}\n`;
    msg += `Guest: ${guestText}\n`;
    msg += `Total items: ${order.items.reduce((s:number, i:any) => s + i.quantity, 0)}\n\n`;

    // Attempt simple group by item name for repriting since category might not be fully populated here,
    // or just list them. We'll group them into a single [Items] block.
    msg += `[Items]\n`;
    order.items.forEach((oi: any) => {
      msg += `${oi.quantity}x ${oi.item?.name || 'Unknown Item'} ${isHB ? '(HB)' : ''}\n`.replace('  ', ' ');
      if (oi.note) {
        msg += `   📝 Note: ${oi.note}\n`;
      }
    });

    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg.trim())}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Link href="/pos">
              <Button variant="ghost" size="icon" className="rounded-full shrink-0">
                <ArrowLeft className="w-5 h-5 text-gray-500" />
              </Button>
            </Link>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <History className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> Order History
            </h1>
          </div>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading history...</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
            <History className="w-12 h-12 mb-4 opacity-20" />
            <p>No past orders found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="hover:bg-slate-50 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <h3 className="font-bold">Order #{order.id.slice(0, 8)}</h3>
                  <div className="text-sm text-muted-foreground flex gap-4 mt-1">
                    <span>{new Date(order.createdAt).toLocaleString()}</span>
                    <span>Type: {order.orderType}</span>
                    {order.orderType === 'ROOM' && order.legacyReservation && (
                      <span className="text-blue-600 font-medium">
                        (Room {order.legacyReservation.room?.number} - {order.legacyReservation.guest?.firstName} {order.legacyReservation.guest?.lastName === 'Guest' ? '' : order.legacyReservation.guest?.lastName})
                      </span>
                    )}
                    {order.orderType === 'WALK_IN' && order.walkInSession && (
                      <span className="text-teal-600 font-medium">
                        (Walk-In - {order.walkInSession.guestName?.replace(/ Guest$/i, '')})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-bold text-lg">${(order.originalTotal || order.total).toFixed(2)}</div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                      (order.originalTotal != null && order.total === 0) ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {(order.originalTotal != null && order.total === 0) ? 'HB (Free)' : order.status}
                    </span>
                  </div>
                  {order.status !== 'CANCELLED' && (
                    <>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                        onClick={() => setSelectedOrder(order)}
                        title="View Order Details"
                      >
                        <Eye className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50"
                        onClick={() => handleWhatsApp(order)}
                        title="Resend WhatsApp KOT"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={async () => {
                          if(confirm("Are you sure you want to void/delete this order?")) {
                            try {
                              await api.delete(`/orders/${order.id}`);
                              fetchOrders();
                            } catch (e) {
                              console.error(e);
                              alert("Failed to delete order");
                            }
                          }
                        }}
                        title="Void Order"
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* View Order Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4 pt-4">
              <div className="text-sm text-gray-500 flex justify-between border-b pb-2">
                <span>Date: {new Date(selectedOrder.createdAt).toLocaleString()}</span>
                <span className="font-semibold text-gray-800">
                  Type: {(selectedOrder.originalTotal != null && selectedOrder.total === 0) ? 'HB (Free)' : selectedOrder.paymentMethod}
                </span>
              </div>
              <div className="space-y-2">
                {selectedOrder.items.map((oi: any, idx: number) => (
                  <div key={idx} className="flex flex-col text-sm">
                    <div className="flex justify-between items-center">
                      <span>
                        {oi.quantity}x {oi.item?.name || 'Unknown Item'}
                        {(selectedOrder.originalTotal != null && selectedOrder.total === 0) && <span className="text-xs font-bold text-accent-foreground ml-1">(HB)</span>}
                      </span>
                      <span className="font-medium">${(oi.quantity * (oi.item?.defaultPrice || 0)).toFixed(2)}</span>
                    </div>
                    {oi.note && (
                      <span className="text-xs text-muted-foreground ml-4 italic mt-1">Note: {oi.note}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${(selectedOrder.originalTotal || selectedOrder.total).toFixed(2)}</span>
              </div>
              <DialogFooter className="mt-6">
                <Button variant="outline" onClick={() => setSelectedOrder(null)}>Close</Button>
                <Button onClick={() => handleWhatsApp(selectedOrder)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  <MessageCircle className="w-4 h-4 mr-2" /> Resend KOT
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
