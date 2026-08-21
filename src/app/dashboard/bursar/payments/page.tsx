'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  RotateCcw,
  Receipt,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import ReceiptModal from '@/app/dashboard/parents/fees/ReceiptModal';

export default function BursarPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [classes, setClasses] = useState<any[]>([]);

  // Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Receipt Modal
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Refund Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundPayment, setRefundPayment] = useState<any>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [refunding, setRefunding] = useState(false);
  const [refundMsg, setRefundMsg] = useState('');

  useEffect(() => {
    fetchSetupClasses();
    fetchPaymentsData();
  }, [statusFilter, methodFilter, classFilter]);

  const fetchSetupClasses = async () => {
    try {
      const res = await fetch('/api/classes');
      const data = await res.json();
      if (res.ok && data.data) {
        setClasses(data.data);
      }
    } catch (e) {
      console.error('Failed to load setup classes', e);
    }
  };

  const fetchPaymentsData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (methodFilter !== 'ALL') params.set('paymentMethod', methodFilter);
      if (classFilter !== 'ALL') params.set('classId', classFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/bursar/payments?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data.success) {
        setPayments(data.data || []);
        setSummary(data.summary || null);
      }
    } catch (err) {
      console.error('Failed to fetch payments ledger', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPaymentsData();
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    const headers = [
      'Payment Date',
      'Receipt Number',
      'Student Name',
      'Admission Number',
      'Class',
      'Parent Name',
      'Payment Method',
      'Gross Amount (NGN)',
      'Platform Fee (NGN)',
      'Net School Amount (NGN)',
      'Reference Number',
      'Transaction ID',
      'Status'
    ];

    const rows = payments.map(p => [
      new Date(p.paymentDate).toLocaleDateString(),
      p.receiptNumber || '',
      `"${p.student?.firstName || ''} ${p.student?.lastName || ''}"`,
      p.student?.admissionNumber || '',
      `"${p.student?.class?.name || ''} ${p.student?.arm?.name || ''}"`,
      `"${p.parent ? `${p.parent.firstName} ${p.parent.lastName}` : ''}"`,
      p.paymentMethod || '',
      p.grossAmount || p.amount || 0,
      p.platformFee || 0,
      p.schoolAmount || p.amount || 0,
      p.referenceNumber || '',
      p.flutterwaveTransactionId || '',
      p.status || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payments_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExecuteRefund = async () => {
    if (!refundPayment || !refundReason.trim()) {
      setRefundMsg('Please enter a valid refund reason.');
      return;
    }
    setRefunding(true);
    setRefundMsg('');

    try {
      const res = await fetch(`/api/bursar/payments/${refundPayment.id}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: refundAmount ? parseFloat(refundAmount) : refundPayment.amount,
          reason: refundReason.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setShowRefundModal(false);
        setRefundPayment(null);
        setRefundReason('');
        setRefundAmount('');
        fetchPaymentsData();
      } else {
        setRefundMsg(data.error || 'Refund execution failed');
      }
    } catch (err: any) {
      setRefundMsg('Connection error processing refund.');
    } finally {
      setRefunding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESSFUL':
      case 'VERIFIED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Successful
          </span>
        );
      case 'PENDING':
      case 'PROCESSING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" /> Pending
          </span>
        );
      case 'FAILED':
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-rose-50 text-rose-700 border border-rose-200 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-rose-600" /> Failed
          </span>
        );
      case 'REFUNDED':
      case 'PARTIALLY_REFUNDED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-purple-50 text-purple-700 border border-purple-200 inline-flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-purple-600" /> Refunded
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      
      {/* Header & Export Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">Payments & Collections Ledger</h1>
          <p className="text-sm text-slate-500 font-medium">
            Monitor real-time online Flutterwave subaccount settlements, cash records, and receipts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchPaymentsData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition shadow-sm"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={payments.length === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Export Excel/CSV
          </button>
        </div>
      </div>

      {/* Analytics KPI Stat Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Collected</span>
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900">₦{(summary.totalCollected || 0).toLocaleString()}</p>
            <p className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> {summary.successfulCount || 0} Successful Transactions
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Today's Collection</span>
              <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900">₦{(summary.todayCollection || 0).toLocaleString()}</p>
            <p className="text-xs text-slate-500 font-medium">Settled today</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Pending Payments</span>
              <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900">₦{(summary.pendingAmount || 0).toLocaleString()}</p>
            <p className="text-xs text-amber-600 font-bold">{summary.pendingCount || 0} Pending Initializations</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Refunds</span>
              <div className="w-9 h-9 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <RotateCcw className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-extrabold font-mono text-slate-900">₦{(summary.refundedAmount || 0).toLocaleString()}</p>
            <p className="text-xs text-purple-600 font-bold">{summary.refundsCount || 0} Processed Refunds</p>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <form onSubmit={handleApplySearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Student, Receipt #, or TxRef..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Status: All</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="VERIFIED">Verified</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Method: All</option>
              <option value="FLUTTERWAVE">Flutterwave Online</option>
              <option value="CASH">Cash</option>
              <option value="POS">POS</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">Class: All</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
            <Receipt className="w-4 h-4 text-indigo-600" /> Transaction Records ({payments.length})
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 font-medium flex items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> Loading payment ledger...
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-medium">
            No payment transactions match the selected filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Date</th>
                  <th className="p-4">Receipt #</th>
                  <th className="p-4">Student</th>
                  <th className="p-4">Class</th>
                  <th className="p-4">Method</th>
                  <th className="p-4 text-right">Gross Amount</th>
                  <th className="p-4 text-right">Platform Fee</th>
                  <th className="p-4 text-right">School Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-4 font-mono font-bold text-slate-600">
                      {new Date(p.paymentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 font-mono font-extrabold text-slate-900">{p.receiptNumber}</td>
                    <td className="p-4">
                      <p className="font-extrabold text-slate-900">{p.student?.firstName} {p.student?.lastName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Adm: {p.student?.admissionNumber}</p>
                    </td>
                    <td className="p-4 font-bold text-slate-700">
                      {p.student?.class?.name} {p.student?.arm?.name}
                    </td>
                    <td className="p-4">
                      <span className="font-extrabold text-[11px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-slate-900">
                      ₦{(p.grossAmount || p.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono text-slate-500">
                      ₦{(p.platformFee || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-right font-mono font-extrabold text-emerald-700">
                      ₦{(p.schoolAmount || p.amount || 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      {getStatusBadge(p.status)}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => setSelectedReceiptId(p.id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition"
                      >
                        Receipt
                      </button>

                      {['SUCCESSFUL', 'VERIFIED'].includes(p.status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setRefundPayment(p);
                            setShowRefundModal(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-[11px] transition"
                        >
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Digital Receipt Modal Component */}
      <ReceiptModal
        paymentId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
      />

      {/* Refund Execution Modal */}
      {showRefundModal && refundPayment && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Initiate Refund</h3>
                <p className="text-xs text-slate-500 font-medium">Payment Receipt: {refundPayment.receiptNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            {refundMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                {refundMsg}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Refund Amount (₦)</label>
                <input
                  type="number"
                  placeholder={`Max: ₦${refundPayment.amount.toLocaleString()}`}
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">Reason for Refund</label>
                <textarea
                  rows={3}
                  placeholder="State the official reason for this refund..."
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRefund}
                  disabled={refunding || !refundReason.trim()}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {refunding ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Confirm Refund'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
