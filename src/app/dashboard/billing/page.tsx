'use client';

import React, { useEffect, useState } from 'react';
import { 
  CreditCard, Calendar, Users, CheckCircle2, AlertTriangle, 
  Loader2, ShieldAlert, History, ShieldCheck, HelpCircle, ArrowRight,
  FileText, Download, Printer, RefreshCw, ToggleLeft, ToggleRight,
  Building, Check, Info, Lock, Receipt, FileCheck, Layers
} from 'lucide-react';

interface School {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
}

interface Subscription {
  id: string;
  planName: string;
  pricePerStudentTerm: number;
  status: string;
  currentBillableCount: number;
  trialStartDate: string;
  trialEndDate: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  gracePeriodEnd: string | null;
  autoRenewEnabled: boolean;
  billingContactName: string | null;
  billingContactEmail: string | null;
  billingPhone: string | null;
  billingAddress: string | null;
  vatNumber: string | null;
}

interface SaaSBillingInvoice {
  id: string;
  invoiceNumber: string;
  studentCount: number;
  pricePerStudent: number;
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  session?: { id: string; name: string };
  term?: { id: string; name: string };
}

interface PaymentTransaction {
  id: string;
  transactionRef: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: string;
  paymentDate: string;
  saasInvoice?: { invoiceNumber: string; studentCount: number };
}

interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  amount: number;
  studentCount: number;
  issuedAt: string;
  notes: string | null;
  saasInvoice?: { invoiceNumber: string; session?: { name: string }; term?: { name: string } };
  transaction?: PaymentTransaction;
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'receipts' | 'subscription' | 'profile'>('overview');
  
  const [school, setSchool] = useState<School | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [currentTermInfo, setCurrentTermInfo] = useState<any>(null);
  const [currentInvoice, setCurrentInvoice] = useState<SaaSBillingInvoice | null>(null);
  const [invoices, setInvoices] = useState<SaaSBillingInvoice[]>([]);
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [receipts, setReceipts] = useState<PaymentReceipt[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [accessStatus, setAccessStatus] = useState<any>(null);

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [togglingAutoRenew, setTogglingAutoRenew] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Selected items for modal view
  const [selectedInvoice, setSelectedInvoice] = useState<SaaSBillingInvoice | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);

  // Load Flutterwave checkout script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const fetchBillingDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const res = await fetch('/api/billing', {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to fetch billing statistics');

      setSchool(json.school || null);
      setSubscription(json.subscription || null);
      setCurrentTermInfo(json.currentTermInfo || null);
      setCurrentInvoice(json.currentInvoice || null);
      setInvoices(json.invoices || []);
      setPayments(json.payments || []);
      setReceipts(json.receipts || []);
      setAuditLogs(json.auditLogs || []);
      setAccessStatus(json.accessStatus || null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error connecting to billing servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        setUser(parsed.user);
      } catch (e) {}
    }
    fetchBillingDetails();
  }, []);

  // Triggers Online Flutterwave Checkout for an Invoice
  const handlePayInvoice = async (targetInv: SaaSBillingInvoice) => {
    if (!school || !user) {
      alert('Session context missing. Please log in again.');
      return;
    }

    if (!(window as any).FlutterwaveCheckout) {
      alert('Flutterwave gateway is initializing. Please wait a moment and try again.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setProcessingPayment(true);

    const flutterwaveKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-e883df149b06871a2e37ca4b2fb418a0-X";
    const ref = `txref-saas-${targetInv.invoiceNumber}-${Date.now()}`;

    try {
      (window as any).FlutterwaveCheckout({
        public_key: flutterwaveKey,
        tx_ref: ref,
        amount: targetInv.totalAmount,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd, qr",
        customer: {
          email: user.email,
          phone_number: school.phone || "08000000000",
          name: user.firstName + " " + user.lastName,
        },
        customizations: {
          title: "Operon School Subscription",
          description: `Termly subscription payment for ${school.name} (${targetInv.studentCount} students)`,
          logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop",
        },
        callback: async function (paymentResponse: any) {
          try {
            const txId = paymentResponse.transaction_id || paymentResponse.id;
            if (!txId) {
              throw new Error('Payment gateway did not return a valid Transaction ID.');
            }

            const token = localStorage.getItem('report_auth_token') || '';
            const res = await fetch('/api/billing', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                invoiceId: targetInv.id,
                transactionRef: String(txId)
              })
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Payment verification failed');

            setSuccessMsg(`Payment of ₦${targetInv.totalAmount.toLocaleString()} verified successfully! Receipt #${json.data?.receipt?.receiptNumber || ''} generated.`);
            fetchBillingDetails();
          } catch (verifyErr: any) {
            setErrorMsg(verifyErr.message || 'Payment completed at gateway but verification failed. Please contact support.');
          } finally {
            setProcessingPayment(false);
          }
        },
        onclose: function () {
          setProcessingPayment(false);
        }
      });
    } catch (paymentErr: any) {
      setErrorMsg('Error launching Flutterwave payment popup.');
      setProcessingPayment(false);
    }
  };

  // Toggle Auto-Renewal
  const handleToggleAutoRenew = async () => {
    if (!subscription) return;
    setTogglingAutoRenew(true);
    try {
      const token = localStorage.getItem('report_auth_token') || '';
      const newStatus = !subscription.autoRenewEnabled;
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
          action: 'TOGGLE_AUTO_RENEW',
          autoRenew: newStatus
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update auto-renewal setting');

      setSubscription(json.subscription);
      setSuccessMsg(`Auto-renewal has been ${newStatus ? 'ENABLED' : 'DISABLED'}.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update setting');
    } finally {
      setTogglingAutoRenew(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'PAID':
        return <span className="bg-emerald-50 text-[#14B8A6] border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><ShieldCheck className="w-3.5 h-3.5" /> Paid / Active</span>;
      case 'TRIAL':
        return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><CheckCircle2 className="w-3.5 h-3.5" /> Free Trial</span>;
      case 'PENDING_VERIFICATION':
      case 'UNPAID':
      case 'PAYMENT_DUE':
        return <span className="bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><AlertTriangle className="w-3.5 h-3.5" /> Unpaid / Due</span>;
      case 'OVERDUE':
      case 'PAST_DUE':
      case 'SUSPENDED':
        return <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Suspended / Overdue</span>;
      default:
        return <span className="bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-black uppercase w-fit">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#14B8A6] animate-spin" />
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Loading Operon Billing System...</p>
        </div>
      </div>
    );
  }

  const billableCount = currentTermInfo?.billableStudents || subscription?.currentBillableCount || 0;
  const termBillAmount = currentInvoice ? currentInvoice.totalAmount : billableCount * 1000;
  const isPaid = currentInvoice?.status === 'PAID' || subscription?.status === 'ACTIVE';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5.5 h-5.5 text-[#14B8A6]" /> Operon Billing & Subscription
          </h2>
          <p className="text-slate-500 text-xs font-semibold">
            Simple ₦1,000 per student per term pricing model. Complete feature access for all schools.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge(subscription?.status || 'TRIAL')}
          <button
            onClick={fetchBillingDetails}
            className="p-2 border border-slate-200 hover:border-slate-300 rounded-xl bg-slate-50 text-slate-600 transition-colors text-xs flex items-center gap-1 font-bold"
            title="Refresh Billing Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Success / Error Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-4 rounded-3xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#14B8A6] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-5 py-4 rounded-3xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Suspension Warning Notice */}
      {accessStatus?.isSuspended && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-extrabold text-red-900 uppercase tracking-wider">Operon Portal Access Suspended</h4>
              <p className="text-xs text-red-700 font-semibold leading-relaxed">
                {accessStatus.message}
              </p>
              <p className="text-[11px] text-red-600 font-medium pt-1">
                🔒 Note: All student records, grades, teacher data, and school history remain 100% safe. Pay your current invoice below to reactivate full portal features immediately.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6-TAB NAVIGATION BAR */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview' 
              ? 'bg-[#14B8A6] text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'invoices' 
              ? 'bg-[#14B8A6] text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4" /> Invoices ({invoices.length})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'payments' 
              ? 'bg-[#14B8A6] text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <History className="w-4 h-4" /> Payments ({payments.length})
        </button>
        <button
          onClick={() => setActiveTab('receipts')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'receipts' 
              ? 'bg-[#14B8A6] text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="w-4 h-4" /> Receipts ({receipts.length})
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'subscription' 
              ? 'bg-[#14B8A6] text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ShieldCheck className="w-4 h-4" /> Subscription & Renewal
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'profile' 
              ? 'bg-[#14B8A6] text-white shadow-sm' 
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building className="w-4 h-4" /> Billing Profile
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Top Quick Stats Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Plan</span>
              <p className="text-base font-extrabold text-slate-900">Operon School Plan</p>
              <p className="text-xs font-bold text-[#14B8A6]">₦1,000 / student / term</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Session & Term</span>
              <p className="text-base font-extrabold text-slate-900">
                {currentTermInfo?.session?.name || '2026/2027'}
              </p>
              <p className="text-xs font-bold text-slate-600">
                {currentTermInfo?.term?.name || 'First Term'}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billable Active Students</span>
              <p className="text-2xl font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-[#14B8A6]" /> {billableCount}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">Active & Enrolled Students</p>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-3xl p-5 shadow-sm space-y-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Term Bill</span>
              <p className="text-2xl font-black text-[#14B8A6]">
                ₦{termBillAmount.toLocaleString()}
              </p>
              <p className="text-[10px] font-semibold text-slate-400">
                Due: {currentInvoice?.dueDate ? new Date(currentInvoice.dueDate).toLocaleDateString() : 'End of term'}
              </p>
            </div>

          </div>

          {/* Prominent Billing Summary Card & Pay Action */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Billing Card */}
            <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-8">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#14B8A6]/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-4 relative z-10">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-[#14B8A6]">OPERON SCHOOL PLAN</span>
                    <h3 className="text-4xl font-black tracking-tight text-white mt-1" style={{ color: '#ffffff' }}>₦1,000</h3>
                    <p className="text-xs font-semibold text-slate-300" style={{ color: '#cbd5e1' }}>per student / term</p>
                  </div>
                  {getStatusBadge(currentInvoice?.status || subscription?.status || 'UNPAID')}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-700/80">
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block" style={{ color: '#cbd5e1' }}>Active Students</span>
                    <span className="text-xl font-black text-white" style={{ color: '#ffffff' }}>{billableCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block" style={{ color: '#cbd5e1' }}>Billing Period</span>
                    <span className="text-base font-bold text-white" style={{ color: '#ffffff' }}>{currentTermInfo?.term?.name || 'First Term'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-300 uppercase block" style={{ color: '#cbd5e1' }}>Amount Due</span>
                    <span className="text-xl font-black text-[#14B8A6]" style={{ color: '#14B8A6' }}>₦{termBillAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 relative z-10 flex flex-col sm:flex-row items-center gap-4">
                {currentInvoice && currentInvoice.status !== 'PAID' ? (
                  <button
                    onClick={() => handlePayInvoice(currentInvoice)}
                    disabled={processingPayment}
                    className="w-full sm:w-auto px-8 py-4 bg-[#14B8A6] hover:bg-[#0d9488] text-white text-xs font-black tracking-widest uppercase rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {processingPayment ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" /> Pay Now (₦{termBillAmount.toLocaleString()})
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="px-5 py-3 bg-emerald-500/20 text-[#14B8A6] border border-emerald-500/30 text-xs font-black uppercase rounded-2xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Subscription Paid & Active
                    </span>
                    {receipts.length > 0 && (
                      <button
                        onClick={() => setSelectedReceipt(receipts[0])}
                        className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-2xl transition-colors flex items-center gap-2"
                      >
                        <Receipt className="w-4 h-4" /> View Payment Receipt
                      </button>
                    )}
                  </div>
                )}
              </div>

            </div>

            {/* Quick Rules & Information Box */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Info className="w-4 h-4 text-[#14B8A6]" /> Billing Policy Summary
              </h4>

              <div className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 block">Single Transparent Price</span>
                  <p className="text-[11px] text-slate-500">₦1,000 per active student per term. No hidden software fees or tier restrictions.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 block">Billable Student Count</span>
                  <p className="text-[11px] text-slate-500">Only Active & Enrolled students count toward billing. Graduated or withdrawn students are non-billable.</p>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                  <span className="font-bold text-slate-800 block">Immutable Invoices</span>
                  <p className="text-[11px] text-slate-500">Paid invoices are permanently preserved. Mid-term student additions generate separate term adjustments.</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: INVOICES */}
      {activeTab === 'invoices' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Termly SaaS Invoices ({invoices.length})
            </h3>
          </div>

          {invoices.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">No SaaS invoices generated yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Invoice Number</th>
                    <th className="py-3 px-4">Session & Term</th>
                    <th className="py-3 px-4">Students</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Issue Date</th>
                    <th className="py-3 px-4">Due Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-extrabold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {inv.session?.name || '2026/2027'} • {inv.term?.name || 'First Term'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-800 font-bold">{inv.studentCount} students</td>
                      <td className="py-3.5 px-4 text-slate-600">₦{inv.pricePerStudent.toLocaleString()}/student</td>
                      <td className="py-3.5 px-4 font-black text-[#14B8A6]">₦{inv.totalAmount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(inv.issueDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedInvoice(inv)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold transition-colors"
                          >
                            View
                          </button>
                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => handlePayInvoice(inv)}
                              disabled={processingPayment}
                              className="px-3 py-1.5 bg-[#14B8A6] hover:bg-[#0d9488] text-white rounded-xl text-[11px] font-extrabold transition-colors shadow-sm"
                            >
                              Pay Now
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Payment Transaction History ({payments.length})
          </h3>

          {payments.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <History className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">No online payment transactions recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 font-extrabold uppercase text-[10px] tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-semibold">
                  {payments.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{tx.transactionRef}</td>
                      <td className="py-3.5 px-4 text-slate-700">{tx.saasInvoice?.invoiceNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-black text-[#14B8A6]">₦{tx.amount.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-slate-600">{tx.paymentMethod}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(tx.paymentDate).toLocaleString()}</td>
                      <td className="py-3.5 px-4">{getStatusBadge(tx.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: RECEIPTS */}
      {activeTab === 'receipts' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            Official Subscription Receipts ({receipts.length})
          </h3>

          {receipts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Receipt className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">No payment receipts available yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {receipts.map((rec) => (
                <div key={rec.id} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 relative flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-mono font-bold text-[#14B8A6]">{rec.receiptNumber}</span>
                      <span className="bg-emerald-100 text-[#14B8A6] text-[9px] font-black uppercase px-2 py-0.5 rounded-md">VERIFIED</span>
                    </div>
                    <p className="text-lg font-black text-slate-900">₦{rec.amount.toLocaleString()}</p>
                    <p className="text-xs text-slate-600 font-semibold">
                      {rec.saasInvoice?.session?.name || '2026/2027'} • {rec.saasInvoice?.term?.name || 'First Term'}
                    </p>
                    <p className="text-[11px] text-slate-400">Issued: {new Date(rec.issuedAt).toLocaleDateString()}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500">{rec.studentCount} Students</span>
                    <button
                      onClick={() => setSelectedReceipt(rec)}
                      className="px-3 py-1.5 bg-[#14B8A6] hover:bg-[#0d9488] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: SUBSCRIPTION & AUTO-RENEWAL */}
      {activeTab === 'subscription' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Subscription Status & Renewal
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Status</span>
                {getStatusBadge(subscription?.status || 'TRIAL')}
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Plan Package</span>
                <span className="font-bold text-slate-900">Operon School Management</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Rate</span>
                <span className="font-bold text-[#14B8A6]">₦1,000 / student / term</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Current Period Start</span>
                <span className="font-semibold text-slate-800">
                  {subscription?.currentPeriodStart ? new Date(subscription.currentPeriodStart).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Next Renewal Date</span>
                <span className="font-semibold text-slate-800">
                  {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : 'End of current term'}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Grace Period Until</span>
                <span className="font-semibold text-slate-800">
                  {subscription?.gracePeriodEnd ? new Date(subscription.gracePeriodEnd).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Auto-Renewal Settings
            </h3>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 block text-xs">Enable Termly Auto-Renewal</span>
                  <span className="text-[11px] text-slate-500">Automatically generate and pay next term invoice.</span>
                </div>
                <button
                  onClick={handleToggleAutoRenew}
                  disabled={togglingAutoRenew}
                  className="text-[#14B8A6] cursor-pointer"
                >
                  {subscription?.autoRenewEnabled ? (
                    <ToggleRight className="w-8 h-8 text-[#14B8A6]" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-slate-300" />
                  )}
                </button>
              </div>

              <div className="pt-2 text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 flex items-start gap-2">
                <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>PCI-DSS Security Notice:</strong> Operon uses secure tokenization via Flutterwave. We never store raw card numbers, CVV, or PINs on our servers.
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: BILLING PROFILE */}
      {activeTab === 'profile' && (
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-6 max-w-2xl">
          <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
            School Billing Profile
          </h3>

          <div className="space-y-4 text-xs font-semibold">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Registered School Name</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">{school?.name || 'N/A'}</div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Billing Contact Email</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">{school?.email || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">{school?.phone || 'N/A'}</div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">School Physical Address</label>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800">{school?.address || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

      {/* INVOICE MODAL VIEWER */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scaleIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#14B8A6]">OPERON SAAS INVOICE</span>
                <h3 className="text-xl font-black text-slate-900">{selectedInvoice.invoiceNumber}</h3>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">School Identity</span>
                <span className="font-bold text-slate-900">{school?.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Session & Term</span>
                <span className="font-bold text-slate-800">{selectedInvoice.session?.name || '2026/2027'} • {selectedInvoice.term?.name || 'First Term'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Billable Students</span>
                <span className="font-bold text-slate-900">{selectedInvoice.studentCount} students</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Rate</span>
                <span className="font-bold text-[#14B8A6]">₦{selectedInvoice.pricePerStudent.toLocaleString()}/student</span>
              </div>
              <div className="flex justify-between py-1 pt-2 border-t border-slate-200 font-extrabold text-sm">
                <span className="text-slate-900">Total Amount Due</span>
                <span className="text-[#14B8A6]">₦{selectedInvoice.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" /> Print Invoice
              </button>
              {selectedInvoice.status !== 'PAID' && (
                <button
                  onClick={() => { setSelectedInvoice(null); handlePayInvoice(selectedInvoice); }}
                  className="px-5 py-2 bg-[#14B8A6] hover:bg-[#0d9488] text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow-sm"
                >
                  <CreditCard className="w-3.5 h-3.5" /> Pay Now
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL VIEWER */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-8 max-w-lg w-full shadow-2xl space-y-6 animate-scaleIn">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#14B8A6]">OFFICIAL PAYMENT RECEIPT</span>
                <h3 className="text-xl font-black text-slate-900">{selectedReceipt.receiptNumber}</h3>
              </div>
              <button onClick={() => setSelectedReceipt(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1">
                <span className="text-slate-500">School Name</span>
                <span className="font-bold text-slate-900">{school?.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Invoice Reference</span>
                <span className="font-bold text-slate-800">{selectedReceipt.saasInvoice?.invoiceNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Student Count</span>
                <span className="font-bold text-slate-900">{selectedReceipt.studentCount} students</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Payment Date</span>
                <span className="font-bold text-slate-800">{new Date(selectedReceipt.issuedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1 pt-2 border-t border-slate-200 font-extrabold text-sm">
                <span className="text-slate-900">Amount Paid</span>
                <span className="text-[#14B8A6]">₦{selectedReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-[#14B8A6] hover:bg-[#0d9488] text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" /> Print / Download Receipt
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
