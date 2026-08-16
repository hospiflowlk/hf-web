"use client";

import { useState, useEffect } from "react";
import api from "@/lib/api";
import { ArrowLeft, Printer, Share2, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import SettleInvoiceDialog from "../components/SettleInvoiceDialog";

export default function ViewInvoicePage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<any>(null);
  const [taxes, setTaxes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scale, setScale] = useState(1);
  const [settleInvoiceOpen, setSettleInvoiceOpen] = useState(false);

  useEffect(() => {
    if (id) fetchInvoiceAndTaxes();
  }, [id]);

  const fetchInvoiceAndTaxes = async () => {
    try {
      const [res, taxesRes] = await Promise.all([
        api.get(`/invoices/${id}`),
        api.get("/taxes").catch(() => ({ data: [] }))
      ]);
      setInvoice(res.data);
      setTaxes(taxesRes.data);
    } catch (err) {
      console.error("Failed to load invoice", err);
      alert("Invoice not found.");
      router.push("/invoices");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-muted-foreground">Loading invoice...</div>;
  }

  if (!invoice) return null;

  const aggregatedTaxes: Record<string, { name: string, rate: number, amount: number }> = {};
  let subtotal = 0;
  
  if (invoice?.items) {
    invoice.items.forEach((line: any) => {
      // we use line.netAmount which is after discount
      subtotal += line.netAmount || (line.unitPrice * line.quantity);
      if (line.taxIds) {
        const ids = line.taxIds.split(',');
        ids.forEach((tid: string) => {
          const tax = taxes.find(t => t.id === tid);
          if (tax) {
            if (!aggregatedTaxes[tid]) {
              aggregatedTaxes[tid] = { name: tax.name, rate: tax.rate, amount: 0 };
            }
            aggregatedTaxes[tid].amount += (line.netAmount || (line.unitPrice * line.quantity)) * (tax.rate / 100);
          }
        });
      }
    });
  }

  const cur = invoice.currency || "USD";

  return (
    <div className="flex h-full print:h-auto flex-col bg-slate-50/50 print:bg-white overflow-hidden">
      {/* Header action bar */}
      <div className="p-4 border-b border-border bg-card flex items-center justify-between print:hidden z-10 relative">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </Link>
          <h1 className="font-semibold text-lg">Invoice {invoice.invoiceNum}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-md mr-4">
            <button onClick={() => setScale(s => Math.max(0.4, s - 0.1))} className="p-2 text-slate-500 hover:text-slate-900 transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={() => setScale(1)} className="p-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors" title="Reset Zoom">
              {Math.round(scale * 100)}%
            </button>
            <button onClick={() => setScale(s => Math.min(2, s + 0.1))} className="p-2 text-slate-500 hover:text-slate-900 transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>
          {(invoice.status === 'Unpaid' || invoice.status === 'Partial') && (
            <Button onClick={() => setSettleInvoiceOpen(true)} className="bg-green-600 hover:bg-green-700 text-white mr-2">
              <span className="font-bold mr-1">$</span> Settle
            </Button>
          )}
          <Button onClick={() => window.print()} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      <div 
        className="flex-1 p-6 print:p-0 overflow-y-auto print:overflow-visible flex justify-center cursor-zoom-in bg-slate-50/50 print:bg-white"
        onDoubleClick={() => setScale(s => s === 1 ? 0.6 : 1)}
      >
        <div 
          className="w-full max-w-[800px] origin-top transition-transform duration-200 cursor-auto"
          style={{ transform: `scale(${scale})` }}
        >
          {/* Invoice Paper format */}
          <div className="bg-white p-12 print:p-0 rounded shadow-sm print:shadow-none border border-slate-200 print:border-none">
          
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">INVOICE</h1>
              <div className="text-sm mt-4">
                <p className="font-bold text-teal-700 text-base mb-1">HILLDALE RETREAT (PVT) LTD</p>
                <p className="text-gray-700">260, Kuda Oya, Labookellie, Nuwara Eliya 22200, Sri Lanka</p>
                <p className="text-gray-700">hilldaleretreat@gmail.com | +94 52 223 6365 | +94 77 905 6363</p>
                <p className="text-gray-700">Business Registration: PV 00205616 | www.hilldaleretreat.com</p>
              </div>
            </div>
            
            <div className="border border-teal-500 rounded-xl p-4 w-64">
              <div className="mb-2">
                <p className="text-[10px] text-gray-500 font-medium">INVOICE NO.</p>
                <p className="font-bold text-gray-900 text-sm">{invoice.invoiceNum}</p>
              </div>
              <div className="mb-2">
                <p className="text-[10px] text-gray-500 font-medium">DATE</p>
                <p className="font-bold text-gray-900 text-sm">{invoice.invoiceDate ? format(new Date(invoice.invoiceDate), 'dd-MM-yyyy') : '-'}</p>
              </div>
              <div className="mb-2">
                <p className="text-[10px] text-gray-500 font-medium">CURRENCY</p>
                <p className="font-bold text-gray-900 text-sm">{cur}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-500 font-medium">STATUS</p>
                <p className="font-bold text-gray-900 text-sm">{invoice.status}</p>
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-teal-700 font-bold text-lg mb-1">Bill To</h3>
            <p className="font-bold text-gray-900">{invoice.guestName || "Guest"}</p>
          </div>

          <table className="w-full text-sm text-left mb-6">
            <thead className="bg-teal-50/50 text-gray-900 font-bold border-b border-gray-200">
              <tr>
                <th className="px-2 py-2 w-1/2">Description</th>
                <th className="px-2 py-2 text-center w-16">Qty</th>
                <th className="px-2 py-2 text-right">Rate</th>
                <th className="px-2 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items?.map((line: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-2 py-2 text-gray-800">{line.description}</td>
                  <td className="px-2 py-2 text-center text-gray-800">{line.quantity}</td>
                  <td className="px-2 py-2 text-right text-gray-800">{cur}{(line.unitPrice || 0).toFixed(2)}</td>
                  <td className="px-2 py-2 text-right text-gray-800">{cur}{(line.total || 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-end mb-16">
            <div className="w-64 border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between text-sm mb-1 text-gray-800">
                <span>Subtotal</span>
                <span>{cur}{subtotal.toFixed(2)}</span>
              </div>
              
              {Object.values(aggregatedTaxes).map((tax, i) => (
                <div key={i} className="flex justify-between text-sm mb-1 text-gray-800">
                  <span>{tax.name}</span>
                  <span>{cur}{tax.amount.toFixed(2)}</span>
                </div>
              ))}

              {invoice.globalDiscount > 0 && (
                <div className="flex justify-between text-sm mb-1 text-red-600">
                  <span>Discount</span>
                  <span>-{cur}{invoice.globalDiscount.toFixed(2)}</span>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-sm mb-3 text-gray-800 border-b border-gray-200 pb-2">
                  <span>Round Off</span>
                  <span>{cur}{invoice.roundOff?.toFixed(2)}</span>
                </div>
              )}
              
              <div className={`flex justify-between pt-2 ${invoice.roundOff === 0 ? 'border-t border-gray-200 mt-2' : ''}`}>
                <span className="font-bold text-gray-900">Total</span>
                <span className="font-bold text-gray-900">{cur}{(invoice.totalAmount || 0).toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-400 mt-16 pt-8 border-t border-gray-100">
            This business is not VAT liable. Sri Lanka Tourism Development Authority Registration No: SLTDA/SQA/GH/01606
          </div>
          
        </div>
        </div>
      </div>
      
      <SettleInvoiceDialog 
        invoice={invoice}
        isOpen={settleInvoiceOpen}
        onClose={() => setSettleInvoiceOpen(false)}
        onSuccess={() => {
          fetchInvoiceAndTaxes();
        }}
      />
    </div>
  );
}
