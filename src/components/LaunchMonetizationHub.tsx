import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  Rocket,
  CheckCircle2,
  Calendar,
  CreditCard,
  ExternalLink,
  Loader2,
  Clock,
  ArrowRight,
  TrendingUp,
  Award,
  QrCode,
  Share2,
  Users,
  Target,
  DollarSign,
  X,
  Eye
} from 'lucide-react';
import { FloateVerifiedCertificate } from './credentials/FloateVerifiedCertificate';
import { FloateBadgeCard } from './credentials/FloateBadgeCard';
import {
  FloateCredential,
  createCredentialForMerchant,
  SAMPLE_CREDENTIALS
} from '../bot/services/credentialService';

interface PricingTier {
  id: string;
  name: string;
  category: 'VERIFICATION' | 'BOOST' | 'SPONSORSHIP' | 'BRAND' | 'CREDITS';
  launchPriceNgn: number;
  standardPriceNgn: number;
  currentPriceNgn: number;
  billingCycle: 'ONE_TIME' | 'YEARLY' | 'WEEKLY' | 'PAYG';
  badgeTitle?: string;
  description: string;
  features: string[];
  isLaunchDiscountActive: boolean;
  savingsNgn: number;
  spotsLimit?: number;
}

interface GrowthGoal {
  targetGmvNgn: number;
  targetUsd: number;
  deadline: string;
  verifiedPlusTarget: number;
  boostsTarget: number;
  sponsoredTarget: number;
  brandTarget: number;
}

