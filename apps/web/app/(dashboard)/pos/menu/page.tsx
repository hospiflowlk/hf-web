"use client";

import { Suspense, useEffect, useState } from "react";
import { Search, ShoppingBag, Plus, Minus, Trash2, CreditCard, Banknote, Coffee, User, ArrowLeft, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import api from "@/lib/api";
import { useSearchParams, useRouter } from "next/navigation";

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  exemptTaxIds: string[];
  trackStock?: boolean;
};

type CartItem = InventoryItem & { cartItemId: string; cartQuantity: number; isHB?: boolean; note?: string };

export default function POSPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading POS Menu...</div>}>
      <POSContent />
    </Suspense>
  );
}

function POSContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [posCategories, setPosCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [taxes, setTaxes] = useState<any[]>([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [isHBMode, setIsHBMode] = useState(false);
  const [popupItem, setPopupItem] = useState<InventoryItem | null>(null);
  const [popupQuantity, setPopupQuantity] = useState(1);
  const [popupNote, setPopupNote] = useState("");

  const searchParams = useSearchParams();
  const router = useRouter();
  
  const orderType = searchParams.get("orderType") || "LEGACY";
  const roomId = searchParams.get("roomId");
  const walkInId = searchParams.get("walkInId");
  const contextLabel = searchParams.get("label") || "Quick Order";

  useEffect(() => {
    fetchItems();
  }, []);

  const handleToggleMode = (mode: boolean) => {
    if (cart.length > 0 && mode !== isHBMode) {
      if (!window.confirm(`Switching to ${mode ? 'HB (Free)' : 'Chargeable'} mode will convert all items currently in your cart. Continue?`)) {
        return;
      }
      setCart(prev => prev.map(item => ({ ...item, isHB: mode })));
    }
    setIsHBMode(mode);
  };

  const fetchItems = async () => {
    try {
      const res = await api.get("/items/pos-master-data");
      const { items: mapped, posCategories: catData, taxes: taxData } = res.data;
      
      setPosCategories(catData);
      setTaxes(taxData);
      setItems(mapped);
    } catch (err) {
      console.error(err);
    }
  };

  // Get unique categories present in items
  const itemCategories = new Set(items.map(i => i.category));
  // Create ordered list of categories starting with "All", then ordered pos categories, then Uncategorized (if present)
  const orderedCategories = [
    "All",
    ...posCategories.map(c => c.name).filter(name => itemCategories.has(name)),
    ...(itemCategories.has("Uncategorized") ? ["Uncategorized"] : [])
  ];

  const filteredItems = items.filter(i => {
    if (search) {
      return i.name.toLowerCase().includes(search.toLowerCase());
    }
    if (filter !== "All" && i.category !== filter) return false;
    return true;
  });

  const confirmAddToCart = () => {
    if (!popupItem) return;
    setCart(prev => {
      const existing = prev.find(p => p.id === popupItem.id && p.isHB === isHBMode && p.note === popupNote);
      if (existing) {
        if (existing.cartQuantity + popupQuantity > popupItem.quantity) return prev;
        return prev.map(p => (p.cartItemId === existing.cartItemId) ? { ...p, cartQuantity: p.cartQuantity + popupQuantity } : p);
      }
      if (popupQuantity <= 0 || popupItem.quantity <= 0) return prev;
      return [...prev, { ...popupItem, cartItemId: `${popupItem.id}-${Date.now()}`, cartQuantity: popupQuantity, isHB: isHBMode, note: popupNote }];
    });
    setPopupItem(null);
    setSearch("");
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        const newQ = item.cartQuantity + delta;
        if (newQ > item.quantity) return item; // limit
        return { ...item, cartQuantity: newQ };
      }
      return item;
    }).filter(i => i.cartQuantity > 0));
  };

  const updateCartNote = (cartItemId: string, note: string) => {
    setCart(prev => prev.map(item => {
      if (item.cartItemId === cartItemId) {
        return { ...item, note };
      }
      return item;
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.unitPrice * item.cartQuantity), 0);
  
  // Calculate dynamic tax
  let tax = 0;
  const taxBreakdown: Record<string, { name: string, type: string, rate: number, amount: number }> = {};

  cart.forEach(item => {
    const itemTotal = item.unitPrice * item.cartQuantity;
    taxes.forEach(taxObj => {
      if (!item.exemptTaxIds.includes(taxObj.id)) {
        const itemTax = itemTotal * (taxObj.rate / 100);
        tax += itemTax;
        
        if (!taxBreakdown[taxObj.id]) {
          taxBreakdown[taxObj.id] = { name: taxObj.name, type: taxObj.type || taxObj.name, rate: taxObj.rate, amount: 0 };
        }
        taxBreakdown[taxObj.id]!.amount += itemTax;
      }
    });
  });

  const total = subtotal + tax;

  const handleCheckout = async (method: string) => {
    if (cart.length === 0) return;
    try {
      await api.post("/orders", {
        orderType,
        roomId: roomId || undefined,
        walkInSessionId: walkInId || undefined,
        paymentMethod: method,
        isHB: isHBMode,
        items: cart.map(i => ({ itemId: i.id, quantity: i.cartQuantity, note: i.note }))
      });
      alert(`Order completed using ${method}!`);
      setCart([]);
      fetchItems(); // refresh stock
      router.push('/pos');
    } catch (err: any) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
      console.error(err);
    }
  };

  const handleCheckoutWithWhatsApp = async (method: string) => {
    if (cart.length === 0) return;
    
    // Build WhatsApp message
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().split(' ')[0];
    const staffName = typeof window !== 'undefined' ? (localStorage.getItem('userEmail')?.split('@')[0] || 'Staff') : 'Staff';
    
    let roomText = "N/A";
    let guestText = "Walk-In";
    if (contextLabel.includes(" - ")) {
      const parts = contextLabel.split(" - ");
      roomText = parts[0]!.replace('Room ', '');
      guestText = parts[1] || '';
    } else {
      roomText = contextLabel.replace('Room ', '');
    }

    const totalItems = cart.reduce((sum, item) => sum + item.cartQuantity, 0);
    const stayId = roomId ? `${roomText}_${Date.now()}` : `W_${Date.now()}`;

    let msg = `*Hilldale KOT*\n`;
    msg += `Stay ID: ${stayId}\n`;
    const isAllHB = cart.every(i => i.isHB);
    const hasSomeHB = cart.some(i => i.isHB);
    const orderTypeLabel = isAllHB ? 'HB' : (hasSomeHB ? 'HB & Charged' : (method === 'ROOM_CHARGE' ? 'Charged' : method));
    msg += `Order Type: ${orderTypeLabel}\n`;
    msg += `Date: ${dateStr} Time: ${timeStr}\n`;
    msg += `Staff: ${staffName}\n`;
    msg += `Room: ${roomText}\n`;
    msg += `Guest: ${guestText}\n`;
    msg += `Total items: ${totalItems}\n\n`;

    const grouped: Record<string, CartItem[]> = {};
    cart.forEach(item => {
      const cat = item.category || "Other";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    const categoryOrder = ['Starters', 'Mains', 'Desserts', 'Beverages', 'ALBeverages'];
    const otherCats = Object.keys(grouped).filter(c => !categoryOrder.includes(c));
    
    [...categoryOrder, ...otherCats].forEach(cat => {
      if (grouped[cat] && grouped[cat].length > 0) {
        msg += `[${cat}]\n`;
        grouped[cat].forEach(item => {
          msg += `${item.cartQuantity}x ${item.name} ${item.isHB ? '(HB)' : ''}\n`.replace('  ', ' ');
          if (item.note) {
            msg += `   📝 Note: ${item.note}\n`;
          }
        });
        msg += `\n`;
      }
    });
    const waUrl = `https://wa.me/?text=${encodeURIComponent(msg)}`;

    try {
      await api.post("/orders", {
        orderType,
        roomId: roomId || undefined,
        walkInSessionId: walkInId || undefined,
        paymentMethod: method,
        isHB: isHBMode,
        items: cart.map(i => ({ itemId: i.id, quantity: i.cartQuantity, note: i.note }))
      });
      setCart([]);
      fetchItems(); // refresh stock
      setShowReviewModal(false);
      window.open(waUrl, '_blank');
      router.push('/pos');
    } catch (err: any) {
      alert("Error: " + JSON.stringify(err.response?.data || err.message));
      console.error(err);
    }
  };

  return (
    <div className="lg:h-[calc(100vh-64px)] h-auto min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left Pane: Items Browser (70%) */}
      <div className="w-full lg:w-[70%] flex flex-col p-4 md:p-6 lg:h-full lg:overflow-hidden h-auto">
        {/* Header / Search / Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <Button variant="ghost" size="icon" onClick={() => router.push('/pos')} className="rounded-full shrink-0">
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </Button>
            <div className="flex-1 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
              <h2 className="text-lg font-bold text-gray-800 line-clamp-1">Ordering For: {contextLabel}</h2>
              <div className="flex border rounded-lg overflow-hidden border-primary/20 shrink-0 w-full sm:w-auto">
                <button 
                  onClick={() => handleToggleMode(false)}
                  className={`flex-1 sm:flex-none px-4 py-2 font-semibold text-sm transition-colors ${!isHBMode ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary'}`}
                >
                  Chargeable
                </button>
                <button 
                  onClick={() => handleToggleMode(true)}
                  className={`flex-1 sm:flex-none px-4 py-2 font-semibold text-sm transition-colors ${isHBMode ? 'bg-primary text-primary-foreground' : 'bg-transparent text-muted-foreground hover:bg-secondary'}`}
                >
                  HB (Free)
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 items-center bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-gray-400" />
              <Input 
                placeholder="Search items by name..." 
                className="pl-12 h-12 bg-white border-0 shadow-sm rounded-xl text-lg focus-visible:ring-1 focus-visible:ring-emerald-500"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {orderedCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all shadow-sm ${filter === cat ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Item Grid */}
        <div className="flex-1 lg:overflow-y-auto overflow-visible custom-scrollbar">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 pb-20">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                onClick={() => { setPopupItem(item); setPopupQuantity(1); setPopupNote(""); }}
                className={`group relative bg-white rounded-xl p-3 shadow-sm border border-gray-100 cursor-pointer transition-all hover:shadow-md hover:border-primary/40 hover:bg-gray-50 flex flex-col justify-center items-center text-center h-24 ${item.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {item.trackStock && (
                  <div className="absolute top-1.5 right-1.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 leading-none rounded-sm ${item.quantity > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {item.quantity} In Stock
                    </span>
                  </div>
                )}
                <h3 className="font-semibold text-sm text-gray-800 line-clamp-2 leading-tight mb-1">{item.name}</h3>
                <p className="text-primary font-bold text-sm">${item.unitPrice.toFixed(2)}</p>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500 font-medium">No items found matching criteria.</div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Cart Overlay */}
      {showMobileCart && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setShowMobileCart(false)} />
      )}

      {/* Right Pane: Cart Ticket (30%) */}
      <div id="cart-section" className={`fixed inset-y-0 right-0 z-50 w-[85%] sm:w-[400px] lg:static lg:w-[30%] bg-white lg:shadow-xl flex flex-col border-l border-gray-200 lg:h-full h-full transition-transform duration-300 transform ${showMobileCart ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
              <ShoppingBag className="w-5 h-5 text-primary" /> Current Order
            </h2>
            <p className="text-sm text-gray-500 mt-1">Ticket #10042</p>
          </div>
          <Button variant="ghost" size="icon" className="lg:hidden -mr-2 -mt-2 text-gray-400 hover:text-gray-800" onClick={() => setShowMobileCart(false)}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={item.cartItemId} className="flex flex-col gap-2 p-3 bg-white border border-gray-100 shadow-sm rounded-xl">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-gray-800 text-sm w-3/4 leading-snug">
                    {item.name} {item.isHB && <span className="text-xs text-accent-foreground bg-accent px-1 py-0.5 rounded font-bold ml-1">(HB)</span>}
                  </span>
                  <span className="font-bold text-gray-900">${(item.unitPrice * item.cartQuantity).toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-sm text-gray-500">${item.unitPrice.toFixed(2)} / ea</span>
                  <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
                    <button 
                      onClick={() => updateCartQuantity(item.cartItemId, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-4 text-center font-bold text-sm">{item.cartQuantity}</span>
                    <button 
                      onClick={() => updateCartQuantity(item.cartItemId, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="mt-2">
                  <Input 
                    placeholder="Add note (optional)" 
                    value={item.note || ''} 
                    onChange={e => updateCartNote(item.cartItemId, e.target.value)} 
                    className="h-8 text-xs bg-gray-50 border-gray-200"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-500 font-medium text-sm">
              <span>Net Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            
            {Object.values(taxBreakdown).map((t, idx) => (
              <div key={idx} className="flex justify-between text-muted-foreground font-medium text-sm">
                <span>{t.name} ({t.rate}%)</span>
                <span>${t.amount.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex justify-between text-2xl font-bold text-gray-900 pt-2 border-t border-gray-200">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 pt-4">
            <Button 
              onClick={() => setShowReviewModal(true)}
              disabled={cart.length === 0}
              className="h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-base shadow-md"
            >
              <User className="w-5 h-5 mr-2" /> Review & Submit Order
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={!!popupItem} onOpenChange={(open) => !open && setPopupItem(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{popupItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-700">Quantity:</span>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setPopupQuantity(Math.max(1, popupQuantity - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-red-200 text-red-500 hover:bg-red-50"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-bold text-lg">{popupQuantity}</span>
                <button 
                  onClick={() => setPopupQuantity(popupItem ? Math.min(popupItem.quantity, popupQuantity + 1) : popupQuantity + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-full border border-green-200 text-green-500 hover:bg-green-50"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="font-medium text-gray-700 text-sm">Special Instructions</label>
              <Input
                value={popupNote}
                onChange={e => setPopupNote(e.target.value)}
                placeholder="e.g. Extra spicy, no onions"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-3 sm:space-x-0 w-full mt-2">
            <Button variant="ghost" onClick={() => setPopupItem(null)}>
              Cancel
            </Button>
            <Button onClick={confirmAddToCart} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Add to Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Review Order</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-gray-500">Items</h4>
              {cart.map((item, idx) => (
                <div key={`${item.cartItemId}-${idx}`} className="flex flex-col text-sm">
                  <div className="flex justify-between items-center">
                    <span>{item.cartQuantity}x {item.name} {item.isHB && <span className="text-xs font-bold text-accent-foreground">(HB)</span>}</span>
                    <span className="font-medium">${(item.unitPrice * item.cartQuantity).toFixed(2)}</span>
                  </div>
                  {item.note && (
                    <span className="text-xs text-muted-foreground ml-4 italic mt-1">Note: {item.note}</span>
                  )}
                </div>
              ))}
            </div>
            
            <div className="border-t pt-3 space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {Object.values(taxBreakdown).map((t, idx) => (
                <div key={idx} className="flex justify-between text-xs text-muted-foreground">
                  <span>{t.name} ({t.rate}%)</span>
                  <span>${t.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0 w-full">
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
              onClick={() => {
                setShowReviewModal(false);
                handleCheckout("ROOM_CHARGE");
              }}
            >
              Confirm Order
            </Button>
            <Button 
              className="bg-[#25D366] hover:bg-[#128C7E] text-white w-full"
              onClick={() => handleCheckoutWithWhatsApp("ROOM_CHARGE")}
            >
              <MessageCircle className="w-4 h-4 mr-2" /> Confirm & WhatsApp KOT
            </Button>
            <Button variant="outline" className="w-full mt-2" onClick={() => setShowReviewModal(false)}>
              Back to Edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mobile Floating Cart Button */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          <Button 
            className="rounded-full shadow-2xl h-14 px-6 bg-primary hover:bg-primary/90 text-white font-bold"
            onClick={() => setShowMobileCart(true)}
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            {cart.reduce((s,i) => s + i.cartQuantity, 0)} items • ${total.toFixed(2)}
          </Button>
        </div>
      )}
    </div>
  );
}
