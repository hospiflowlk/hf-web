"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function WalkInsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [closedSessions, setClosedSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestCount, setGuestCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSessionForOrders, setSelectedSessionForOrders] = useState<any>(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const [activeRes, closedRes] = await Promise.all([
        api.get("/walk-in/active"),
        api.get("/walk-in/closed")
      ]);
      setSessions(activeRes.data);
      setClosedSessions(closedRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!guestName) return;
    setSubmitting(true);
    try {
      await api.post("/walk-in", { guestName, guestCount });
      setOpen(false);
      setGuestName("");
      setGuestCount(1);
      fetchSessions();
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const handleRepostBill = async (sessionId: string) => {
    if (confirm("Are you sure you want to re-post the bill for this checkout? This will generate a new draft invoice.")) {
      try {
        await api.post(`/walk-in/${sessionId}/repost-bill`);
        alert("Re-post successful! A new draft invoice has been generated.");
      } catch (e: any) {
        alert("Re-post failed: " + e.message);
      }
    }
  };

  const handleUnCheckout = async (sessionId: string) => {
    if (confirm("Are you sure you want to un-checkout this session? It will become active again.")) {
      try {
        await api.post(`/walk-in/${sessionId}/un-checkout`);
        alert("Walk-In session un-checked out successfully!");
        fetchSessions();
      } catch (e: any) {
        alert("Un-checkout failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm("Are you sure you want to delete this checkout record permanently?")) {
      try {
        await api.delete(`/walk-in/closed/${sessionId}`);
        fetchSessions();
      } catch (e: any) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const handleDeleteAllSessions = async () => {
    if (confirm("Are you sure you want to delete ALL checkout records permanently? This action cannot be undone.")) {
      try {
        await api.delete(`/walk-in/closed`);
        fetchSessions();
      } catch (e: any) {
        alert("Delete all failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/pos')} className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-orange-500" /> Walk-In Sessions
            </h1>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto overflow-x-auto">
            <button 
              onClick={() => setTab('ACTIVE')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === 'ACTIVE' ? 'bg-white shadow-sm text-orange-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active Check-Ins
            </button>
            <button 
              onClick={() => setTab('HISTORY')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === 'HISTORY' ? 'bg-white shadow-sm text-orange-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Recent Checkouts
            </button>
          </div>
          
          {tab === 'HISTORY' && closedSessions.length > 0 && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 w-full sm:w-auto"
              onClick={handleDeleteAllSessions}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear History
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700 w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" /> New Walk-In
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start Walk-In Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Guest/Table Name</label>
                <Input 
                  placeholder="e.g. Table 4 or John" 
                  value={guestName} 
                  onChange={e => setGuestName(e.target.value)} 
                />
              </div>
              <div>
                <label className="text-sm font-medium">Number of Guests</label>
                <Input 
                  type="number" 
                  min={1} 
                  value={guestCount} 
                  onChange={e => setGuestCount(Number(e.target.value))} 
                />
              </div>
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700" 
                onClick={handleCreate}
                disabled={submitting || !guestName}
              >
                {submitting ? "Starting..." : "Start Session"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading sessions...</p>
      ) : tab === 'ACTIVE' && sessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            <p>No active walk-in sessions right now.</p>
            <p className="text-sm mt-2">Click "New Walk-In" above to add one!</p>
          </CardContent>
        </Card>
      ) : tab === 'HISTORY' && closedSessions.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-20" />
            <p>No recent checkouts found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(tab === 'ACTIVE' ? sessions : closedSessions).map(session => (
            <Card key={session.id} className={`flex flex-col justify-between h-full ${tab === 'ACTIVE' ? "border-orange-200" : "border-gray-200 opacity-80"}`}>
              <div>
                <CardHeader className={`pb-2 ${tab === 'ACTIVE' ? "bg-orange-50" : "bg-gray-50"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{session.guestName}</CardTitle>
                      <p className={`text-sm ${tab === 'ACTIVE' ? "text-orange-700" : "text-gray-600"}`}>{session.referenceNumber}</p>
                    </div>
                    {tab === 'HISTORY' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-2"
                        onClick={() => handleDeleteSession(session.id)}
                        title="Delete record permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-0">
                  <div className="font-medium text-gray-800">
                    Guests: {session.guestCount}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {tab === 'ACTIVE' 
                      ? `Started: ${new Date(session.createdAt).toLocaleString()}` 
                      : `Closed: ${new Date(session.closedAt).toLocaleString()}`
                    }
                  </div>
                </CardContent>
              </div>
              
              <div className="p-6 pt-4 mt-auto">
                {/* Calculate accumulated POS balance from orders */}
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-500">POS Balance</div>
                  <div className="text-lg font-bold text-gray-900">
                    ${(session.orders?.reduce((sum: number, o: any) => sum + o.total, 0) || 0).toFixed(2)}
                  </div>
                </div>

                <div className="mt-4">
                  {tab === 'ACTIVE' ? (
                    <div className="flex flex-col gap-2">
                      <Button 
                        className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
                        variant="outline"
                        onClick={() => setSelectedSessionForOrders(session)}
                      >
                        View Orders
                      </Button>
                      <Button 
                        className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        variant="outline"
                        onClick={async () => {
                          if (confirm("Are you sure you want to check out this walk-in session? This will generate a draft invoice.")) {
                            try {
                              await api.patch(`/walk-in/${session.id}/checkout`);
                              alert("Check-out successful! A draft invoice has been generated.");
                              fetchSessions();
                            } catch (e: any) {
                              alert("Checkout failed: " + e.message);
                            }
                          }
                        }}
                      >
                        Checkout and Post the Bill
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button 
                        className="w-full bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                        variant="outline"
                        onClick={() => setSelectedSessionForOrders(session)}
                      >
                        View Orders
                      </Button>
                      <Button 
                        className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200"
                        variant="outline"
                        onClick={() => handleRepostBill(session.id)}
                      >
                        Re-post the Bill
                      </Button>
                      <Button 
                        className="w-full bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                        variant="outline"
                        onClick={() => handleUnCheckout(session.id)}
                      >
                        Un-Checkout
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Orders Dialog */}
      <Dialog open={!!selectedSessionForOrders} onOpenChange={(open) => !open && setSelectedSessionForOrders(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Orders for {selectedSessionForOrders?.guestName}
              <div className="text-sm font-normal text-muted-foreground mt-1">
                Ref: {selectedSessionForOrders?.referenceNumber} | Guests: {selectedSessionForOrders?.guestCount}
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedSessionForOrders?.orders?.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No POS orders for this session.</p>
            ) : (
              selectedSessionForOrders?.orders?.map((order: any) => (
                <div key={order.id} className="border rounded-lg p-4 bg-slate-50">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold">Order #{order.id.slice(0,8)}</span>
                    <span className="text-sm font-medium bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                      ${order.total.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mb-4">
                    {new Date(order.createdAt).toLocaleString()}
                  </div>
                  
                  {order.items?.length > 0 && (
                    <div className="space-y-2 border-t pt-3">
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Order Items</div>
                      {order.items.map((item: any) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {item.quantity}x {item.item?.name || 'Unknown Item'} 
                          </span>
                          <span className="text-gray-900">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
