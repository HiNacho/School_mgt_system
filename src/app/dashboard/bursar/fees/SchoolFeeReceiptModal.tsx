'use client';

import React from 'react';
import { Printer, X, CheckCircle, Download, ShieldCheck } from 'lucide-react';

interface ReceiptProps {
  payment: {
    id: string;
    receiptNumber: string;
    amount: number;
    currency?: string;
    paymentMethod: string;
    referenceNumber?: string;
    flutterwaveTransactionId?: string;
    paymentDate: string | Date;
    status: string;
    notes?: string;
    student?: {
      firstName: string;
      lastName: string;
      middleName?: string;
      admissionNumber: string;
      className?: string;
      armName?: string;
      school?: {
        name: string;
        logoUrl?: string;
        address?: string;
        phone?: string;
      };
    };
    invoice?: {
      invoiceNumber?: string;
      sessionName?: string;
      termName?: string;
    };
  };
  onClose: () => void;
}

export default function SchoolFeeReceiptModal({ payment, onClose }: ReceiptProps) {
  const handlePrint = () => {
    window.print();
  };

  const studentName = payment.student 
    ? `${payment.student.lastName}, ${payment.student.firstName} ${payment.student.middleName || ''}`.trim()
    : 'Student';

  const schoolName = payment.student?.school?.name || 'Operon Partner School';
  const schoolLogo = payment.student?.school?.logoUrl;
  const paymentDateFormatted = new Date(payment.paymentDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="no-print fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-150">
        
        {/* Modal Header Toolbar */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Official Fee Payment Receipt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" /> Print Receipt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 border border-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 overflow-y-auto max-h-[80vh] bg-slate-50/40">
          <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-md relative overflow-hidden space-y-5">
            
            {/* Watermark Logo */}
            {schoolLogo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.06] select-none z-0">
                <img src={schoolLogo} alt="Watermark" className="w-64 h-64 object-contain" />
              </div>
            )}

            {/* Receipt Header */}
            <div className="text-center space-y-1 relative z-10 border-b-2 border-slate-900 pb-4">
              {schoolLogo && (
                <img src={schoolLogo} alt="School Logo" className="w-12 h-12 object-contain mx-auto mb-1" />
              )}
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                {schoolName}
              </h2>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider font-bold">
                {payment.student?.school?.address || 'Official Electronic Payment Receipt'}
              </p>
              <div className="inline-block mt-2 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 text-[10px] font-black uppercase tracking-widest border border-emerald-300">
                ✓ SCHOOL FEE PAYMENT RECEIPT
              </div>
            </div>

            {/* Receipt Details Grid */}
            <div className="space-y-2.5 text-xs relative z-10 font-sans">
              <div className="flex justify-between py-1 border-b border-slate-150">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Receipt Number:</span>
                <strong className="font-mono text-slate-900 font-bold">{payment.receiptNumber}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-150">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Student Name:</span>
                <strong className="text-slate-900 font-bold">{studentName}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-150">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Admission No:</span>
                <strong className="font-mono text-slate-900 font-bold">{payment.student?.admissionNumber || '—'}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-150">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Class & Arm:</span>
                <strong className="text-slate-900 font-bold">{payment.student?.className} Arm {payment.student?.armName}</strong>
              </div>

              {payment.invoice?.sessionName && (
                <div className="flex justify-between py-1 border-b border-slate-150">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Session & Term:</span>
                  <strong className="text-slate-900 font-bold">{payment.invoice.sessionName} — {payment.invoice.termName}</strong>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-150">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Payment Method:</span>
                <strong className="text-slate-900 font-bold uppercase">{payment.paymentMethod}</strong>
              </div>

              {payment.flutterwaveTransactionId && (
                <div className="flex justify-between py-1 border-b border-slate-150">
                  <span className="text-slate-500 font-semibold uppercase text-[10px]">Flutterwave Ref:</span>
                  <strong className="font-mono text-indigo-900 font-bold text-[11px]">{payment.flutterwaveTransactionId}</strong>
                </div>
              )}

              <div className="flex justify-between py-1 border-b border-slate-150">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Payment Date:</span>
                <strong className="font-mono text-slate-900 font-bold">{paymentDateFormatted}</strong>
              </div>

              {/* Total Amount Paid Box */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center mt-3">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-950">Amount Paid:</span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  ₦{payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Footer Verification Stamp */}
            <div className="pt-3 border-t border-slate-200 text-center space-y-1 relative z-10">
              <div className="flex items-center justify-center gap-1.5 text-emerald-700 text-[10px] font-bold">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Verified Online Settlement — Operon Education Platform</span>
              </div>
              <p className="text-[8.5px] text-slate-400 font-mono">
                System generated electronic receipt. Valid without manual signature.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
