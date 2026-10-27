import React, { useState, useEffect } from 'react';
import { Megaphone, CreditCard, Sparkles, CheckCircle2, AlertCircle, Loader2, Image, Layers, ArrowRight, ShieldCheck, Eye, ExternalLink } from 'lucide-react';

interface AdPackage {
  id: 'HERO_BANNER' | 'CATEGORY_SPOTLIGHT' | 'SEARCH_BOOST';
  title: string;
  description: string;
  priceNaira: number;
  durationDays: number;
  badge: string;
}

const PACKAGES: AdPackage[] = [
  {
    id: 'HERO_BANNER',
    title: 'Hero Ad Banner Carousel',
    description: 'Featured top banner carousel placement on floate.xyz home page for maximum daily shopper views.',
    priceNaira: 10000,
    durationDays: 7,
    badge: '👑 Most Popular',
  },
  {
    id: 'CATEGORY_SPOTLIGHT',
    title: 'Category Spotlight Rank',
    description: 'Top spotlight placement inside your target market category section.',
    priceNaira: 5000,
    durationDays: 7,
    badge: '🎯 Targeted',
  },
  {
    id: 'SEARCH_BOOST',
    title: 'Search Priority Rank #1',
    description: 'Guaranteed top #1 search rank boost when buyers search for your keywords across Nigeria.',
    priceNaira: 3000,
    durationDays: 7,
    badge: '⚡ High Intent',
  },
];