export const LaunchMonetizationHub: React.FC = () => {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [goal, setGoal] = useState<GrowthGoal | null>(null);
  const [isLaunchPeriod, setIsLaunchPeriod] = useState(true);
  const [deadline, setDeadline] = useState('2026-11-20T23:59:59.999Z');
  const [loading, setLoading] = useState(true);

  // Checkout Form State
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [merchantPhone, setMerchantPhone] = useState('');
  const [merchantName, setMerchantName] = useState('');
  const [merchantEmail, setMerchantEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Certificate Inspector & Base-Kit Preview State
  const [certPhone, setCertPhone] = useState('');
  const [certData, setCertData] = useState<any | null>(null);
  const [certLoading, setCertLoading] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [previewModalCredential, setPreviewModalCredential] = useState<FloateCredential | null>(null);
  const [previewViewTab, setPreviewViewTab] = useState<'certificate' | 'badge'>('certificate');

  useEffect(() => {
    fetchPricingTiers();
  }, []);

  const fetchPricingTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/pricing/tiers');
      const data = await res.json();
      if (data.success) {
        setTiers(data.tiers || []);
        setGoal(data.growthGoal || null);
        setIsLaunchPeriod(data.isLaunchPeriod ?? true);
        if (data.launchDeadline) setDeadline(data.launchDeadline);
      }
    } catch (err) {
      console.error('Failed to load pricing tiers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateFlutterwave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTier) return;
    if (!merchantPhone.trim()) {
      setCheckoutError('Please enter your WhatsApp phone number.');
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/v1/payments/flutterwave/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantPhone: merchantPhone.trim(),
          packageId: selectedTier.id,
          customerName: merchantName.trim() || undefined,
          customerEmail: merchantEmail.trim() || undefined,
          redirectUrl: window.location.origin + '/checkout/callback',
        }),
      });

      const data = await res.json();
      if (data.success && data.checkoutUrl) {
        // Redirect to Flutterwave Hosted Checkout
        window.location.href = data.checkoutUrl;
      } else {
        setCheckoutError(data.error || 'Failed to initiate Flutterwave checkout. Please try again.');
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Network error initiating checkout.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certPhone.trim()) return;

    setCertLoading(true);
    setCertError(null);
    setCertData(null);

    try {
      const cleanPhone = certPhone.replace(/\D/g, '');
      const res = await fetch(`/api/v1/merchant/${cleanPhone}/certificate`);
      const data = await res.json();
      if (data.success && data.certificate) {
        setCertData(data.certificate);
      } else {
        setCertError(data.error || 'No merchant certificate found for this phone number.');
      }
    } catch (err: any) {
      setCertError(err?.message || 'Failed to retrieve certificate.');
    } finally {
      setCertLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-16">
      {/* Launch Pricing Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-sky-500/10 border border-amber-500/30 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Primary Gateway: Flutterwave • Launch Pricing Active
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              FLOATE Africa Monetization Architecture
            </h2>
            <p className="text-sm sm:text-base text-slate-300 max-w-2xl leading-relaxed">
              Founding Merchant launch prices valid until <strong className="text-amber-400">20 Nov 2026</strong>.
              Combined with the 1-to-1 lead tracking engine (₦200 / customer lead) for verified trust, priority ranking, and measurable ROI.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto shrink-0">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center sm:text-left shadow-lg">
              <div className="text-xs text-slate-400 font-semibold uppercase">Launch Goal Target</div>
              <div className="text-2xl font-black text-emerald-400 font-mono">₦1,425,000</div>
              <div className="text-[11px] text-slate-400">≈ $1,048 by 20 Nov (Phase 1)</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center sm:text-left shadow-lg">
              <div className="text-xs text-slate-400 font-semibold uppercase">Payment Engine</div>
              <div className="text-xl font-bold text-amber-400 flex items-center justify-center sm:justify-start gap-1.5 mt-0.5">
                <CreditCard className="w-5 h-5 text-amber-400" />
                Flutterwave
              </div>
              <div className="text-[11px] text-emerald-400">Cards • Bank Transfer • USSD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Roadmap Breakdown Table (Getting to $1,000 by 20 Nov) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Launch Revenue Target Roadmap (Ends 20 Nov 2026)
            </h3>
            <p className="text-xs text-slate-400">
              6–7 Verified Plus upgrades daily. Unit margins average 91%–97% keeping cash-flow positive.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 w-fit">
            Unit Economics: 2.5x - 3.0x Return
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold text-slate-400">⭐ Verified Plus (160 units)</div>
            <div className="text-2xl font-bold text-amber-400 font-mono">₦800,000</div>
            <div className="text-xs text-slate-400">₦5,000 / year • 91% net margin</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold text-slate-400">🚀 Product Boosts (200 units)</div>
            <div className="text-2xl font-bold text-sky-400 font-mono">₦200,000</div>
            <div className="text-xs text-slate-400">₦1,000 / boost / wk • 96% margin</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold text-slate-400">👑 Category Spots (20 slot-wks)</div>
            <div className="text-2xl font-bold text-purple-400 font-mono">₦200,000</div>
            <div className="text-xs text-slate-400">₦10,000 / week • 97% margin</div>
          </div>
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-1">
            <div className="text-xs font-semibold text-slate-400">🌟 Brand Spots (3 weeks)</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">₦225,000</div>
            <div className="text-xs text-slate-400">₦75,000 / week • 94% margin</div>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-amber-400" />
            Active Monetization Tiers (Flutterwave Checkout)
          </h3>
          <span className="text-xs text-amber-400 font-medium bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full">
            ⚡ Launch Discount Active
          </span>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <span className="text-sm">Loading pricing tiers...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiers.map((tier) => {
              const isHighlight = tier.id === 'VERIFIED_PLUS';
              return (
                <div
                  key={tier.id}
                  className={`rounded-3xl p-6 flex flex-col justify-between transition-all relative ${
                    isHighlight
                      ? 'bg-gradient-to-b from-amber-950/50 via-slate-900 to-slate-950 border-2 border-amber-500/60 shadow-xl shadow-amber-500/10'
                      : 'bg-slate-900/90 border border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {isHighlight && (
                    <div className="absolute -top-3 left-6 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md">
                      ⭐ Recommended • Founding Merchant
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-lg font-bold text-white tracking-tight">{tier.name}</h4>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{tier.description}</p>
                      </div>
                      {tier.badgeTitle && (
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 whitespace-nowrap">
                          {tier.badgeTitle}
                        </span>
                      )}
                    </div>

                    {/* Price Block */}
                    <div className="pt-2 border-t border-slate-800/80">
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white font-mono">
                          {tier.currentPriceNgn === 0 ? 'FREE' : `₦${tier.currentPriceNgn.toLocaleString()}`}
                        </span>
                        {tier.isLaunchDiscountActive && tier.standardPriceNgn > tier.currentPriceNgn && (
                          <span className="text-xs text-slate-500 line-through font-mono">
                            ₦{tier.standardPriceNgn.toLocaleString()}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 lowercase">
                          /{tier.billingCycle === 'YEARLY' ? 'year' : tier.billingCycle === 'WEEKLY' ? 'week' : 'one-time'}
                        </span>
                      </div>
                      {tier.isLaunchDiscountActive && tier.savingsNgn > 0 && (
                        <div className="text-[11px] text-emerald-400 font-semibold mt-1">
                          🎉 Save ₦{tier.savingsNgn.toLocaleString()} before 20 Nov
                        </div>
                      )}
                    </div>

                    {/* Features List */}
                    <ul className="space-y-2 text-xs text-slate-300 pt-2">
                      {tier.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-2">
                    <button
                      onClick={() => {
                        setSelectedTier(tier);
                        setCheckoutError(null);
                      }}
                      className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                        isHighlight
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      }`}
                    >
                      <span>
                        {tier.currentPriceNgn === 0 ? 'Activate Free Badge' : `Pay ₦${tier.currentPriceNgn.toLocaleString()} via Flutterwave`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    {isHighlight && (
                      <button
                        onClick={() => {
                          setPreviewModalCredential(SAMPLE_CREDENTIALS[0]);
                        }}
                        className="w-full py-2 px-3 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-amber-300 font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5 border border-amber-500/30"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Preview Certificate & Badges (Base Kit)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Flutterwave Checkout Modal */}
      {selectedTier && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                  Flutterwave Secure Checkout
                </span>
                <h3 className="text-xl font-bold text-white mt-1.5">{selectedTier.name}</h3>
                <p className="text-xs text-slate-400">
                  Amount: <strong className="text-emerald-400 font-mono text-sm">₦{selectedTier.currentPriceNgn.toLocaleString()}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedTier(null)}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {checkoutError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                {checkoutError}
              </div>
            )}

            <form onSubmit={handleInitiateFlutterwave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  WhatsApp Phone Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. 08031234567 or +234..."
                  value={merchantPhone}
                  onChange={(e) => setMerchantPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                  required
                />
                <span className="text-[11px] text-slate-500">Your store will be upgraded automatically upon payment confirmation.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Business / Owner Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Makky Luxe Boutique"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email Address for Receipt (Optional)
                </label>
                <input
                  type="email"
                  placeholder="merchant@example.com"
                  value={merchantEmail}
                  onChange={(e) => setMerchantEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Redirecting to Flutterwave...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Continue to Flutterwave (₦{selectedTier.currentPriceNgn.toLocaleString()})
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Protected by 256-bit bank encryption via Flutterwave</span>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dual Harmonization Module: 1-to-1 Lead Engine & Credits */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-emerald-400" />
              Harmonized Dual Model: The 1-to-1 Lead Engine
            </h3>
            <p className="text-xs text-slate-400">
              Why both models work together: Upfront tiers sell trust & status; lead credits measure real-time ROI.
            </p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-sky-950 text-sky-400 border border-sky-800 w-fit">
            ₦200 / Verified Customer Lead
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              1
            </div>
            <h4 className="text-sm font-bold text-white">5 Free Starter Credits</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every merchant receives 5 free customer lead credits (₦1,000 value) upon registering their store. Traders test without risk.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              2
            </div>
            <h4 className="text-sm font-bold text-white">48-Hour Duplicate Protection</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Repeat inquiries from the same shopper within 48 hours are 100% free. Merchants only pay for unique, fresh buyer leads.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-5 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
              3
            </div>
            <h4 className="text-sm font-bold text-white">Verified Plus Search Priority</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Subscribers to Verified Plus (+25 score) get top placement in buyer search results, generating 3x to 5x more lead inquiries automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Manage Business Hub: Instant Certificate PNG Download */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800">
              ✓ Verified Store Management Hub
            </span>
            <h3 className="text-2xl font-black text-white tracking-tight mt-2 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-400" />
              Download Official Store Certificate (PNG)
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              All registered Floate stores are 100% verified automatically with zero verification fees. Enter your WhatsApp phone number or business name below to instantly download your official certificate PNG with your exact business details.
            </p>
          </div>
        </div>

        <form onSubmit={handleCheckCertificate} className="flex flex-col sm:flex-row gap-3 pt-2">
          <input
            type="text"
            placeholder="Enter your WhatsApp phone (e.g. 07065599116 or richbuild)"
            value={certPhone}
            onChange={(e) => setCertPhone(e.target.value)}
            className="flex-1 px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-400 shadow-inner"
            required
          />
          <button
            type="submit"
            disabled={certLoading}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-amber-500/20 active:scale-95"
          >
            {certLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Download Certificate (PNG)
          </button>
        </form>

        {certError && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs font-medium">
            {certError}
          </div>
        )}

        {certData && (
          <div className="p-6 rounded-2xl bg-slate-950 border-2 border-emerald-500/40 space-y-5 animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800">
                  ✓ Verified Store Active
                </span>
                <h4 className="text-xl font-black text-white mt-2">{certData.merchantName}</h4>
                <div className="text-xs text-slate-400 font-mono mt-0.5">
                  Store: {certData.merchantName} • {certData.city || 'Lagos'}, {certData.state || 'Nigeria'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/credentials/${certData.certificateId || certPhone || 'store'}/download/certificate`}
                  download
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-md"
                >
                  <Award className="w-4 h-4" />
                  Download PNG Certificate ASAP
                </a>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3 border-t border-slate-800">
              <div>
                <span className="text-slate-500 block">Category</span>
                <span className="text-slate-200 font-semibold">{certData.category || 'General'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status</span>
                <span className="text-emerald-400 font-semibold">Verified Active ✓</span>
              </div>
              <div>
                <span className="text-slate-500 block">Storefront URL</span>
                <a href={`/vendor/${encodeURIComponent(certData.merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '-'))}`} className="text-amber-400 hover:underline font-mono truncate block">
                  floate.xyz/vendor/{certData.merchantName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                </a>
              </div>
              <div>
                <span className="text-slate-500 block">Preview</span>
                <button
                  type="button"
                  onClick={() => {
                    const loc = `${certData.city || ''}, ${certData.state || 'Nigeria'}`.trim();
                    const cred = createCredentialForMerchant({
                      merchantId: certPhone || 'store',
                      name: certData.merchantName,
                      biz: certData.merchantName,
                      loc: loc,
                      phone: certPhone || '08031112222',
                      isPlus: true,
                    });
                    setPreviewModalCredential(cred);
                  }}
                  className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Preview Base Kit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floate Base Kit Certificate & Badge Preview Modal */}
      {previewModalCredential && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 relative shadow-2xl my-6 max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setPreviewModalCredential(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-2 rounded-full bg-slate-800 transition-colors z-20"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2.5 py-0.5 rounded-full border border-amber-800">
                  Base Kit v2 Asset Preview
                </span>
                <span className="font-mono text-emerald-300 text-xs bg-slate-950 px-2 py-0.5 rounded border border-emerald-800">
                  {previewModalCredential.fid}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                {previewModalCredential.biz} • {previewModalCredential.city}
              </h3>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <button
                onClick={() => setPreviewViewTab('certificate')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewViewTab === 'certificate'
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                1080×1920 Story Certificate
              </button>
              <button
                onClick={() => setPreviewViewTab('badge')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  previewViewTab === 'badge'
                    ? 'bg-amber-400 text-emerald-950 shadow-md font-black'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                1080×1080 Badge & Scalloped Seal
              </button>
            </div>

            <div className="py-2 flex justify-center">
              {previewViewTab === 'certificate' ? (
                <FloateVerifiedCertificate credential={previewModalCredential} scale={0.7} />
              ) : (
                <FloateBadgeCard credential={previewModalCredential} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
