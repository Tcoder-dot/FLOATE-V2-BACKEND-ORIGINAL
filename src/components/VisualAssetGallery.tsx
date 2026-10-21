import React, { useState } from 'react';
import { Sparkles, CheckCircle2, Share2, Store, Receipt, ArrowRight, UserCheck, Lock, ArrowUpRight } from 'lucide-react';

export function VisualAssetGallery() {
  const [activeTab, setActiveTab] = useState<'buyer_receipt' | 'vendor_receipt' | 'merchant_card' | 'buyer_welcome'>('buyer_receipt');
  
  // Dynamic fields
  const [buyerName, setBuyerName] = useState('Emeka Chukwu');
  const [vendorName, setVendorName] = useState('Chinedu Luxury Footwear');
  const [marketLocation, setMarketLocation] = useState('Main Market, Onitsha');
  const [productName, setProductName] = useState('Nike Air Jordan 4 Retro (Size 43)');
  const [price, setPrice] = useState('₦85,000');
  const [orderRef, setOrderRef] = useState('FL-89234-NG');
  const [deliveryCode, setDeliveryCode] = useState('4912');
  const [buyerSlogan, setBuyerSlogan] = useState('Shopping without fear of fake alert or vendor story.');

  const logoUrl = 'https://i.postimg.cc/q7TQykYc/20260815-173644.png';
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent('https://wa.me/2348123456789?text=Hi%20Floate,%20I%20want%20to%20shop%20safely')}&color=581c87&bgcolor=ffffff`;

  return (
    <div className="space-y-6" id="visual-assets-preview-panel">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-purple-900/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                V1 Visual Asset Engine
              </span>
              <span className="text-xs text-slate-400 font-mono">Secured by FLOATE AFRICA</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Floate Luxury Invoices & Social Viral Cards
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
              Clean white canvas with subtle purple micro-patterns, solid high-contrast purple and black panels, bold typography, and zero glassmorphism.
            </p>
          </div>

          {/* Asset Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-black/60 p-1.5 rounded-xl border border-slate-800 shrink-0">
            <button
              onClick={() => setActiveTab('buyer_receipt')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'buyer_receipt'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              Buyer Receipt
            </button>

            <button
              onClick={() => setActiveTab('vendor_receipt')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'vendor_receipt'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Vendor Order Slip
            </button>

            <button
              onClick={() => setActiveTab('merchant_card')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'merchant_card'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              Merchant Shop Card
            </button>

            <button
              onClick={() => setActiveTab('buyer_welcome')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'buyer_welcome'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              Buyer Viral Card
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Dynamic Controls Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Live Data Simulator
              </h3>
              <span className="text-[11px] text-purple-400 font-mono">Real-Time State</span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Product Title</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Agreed Price (₦)</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Order Ref ID</label>
                  <input
                    type="text"
                    value={orderRef}
                    onChange={(e) => setOrderRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Verified Merchant Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Market Location / Hub</label>
                <input
                  type="text"
                  value={marketLocation}
                  onChange={(e) => setMarketLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Buyer Name</label>
                  <input
                    type="text"
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Vendor Secret PIN</label>
                  <input
                    type="text"
                    value={deliveryCode}
                    onChange={(e) => setDeliveryCode(e.target.value)}
                    maxLength={4}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-purple-400 focus:outline-none focus:border-purple-500 font-mono font-bold tracking-widest text-center"
                  />
                </div>
              </div>

              {activeTab === 'buyer_welcome' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Buyer Catchy Slogan</label>
                  <input
                    type="text"
                    value={buyerSlogan}
                    onChange={(e) => setBuyerSlogan(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}
            </div>

            {/* Architecture Highlights Note */}
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-white">
                <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                Refined Design Parameters
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                <li>Crisp white background with subtle purple micro-grid geometric watermark.</li>
                <li>Solid bold purple and deep black panels (no glassmorphism).</li>
                <li>Pure high-contrast white and dark typography.</li>
                <li>Official Floate Africa logo in header.</li>
                <li>Secret Release PIN shown exclusively on Vendor Order Slip.</li>
                <li>Official <strong>"Secured by FLOATE AFRICA"</strong> stamp.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Visual Render Canvas */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center">
          {/* TAB 1: BUYER RECEIPT */}
          {activeTab === 'buyer_receipt' && (
            <div className="w-full max-w-md bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900 relative overflow-hidden">
              {/* Subtle Purple Background Pattern (Zero Glassmorphism) */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(#7e22ce 1.5px, transparent 1.5px), radial-gradient(#581c87 1.5px, #ffffff 1.5px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              />
              <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full border-4 border-purple-200/50 pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-36 h-36 rounded-full border-4 border-purple-200/50 pointer-events-none" />

              {/* Header with Official Logo */}
              <div className="relative z-10 flex items-center justify-between border-b-2 border-purple-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Floate Logo"
                    referrerPolicy="no-referrer"
                    className="h-10 w-auto object-contain"
                  />
                  <div>
                    <h4 className="font-black text-sm text-purple-950 tracking-wider">FLOATE SAFEPAY</h4>
                    <p className="text-[10px] text-purple-800 font-bold uppercase tracking-widest font-mono">Buyer Escrow Receipt</p>
                  </div>
                </div>
                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-full text-[10px] font-black tracking-wide">
                  FUNDS SECURED
                </div>
              </div>

              {/* Central Solid Amount Box (Solid Purple & Solid Black) */}
              <div className="relative z-10 bg-purple-900 rounded-2xl p-5 text-center text-white shadow-md border-b-4 border-purple-950">
                <span className="text-[11px] uppercase tracking-widest font-mono text-purple-200 font-bold block mb-1">
                  Total Held in SafePay Escrow
                </span>
                <div className="text-4xl font-black text-white font-mono tracking-tight my-1">
                  {price}
                </div>
                <div className="text-xs text-purple-200 font-mono mt-1">
                  Order Ref: <span className="text-white font-bold">{orderRef}</span>
                </div>
              </div>

              {/* Transaction Specs (Solid Off-Black Panel) */}
              <div className="relative z-10 bg-slate-950 rounded-2xl p-4 space-y-2.5 text-xs text-white border border-slate-800 shadow-md">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Item</span>
                  <span className="text-white font-bold text-right truncate max-w-[200px]">{productName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Seller</span>
                  <span className="text-purple-300 font-bold">{vendorName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Market Depot</span>
                  <span className="text-slate-100 font-medium">{marketLocation}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Buyer</span>
                  <span className="text-slate-100 font-medium">{buyerName}</span>
                </div>
              </div>

              {/* Protection Notice Box (Solid White with Purple Border) */}
              <div className="relative z-10 bg-purple-50 border-2 border-purple-200 rounded-2xl p-3.5 text-center">
                <div className="text-xs font-black text-purple-950 mb-0.5">
                  100% Escrow Protection
                </div>
                <p className="text-[11px] text-purple-900 font-medium leading-snug">
                  The seller will only receive funds after you physically inspect the item and give them your release code upon delivery.
                </p>
              </div>

              {/* Footer Stamp */}
              <div className="relative z-10 flex items-center justify-between border-t-2 border-purple-100 pt-3.5 text-[10px] text-slate-500 font-mono">
                <span className="font-bold text-slate-800">Secured by FLOATE AFRICA</span>
                <span className="text-purple-900 font-black">floate.xyz</span>
              </div>
            </div>
          )}

          {/* TAB 2: VENDOR ORDER & DISPATCH SLIP (Includes Secret Delivery PIN) */}
          {activeTab === 'vendor_receipt' && (
            <div className="w-full max-w-md bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-2xl space-y-5 text-slate-900 relative overflow-hidden">
              {/* Subtle Purple Pattern */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(#7e22ce 1.5px, transparent 1.5px), radial-gradient(#581c87 1.5px, #ffffff 1.5px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              />
              <div className="absolute -top-16 -right-16 w-36 h-36 rounded-full border-4 border-purple-200/50 pointer-events-none" />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b-2 border-purple-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Floate Logo"
                    referrerPolicy="no-referrer"
                    className="h-10 w-auto object-contain"
                  />
                  <div>
                    <h4 className="font-black text-sm text-purple-950 tracking-wider">FLOATE DISPATCH SLIP</h4>
                    <p className="text-[10px] text-purple-800 font-bold uppercase tracking-widest font-mono">Merchant Payout Guarantee</p>
                  </div>
                </div>
                <div className="bg-purple-100 text-purple-900 border border-purple-300 px-3 py-1 rounded-full text-[10px] font-black tracking-wide">
                  PAYOUT LOCKED
                </div>
              </div>

              {/* Solid Purple Amount Box */}
              <div className="relative z-10 bg-purple-900 rounded-2xl p-5 text-center text-white shadow-md border-b-4 border-purple-950">
                <span className="text-[11px] uppercase tracking-widest font-mono text-purple-200 font-bold block mb-1">
                  Guaranteed Settlement Amount
                </span>
                <div className="text-4xl font-black text-white font-mono tracking-tight my-1">
                  {price}
                </div>
                <div className="text-xs text-purple-200 font-mono mt-1">
                  Order ID: <span className="text-white font-bold">{orderRef}</span>
                </div>
              </div>

              {/* Details (Solid Off-Black Panel) */}
              <div className="relative z-10 bg-slate-950 rounded-2xl p-4 space-y-2.5 text-xs text-white border border-slate-800 shadow-md">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Product to Dispatch</span>
                  <span className="text-white font-bold text-right truncate max-w-[200px]">{productName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Recipient (Buyer)</span>
                  <span className="text-slate-100 font-bold">{buyerName}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span>Dispatch Depot</span>
                  <span className="text-slate-100 font-medium">{marketLocation}</span>
                </div>
              </div>

              {/* Vendor Secret Delivery PIN Box (Solid White with Purple Accent) */}
              <div className="relative z-10 bg-purple-50 border-2 border-purple-600 rounded-2xl p-4 text-center space-y-1 shadow-sm">
                <span className="text-[10px] uppercase font-mono tracking-wider text-purple-950 font-black block">
                  Delivery Confirmation PIN Box
                </span>
                <div className="text-3xl font-black text-purple-950 tracking-[0.3em] font-mono py-1">
                  {deliveryCode}
                </div>
                <p className="text-[10px] text-purple-900 font-medium leading-tight">
                  Ask buyer for this 4-digit PIN upon handover. Once sent to the bot, settlement will credit your bank account immediately.
                </p>
              </div>

              {/* Footer */}
              <div className="relative z-10 flex items-center justify-between border-t-2 border-purple-100 pt-3.5 text-[10px] text-slate-500 font-mono">
                <span className="font-bold text-slate-800">Secured by FLOATE AFRICA</span>
                <span className="text-purple-900 font-black">Instant Payout Guaranteed</span>
              </div>
            </div>
          )}

          {/* TAB 3: MERCHANT SHOP CARD */}
          {activeTab === 'merchant_card' && (
            <div className="w-full max-w-lg bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-900 relative overflow-hidden">
              {/* Subtle Purple Pattern */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(#7e22ce 1.5px, transparent 1.5px), radial-gradient(#581c87 1.5px, #ffffff 1.5px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b-2 border-purple-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Floate Logo"
                    referrerPolicy="no-referrer"
                    className="h-10 w-auto object-contain"
                  />
                  <div>
                    <h4 className="font-black text-xs text-purple-950 tracking-wider">FLOATE VERIFIED</h4>
                    <p className="text-[10px] text-purple-800 font-bold font-mono uppercase">Official Store Card</p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black bg-purple-900 text-white shadow-sm uppercase tracking-wider">
                  VERIFIED SELLER
                </span>
              </div>

              {/* Center Vendor Profile: BOLD, CAPITALIZED, CENTERED */}
              <div className="relative z-10 bg-slate-950 rounded-2xl p-7 text-center text-white space-y-3 border border-slate-800 shadow-md">
                <span className="text-[11px] uppercase font-mono tracking-[0.2em] text-purple-400 font-black block">
                  OFFICIAL TRUSTED MERCHANT
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight">
                  {vendorName.toUpperCase()}
                </h3>
                <div className="text-xs text-purple-200 font-bold uppercase tracking-wider">
                  📍 {marketLocation.toUpperCase()} • <span className="text-purple-400 font-black">SAFEPAY ENABLED</span>
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/80 border border-purple-700/60 text-[10px] text-purple-100 font-black uppercase tracking-wider">
                  <span>⚡ 100% SCAM-PROOF</span>
                  <span>•</span>
                  <span>🔒 ESCROW SECURED</span>
                </div>
              </div>

              {/* Bottom Area: Small Left-Side Invitation & Right-Side Watermark */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t-2 border-purple-100 pt-4">
                {/* Small Left-Side Invitation */}
                <div className="flex items-center gap-2.5 bg-purple-900 text-white px-3 py-2 rounded-xl shadow-sm border border-purple-700 max-w-[260px]">
                  <div className="bg-white p-1 rounded-lg shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="WhatsApp QR Code"
                      className="w-8 h-8 rounded object-contain"
                    />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-[9px] font-black uppercase text-purple-200 tracking-wider flex items-center gap-1">
                      SHOP SAFELY VIA WHATSAPP <ArrowUpRight className="w-2.5 h-2.5 text-purple-300" />
                    </div>
                    <div className="text-[8px] text-slate-200 font-mono font-bold truncate">
                      SCAN QR OR WA.ME/FLOATE
                    </div>
                  </div>
                </div>

                {/* Right-Side Trademark */}
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="block font-bold text-slate-800 text-[10px] font-mono uppercase">Secured by FLOATE AFRICA</span>
                  <span className="text-purple-900 font-black text-[10px] font-mono">floate.xyz</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BUYER VIRAL WELCOME CARD */}
          {activeTab === 'buyer_welcome' && (
            <div className="w-full max-w-lg bg-white border-2 border-purple-200 rounded-3xl p-6 shadow-2xl space-y-6 text-slate-900 relative overflow-hidden">
              {/* Subtle Purple Pattern */}
              <div 
                className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{
                  backgroundImage: `radial-gradient(#7e22ce 1.5px, transparent 1.5px), radial-gradient(#581c87 1.5px, #ffffff 1.5px)`,
                  backgroundSize: '24px 24px',
                  backgroundPosition: '0 0, 12px 12px'
                }}
              />

              {/* Header */}
              <div className="relative z-10 flex items-center justify-between border-b-2 border-purple-100 pb-4">
                <div className="flex items-center gap-3">
                  <img
                    src={logoUrl}
                    alt="Floate Logo"
                    referrerPolicy="no-referrer"
                    className="h-10 w-auto object-contain"
                  />
                  <div>
                    <h4 className="font-black text-xs text-purple-950 tracking-wider">SMART SHOPPER</h4>
                    <p className="text-[10px] text-purple-800 font-bold font-mono uppercase">Floate Africa Insider</p>
                  </div>
                </div>
                <span className="px-3.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 uppercase tracking-wider">
                  SAFEPAY PROTECTED
                </span>
              </div>

              {/* Center Writeup: BOLD, CAPITALIZED, CENTERED */}
              <div className="relative z-10 bg-slate-950 rounded-2xl p-7 text-center text-white space-y-3.5 border border-slate-800 shadow-md">
                <span className="text-[11px] uppercase font-mono tracking-[0.2em] text-purple-400 font-black block">
                  {buyerName.toUpperCase()} IS SHOPPING WITH FLOATE
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-snug uppercase tracking-tight">
                  "{buyerSlogan.toUpperCase()}"
                </h3>
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-900 text-xs text-purple-100 font-black uppercase tracking-wider">
                  <span>⚡ 0% SCAM RISK</span>
                  <span>•</span>
                  <span>📦 INSPECT BEFORE PAY</span>
                </div>
              </div>

              {/* Bottom Area: Small Left-Side Invitation & Right-Side Watermark */}
              <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t-2 border-purple-100 pt-4">
                {/* Small Left-Side Invitation */}
                <div className="flex items-center gap-2.5 bg-purple-900 text-white px-3 py-2 rounded-xl shadow-sm border border-purple-700 max-w-[260px]">
                  <div className="bg-white p-1 rounded-lg shrink-0">
                    <img
                      src={qrCodeUrl}
                      alt="WhatsApp QR Code"
                      className="w-8 h-8 rounded object-contain"
                    />
                  </div>
                  <div className="space-y-0.5 min-w-0">
                    <div className="text-[9px] font-black uppercase text-purple-200 tracking-wider flex items-center gap-1">
                      TRY FLOATE ON WHATSAPP <ArrowUpRight className="w-2.5 h-2.5 text-purple-300" />
                    </div>
                    <div className="text-[8px] text-slate-200 font-mono font-bold truncate">
                      SCAN QR OR WA.ME/FLOATE
                    </div>
                  </div>
                </div>

                {/* Right-Side Trademark */}
                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="block font-bold text-slate-800 text-[10px] font-mono uppercase">Secured by FLOATE AFRICA</span>
                  <span className="text-purple-900 font-black text-[10px] font-mono">floate.xyz</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Caption */}
          <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1 text-purple-400 font-medium">
              <Share2 className="w-3.5 h-3.5" /> Clean Solid Finish (Zero Glassmorphism)
            </span>
            <span>•</span>
            <span>Subtle Purple Pattern</span>
            <span>•</span>
            <span>Secured by FLOATE AFRICA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
