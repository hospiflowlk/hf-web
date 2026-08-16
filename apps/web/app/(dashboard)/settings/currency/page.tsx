"use client";

import { useEffect, useState } from "react";
import { TopHeader } from "@/components/TopHeader";
import api from "@/lib/api";
import { toast } from "react-hot-toast";
import { 
  DollarSign, 
  Settings2, 
  Save, 
  TrendingUp, 
  CheckCircle2, 
  Power
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isBase: boolean;
  isEnabled: boolean;
}

interface BusinessSettings {
  baseCurrencyCode: string;
  invoiceDefaultCurrency: string;
  expenseDefaultCurrency: string;
  reportDefaultCurrency: string;
}

export default function CurrencySettingsPage() {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [settings, setSettings] = useState<BusinessSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit states for currencies
  const [editingRates, setEditingRates] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [curRes, setRes] = await Promise.all([
        api.get("/currencies"),
        api.get("/settings")
      ]);
      setCurrencies(curRes.data);
      setSettings(setRes.data);
    } catch (error) {
      toast.error("Failed to load currency settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (field: keyof BusinessSettings, value: string) => {
    if (!settings) return;
    try {
      const updated = { ...settings, [field]: value };
      await api.put("/settings", updated);
      setSettings(updated);
      toast.success("Settings updated successfully");
    } catch (error) {
      toast.error("Failed to update settings");
    }
  };

  const handleSetBaseCurrency = async (code: string) => {
    try {
      await api.put(`/currencies/${code}/base`);
      toast.success(`${code} is now the base currency!`);
      fetchData(); // Reload everything as base currency shifts rates
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to set base currency");
    }
  };

  const handleToggleCurrency = async (currency: Currency) => {
    try {
      await api.put(`/currencies/${currency.code}`, { isEnabled: !currency.isEnabled });
      setCurrencies(currencies.map(c => c.code === currency.code ? { ...c, isEnabled: !c.isEnabled } : c));
      toast.success(`${currency.code} ${currency.isEnabled ? 'disabled' : 'enabled'}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to toggle currency");
    }
  };

  const handleSaveRate = async (code: string) => {
    const rate = editingRates[code];
    if (rate === undefined) return;
    try {
      await api.put(`/currencies/${code}`, { exchangeRate: Number(rate) });
      setCurrencies(currencies.map(c => c.code === code ? { ...c, exchangeRate: Number(rate) } : c));
      const newEditingRates = { ...editingRates };
      delete newEditingRates[code];
      setEditingRates(newEditingRates);
      toast.success("Exchange rate updated");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update rate");
    }
  };

  const enabledCurrencies = currencies.filter(c => c.isEnabled);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
      <TopHeader />
      <div className="px-6 lg:px-8 pt-6 max-w-6xl mx-auto w-full">
        <h1 className="text-2xl font-bold">Currency Settings</h1>
        <p className="text-muted-foreground mt-1">Manage multi-currency and exchange rates</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 lg:p-8 custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Base Currency & Module Defaults */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Base Currency Card */}
              <div className="bg-card rounded-2xl shadow-sm border border-border p-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-primary/10 text-primary">
                    <DollarSign className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Base Business Currency</h2>
                    <p className="text-sm text-muted-foreground">The primary reporting currency</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <select 
                      className="w-full p-3 rounded-lg border border-input bg-background/50 hover:bg-background transition-colors focus:ring-2 focus:ring-primary/20 outline-none"
                      value={settings?.baseCurrencyCode}
                      onChange={(e) => handleSetBaseCurrency(e.target.value)}
                    >
                      {enabledCurrencies.map(c => (
                        <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground pl-1">
                      Warning: Changing this modifies the anchor for all future reports. Exchange rates for other currencies will need to be updated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Defaults Card */}
              <div className="bg-card rounded-2xl shadow-sm border border-border p-6 overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110" />
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                    <Settings2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Module Defaults</h2>
                    <p className="text-sm text-muted-foreground">Default currency selections</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Invoices Default</label>
                    <select 
                      className="w-full p-2.5 rounded-lg border border-input bg-background/50 outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={settings?.invoiceDefaultCurrency}
                      onChange={(e) => handleUpdateSettings('invoiceDefaultCurrency', e.target.value)}
                    >
                      {enabledCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Expenses Default</label>
                    <select 
                      className="w-full p-2.5 rounded-lg border border-input bg-background/50 outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={settings?.expenseDefaultCurrency}
                      onChange={(e) => handleUpdateSettings('expenseDefaultCurrency', e.target.value)}
                    >
                      {enabledCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-sm font-medium text-foreground">Reports Default</label>
                    <select 
                      className="w-full p-2.5 rounded-lg border border-input bg-background/50 outline-none focus:ring-2 focus:ring-blue-500/20"
                      value={settings?.reportDefaultCurrency}
                      onChange={(e) => handleUpdateSettings('reportDefaultCurrency', e.target.value)}
                    >
                      {enabledCurrencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Currencies Grid */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/30">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-green-500/10 text-green-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">Exchange Rates & Enabled Currencies</h2>
                    <p className="text-sm text-muted-foreground">Manage live rates against {settings?.baseCurrencyCode}</p>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-secondary/50 text-muted-foreground text-sm">
                      <th className="px-6 py-4 font-medium border-b border-border">Currency</th>
                      <th className="px-6 py-4 font-medium border-b border-border">Symbol</th>
                      <th className="px-6 py-4 font-medium border-b border-border">Rate (to 1 {settings?.baseCurrencyCode})</th>
                      <th className="px-6 py-4 font-medium border-b border-border">Status</th>
                      <th className="px-6 py-4 font-medium border-b border-border text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {currencies.map((currency) => (
                      <tr key={currency.code} className="hover:bg-secondary/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{currency.code}</span>
                            <span className="text-muted-foreground text-sm">- {currency.name}</span>
                            {currency.isBase && (
                              <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                <CheckCircle2 className="w-3 h-3" /> Base
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground font-medium">
                          {currency.symbol}
                        </td>
                        <td className="px-6 py-4">
                          {currency.isBase ? (
                            <span className="text-muted-foreground font-mono bg-secondary px-2 py-1 rounded">1.00</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                className="w-32 px-3 py-1.5 rounded-md border border-input bg-background font-mono text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-shadow"
                                value={editingRates[currency.code] !== undefined ? editingRates[currency.code] : currency.exchangeRate}
                                onChange={(e) => setEditingRates({ ...editingRates, [currency.code]: parseFloat(e.target.value) })}
                              />
                              {editingRates[currency.code] !== undefined && editingRates[currency.code] !== currency.exchangeRate && (
                                <button 
                                  onClick={() => handleSaveRate(currency.code)}
                                  className="p-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 rounded-md transition-colors"
                                  title="Save Rate"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                            currency.isEnabled 
                              ? "bg-green-500/10 text-green-600" 
                              : "bg-muted text-muted-foreground"
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", currency.isEnabled ? "bg-green-500" : "bg-muted-foreground")} />
                            {currency.isEnabled ? "Enabled" : "Disabled"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleToggleCurrency(currency)}
                            disabled={currency.isBase}
                            className={cn(
                              "p-2 rounded-lg transition-colors border",
                              currency.isBase ? "opacity-50 cursor-not-allowed bg-muted border-transparent" :
                              currency.isEnabled 
                                ? "text-destructive border-destructive/20 hover:bg-destructive/10" 
                                : "text-green-600 border-green-500/20 hover:bg-green-500/10"
                            )}
                            title={currency.isEnabled ? "Disable" : "Enable"}
                          >
                            <Power className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
