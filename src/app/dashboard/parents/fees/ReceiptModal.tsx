'use client';

import React, { useState, useEffect } from 'react';
import { Download, Printer, CheckCircle2, Building2, ShieldCheck, RefreshCw } from 'lucide-react';

interface ReceiptModalProps {
  paymentId: string | null;
  onClose: () => void;
}

export default function ReceiptModal({ paymentId, onClose }: ReceiptModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (paymentId) {
      fetchReceiptData();
    }
  }, [paymentId]);

  const fetchReceiptData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${paymentId}/receipt`);
      const json = await res.json();
      if (res.ok && json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Failed to load digital payment receipt');
      }
    } catch (err: any) {
      setError('Connection error loading receipt data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!paymentId) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 print:shadow-none print:border-none print:max-w-none print:p-0">
        
        {/* Modal Actions Header (Hidden in Print) */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 print:hidden">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Digital Payment Receipt
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-sm font-bold ml-2"
            >
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium flex items-center justify-center gap-3">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> Generating official receipt...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 font-bold bg-rose-50 rounded-2xl border border-rose-200">
            {error}
          </div>
        ) : data ? (
          /* Printable Receipt Content */
          <div className="space-y-6 text-slate-900">
            
            {/* Receipt Header */}
            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
              <div className="space-y-1">
                {data.school.logoUrl ? (
                  <img src={data.school.logoUrl} alt={data.school.name} className="h-12 w-auto mb-2 object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-lg mb-2">
                    {data.school.name.slice(0, 1)}
                  </div>
                )}
                <h2 className="text-xl font-extrabold text-slate-900">{data.school.name}</h2>
                <p className="text-xs text-slate-500 font-medium">{data.school.address}</p>
                <p className="text-xs text-slate-500 font-medium">{data.school.email} | {data.school.phone}</p>
              </div>

              <div className="text-right space-y-1">
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold text-xs uppercase tracking-wider rounded-lg">
                  Official Payment Receipt
                </span>
                <p className="text-sm font-extrabold font-mono text-slate-900">{data.receiptNumber}</p>
                <p className="text-xs text-slate-500 font-medium">
                  Date: {new Date(data.paymentDetails.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Student & Parent Info */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Student Information</span>
                <p className="font-extrabold text-sm text-slate-900">{data.student.name}</p>
                <p className="text-slate-600">Admission No: <span className="font-mono font-bold">{data.student.admissionNumber}</span></p>
                <p className="text-slate-600">Class: <span className="font-bold">{data.student.className}</span></p>
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Parent / Guardian</span>
                <p className="font-extrabold text-sm text-slate-900">{data.parent?.name || 'Guardian'}</p>
                <p className="text-slate-600">{data.parent?.email}</p>
                <p className="text-slate-600">{data.parent?.phone}</p>
              </div>
            </div>

            {/* Payment Summary Box */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Payment Breakdown</h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-extrabold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Invoice Ref</th>
                      <th className="p-3 text-right">Amount Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    <tr>
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{data.paymentDetails.notes || 'School Fee Payment'}</span>
                        <span className="block text-[10px] text-slate-400">{data.paymentDetails.paymentMethod} • TxRef: {data.paymentReference}</span>
                      </td>
                      <td className="p-3 text-right font-mono">{data.invoice?.invoiceNumber || 'N/A'}</td>
                      <td className="p-3 text-right font-mono font-extrabold text-slate-900 text-sm">
                        ₦{(data.paymentDetails.amountPaid || 0).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Financial Ledger & Remaining Balance */}
            {data.invoice && (
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Invoice Total</span>
                  <p className="font-mono font-extrabold text-indigo-900 text-sm">₦{(data.invoice.netAmount || 0).toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Total Paid</span>
                  <p className="font-mono font-extrabold text-emerald-700 text-sm">₦{(data.invoice.paidAmount || 0).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Outstanding Balance</span>
                  <p className="font-mono font-extrabold text-rose-600 text-sm">₦{(data.invoice.outstandingBalance || 0).toLocaleString()}</p>
                </div>
              </div>
            )}

            {/* Footer Notes */}
            <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-[10px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Online Settlement via Flutterwave Subaccount ({data.school.subaccountId || 'N/A'})</span>
              </div>
              <p>Generated automatically by Operon SaaS Platform</p>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
