'use client';

import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Zap,
  Lock,
  ArrowRight,
  RefreshCw,
  Sliders,
  DollarSign,
  AlertTriangle
} from 'lucide-react';

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '044', name: 'Access Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '035', name: 'Wema Bank' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '215', name: 'Unity Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '100033', name: 'PalmPay' },
  { code: '090405', name: 'PalmPay MFB' },
  { code: '100004', name: 'OPay Digital Services' },
  { code: '090325', name: 'OPay' },
  { code: '50515', name: 'Moniepoint MFB' },
  { code: '090129', name: 'Moniepoint Microfinance Bank' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '090267', name: 'Kuda Microfinance Bank' },
  { code: '566', name: 'VFD Microfinance Bank' },
  { code: '090110', name: 'VFD MFB' },
];

export default function PaymentSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [schoolData, setSchoolData] = useState<any>(null);
  const [bankList, setBankList] = useState<any[]>(NIGERIAN_BANKS);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [autoDetecting, setAutoDetecting] = useState(false);
  const [autoDetectedBankName, setAutoDetectedBankName] = useState('');

  // Form State
  const [bankCode, setBankCode] = useState('058');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedAccountName, setResolvedAccountName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [onlinePaymentsEnabled, setOnlinePaymentsEnabled] = useState(true);
  const [allowPartialPayments, setAllowPartialPayments] = useState(true);
  const [minPartialPaymentAmount, setMinPartialPaymentAmount] = useState(1000);

  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchBanksList();
    fetchPaymentSettings();
  }, []);

  const handleAutoDetectBank = async (accNum: string) => {
    const clean = accNum.replace(/[^0-9]/g, '');
    if (clean.length !== 10) return;

    setAutoDetecting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/banks/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber: clean, autoDetect: true }),
      });
      const json = await res.json();

      if (res.ok && json.success && json.data) {
        setBankCode(json.data.bankCode);
        setAutoDetectedBankName(json.data.bankName);
        setResolvedAccountName(json.data.accountName);
      }
    } catch (err) {
      console.warn('Auto-detect did not find matching bank');
    } finally {
      setAutoDetecting(false);
    }
  };

  const fetchBanksList = async () => {
    try {
      const res = await fetch('/api/banks');
      const json = await res.json();
      if (res.ok && json.data && Array.isArray(json.data) && json.data.length > 0) {
        setBankList(json.data);
      }
    } catch (e) {
      console.warn('Using default Nigerian banks list fallback');
    }
  };

  const fetchPaymentSettings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/schools/me/payment-account`);
      const data = await res.json();

      if (res.ok && data.success) {
        setSchoolData(data.data);
        setOnlinePaymentsEnabled(data.data.onlinePaymentsEnabled ?? true);
        setAllowPartialPayments(data.data.allowPartialPayments ?? true);
        setMinPartialPaymentAmount(data.data.minPartialPaymentAmount || 1000);
        setBusinessEmail(data.data.email || '');
        setBusinessPhone(data.data.phone || '');
        if (data.data.flutterwaveBankCode) setBankCode(data.data.flutterwaveBankCode);
      } else {
        setErrorMsg(data.error || 'Failed to load payment account settings');
      }
    } catch (err: any) {
      setErrorMsg('Failed to connect to server settings endpoint.');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveAccount = async () => {
    if (!accountNumber || accountNumber.length !== 10) {
      setErrorMsg('Please enter a valid 10-digit NUBAN bank account number.');
      return;
    }
    setResolving(true);
    setErrorMsg('');
    setResolvedAccountName('');

    try {
      const schoolId = schoolData?.id || 'me';
      const res = await fetch(`/api/schools/${schoolId}/payment-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountBank: bankCode,
          accountNumber,
          businessName: schoolData?.name,
          businessEmail,
          businessMobile: businessPhone,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setResolvedAccountName(data.data.accountName);
        setSuccessMsg(`🎉 Flutterwave Subaccount successfully activated for ${data.data.accountName}!`);
        setShowEditModal(false);
        fetchPaymentSettings();
      } else {
        setErrorMsg(data.error || 'Bank account verification or subaccount creation failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify account details');
    } finally {
      setResolving(false);
    }
  };

  const handleSavePolicySettings = async () => {
    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const schoolId = schoolData?.id || 'me';
      const res = await fetch(`/api/schools/${schoolId}/payment-account`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlinePaymentsEnabled,
          allowPartialPayments,
          minPartialPaymentAmount,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Payment policy options updated successfully!');
        fetchPaymentSettings();
      } else {
        setErrorMsg(data.error || 'Failed to update payment settings');
      }
    } catch (err: any) {
      setErrorMsg('Server connection error while saving payment settings.');
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Active & Connected
          </span>
        );
      case 'PENDING_VERIFICATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Verification
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <AlertCircle className="w-3.5 h-3.5" /> Not Configured
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-3 text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" /> Loading payment account settings...
        </div>
      </div>
    );
  }

  const isConfigured = schoolData?.flutterwaveStatus === 'ACTIVE' && schoolData?.flutterwaveSubaccountId;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> Flutterwave Subaccount Split System
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Online Payment & Settlement Setup</h1>
          <p className="text-sm text-slate-300 max-w-xl">
            Configure your school's bank settlement account. Parents pay online via Flutterwave, and funds automatically split directly into your school's bank account.
          </p>
        </div>

        <div>
          {getStatusBadge(schoolData?.flutterwaveStatus || 'NOT_CONNECTED')}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Cols: Bank Account Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Settlement Bank Account</h3>
                  <p className="text-xs text-slate-500 font-medium">Bank account registered to receive direct fee payouts</p>
                </div>
              </div>

              {isConfigured && (
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                >
                  Update Bank Details
                </button>
              )}
            </div>

            {isConfigured ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-indigo-100 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Name</span>
                      <p className="text-base font-extrabold text-slate-900">{schoolData.flutterwaveAccountName || 'School Account'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bank Code / Name</span>
                      <p className="text-base font-extrabold text-slate-900">
                        {NIGERIAN_BANKS.find(b => b.code === schoolData.flutterwaveBankCode)?.name || `Bank Code (${schoolData.flutterwaveBankCode})`}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Masked Account Number</span>
                      <p className="text-base font-extrabold font-mono text-slate-900">••••••••{schoolData.flutterwaveAccountNumberLast4 || '1234'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Flutterwave Subaccount ID</span>
                      <p className="text-xs font-bold font-mono text-indigo-700 bg-indigo-100/60 px-2.5 py-1 rounded-lg w-fit mt-1">
                        {schoolData.flutterwaveSubaccountId}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 p-3 rounded-xl">
                  <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Your subaccount is active. All online parent payments will split automatically into this bank account.</span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-md mx-auto">
                  <h4 className="text-lg font-extrabold text-slate-900">Online Payments Not Activated</h4>
                  <p className="text-xs text-slate-500 font-medium">
                    Connect your school's bank account to enable instant online fee payments for parents.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(true)}
                  className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs tracking-wider uppercase transition shadow-lg shadow-indigo-600/20 inline-flex items-center gap-2"
                >
                  Set Up Settlement Account <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Policy & Rules Options */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Payment Policy Controls</h3>
                <p className="text-xs text-slate-500 font-medium">Configure rules for online payment acceptance and partial fees</p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <label className="text-sm font-extrabold text-slate-800">Enable Online Fees Payment</label>
                  <p className="text-xs text-slate-500 font-medium">Allow parents & students to pay invoices online via Flutterwave</p>
                </div>
                <input
                  type="checkbox"
                  checked={onlinePaymentsEnabled}
                  onChange={(e) => setOnlinePaymentsEnabled(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="space-y-0.5">
                  <label className="text-sm font-extrabold text-slate-800">Allow Partial Fee Payments</label>
                  <p className="text-xs text-slate-500 font-medium">Parents can pay in installments up to total invoice balance</p>
                </div>
                <input
                  type="checkbox"
                  checked={allowPartialPayments}
                  onChange={(e) => setAllowPartialPayments(e.target.checked)}
                  className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                />
              </div>

              {allowPartialPayments && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">Minimum Allowed Partial Payment (₦)</label>
                  <input
                    type="number"
                    value={minPartialPaymentAmount}
                    onChange={(e) => setMinPartialPaymentAmount(Number(e.target.value) || 1000)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-bold font-mono text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleSavePolicySettings}
                disabled={saving}
                className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Policy Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Info & Fee Structure Card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center border border-indigo-500/30">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold">Automated Split Settlement</h3>
              <p className="text-xs text-indigo-200 leading-relaxed font-medium">
                When a parent pays an invoice online, Flutterwave processes the transaction and instantly routes funds into your school's registered bank account.
              </p>
            </div>

            <div className="border-t border-indigo-800/60 pt-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Server-side Secret Key Isolation
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Zero manual transfer delays
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> Automated digital receipt generation
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Modal for Setting / Updating Bank Account Details */}
      {showEditModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 space-y-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Connect Settlement Bank</h3>
                <p className="text-xs text-slate-500 font-medium">Enter your school's official bank account details</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">10-Digit NUBAN Account Number</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="Enter 10-digit account number..."
                    value={accountNumber}
                    onChange={(e) => {
                      const num = e.target.value.replace(/[^0-9]/g, '');
                      setAccountNumber(num);
                      if (num.length === 10) {
                        handleAutoDetectBank(num);
                      }
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-base font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                  {autoDetecting && (
                    <div className="absolute right-3 top-3.5 flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                      <RefreshCw className="w-4 h-4 animate-spin" /> Auto-detecting...
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">Select Bank</label>
                  <span className="text-[10px] text-slate-400 font-medium">Type to filter list</span>
                </div>
                <input
                  type="text"
                  placeholder="🔍 Search bank name (e.g. GTBank, PalmPay, Moniepoint)..."
                  value={bankSearchQuery}
                  onChange={(e) => setBankSearchQuery(e.target.value)}
                  className="w-full px-3.5 py-2 mb-2 rounded-lg border border-slate-200 text-xs font-bold focus:outline-none focus:border-indigo-600"
                />
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm font-extrabold text-slate-900 focus:outline-none focus:border-indigo-600"
                >
                  {bankList
                    .filter((b) => b.name.toLowerCase().includes(bankSearchQuery.toLowerCase()))
                    .map((b) => (
                      <option key={b.code} value={b.code}>
                        {b.name}
                      </option>
                    ))}
                </select>
              </div>

              {autoDetectedBankName && (
                <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs font-extrabold flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-600 shrink-0 animate-bounce" /> Auto-Detected Bank: {autoDetectedBankName}
                </div>
              )}

              {resolvedAccountName && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> Verified Account Name: {resolvedAccountName}
                </div>
              )}

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-extrabold text-xs uppercase tracking-wider hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={resolving || accountNumber.length !== 10}
                  className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                >
                  {resolving ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Verify & Activate Subaccount'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
