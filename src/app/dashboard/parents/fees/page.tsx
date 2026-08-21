'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  RefreshCw,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Lock,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  Download
} from 'lucide-react';
import ReceiptModal from './ReceiptModal';

export default function ParentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Payment Checkout State
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [initiating, setInitiating] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Digital Receipt Modal
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  useEffect(() => {
    fetchParentInvoicesAndLedger();
  }, []);

  const fetchParentInvoicesAndLedger = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/parents/fees');
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setErrorMsg(json.error || 'Failed to load outstanding invoices and payment records');
      }
    } catch (err: any) {
      setErrorMsg('Connection error loading fee ledger.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPayModal = (inv: any) => {
    setSelectedInvoice(inv);
    const balance = inv.netAmount - inv.paidAmount;
    setPayAmount(String(balance));
    setCheckoutError('');
  };

  const handleInitiatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !payAmount || Number(payAmount) <= 0) {
      setCheckoutError('Please enter a valid payment amount.');
      return;
    }

    setInitiating(true);
    setCheckoutError('');

    try {
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedInvoice.studentId,
          invoiceId: selectedInvoice.id,
          amount: Number(payAmount),
        }),
      });

      const json = await res.json();
      if (res.ok && json.success && json.checkoutUrl) {
        // Redirect parent directly to Flutterwave secure checkout link
        window.location.href = json.checkoutUrl;
      } else {
        setCheckoutError(json.error || 'Failed to initialize payment checkout link.');
      }
    } catch (err: any) {
      setCheckoutError('Server connection error initializing checkout.');
    } finally {
      setInitiating(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> Loading your children's fee invoices and receipts...
        </div>
      </div>
    );
  }

  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const totalOutstanding = invoices.reduce((acc: number, inv: any) => acc + (inv.netAmount - inv.paidAmount), 0);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Secure Online Payment Portal
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">School Fees & Digital Receipts</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            View outstanding fee invoices for your children, pay online securely via Flutterwave, and download official receipts.
          </p>
        </div>

        <div className="bg-white/10 border border-white/10 backdrop-blur-md p-4 rounded-2xl text-right">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">Total Outstanding Balance</span>
          <p className="text-2xl md:text-3xl font-extrabold font-mono text-emerald-400">₦{totalOutstanding.toLocaleString()}</p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Outstanding Invoices */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">Outstanding Invoices</h3>
              <p className="text-xs text-slate-500 font-medium">Pending school fee invoices assigned to your children</p>
            </div>
          </div>

          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            {invoices.length} Active Invoice(s)
          </span>
        </div>

        {invoices.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            🎉 Great news! All fee invoices for your children are fully settled. No outstanding balance.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {invoices.map((inv: any) => {
              const balance = inv.netAmount - inv.paidAmount;
              return (
                <div key={inv.id} className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/20 border border-slate-200 space-y-4 shadow-sm flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-extrabold text-indigo-600 bg-indigo-100/60 px-2.5 py-0.5 rounded-lg">
                        {inv.invoiceNumber}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${inv.status === 'PARTIALLY_PAID' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>
                        {inv.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-extrabold text-slate-900 text-base">
                        {inv.student?.firstName} {inv.student?.lastName}
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Class: {inv.student?.class?.name} {inv.student?.arm?.name} • Adm: {inv.student?.admissionNumber}
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2 text-xs border-t border-slate-200/60">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Total Fee</span>
                        <p className="font-mono font-bold text-slate-800">₦{inv.netAmount.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Paid So Far</span>
                        <p className="font-mono font-bold text-emerald-600">₦{inv.paidAmount.toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Outstanding</span>
                        <p className="font-mono font-extrabold text-rose-600 text-sm">₦{balance.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenPayModal(inv)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                  >
                    Pay ₦{balance.toLocaleString()} Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Payment History Ledger & Receipt Downloads */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
            <Receipt className="w-4 h-4 text-indigo-600" /> Payment History & Receipts ({payments.length})
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">
            No past payment records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Receipt #</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Payment Method</th>
                  <th className="p-4 text-right">Amount Paid</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 font-mono font-extrabold text-slate-900">{p.receiptNumber}</td>
                    <td className="p-4 font-extrabold text-slate-900">
                      {p.student?.firstName} {p.student?.lastName}
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-700 text-sm">
                      ₦{(p.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> {p.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptId(p.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs transition inline-flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" /> View Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Checkout Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Pay School Fees</h3>
                <p className="text-xs text-slate-500 font-medium">Invoice: {selectedInvoice.invoiceNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedInvoice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handleInitiatePayment} className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Name</span>
                <p className="font-extrabold text-slate-900 text-sm">{selectedInvoice.student?.firstName} {selectedInvoice.student?.lastName}</p>
                <p className="text-xs text-slate-500">Remaining Payable Balance: <span className="font-mono font-bold text-rose-600">₦{(selectedInvoice.netAmount - selectedInvoice.paidAmount).toLocaleString()}</span></p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Enter Payment Amount (₦)</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={selectedInvoice.netAmount - selectedInvoice.paidAmount}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Secure 256-bit encrypted checkout powered by Flutterwave.</span>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={initiating || !payAmount || Number(payAmount) <= 0}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {initiating ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Proceed to Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Digital Receipt Modal */}
      <ReceiptModal
        paymentId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
      />

    </div>
  );
}
