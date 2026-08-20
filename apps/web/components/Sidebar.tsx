"use client";
import { useState, useEffect } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  ReceiptText, 
  ShoppingCart, 
  Landmark, 
  Percent, 
  FolderKey, 
  Users, 
  BarChart2, 
  BookOpen, 
  UserCircle, 
  LogOut,
  ChevronDown,
  RefreshCcw,
  Edit2,
  Coffee,
  LayoutDashboard,
  Settings,
  Package
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useRouter } from "next/navigation";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Front Desk", href: "/front-desk", icon: ReceiptText },
  { name: "Invoices", href: "/invoices", icon: ReceiptText },
  { name: "Expenses", href: "/expenses", icon: ShoppingCart },
  { name: "Accounts", href: "/accounts", icon: Landmark },
  { name: "Taxes", href: "/masters/taxes", icon: Percent },
  { name: "POS (Restaurant)", href: "/pos", icon: Coffee },
  {
    name: "Inventory",
    href: "/inventory",
    icon: Package,
    subItems: [
      { name: "Dashboard", href: "/inventory/dashboard" },
      { name: "Stock Management", href: "/inventory/stock" },
      { name: "Movement History", href: "/inventory/history" },
    ]
  },
  { 
    name: "Masters", 
    href: "/masters", 
    icon: FolderKey, 
    subItems: [
      { name: "Items", href: "/masters/items" },
      { name: "Suppliers", href: "/masters/suppliers" },
      { name: "Customers", href: "/masters/customers" },
      { name: "Categories", href: "/masters/categories" },
      { name: "Business Sources", href: "/masters/business-sources" },
      { name: "POS (Categories)", href: "/masters/pos-categories" }
    ]
  },
  { name: "Payroll", href: "/payroll", icon: Users },
  { name: "Reports", href: "/reports", icon: BarChart2 },
  { name: "Daybook Generator", href: "/daybook", icon: BookOpen },
  { name: "Users", href: "/users", icon: UserCircle },
  { 
    name: "Settings", 
    href: "/settings", 
    icon: Settings, 
    subItems: [
      { name: "Currencies", href: "/settings/currency" },
      { name: "Rooms", href: "/settings/rooms" }
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  const toggleMenu = (href: string) => {
    setExpandedMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const [userName, setUserName] = useState<string>("User");
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("hf_user_name");
      const storedRole = localStorage.getItem("hf_user_role");
      if (stored) {
        setUserName(stored);
        if (storedRole) setUserRole(storedRole);
      } else {
        const token = localStorage.getItem("hf_access_token");
        if (token && token.includes(".")) {
          try {
            const parts = token.split(".");
            if (parts[1]) {
              const payload = JSON.parse(atob(parts[1]));
              if (payload?.name) setUserName(payload.name);
              if (payload?.role) setUserRole(payload.role);
            }
          } catch (e) {}
        }

      }
    }
  }, []);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("hf_access_token");
        localStorage.removeItem("hf_user_name");
        localStorage.removeItem("hf_user_role");
      }
      router.push("/login");
    }
  };

  const [usdRate, setUsdRate] = useState<number | null>(null);

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await api.get("/currencies");
        const usd = res.data.find((c: any) => c.code === "USD");
        if (usd) setUsdRate(usd.exchangeRate);
      } catch (err) {
        console.error("Failed to fetch currencies for sidebar", err);
      }
    };
    fetchCurrencies();
  }, []);


  const marketRate = 334.67;
  const currentUsdRate = usdRate !== null ? usdRate : 337.00;
  const rateDiff = currentUsdRate - marketRate;
  const isPositive = rateDiff >= 0;

  return (
    <div className="flex flex-col h-full w-64 bg-card border-r border-border shadow-sm overflow-y-auto overflow-x-hidden custom-scrollbar">
      {/* Logo */}
      <div className="p-6 flex flex-col items-center justify-center border-b border-border">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center border-2 border-blue-100 shadow-inner mb-3">
          {/* A simple placeholder logo resembling a house/shield */}
          <div className="w-10 h-10 text-primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
          </div>
        </div>
        <h1 className="text-lg font-bold text-primary tracking-tight">HospiFlow</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = expandedMenus[item.href] !== undefined ? expandedMenus[item.href] : isActive;

          return (
            <div key={item.href} className="flex flex-col">
              {hasSubItems ? (
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
                    isActive && !isExpanded
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", isActive && !isExpanded ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 opacity-50 transition-transform", isExpanded && "rotate-180")} />
                </button>
              ) : (
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors group",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-5 h-5", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                    <span className="text-sm">{item.name}</span>
                  </div>
                </Link>
              )}

              {/* Sub-items */}
              {hasSubItems && isExpanded && (
                <div className="ml-9 mt-1 flex flex-col space-y-1">
                  {item.subItems!.map(sub => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "px-3 py-2 text-sm rounded-md transition-colors",
                        pathname === sub.href 
                          ? "text-primary font-medium bg-secondary/50" 
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                      )}
                    >
                      {sub.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Rate Widget */}
      <div className="px-4 pb-4">
        <div className="bg-secondary/50 rounded-xl p-4 border border-border shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2 text-primary font-semibold text-sm">
              <RefreshCcw className="w-4 h-4" />
              USD / LKR
            </div>
            <Link href="/settings/currency">
              <Edit2 className="w-3.5 h-3.5 text-muted-foreground cursor-pointer hover:text-primary" />
            </Link>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Your Rate</span>
              <span className="font-semibold">{currentUsdRate.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Market Rate</span>
              <span className="font-semibold">{marketRate.toFixed(2)}</span>
            </div>
            <div className="mt-2 pt-2 border-t border-border flex justify-end">
              <span className={`font-medium px-2 py-0.5 rounded text-[10px] ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-destructive bg-destructive/10'}`}>
                {isPositive ? '+' : ''}{rateDiff.toFixed(2)} LKR
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {userName ? userName.substring(0, 2).toUpperCase() : "U"}
          </div>
          <div className="flex flex-col">
            <p className="text-sm font-semibold capitalize text-foreground">{userName}</p>
            {userRole && <p className="text-[10px] text-muted-foreground uppercase">{userRole}</p>}
          </div>
        </div>
        <button onClick={handleLogout} className="text-muted-foreground hover:text-destructive transition-colors" title="Log Out">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="px-4 pb-4 text-center">
        <p className="text-[10px] text-muted-foreground">License valid until: Aug 11, 2026</p>
      </div>
    </div>
  );
}
