import React, { useState } from 'react';
import {
  FloateCredential,
  SAMPLE_CREDENTIALS,
  createCredentialForMerchant,
} from '../../bot/services/credentialService';
import { FloateVerifiedCertificate } from './FloateVerifiedCertificate';
import { FloateBadgeCard } from './FloateBadgeCard';
import { FloateMarketFlyer } from './FloateMarketFlyer';
import { FloateSquareBoost } from './FloateSquareBoost';
import { PublicVerifyView } from './PublicVerifyView';
import { VendorAssetIssuanceFlow } from './VendorAssetIssuanceFlow';
import {
  Award,
  ShieldCheck,
  FileText,
  Square,
  QrCode,
  Sliders,
  CheckCircle,
  ExternalLink,
  Layers,
  Send,
  Workflow,
} from 'lucide-react';

export const FloateBaseKitStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'flow' | 'certificate' | 'badge' | 'flyer' | 'square' | 'verify'
  >('flow');

  // Customizer state
  const [name, setName] = useState('Alhaji Sani Balogun');
  const [biz, setBiz] = useState('Balogun Fabrics & Silk');
  const [loc, setLoc] = useState('Balogun Market, Lagos Island, Lagos');
  const [tier, setTier] = useState<'basic' | 'plus'>('plus');
  const [showCustomizer, setShowCustomizer] = useState(false);

  // Active credential object (defaults to Lagos sample)
  const [activeCredential, setActiveCredential] = useState<FloateCredential>(
    SAMPLE_CREDENTIALS[3] || SAMPLE_CREDENTIALS[0]
  );

  const handleUpdateCredential = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = createCredentialForMerchant({
      merchantId: 'custom-m-1',
      name,
      biz,
      loc,
      isPlus: tier === 'plus',
      photoUrl: activeCredential.photoUrl,
    });
    setActiveCredential(updated);
  };

  const handleSelectSample = (sample: FloateCredential) => {
    setActiveCredential(sample);
    setName(sample.name);
    setBiz(sample.biz);
    setLoc(sample.loc);
    setTier(sample.tier);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0E3B12] via-[#1B5E20] to-[#0E3B12] p-6 sm:p-8 rounded-3xl border border-emerald-700/40 shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <img
                src="/brand/base-kit/layers/wordmark-yellow.png"
                alt="FLOATE"
                className="h-8 object-contain"
              />
              <span className="bg-[#FFC107] text-[#0E3B12] font-black text-xs px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                Base Kit v2.0
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tracking-tight">
              Brand &amp; Verification Credential Studio
            </h1>
            <p className="text-emerald-200/90 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Official Floate design system assets for traders and buyers across <strong>Lagos, Onitsha, Enugu, Aba, Kano, and Abuja</strong>. Dynamic location branding ensures merchants display their real market on every certificate, flyer, and status badge.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCustomizer(!showCustomizer)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-900/80 hover:bg-emerald-800 text-amber-300 border border-amber-400/40 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>{showCustomizer ? 'Close Editor' : 'Change City & Merchant'}</span>
            </button>
            <a
              href="/brand/base-kit/README.md"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 rounded-xl text-xs border border-emerald-800 transition-colors"
            >
              <Layers className="w-4 h-4" />
              <span>Specs</span>
            </a>
          </div>
        </div>
      </div>

      {/* Merchant Customizer Drawer (Optional) */}
      {showCustomizer && (
        <div className="bg-[#0E3B12]/90 border-2 border-amber-400/50 p-6 rounded-3xl shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4" />
              Switch Vendor or Test Any Nigerian Market
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-emerald-300">Presets:</span>
              {SAMPLE_CREDENTIALS.map((s) => (
                <button
                  key={s.fid}
                  onClick={() => handleSelectSample(s)}
                  className={`px-2 py-1 text-xs rounded-lg font-mono transition-colors ${
                    activeCredential.fid === s.fid
                      ? 'bg-amber-400 text-emerald-950 font-bold'
                      : 'bg-emerald-900 hover:bg-emerald-800 text-emerald-200'
                  }`}
                >
                  {s.city} ({s.biz.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleUpdateCredential}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <div>
              <label className="block text-[11px] font-bold text-emerald-300 uppercase mb-1">
                Merchant Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-300 uppercase mb-1">
                Business / Stall Name
              </label>
              <input
                type="text"
                value={biz}
                onChange={(e) => setBiz(e.target.value)}
                className="w-full bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-300 uppercase mb-1">
                Market Location / City
              </label>
              <input
                type="text"
                value={loc}
                onChange={(e) => setLoc(e.target.value)}
                placeholder="e.g. Balogun Market, Lagos Island, Lagos"
                className="w-full bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-emerald-300 uppercase mb-1">
                Verification Tier
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as 'basic' | 'plus')}
                className="w-full bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2 text-xs text-amber-300 font-bold focus:outline-hidden focus:border-amber-400"
              >
                <option value="plus">Verified Plus (Founding Merchant)</option>
                <option value="basic">Basic Verification (Free)</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
              <button
                type="submit"
                className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-colors"
              >
                Apply to All Templates
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Studio Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-emerald-800/40 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('flow')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'flow'
              ? 'bg-[#FFC107] text-[#0E3B12] shadow-lg scale-102 font-black'
              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
          }`}
        >
          <Workflow className="w-4 h-4 text-emerald-950" />
          <span>Vendor Issuance Flow (Real Example)</span>
        </button>

        <button
          onClick={() => setActiveTab('certificate')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'certificate'
              ? 'bg-[#FFC107] text-[#0E3B12] shadow-lg scale-102'
              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Certificate (1080×1920)</span>
        </button>

        <button
          onClick={() => setActiveTab('badge')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'badge'
              ? 'bg-[#FFC107] text-[#0E3B12] shadow-lg scale-102'
              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Verified Seal &amp; Badge Card</span>
        </button>

        <button
          onClick={() => setActiveTab('flyer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'flyer'
              ? 'bg-[#FFC107] text-[#0E3B12] shadow-lg scale-102'
              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Market Flyer A5 ({activeCredential.city})</span>
        </button>

        <button
          onClick={() => setActiveTab('square')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'square'
              ? 'bg-[#FFC107] text-[#0E3B12] shadow-lg scale-102'
              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
          }`}
        >
          <Square className="w-4 h-4" />
          <span>Product Boost Square (1080×1080)</span>
        </button>

        <button
          onClick={() => setActiveTab('verify')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
            activeTab === 'verify'
              ? 'bg-[#FFC107] text-[#0E3B12] shadow-lg scale-102'
              : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
          }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Public Verify Route (/v/:fid)</span>
        </button>
      </div>

      {/* Tab Panels */}
      <div className="py-4">
        {activeTab === 'flow' && (
          <VendorAssetIssuanceFlow />
        )}

        {activeTab === 'certificate' && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto mb-2 text-xs text-emerald-300/80">
              Personalised high-resolution certificate for <strong>{activeCredential.name}</strong> ({activeCredential.loc}). Includes scannable anti-fraud QR code and FID serial number.
            </div>
            <FloateVerifiedCertificate credential={activeCredential} />
          </div>
        )}

        {activeTab === 'badge' && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto mb-2 text-xs text-emerald-300/80">
              1080×1080 personal badge card for WhatsApp Status &amp; Instagram, plus master scalloped seal (64px to 1080px).
            </div>
            <FloateBadgeCard credential={activeCredential} />
          </div>
        )}

        {activeTab === 'flyer' && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto mb-2 text-xs text-emerald-300/80">
              A5 distribution flyer dynamically localized for <strong>{activeCredential.city}</strong> ({activeCredential.loc.split(',')[0]}) with Pidgin copy, floating WhatsApp AI mockup, QR code, and steps.
            </div>
            <FloateMarketFlyer
              cityName={activeCredential.city}
              marketName={activeCredential.loc.split(',')[0]}
              locationDisplay={activeCredential.loc}
            />
          </div>
        )}

        {activeTab === 'square' && (
          <div className="space-y-4">
            <div className="text-center max-w-xl mx-auto mb-2 text-xs text-emerald-300/80">
              High-converting social card template for merchant product boosts. Automatically bound to <strong>{activeCredential.city}</strong> sellers.
            </div>
            <FloateSquareBoost
              headline="Skip the traffic."
              italicWord="Find it"
              cityName={activeCredential.city}
              locationDisplay={activeCredential.loc}
            />
          </div>
        )}

        {activeTab === 'verify' && (
          <div className="space-y-4">
            <PublicVerifyView initialFid={activeCredential.fid} />
          </div>
        )}
      </div>
    </div>
  );
};
