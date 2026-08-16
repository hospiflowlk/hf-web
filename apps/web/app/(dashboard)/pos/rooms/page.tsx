"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Hotel, UserPlus, Trash2, Edit2, ArrowLeft } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SignaturePad } from "@/components/SignaturePad";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

export default function RoomGuestsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [recentRooms, setRecentRooms] = useState<any[]>([]);
  const [allRooms, setAllRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editReservationId, setEditReservationId] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoomForOrders, setSelectedRoomForOrders] = useState<any>(null);
  const [signingOrder, setSigningOrder] = useState<any | 'ALL'>(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const [res, allRes, recentRes] = await Promise.all([
        api.get("/rooms/checked-in"),
        api.get("/rooms/all"),
        api.get("/rooms/recent-checkouts")
      ]);
      setRooms(res.data);
      setAllRooms(allRes.data);
      setRecentRooms(recentRes.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSimulateCheckIn = async () => {
    if (!selectedRoomId || !firstName) return;
    setSubmitting(true);
    try {
      await api.post(`/rooms/${selectedRoomId}/checkin-test`, { firstName, lastName });
      setOpen(false);
      setFirstName("");
      setLastName("");
      setSelectedRoomId("");
      fetchRooms(); // Refresh the checked-in rooms!
    } catch (e) {
      console.error(e);
    }
    setSubmitting(false);
  };

  const handleDeleteActiveCheckIn = async (reservationId: string) => {
    if (confirm("Are you sure you want to void this check-in?")) {
      try {
        await api.delete(`/rooms/active-checkin/${reservationId}`);
        fetchRooms();
      } catch (e: any) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const handleEditActiveCheckIn = async () => {
    if (!editReservationId) return;
    setSubmitting(true);
    try {
      await api.post(`/rooms/active-checkin/${editReservationId}`, { firstName: editFirstName, lastName: editLastName });
      setEditModalOpen(false);
      fetchRooms();
    } catch (e: any) {
      alert("Edit failed: " + (e.response?.data?.message || e.message));
    }
    setSubmitting(false);
  };

  const handleRepostBill = async (reservationId: string) => {
    if (confirm("Are you sure you want to re-post the bill for this checkout? This will generate a new draft invoice.")) {
      try {
        await api.post(`/rooms/repost-bill/${reservationId}`);
        alert("Re-post successful! A new draft invoice has been generated.");
      } catch (e: any) {
        alert("Re-post failed: " + e.message);
      }
    }
  };

  const handleUnCheckout = async (reservationId: string) => {
    if (confirm("Are you sure you want to un-checkout this room? It will become active again.")) {
      try {
        await api.post(`/rooms/un-checkout/${reservationId}`);
        alert("Room un-checked out successfully!");
        fetchRooms();
      } catch (e: any) {
        alert("Un-checkout failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const handleDeleteCheckout = async (reservationId: string) => {
    if (confirm("Are you sure you want to delete this checkout record permanently?")) {
      try {
        await api.delete(`/rooms/recent-checkouts/${reservationId}`);
        fetchRooms();
      } catch (e: any) {
        alert("Delete failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const handleDeleteAllCheckouts = async () => {
    if (confirm("Are you sure you want to delete ALL checkout records permanently? This action cannot be undone.")) {
      try {
        await api.delete(`/rooms/recent-checkouts`);
        fetchRooms();
      } catch (e: any) {
        alert("Delete all failed: " + (e.response?.data?.message || e.message));
      }
    }
  };

  const handleSignOrder = async (orderOrAll: any, signatureData: string, tip: number) => {
    setSubmitting(true);
    try {
      if (orderOrAll === 'ALL') {
        const unpaidOrders = selectedRoomForOrders?.reservations?.[0]?.posOrders?.filter((o: any) => !o.signatureData && o.status !== 'CANCELLED') || [];
        for (const order of unpaidOrders) {
          await api.post(`/orders/${order.id}/sign`, { signatureData, tip: tip / unpaidOrders.length });
        }
      } else {
        await api.post(`/orders/${orderOrAll.id}/sign`, { signatureData, tip });
      }
      setSigningOrder(null);
      fetchRooms(); // Refresh to get updated order status
      
      // Update local state for selectedRoomForOrders so the modal updates immediately
      if (selectedRoomForOrders) {
        const updatedRooms = await api.get("/rooms/all");
        const updatedRoom = updatedRooms.data.find((r: any) => r.id === selectedRoomForOrders.id);
        if (updatedRoom) {
          setSelectedRoomForOrders(updatedRoom);
        }
      }
    } catch (e: any) {
      alert("Signing failed: " + (e.response?.data?.message || e.message));
    }
    setSubmitting(false);
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/pos')} className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Hotel className="w-6 h-6 sm:w-8 sm:h-8 text-primary" /> Room Guests
            </h1>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg self-stretch sm:self-auto overflow-x-auto">
            <button 
              onClick={() => setTab('ACTIVE')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === 'ACTIVE' ? 'bg-accent shadow-sm text-accent-foreground' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active Check-Ins
            </button>
            <button 
              onClick={() => setTab('HISTORY')}
              className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${tab === 'HISTORY' ? 'bg-accent shadow-sm text-accent-foreground' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Recent Checkouts
            </button>
          </div>
          
          {tab === 'HISTORY' && recentRooms.length > 0 && (
            <Button 
              variant="outline" 
              className="text-red-600 border-red-200 bg-red-50 hover:bg-red-100 w-full sm:w-auto"
              onClick={handleDeleteAllCheckouts}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Clear History
            </Button>
          )}
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto mt-2 sm:mt-0">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                <UserPlus className="w-4 h-4 mr-2" /> Quick Check-In
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Quick Check-In (Testing)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <label className="text-sm font-medium">Select Room</label>
                <select 
                  className="w-full border border-gray-300 p-2 rounded-md mt-1"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="">-- Select an Empty Room --</option>
                  {allRooms.filter(r => !rooms.find(cr => cr.id === r.id)).map(r => (
                    <option key={r.id} value={r.id}>Room {r.number}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Guest Name</label>
                  <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. John Doe" />
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 mt-2" 
                onClick={handleSimulateCheckIn}
                disabled={submitting || !selectedRoomId || !firstName}
              >
                {submitting ? "Checking In..." : "Check In Guest"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading rooms...</p>
      ) : tab === 'ACTIVE' && rooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
            <Hotel className="w-12 h-12 mb-4 opacity-20" />
            <p>No rooms are currently checked in.</p>
            <p className="text-sm mt-2">Click "Quick Check-In" above to add a guest!</p>
          </CardContent>
        </Card>
      ) : tab === 'HISTORY' && recentRooms.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center text-muted-foreground">
            <Hotel className="w-12 h-12 mb-4 opacity-20" />
            <p>No recent checkouts found.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {(tab === 'ACTIVE' ? rooms : recentRooms).map(room => (
            <Card key={room.id} className={`flex flex-col justify-between h-full ${tab === 'ACTIVE' ? "border-blue-200" : "border-gray-200 opacity-80"}`}>
              <div>
                <CardHeader className={`pb-2 ${tab === 'ACTIVE' ? "bg-blue-50" : "bg-gray-50"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Room {room.number}</CardTitle>
                      <p className={`text-sm ${tab === 'ACTIVE' ? "text-blue-700" : "text-gray-600"}`}>{room.category?.name}</p>
                    </div>
                    {tab === 'HISTORY' && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-2"
                        onClick={() => handleDeleteCheckout(room.reservations[0].id)}
                        title="Delete record permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                    {tab === 'ACTIVE' && (!room.reservations?.[0]?.posOrders || room.reservations[0].posOrders.length === 0) && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 -mt-1 -mr-2"
                        onClick={() => handleDeleteActiveCheckIn(room.reservations[0].id)}
                        title="Void Check-In"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 pb-0">
                  <div className="flex justify-between items-center group">
                    <div className="font-medium text-gray-800">
                      {room.reservations?.[0]?.guest?.firstName} {room.reservations?.[0]?.guest?.lastName === 'Guest' ? '' : room.reservations?.[0]?.guest?.lastName}
                    </div>
                    {tab === 'ACTIVE' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          setEditReservationId(room.reservations[0].id);
                          setEditFirstName(room.reservations[0].guest?.firstName || "");
                          setEditLastName(room.reservations[0].guest?.lastName === 'Guest' ? '' : (room.reservations[0].guest?.lastName || ""));
                          setEditModalOpen(true);
                        }}
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {tab === 'ACTIVE' 
                      ? `Checked In: ${new Date(room.reservations?.[0]?.checkIn).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })}` 
                      : `Checked Out: ${new Date(room.reservations?.[0]?.checkOut).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true })}`
                    }
                  </div>
                </CardContent>
              </div>
              
              <div className="p-6 pt-4 mt-auto">
                {/* Calculate accumulated POS balance from orders */}
                <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                  <div className="text-sm font-medium text-gray-500">POS Balance</div>
                  <div className="text-lg font-bold text-gray-900">
                    ${(room.reservations?.[0]?.posOrders?.reduce((sum: number, o: any) => sum + o.total, 0) || 0).toFixed(2)}
                  </div>
                </div>

                <div className="mt-4">
                  {tab === 'ACTIVE' ? (
                    <div className="flex flex-col gap-2">
                      <Button 
                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                        variant="outline"
                        onClick={() => setSelectedRoomForOrders(room)}
                      >
                        View Orders
                      </Button>
                      <Button 
                        className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                        variant="outline"
                        onClick={async () => {
                          if (confirm("Are you sure you want to check out this guest? This will generate a draft invoice.")) {
                            try {
                              await api.post(`/rooms/${room.id}/checkout`);
                              alert("Check-out successful! A draft invoice has been generated.");
                              fetchRooms();
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
                        onClick={() => setSelectedRoomForOrders(room)}
                      >
                        View Orders
                      </Button>
                      <Button 
                        className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200"
                        variant="outline"
                        onClick={() => handleRepostBill(room.reservations[0].id)}
                      >
                        Re-post the Bill
                      </Button>
                      <Button 
                        className="w-full bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                        variant="outline"
                        onClick={() => handleUnCheckout(room.reservations[0].id)}
                        disabled={allRooms.find(r => r.id === (room.originalRoomId || room.id))?.reservations?.some((res: any) => res.status === 'CHECKED_IN')}
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
      <Dialog open={!!selectedRoomForOrders} onOpenChange={(open) => {
        if (!open) {
          setSelectedRoomForOrders(null);
          setSigningOrder(null);
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {signingOrder ? (
            <SignaturePad
              orderTotal={
                signingOrder === 'ALL'
                  ? selectedRoomForOrders?.reservations?.[0]?.posOrders?.filter((o: any) => !o.signatureData && o.status !== 'CANCELLED').reduce((sum: number, o: any) => sum + o.total, 0) || 0
                  : signingOrder.total
              }
              onCancel={() => setSigningOrder(null)}
              onSave={(signatureData, tip) => handleSignOrder(signingOrder, signatureData, tip)}
            />
          ) : (
            <>
              <DialogHeader>
                <div className="flex justify-between items-start">
                  <DialogTitle>
                    Orders for Room {selectedRoomForOrders?.number}
                    <div className="text-sm font-normal text-muted-foreground mt-1">
                      Guest: {selectedRoomForOrders?.reservations?.[0]?.guest?.firstName} {selectedRoomForOrders?.reservations?.[0]?.guest?.lastName === 'Guest' ? '' : selectedRoomForOrders?.reservations?.[0]?.guest?.lastName}
                    </div>
                  </DialogTitle>
                  {selectedRoomForOrders?.reservations?.[0]?.posOrders?.some((o: any) => !o.signatureData && o.status !== 'CANCELLED') && (
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => setSigningOrder('ALL')}
                    >
                      Sign All Unpaid
                    </Button>
                  )}
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                {selectedRoomForOrders?.reservations?.[0]?.posOrders?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No POS orders charged to this room.</p>
                ) : (
                  selectedRoomForOrders?.reservations?.[0]?.posOrders?.map((order: any) => (
                    <div key={order.id} className="border rounded-lg p-4 bg-slate-50 relative overflow-hidden">
                      {order.signatureData && (
                        <div className="absolute top-0 right-0 p-2 pointer-events-none flex flex-col items-end">
                          <img src={order.signatureData} alt="Signature" className="h-20 opacity-10" />
                          {order.signedAt && (
                            <span className="text-[10px] text-gray-500 mt-1 pr-2">
                              {new Date(order.signedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-semibold">Order #{order.id.slice(0,8)}</span>
                        <div className="flex items-center gap-3 relative z-10">
                          {order.signatureData ? (
                            <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                              ✓ Signed {order.tip > 0 && `(+$${order.tip.toFixed(2)} Tip)`}
                            </span>
                          ) : order.status !== 'CANCELLED' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs border-green-600 text-green-600 hover:bg-green-50" onClick={() => setSigningOrder(order)}>
                              Sign Order
                            </Button>
                          )}
                          <span className="text-sm font-medium bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                            ${order.total.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 mb-4 relative z-10">
                        {new Date(order.createdAt).toLocaleString()}
                      </div>
                      
                      {order.items?.length > 0 && (
                        <div className="space-y-2 border-t pt-3 relative z-10">
                          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Order Items</div>
                          {order.items.map((item: any) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-gray-700">
                                {item.quantity}x {item.item?.name || 'Unknown Item'} 
                                {item.isHB && <span className="ml-2 text-emerald-600 font-medium">(HB)</span>}
                              </span>
                              <span className="text-gray-900">${((item.isHB ? 0 : item.unitPrice) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Check-In Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Guest Name</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="editFirstName">First Name</label>
              <Input
                id="editFirstName"
                value={editFirstName}
                onChange={(e) => setEditFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="editLastName">Last Name</label>
              <Input
                id="editLastName"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancel</Button>
            <Button onClick={handleEditActiveCheckIn} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
