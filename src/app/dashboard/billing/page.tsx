'use client';

import React, { useEffect, useState } from 'react';
import { 
  CreditCard, Calendar, Users, CheckCircle, AlertTriangle, 
  Loader2, ShieldAlert, History, ShieldCheck, HelpCircle, ArrowRight
} from 'lucide-react';

interface Payment {
  id: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  status: string;
}

interface School {
  id: string;
  name: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  maxStudents: number;
  phone: string | null;
  _count: {
    students: number;
  };
}

export default function BillingPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Checkout inputs
  const [selectedPlan, setSelectedPlan] = useState('Standard Plan (Up to 250 Students)');
  const [selectedTerms, setSelectedTerms] = useState('1');
  const [calculatedAmount, setCalculatedAmount] = useState(80000);

  // Load Flutterwave checkout script dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // Safely remove script if it still exists
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

      setPayments(json.payments || []);
      setSchool(json.school || null);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error connecting to billing servers.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Read session credentials
    const sessionStr = localStorage.getItem('report_user_session');
    if (sessionStr) {
      try {
        const parsed = JSON.parse(sessionStr);
        setUser(parsed.user);
      } catch (e) {}
    }
    fetchBillingDetails();
  }, []);

  // Recalculate price when plan/terms change
  useEffect(() => {
    let pricePerTerm = 80000;
    if (selectedPlan.includes('Basic') || selectedPlan.includes('100')) {
      pricePerTerm = 40000;
    } else if (selectedPlan.includes('Standard') || selectedPlan.includes('250')) {
      pricePerTerm = 80000;
    } else if (selectedPlan.includes('Premium') || selectedPlan.includes('500')) {
      pricePerTerm = 150000;
    } else if (selectedPlan.includes('Enterprise') || selectedPlan.includes('Unlimited')) {
      pricePerTerm = 300000;
    }

    const termsCount = parseInt(selectedTerms, 10) || 1;
    setCalculatedAmount(pricePerTerm * termsCount);
  }, [selectedPlan, selectedTerms]);

  // Triggers Flutterwave transaction
  const handleOnlinePayment = async () => {
    if (!school || !user) {
      alert('School or session context missing. Please log in again.');
      return;
    }

    if (!(window as any).FlutterwaveCheckout) {
      alert('Flutterwave checkout script is still loading. Please wait a moment and try again.');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setProcessingPayment(true);

    const flutterwaveKey = process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || "FLWPUBK_TEST-e883df149b06871a2e37ca4b2fb418a0-X";
    const ref = `txref-${school.id.substring(0, 5)}-${Date.now()}`;

    try {
      (window as any).FlutterwaveCheckout({
        public_key: flutterwaveKey,
        tx_ref: ref,
        amount: calculatedAmount,
        currency: "NGN",
        payment_options: "card, banktransfer, ussd, qr",
        customer: {
          email: user.email,
          phone_number: school.phone || "08000000000",
          name: user.firstName + " " + user.lastName,
        },
        customizations: {
          title: "NachoEd School Subscription",
          description: `Subscription renewal for ${school.name} (${selectedPlan})`,
          logo: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=100&auto=format&fit=crop",
        },
        callback: async function (paymentResponse: any) {
          // Verify with database callback API
          try {
            const token = localStorage.getItem('report_auth_token') || '';
            const res = await fetch('/api/billing', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                amount: calculatedAmount,
                planSelected: selectedPlan,
                durationTerms: parseInt(selectedTerms, 10),
                transactionRef: paymentResponse.transaction_id || ref,
                status: paymentResponse.status || 'successful'
              })
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'Subscription registration failed');

            setSuccessMsg(`Online payment verified successfully! Your school is now active on the ${selectedPlan}.`);
            
            // Sync session in localStorage
            if (json.data?.school) {
              const sessionStr = localStorage.getItem('report_user_session');
              if (sessionStr) {
                const parsed = JSON.parse(sessionStr);
                parsed.school = json.data.school;
                localStorage.setItem('report_user_session', JSON.stringify(parsed));
              }
            }

            fetchBillingDetails();
          } catch (verifyErr: any) {
            setErrorMsg(verifyErr.message || 'Payment was completed but failed to update subscription. Please contact support.');
          } finally {
            setProcessingPayment(false);
          }
        },
        onclose: function () {
          setProcessingPayment(false);
        }
      });
    } catch (paymentErr: any) {
      setErrorMsg('Error initializing online payment popup.');
      setProcessingPayment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><ShieldCheck className="w-3.5 h-3.5" /> Active</span>;
      case 'trial':
        return <span className="bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><CheckCircle className="w-3.5 h-3.5" /> Trial</span>;
      case 'suspended':
        return <span className="bg-red-50 text-red-500 border border-red-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm"><ShieldAlert className="w-3.5 h-3.5 animate-pulse" /> Suspended</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 border border-slate-100 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1 w-fit shadow-sm">{status}</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto text-slate-800 bg-slate-50/50 min-h-screen">
      
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-5.5 h-5.5 text-emerald-600" /> Billing & Subscriptions
          </h2>
          <p className="text-slate-450 text-xs font-semibold">
            Manage your billing plans, pay your termly subscription invoice, and monitor enrollment limits.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl shadow-sm">
          <span>Secure payments via Flutterwave Gateway</span>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-4 rounded-3xl text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-700 border border-red-200 px-5 py-4 rounded-3xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Status Warning Banners */}
      {school && school.subscriptionStatus === 'suspended' && (
        <div className="bg-red-50 border border-red-200 rounded-3xl p-5 shadow-sm space-y-2.5 flex items-start gap-4">
          <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5 animate-pulse" />
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-red-800">Account Access Suspended</h4>
            <p className="text-xs text-red-650 font-semibold leading-relaxed">
              Your subscription and grace period have expired. Modification features (such as adding students, editing grades, or marking attendance) are locked out. Please use the online checkout portal below to reactivate your portal immediately.
            </p>
          </div>
        </div>
      )}

      {school && school.subscriptionStatus === 'trial' && (
        <div className="bg-blue-50 border border-blue-200 rounded-3xl p-5 shadow-sm flex items-start gap-4">
          <CheckCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-blue-800">Free Trial Status Active</h4>
            <p className="text-xs text-blue-650 font-semibold leading-relaxed">
              Your school is currently registered under the **Termly Free Trial**. You are entitled to free trial access for your first academic term. You can upgrade to a paid billing plan at any time below.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="h-80 flex items-center justify-center bg-white border border-slate-200/80 rounded-3xl shadow-sm">
          <div className="text-center space-y-3">
            <Loader2 className="w-6 h-6 border-2 border-t-emerald-600 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin mx-auto text-emerald-600" />
            <p className="text-slate-450 text-xs font-semibold">Accessing payment records...</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Active Subscription Summary & Billing Form */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Subscription Summary Card */}
            {school && (
              <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
                  Subscription Summary
                </h3>

                <div className="space-y-3.5 pt-1">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs text-slate-400 font-bold">Active Status</span>
                    {getStatusBadge(school.subscriptionStatus)}
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs text-slate-400 font-bold">Current Plan</span>
                    <span className="text-xs font-extrabold text-slate-800">{school.subscriptionPlan}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                    <span className="text-xs text-slate-400 font-bold">Enrollment Limit</span>
                    <span className="text-xs font-extrabold text-slate-800 font-mono">
                      {school._count.students} / {school.maxStudents || 100} Students
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-400 font-bold">Billing End Date</span>
                    <span className="text-xs font-extrabold text-slate-800 font-mono flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {school.subscriptionEnd ? new Date(school.subscriptionEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Online Billing Payment Checkout */}
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider">
                Online Subscription Checkout
              </h3>

              <div className="space-y-4 pt-1">
                {/* Select Plan Tier */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Select Plan Tier</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="Basic Plan (Up to 100 Students)">Basic Plan (Up to 100 Students) - ₦40,000/Term</option>
                    <option value="Standard Plan (Up to 250 Students)">Standard Plan (Up to 250 Students) - ₦80,000/Term</option>
                    <option value="Premium Plan (Up to 500 Students)">Premium Plan (Up to 500 Students) - ₦150,000/Term</option>
                    <option value="Enterprise Unlimited Plan">Enterprise Unlimited Plan - ₦300,000/Term</option>
                  </select>
                </div>

                {/* Duration select */}
                <div className="space-y-1">
                  <label className="block text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Subscription Duration</label>
                  <select
                    value={selectedTerms}
                    onChange={(e) => setSelectedTerms(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
                  >
                    <option value="1">1 Term (90 Days)</option>
                    <option value="2">2 Terms (180 Days)</option>
                    <option value="3">Full Academic Year - 3 Terms (270 Days)</option>
                  </select>
                </div>

                {/* Pricing summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-450 font-bold">Terms Count:</span>
                    <span className="text-slate-700 font-extrabold">{selectedTerms} Term(s)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                    <span className="text-slate-450 font-bold">Days Issued:</span>
                    <span className="text-slate-700 font-extrabold font-mono">{parseInt(selectedTerms, 10) * 90} Days</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="text-xs text-slate-800 font-black uppercase">Total Due (NGN):</span>
                    <span className="text-xl font-black text-emerald-650 font-mono">
                      ₦{calculatedAmount.toLocaleString('en-US')}.00
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <button
                  type="button"
                  onClick={handleOnlinePayment}
                  disabled={processingPayment}
                  className="w-full flex items-center justify-center gap-1.5 py-3 bg-emerald-650 hover:bg-emerald-600 disabled:bg-slate-200 text-white rounded-xl text-xs font-black cursor-pointer shadow-sm transition-colors uppercase tracking-wider"
                >
                  {processingPayment ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Verifying Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Online via Flutterwave</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>

          {/* Payment Transactions Ledger Table */}
          <div className="lg:col-span-7">
            <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-black uppercase text-slate-450 tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-emerald-600" /> Transaction Billing History
              </h3>

              <div className="overflow-x-auto rounded-2xl border border-slate-200/60 shadow-sm mt-2">
                <table className="w-full border-collapse text-left text-xs font-semibold text-slate-600">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="p-4">Payment Date</th>
                      <th className="p-4">Channel / Method</th>
                      <th className="p-4 text-right">Amount (NGN)</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                          No transaction billing history logged yet.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/20 transition-colors">
                          <td className="p-4">
                            <span className="text-slate-800 font-extrabold block">
                              {new Date(p.paymentDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                              {new Date(p.paymentDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-4 text-slate-700">
                            {p.paymentMethod}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-slate-800">
                            ₦{p.amount.toLocaleString()}.00
                          </td>
                          <td className="p-4 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                              p.status === 'paid' 
                                ? 'bg-green-50 text-green-600 border-green-100'
                                : 'bg-amber-50 text-amber-600 border-amber-100'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          </div>

        </div>
      )}
    </div>
  );
}
