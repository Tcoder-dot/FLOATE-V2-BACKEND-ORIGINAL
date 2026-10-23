import React, { useState } from 'react';
import { ShieldCheck, Phone, CheckCircle, Camera, AlertCircle, Store, X, ArrowRight } from 'lucide-react';

interface MerchantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (merchant: any) => void;
}

const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
  'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara', 'FCT Abuja'
];

const INFORMAL_CATEGORIES = [
  'Tailoring & Fashion',
  'Provisions & Supermarket',
  'Auto Mechanics & Spare Parts',
  'POS & Mobile Money',
  'Building Materials',
  'Electronics & Appliances',
  'Hairdressing & Beauty',
  'Food & Catering',
  'Pharmacy & Chemists',
  'Furniture & Woodwork',
  'Welding & Metalwork',
  'Printing & Branding',
  'Phone & Gadget Repair',
  'Agribusiness & Agro-allied',
  'Shoes & Leathercraft',
  'Vulcanizing & Tyres',
  'Laundry & Dry Cleaning',
  'General Trading',
  'Hardware & Plumbing'
];

export function MerchantOnboardingModal({ isOpen, onClose, onSuccess }: MerchantOnboardingModalProps) {
  const [step, setStep] = useState<'PHONE' | 'OTP' | 'KYC'>('PHONE');
  const [phone, setPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [simulatedOtp, setSimulatedOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // KYC Form fields
  const [businessName, setBusinessName] = useState('');
  const [addressType, setAddressType] = useState<'Shop Address' | 'Home Address'>('Shop Address');
  const [addressDetail, setAddressDetail] = useState('');
  const [state, setState] = useState('Lagos');
  const [category, setCategory] = useState('Provisions & Supermarket');
  const [cacInfo, setCacInfo] = useState('');
  const [selfieBase64, setSelfieBase64] = useState('');

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || phone.length < 8) {
      setError('Please enter a valid WhatsApp phone number (e.g. +234...)');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone }),
      });
      const data = await res.json();
      if (data.success) {
        setSimulatedOtp(data.simulatedOtp || '1234');
        setStep('OTP');
      } else {
        setError(data.error || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err?.message || 'Network error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.length < 4) {
      setError('Please enter the 4-digit OTP code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp: otpInput }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.isRegistered && data.merchant) {
          onSuccess(data.merchant);
          onClose();
        } else {
          setStep('KYC');
        }
      } else {
        setError(data.error || 'Invalid OTP code');
      }
    } catch (err: any) {
      setError(err?.message || 'Verification error');
    } finally {
      setLoading(false);
    }
  };

  const handleKycSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName || !addressDetail || !state || !category) {
      setError('Please fill in all mandatory business details.');
      return;
    }
    if (!selfieBase64) {
      setError('Mandatory selfie profile photo capture required.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/merchant/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          phoneNumber: phone,
          addressType,
          addressDetail,
          state,
          category,
          profilePhoto: selfieBase64,
          cacInfo,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onSuccess(data.merchant);
        alert('Merchant registration submitted successfully! Awaiting Admin Vetting. You will receive a WhatsApp notification upon approval.');
        onClose();
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Registration network error');
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureSelfie = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 300, 300);
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Floate Vendor KYC Selfie', 150, 140);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(phone || '+234...', 150, 170);
      setSelfieBase64(canvas.toDataURL('image/jpeg'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Floate Merchant WhatsApp Portal</h2>
              <p className="text-[11px] text-slate-400">Secure WhatsApp-based Identity & KYC Onboarding</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl flex items-center gap-2 text-red-200 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {step === 'PHONE' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">WhatsApp Phone Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+234 803 000 0000"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">We will send a secure 4-digit verification code to your WhatsApp (Floate AI).</p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {loading ? 'Sending WhatsApp OTP...' : 'Send WhatsApp OTP Code'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'OTP' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
                <span className="font-semibold">Simulated WhatsApp OTP:</span> {simulatedOtp} (Sent to {phone})
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Enter 4-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="1234"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 px-4 text-center text-xl tracking-widest text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
              >
                {loading ? 'Verifying OTP...' : 'Verify Code & Proceed'}
                <CheckCircle className="w-4 h-4" />
              </button>
            </form>
          )}

          {step === 'KYC' && (
            <form onSubmit={handleKycSubmit} className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              <div className="p-3 bg-sky-950/40 border border-sky-800/60 rounded-xl text-xs text-sky-200">
                <span className="font-semibold">WhatsApp Verified!</span> Complete your business KYC profile below to join the Floate market directory.
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Chivora Ventures & Stores"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Address Type *</label>
                  <select
                    value={addressType}
                    onChange={(e: any) => setAddressType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="Shop Address">Shop Address</option>
                    <option value="Home Address">Home Address</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">State / Region *</label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  >
                    {NIGERIAN_STATES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Address Detail / Market Hub *</label>
                <input
                  type="text"
                  value={addressDetail}
                  onChange={(e) => setAddressDetail(e.target.value)}
                  placeholder="e.g. Shop 12, Main Market, Enugu"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Informal Sector Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                >
                  {INFORMAL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">CAC / Trade Union ID (Optional)</label>
                <input
                  type="text"
                  value={cacInfo}
                  onChange={(e) => setCacInfo(e.target.value)}
                  placeholder="e.g. BN-2024-884920 or Market Union ID"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Mandatory Selfie / Profile Photo Capture *</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleCaptureSelfie}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl flex items-center gap-2 border border-slate-700"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    {selfieBase64 ? 'Retake Selfie' : 'Capture Live Selfie'}
                  </button>
                  {selfieBase64 && (
                    <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Captured & Locked
                    </span>
                  )}
                </div>
                {selfieBase64 && (
                  <div className="mt-2 w-20 h-20 rounded-xl overflow-hidden border border-slate-800">
                    <img src={selfieBase64} alt="Selfie" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md mt-4"
              >
                {loading ? 'Submitting KYC...' : 'Submit Merchant KYC & Request Vetting'}
                <ShieldCheck className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
