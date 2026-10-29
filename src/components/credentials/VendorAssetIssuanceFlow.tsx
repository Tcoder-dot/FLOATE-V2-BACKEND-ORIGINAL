import React, { useState } from 'react';
import {
  FloateCredential,
  SAMPLE_CREDENTIALS,
  createCredentialForMerchant,
} from '../../bot/services/credentialService';
import {
  CheckCircle2,
  Download,
  ExternalLink,
  MessageCircle,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
  Sparkles,
  ArrowRight,
  Printer,
  Share2,
  FileText,
  Award,
  Layers,
  MapPin,
  Clock,
  Send,
} from 'lucide-react';

export const VendorAssetIssuanceFlow: React.FC = () => {
  const [selectedMerchant, setSelectedMerchant] = useState<FloateCredential>(
    SAMPLE_CREDENTIALS[3] || SAMPLE_CREDENTIALS[0] // Default to Lagos sample (Alhaji Sani Balogun)
  );

  const [activeStep, setActiveStep] = useState<number>(3); // 1: Registration/KYC, 2: Generation, 3: WhatsApp Delivery, 4: Buyer Verification
  const [isDelivering, setIsDelivering] = useState(false);
  const [deliverySent, setDeliverySent] = useState(true);

  // Trigger simulated delivery
  const handleSimulateDelivery = () => {
    setIsDelivering(true);
    setDeliverySent(false);
    setTimeout(() => {
      setIsDelivering(false);
      setDeliverySent(true);
      setActiveStep(3);
    }, 900);
  };

  return (
    <div className="w-full space-y-8 text-left">
      {/* Overview Intro Banner */}
      <div className="bg-gradient-to-r from-[#0E3B12] via-[#145018] to-[#0E3B12] p-6 sm:p-8 rounded-3xl border border-emerald-700/50 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-[#FFC107] text-[#0E3B12] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
              Real-World Distribution Architecture
            </span>
            <span className="text-emerald-300 text-xs font-semibold">
              • Anti-Fraud Credential Pipeline
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            How Vendors Receive &amp; Use Their Floate Brand Assets
          </h2>
          <p className="text-emerald-200/90 text-xs sm:text-sm mt-2 max-w-3xl leading-relaxed">
            Every vendor receives assets branded to their <strong>specific market and city</strong> (e.g. Lagos, Balogun, Aba, Ariaria, Kano, Abuja, or Onitsha). Below is the live end-to-end lifecycle from verification to automated WhatsApp Cloud media delivery and stall display.
          </p>
        </div>
      </div>

      {/* Real Vendor Selector by City */}
      <div className="bg-slate-900/70 p-5 rounded-2xl border border-slate-800">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" />
            <span>Select Real Vendor Example by City:</span>
          </div>
          <span className="text-[11px] text-amber-400/90 font-medium">
            Active: <strong>{selectedMerchant.biz}</strong> ({selectedMerchant.city})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SAMPLE_CREDENTIALS.map((merchant) => {
            const isSelected = selectedMerchant.fid === merchant.fid;
            return (
              <button
                key={merchant.fid}
                onClick={() => {
                  setSelectedMerchant(merchant);
                  setDeliverySent(true);
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'bg-emerald-950/80 border-amber-400 text-white shadow-lg ring-1 ring-amber-400/50'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-amber-400 bg-emerald-900/80 px-2 py-0.5 rounded">
                    {merchant.fid}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-300">
                    {merchant.city}
                  </span>
                </div>
                <div className="font-bold text-xs text-white mt-1.5 truncate">
                  {merchant.biz}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">
                  {merchant.name}
                </div>
                <div className="text-[10px] text-emerald-400/80 mt-1 truncate">
                  📍 {merchant.loc.split(',')[0]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Progress Tracker */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Step 1 */}
        <div
          onClick={() => setActiveStep(1)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStep === 1
              ? 'bg-emerald-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 font-bold text-xs flex items-center justify-center">
              1
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              KYC &amp; Verification
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white">Stall &amp; Identity Audit</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Vendor signs up via WhatsApp or Web, locks GPS coordinates in {selectedMerchant.city}, and passes phone &amp; stall checks.
          </p>
        </div>

        {/* Step 2 */}
        <div
          onClick={() => setActiveStep(2)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStep === 2
              ? 'bg-emerald-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 font-bold text-xs flex items-center justify-center">
              2
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              FID &amp; Asset Engine
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white">Automated Rendering</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Assigns <strong className="font-mono text-amber-300">{selectedMerchant.fid}</strong>, creates scannable anti-fraud QR code, and generates 4 assets for {selectedMerchant.city}.
          </p>
        </div>

        {/* Step 3 */}
        <div
          onClick={() => setActiveStep(3)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStep === 3
              ? 'bg-emerald-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 font-bold text-xs flex items-center justify-center">
              3
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              WhatsApp Delivery
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white">Direct Media Dispatch</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            WhatsApp Bot instantly sends certificate PNG, status badge card, and printable flyer direct to vendor's phone.
          </p>
        </div>

        {/* Step 4 */}
        <div
          onClick={() => setActiveStep(4)}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeStep === 4
              ? 'bg-emerald-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/40'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-emerald-950 font-bold text-xs flex items-center justify-center">
              4
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Buyer Trust Loop
            </span>
          </div>
          <h4 className="text-sm font-extrabold text-white">Stall Scan &amp; WhatsApp</h4>
          <p className="text-[11px] text-slate-400 mt-1 leading-snug">
            Buyer scans QR on stall flyer or clicks WhatsApp Status badge &rarr; verifies official Floate registry at floate.xyz/v/{selectedMerchant.fid}.
          </p>
        </div>
      </div>

      {/* Main Interactive Showcase Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Realistic WhatsApp Phone View (What Vendor Receives) */}
        <div className="lg:col-span-6 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-slate-200">
                Vendor's WhatsApp Screen ({selectedMerchant.name})
              </span>
            </div>
            <button
              onClick={handleSimulateDelivery}
              disabled={isDelivering}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs rounded-xl shadow-xs transition-colors"
            >
              {isDelivering ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Re-test Delivery</span>
                </>
              )}
            </button>
          </div>

          {/* Smartphone Mockup */}
          <div className="max-w-[380px] mx-auto bg-[#0B141A] rounded-[32px] p-3 shadow-2xl border-4 border-slate-700 text-left font-sans">
            {/* Phone Top Speaker & Camera */}
            <div className="w-24 h-4 bg-slate-800 rounded-full mx-auto mb-2"></div>

            {/* WhatsApp Chat Header */}
            <div className="bg-[#1F2C34] p-3 rounded-2xl flex items-center gap-3 text-white">
              <div className="w-9 h-9 rounded-full bg-[#1B5E20] flex items-center justify-center p-1.5 flex-shrink-0">
                <img
                  src="/brand/base-kit/layers/icon-yellow.png"
                  alt="Floate"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold truncate flex items-center gap-1">
                  <span>Floate Verification Bot</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[10px] text-emerald-400 font-mono">Official Business Account</div>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="py-4 space-y-3">
              {/* WhatsApp Message Bubble */}
              <div className="bg-[#005C4B] text-white p-3.5 rounded-2xl rounded-tl-xs shadow-md text-xs space-y-2.5 max-w-[95%]">
                <div className="text-[#FFC107] font-bold text-sm">
                  🎉 Congratulations {selectedMerchant.name}!
                </div>
                <p className="text-[11px] text-slate-100 leading-relaxed">
                  Your enterprise <strong>{selectedMerchant.biz}</strong> has officially earned the <strong>Floate Verified Shield 🛡️</strong> for your stall at <strong>{selectedMerchant.loc}</strong>!
                </p>

                {/* Attached Credential Previews */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="bg-[#024438] p-1.5 rounded-xl border border-emerald-600/30 text-center">
                    <img
                      src={selectedMerchant.certificateUrl}
                      alt="Certificate"
                      className="w-full h-24 object-cover rounded-lg mb-1"
                    />
                    <span className="text-[9px] font-bold text-amber-300 block truncate">
                      📄 Official Certificate
                    </span>
                  </div>
                  <div className="bg-[#024438] p-1.5 rounded-xl border border-emerald-600/30 text-center">
                    <img
                      src={selectedMerchant.badgeCardUrl}
                      alt="Badge Card"
                      className="w-full h-24 object-cover rounded-lg mb-1"
                    />
                    <span className="text-[9px] font-bold text-amber-300 block truncate">
                      🛡️ Status Badge (1080p)
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-2 bg-[#01382E] rounded-xl text-[10px] text-emerald-100/90 space-y-1">
                  <div><strong>1. WhatsApp Status:</strong> Post your Badge Card so your contacts know you're verified.</div>
                  <div><strong>2. Market Stall:</strong> Print your A5 Flyer and stick it at your shop.</div>
                  <div><strong>3. Share Link:</strong> {selectedMerchant.verifyUrl}</div>
                </div>

                <div className="text-[10px] text-emerald-200/70 font-mono text-right pt-1">
                  10:42 AM • Delivered ✓✓
                </div>
              </div>
            </div>

            {/* Phone WhatsApp Bottom CTA Bar */}
            <div className="bg-[#1F2C34] p-2 rounded-2xl flex items-center justify-between text-[11px]">
              <a
                href={selectedMerchant.verifyUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 text-center py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-1 mr-2 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Verify Link</span>
              </a>
              <a
                href={selectedMerchant.certificateUrl}
                download
                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl font-bold flex items-center justify-center"
                title="Download certificate"
              >
                <Download className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Location Flyer & Assets Specific to this Vendor */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-slate-900/80 p-6 rounded-3xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  Customized Asset Preview for {selectedMerchant.city}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Flyer &amp; Marketing Collateral for {selectedMerchant.biz}
                </h3>
              </div>
              <span className="text-xs font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 px-2.5 py-1 rounded-full">
                {selectedMerchant.city.toUpperCase()} EDITION
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Notice how the flyer header does not show Onitsha if the merchant is in Lagos or Aba. It dynamically reflects their actual market: <strong className="text-amber-400">{selectedMerchant.loc}</strong>.
            </p>

            {/* Interactive Asset Tabs for this specific vendor */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">1. Certificate of Verification:</span>
                <span className="font-mono text-amber-300 font-bold">{selectedMerchant.fid}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">2. Market Flyer Header:</span>
                <span className="font-bold text-emerald-300">
                  {selectedMerchant.city.toUpperCase()} · {selectedMerchant.loc.split(',')[0].toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">3. WhatsApp Bot Match Prompt:</span>
                <span className="text-slate-200 italic">
                  "Found 3 verified sellers for you in {selectedMerchant.loc.split(',')[0]} 👇"
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">4. Public Anti-Fraud Verify URL:</span>
                <a
                  href={selectedMerchant.verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-amber-400 hover:underline font-mono"
                >
                  floate.xyz/v/{selectedMerchant.fid}
                </a>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <a
                href={`/api/credentials/${selectedMerchant.fid}/download/certificate`}
                download
                className="p-2.5 bg-amber-400 hover:bg-amber-300 rounded-xl text-xs font-bold text-emerald-950 flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Certificate (PNG)</span>
              </a>
              <a
                href={`/api/credentials/${selectedMerchant.fid}/download/badge`}
                download
                className="p-2.5 bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-700/60 rounded-xl text-xs font-bold text-emerald-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Badge Card (PNG)</span>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(
                  `Check out ${selectedMerchant.biz} on Floate!\nVerified Merchant ID: ${selectedMerchant.fid}\n\nVerify Online: https://floate.xyz/v/${selectedMerchant.fid}\nDownload Certificate: ${typeof window !== 'undefined' ? window.location.origin : 'https://floate.xyz'}/api/credentials/${selectedMerchant.fid}/download/certificate`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Send to WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Operational Flow Summary Card */}
          <div className="bg-gradient-to-br from-emerald-950/40 to-slate-900/60 p-6 rounded-3xl border border-emerald-800/30 space-y-3">
            <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Automated Operations Summary (No Manual Ops Bottleneck)
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Zero-Wait Issuance:</strong> Rendering happens automatically via headless Chromium server workers upon KYC approval or Flutterwave payment.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Immutable QR Codes:</strong> The QR code printed on the flyer links to the anti-fraud database record at <code className="text-amber-300">floate.xyz/v/:fid</code>, preventing merchants from faking screenshots.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Localized Outreach:</strong> Market ambassadors hand out flyers with localized Pidgin copy and market names matched to traders in that market.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
