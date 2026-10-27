import React, { useState, useEffect } from 'react';
import {
  Store,
  ShieldCheck,
  Sparkles,
  CheckCircle,
  Copy,
  ExternalLink,
  MessageCircle,
  ArrowRight,
  Upload,
  Camera,
  MapPin,
  Tag,
  Phone,
  User,
  ShoppingBag,
  Zap,
  Gift
} from 'lucide-react';

const NIGERIAN_STATES = [
  'Lagos', 'Abuja (FCT)', 'Anambra', 'Enugu', 'Kano', 'Oyo', 'Rivers', 'Abia',
  'Delta', 'Ogun', 'Kaduna', 'Edo', 'Imo', 'Akwa Ibom', 'Ondo', 'Plateau',
  'Osun', 'Kwara', 'Ekiti', 'Bayelsa', 'Cross River', 'Benue', 'Bauchi',
  'Borno', 'Ebonyi', 'Gombe', 'Jigawa', 'Katsina', 'Kebbi', 'Kogi',
  'Nasarawa', 'Niger', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

const POPULAR_CATEGORIES = [
  'Phones, Gadgets & Accessories',
  'Shoes, Footwear & Leathercraft',
  'Fashion, Tailoring & Clothing',
  'Solar Panels, Inverters & Energy',
  'Electronics & Home Appliances',
  'Auto Spare Parts & Mechanics',
  'Building Materials & Hardware',
  'Provisions & Supermarket',
  'Hair, Beauty & Cosmetics',
  'Food, Catering & Groceries',
  'Furniture & Home Decor',
  'Computers, Laptops & Tech Repair',
  'Pharmacy & Health',
  'Printing, Branding & Gift Items',
  'General Commerce & Trading'
];

const POPULAR_MARKET_HUBS = [
  'Main Market, Onitsha',
  'Computer Village, Ikeja, Lagos',
  'Balogun Market, Lagos Island',
  'Alaba International Market, Lagos',
  'Trade Fair Complex, Lagos',
  'Ariaria International Market, Aba',
  'Kantin Kwari Market, Kano',
  'Wuse Market, Abuja',
  'Ogbete Main Market, Enugu',
  'Bodija Market, Ibadan',
  'Mile 12 Market, Lagos',
  'Online / Home-Based Delivery'
];

export function StorefrontRegistration() {
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [selectedState, setSelectedState] = useState('Lagos');
  const [city, setCity] = useState('');
  const [marketHub, setMarketHub] = useState('Computer Village, Ikeja, Lagos');
  const [category, setCategory] = useState(POPULAR_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [shopAddress, setShopAddress] = useState('');

  // Initial Product (Quick-Add)
  const [includeProduct, setIncludeProduct] = useState(true);
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [productImageBase64, setProductImageBase64] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Submission State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{
    storeUrl: string;
    cleanPhone: string;
    businessName: string;
    creditsAwarded: number;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-fill from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPhone = params.get('phone') || '';
    const urlName = params.get('name') || '';
    const urlBiz = params.get('biz') || params.get('business') || '';
    const urlCat = params.get('cat') || params.get('category') || '';
    const urlLoc = params.get('loc') || params.get('location') || '';

    if (urlPhone) {
      const clean = urlPhone.replace(/\D/g, '');
      setPhone(clean);
    }
    if (urlName && urlName !== 'Customer') setOwnerName(urlName);
    if (urlBiz) setBusinessName(urlBiz);
    if (urlCat) {
      const match = POPULAR_CATEGORIES.find((c) => c.toLowerCase().includes(urlCat.toLowerCase()));
      if (match) setCategory(match);
      else setCustomCategory(urlCat);
    }
    if (urlLoc) {
      setCity(urlLoc);
      const matchedState = NIGERIAN_STATES.find((s) => urlLoc.toLowerCase().includes(s.toLowerCase()));
      if (matchedState) setSelectedState(matchedState);
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Image file must be under 5MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setProductImageBase64(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const clean = phone.replace(/\D/g, '');
    if (!clean || clean.length < 8) {
      setError('Please enter a valid WhatsApp phone number.');
      return;
    }
    if (!businessName.trim()) {
      setError('Please provide your Store / Business name.');
      return;
    }
    if (!ownerName.trim()) {
      setError('Please provide your Full Legal Name.');
      return;
    }

    setLoading(true);

    try {
      const payload: any = {
        phone: clean,
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        state: selectedState,
        city: city.trim() || selectedState,
        location: `${city.trim() || selectedState}, ${selectedState}`,
        category: customCategory.trim() || category,
        marketHub: marketHub || shopAddress || 'Main Market',
        shopAddress: shopAddress.trim() || `${marketHub}, ${selectedState}`,
      };

      if (includeProduct && productName.trim()) {
        payload.initialProduct = {
          product: productName.trim(),
          price: productPrice.trim() || '₦25,000',
          category: customCategory.trim() || category,
          description: productDescription.trim() || 'Verified quality product from stock',
          photoBase64: productImageBase64 || undefined,
        };
      }

      const res = await fetch('/api/register/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete registration.');
      }

      const canonicalPhone = clean.startsWith('0') ? `234${clean.slice(1)}` : clean;
      const storeUrl = data.storeUrl || `${window.location.origin}/vendor/${canonicalPhone}`;

      setSuccessData({
        storeUrl,
        cleanPhone: canonicalPhone,
        businessName: businessName.trim(),
        creditsAwarded: 25,
      });
    } catch (err: any) {
      setError(err?.message || 'Network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyStoreLink = () => {
    if (!successData?.storeUrl) return;
    navigator.clipboard.writeText(successData.storeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (successData) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-emerald-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Celebratory Icon & Header */}
          <div className="text-center space-y-3 relative z-10">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10 animate-bounce">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Verified Storefront Activated
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Congratulations, {successData.businessName}!
            </h1>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Your official business storefront is live on Floate. Buyers across Nigeria can now discover your products and chat with you directly on WhatsApp.
            </p>
          </div>

          {/* 25 Credits Welcome Gift Box */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-300 flex items-center gap-1.5">
                  +25 Free Floate Credits Credited!
                </h4>
                <p className="text-xs text-slate-400">
                  That covers your first <strong>5 connected buyers</strong> directly to your WhatsApp. Zero commission!
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-black bg-amber-400 text-slate-950 px-2.5 py-1 rounded-md shrink-0">
              25 CREDITS
            </span>
          </div>

          {/* Live Storefront URL Card */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Your Storefront Web Link
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-2xl p-2 sm:p-2.5">
              <div className="px-2 py-1 text-xs font-mono text-emerald-400 truncate flex-1">
                {successData.storeUrl}
              </div>
              <button
                onClick={copyStoreLink}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition-all flex items-center gap-1.5 shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedLink ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Share this link on your WhatsApp Status, Instagram bio, and business card.
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <a
              href={successData.storeUrl}
              className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Store className="w-4 h-4" />
              View My Live Storefront
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hello! My store is now live on Floate. Check our verified catalog here: ${successData.storeUrl}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm border border-slate-700 flex items-center justify-center gap-2 transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              Share on WhatsApp
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Intro Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider">
            <Store className="w-3.5 h-3.5" />
            Floate for Businesses
          </div>

          <div className="max-w-2xl space-y-2">
            <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Get Your Verified Storefront & Connect with Buyers on WhatsApp
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Register your business on Floate in 2 minutes. Receive direct buyer inquiries on WhatsApp, showcase your catalogue with zero commission, and get 25 Free Floate Credits to start.
            </p>
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-800/80">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Verified Badge</h4>
                <p className="text-[11px] text-slate-400">Trusted business profile</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">0% Commission</h4>
                <p className="text-[11px] text-slate-400">Keep 100% of sales</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Gift className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">25 Free Credits</h4>
                <p className="text-[11px] text-slate-400">5 customer connections</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <ShoppingBag className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-200">Web Catalogue</h4>
                <p className="text-[11px] text-slate-400">floate.xyz/vendor/you</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <span className="font-bold">Error:</span> {error}
          </div>
        )}

        {/* Section 1: Business Profile */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
            <Store className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Step 1: Store & Owner Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Business / Store Name *
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Divine Footwear & Bags"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Owner Full Name (Legal Name) *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Emeka Stanley Okafor"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                WhatsApp Phone Number *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 08012345678 or 2348012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Buyers will be linked directly to this WhatsApp number.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Category / Trade *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                {POPULAR_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                State *
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              >
                {NIGERIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                City / Town / LGA
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Ikeja, Onitsha, Wuse, Ibadan"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Market Hub or Shop Address
              </label>
              <input
                type="text"
                placeholder="e.g. Line 4, Stall 22, Main Market, Onitsha (or Street Address)"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 2: First Product Quick-Add (Visual & Instant) */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-400" />
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Step 2: Add Your First Product</h2>
                <p className="text-xs text-slate-400">Put your first item live so buyers can see and buy right away</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <input
                type="checkbox"
                checked={includeProduct}
                onChange={(e) => setIncludeProduct(e.target.checked)}
                className="rounded text-emerald-500 focus:ring-emerald-400 bg-slate-950 border-slate-700"
              />
              Add First Item Now
            </label>
          </div>

          {includeProduct ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Product Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Men Italian Leather Slippers (Size 42-45)"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Price in Naira (₦) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 25,000 or ₦25,000"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                    Description & Specs
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. 100% pure leather, durable sole, available in Black and Brown. Fast same-day waybill."
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Image Upload Area */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Product Photo (Camera or Gallery)
                </label>
                <div className="bg-slate-950 border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-2xl p-6 text-center relative overflow-hidden transition-all flex flex-col items-center justify-center min-h-[220px]">
                  {imagePreview ? (
                    <div className="relative w-full aspect-video rounded-xl overflow-hidden group">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setProductImageBase64('');
                        }}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/90 text-rose-400 hover:bg-slate-900 text-xs font-bold transition-all"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-emerald-400">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-200">Upload Product Image</span>
                        <p className="text-[11px] text-slate-500">Tap to snap with phone camera or pick from gallery</p>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 cursor-pointer transition-colors">
                        <Camera className="w-3.5 h-3.5" />
                        Choose Photo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              You can add products anytime later from your live storefront or WhatsApp.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-slate-950 font-black text-base shadow-xl shadow-amber-500/20 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Registering Store & Crediting 25 Leads...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 fill-slate-950" />
                Activate Storefront & Claim 25 Free Credits
                <ArrowRight className="w-5 h-5" />
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