export const SponsorProductPortal: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [bizName, setBizName] = useState('');
  const [selectedPkg, setSelectedPkg] = useState<AdPackage['id']>('HERO_BANNER');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [offerText, setOfferText] = useState('20% Off Limited Stock');
  const [imageUrl, setImageUrl] = useState('');
  const [targetCategory, setTargetCategory] = useState('Phones & Gadgets');
  const [targetLocation, setTargetLocation] = useState('Lagos');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdAd, setCreatedAd] = useState<any | null>(null);

  // Active Ads Carousel Feed State
  const [activeAds, setActiveAds] = useState<any[]>([]);

  useEffect(() => {
    fetchActiveAds();
  }, []);

  const fetchActiveAds = async () => {
    try {
      const res = await fetch('/api/ads/active');
      const data = await res.json();
      if (data.success) {
        setActiveAds(data.ads || []);
      }
    } catch (e) {
      console.warn('Failed to fetch active ads:', e);
    }
  };

  const handleCreateAd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !headline) {
      setErrorMsg('Please enter your WhatsApp phone number and ad headline.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantPhone: phone,
          merchantName: bizName || 'Verified Merchant',
          packageType: selectedPkg,
          headline,
          description,
          offerText,
          rawImageUrl: imageUrl,
          targetCategory,
          targetLocation,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedAd(data);
      } else {
        setErrorMsg(data.error || 'Failed to initialize Bachs.io ad campaign.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error creating ad campaign.');
    } finally {
      setLoading(false);
    }
  };

  const selectedPkgDetails = PACKAGES.find((p) => p.id === selectedPkg);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/20 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center space-x-2 bg-amber-500/15 border border-amber-500/30 text-amber-400 px-3 py-1 rounded-full text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sponsor Products & Run Ads with Bachs.io</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            FLOATE Ad Banner & Product Sponsorship Portal
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl">
            Promote your store across floate.xyz home page, category spotlights, and top search queries across Nigeria. Securely pay via Bachs.io and get instant WhatsApp Super Admin verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-400" />
            Create Sponsored Ad Campaign
          </h3>

          <form onSubmit={handleCreateAd} className="space-y-5">
            {/* Step 1: Merchant Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">WhatsApp Phone Number *</label>
                <input
                  type="tel"
                  placeholder="e.g. 08031234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Business / Store Name</label>
                <input
                  type="text"
                  placeholder="e.g. Divine Footwear"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Step 2: Package Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Select Ad Campaign Package *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPkg === pkg.id;
                  return (
                    <div
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg.id)}
                      className={`cursor-pointer rounded-xl p-3.5 border transition-all space-y-2 relative ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {pkg.badge}
                        </span>
                        <input
                          type="radio"
                          name="adPkg"
                          checked={isSelected}
                          onChange={() => setSelectedPkg(pkg.id)}
                          className="accent-amber-500"
                        />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-200">{pkg.title}</h4>
                        <p className="text-[11px] text-amber-400 font-extrabold mt-0.5">
                          ₦{pkg.priceNaira.toLocaleString()} / {pkg.durationDays} Days
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Creative Copy & Banner */}
            <div className="space-y-4 pt-2 border-t border-slate-800/80">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Ad Headline / Catchphrase *</label>
                <input
                  type="text"
                  placeholder="e.g. 🔥 Brand New iPhone 13 Pro Max - 20% Off Today!"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Offer Badge Text</label>
                  <input
                    type="text"
                    placeholder="e.g. 20% Off Limited Stock"
                    value={offerText}
                    onChange={(e) => setOfferText(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Banner Image URL (Optional)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Target Category</label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  >
                    <option value="Phones & Gadgets">Phones & Gadgets</option>
                    <option value="Fashion & Shoes">Fashion & Shoes</option>
                    <option value="Electronics & Appliances">Electronics & Appliances</option>
                    <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
                    <option value="Provisions & Foodstuff">Provisions & Foodstuff</option>
                    <option value="General Commerce">General Commerce</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Target Location / Market</label>
                  <input
                    type="text"
                    placeholder="e.g. Lagos, Computer Village"
                    value={targetLocation}
                    onChange={(e) => setTargetLocation(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center space-x-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Initializing Bachs.io Payment...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4" />
                  <span>Pay ₦{selectedPkgDetails?.priceNaira.toLocaleString()} via Bachs.io</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Created Ad Checkout Action Banner */}
          {createdAd && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                <span>Ad Campaign Created! Complete Payment Below:</span>
              </div>

              <p className="text-xs text-slate-300">
                Ref: <span className="font-mono text-emerald-400">{createdAd.reference}</span> &bull; Amount:{' '}
                <strong>₦{createdAd.amountNaira?.toLocaleString()}</strong>
              </p>

              <a
                href={createdAd.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs"
              >
                <span>💳 Open Bachs.io Secure Payment Page</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Live Banner Preview & Active Ads Feed */}
        <div className="space-y-6">
          {/* Ad Live Preview Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-amber-400" />
              Live Ad Banner Preview
            </h4>

            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border border-amber-500/30 rounded-2xl p-4 space-y-3 relative overflow-hidden shadow-lg">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  SPONSORED
                </span>
                <span className="text-[10px] text-slate-400 font-medium">{targetLocation}</span>
              </div>

              {imageUrl && (
                <img
                  src={imageUrl}
                  alt="Banner"
                  className="w-full h-32 object-cover rounded-xl border border-slate-800"
                />
              )}

              <div className="space-y-1">
                <h5 className="text-sm font-bold text-white line-clamp-2">
                  {headline || 'Your Catchy Ad Headline Displays Here'}
                </h5>
                <p className="text-xs text-amber-400 font-semibold">{offerText}</p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>By {bizName || 'Your Store'}</span>
                <span className="text-emerald-400 font-medium">✓ Verified Merchant</span>
              </div>
            </div>
          </div>

          {/* Active Approved Ads on floate.xyz */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                Active Banners on floate.xyz ({activeAds.length})
              </h4>
              <button
                onClick={fetchActiveAds}
                className="text-[10px] text-sky-400 hover:text-sky-300 font-medium"
              >
                Refresh
              </button>
            </div>

            {activeAds.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                No active banner campaigns running. Be the first merchant to sponsor your store!
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {activeAds.map((ad) => (
                  <div key={ad.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{ad.headline}</span>
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">By {ad.merchantName} (+{ad.merchantPhone})</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
