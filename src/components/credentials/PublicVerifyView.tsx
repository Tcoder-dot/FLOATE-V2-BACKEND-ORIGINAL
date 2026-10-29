import React, { useState } from 'react';
import { FloateCredential, SAMPLE_CREDENTIALS, findCredentialByFid } from '../../bot/services/credentialService';
import { ShieldCheck, CheckCircle2, MessageCircle, AlertTriangle, ArrowLeft, ExternalLink, MapPin, Store, Calendar, ShieldAlert } from 'lucide-react';

interface Props {
  initialFid?: string;
  onBack?: () => void;
}

export const PublicVerifyView: React.FC<Props> = ({
  initialFid = 'FLT-ONT-00142',
  onBack,
}) => {
  const [fidInput, setFidInput] = useState(initialFid);
  const [credential, setCredential] = useState<FloateCredential | undefined>(
    findCredentialByFid(initialFid) || SAMPLE_CREDENTIALS[0]
  );

  const handleLookup = (id: string) => {
    setFidInput(id);
    const found = findCredentialByFid(id);
    setCredential(found);
  };

  return (
    <div className="min-h-screen bg-[#0E3B12] text-white flex flex-col items-center p-4 sm:p-6 font-sans">
      {/* Top Navbar */}
      <div className="w-full max-w-xl flex items-center justify-between py-3 border-b border-emerald-800/50 mb-6">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <img
            src="/brand/base-kit/layers/wordmark-yellow.png"
            alt="FLOATE"
            className="h-7 object-contain"
          />
        </div>
        <span className="text-xs text-amber-400 font-bold tracking-wider uppercase bg-emerald-900/60 px-3 py-1 rounded-full border border-amber-400/30">
          Official Merchant Registry
        </span>
      </div>

      {/* Lookup Bar (to test any FID) */}
      <div className="w-full max-w-xl mb-6 bg-emerald-950/70 p-3 rounded-2xl border border-emerald-800/40 flex items-center gap-2">
        <span className="text-xs text-emerald-300 font-mono font-semibold pl-2">
          floate.xyz/v/
        </span>
        <input
          type="text"
          value={fidInput}
          onChange={(e) => setFidInput(e.target.value.toUpperCase())}
          placeholder="FLT-ONT-00142"
          className="flex-1 bg-emerald-900/80 border border-emerald-700/60 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono uppercase focus:outline-hidden focus:border-amber-400"
        />
        <button
          onClick={() => handleLookup(fidInput)}
          className="bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors"
        >
          Verify
        </button>
      </div>

      {/* Quick switcher buttons */}
      <div className="w-full max-w-xl flex items-center gap-2 mb-6 overflow-x-auto pb-1 text-xs">
        <span className="text-emerald-300/80 text-[11px] font-semibold whitespace-nowrap">
          Quick test:
        </span>
        {SAMPLE_CREDENTIALS.map((sample) => (
          <button
            key={sample.fid}
            onClick={() => handleLookup(sample.fid)}
            className={`px-2.5 py-1 rounded-lg font-mono text-[11px] whitespace-nowrap transition-colors ${
              credential?.fid === sample.fid
                ? 'bg-amber-400 text-emerald-950 font-bold'
                : 'bg-emerald-900/40 text-emerald-200 hover:bg-emerald-900/80'
            }`}
          >
            {sample.fid} ({sample.city})
          </button>
        ))}
      </div>

      {/* Main Verification Card */}
      {credential ? (
        <div className="w-full max-w-xl bg-[#FFFDF5] rounded-3xl p-6 sm:p-8 text-[#10200F] shadow-2xl border-4 border-[#FFC107] relative overflow-hidden">
          {/* Status Ribbon */}
          <div className="flex items-center justify-between pb-4 border-b border-emerald-950/10">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-600 animate-pulse"></span>
              <span className="text-emerald-800 font-extrabold text-sm uppercase tracking-wider">
                Status: Verified & Active
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#1B5E20] bg-[#FFF4CC] px-2.5 py-1 rounded-full border border-amber-300">
              {credential.fid}
            </span>
          </div>

          {/* Top Banner with Merchant Seal & Identity */}
          <div className="flex items-center gap-4 sm:gap-6 mt-6">
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
              <img
                src="/brand/base-kit/layers/seal-verified-512.png"
                alt="Floate Verified"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[#1B5E20] font-bold text-xs uppercase tracking-widest">
                {credential.tier === 'plus' ? 'Founding Verified Plus Merchant' : 'Verified Merchant'}
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#10200F] leading-tight truncate mt-0.5">
                {credential.biz}
              </h1>
              <p className="text-xs sm:text-sm text-[#4F5E4F] font-semibold mt-0.5">
                Operated by {credential.name}
              </p>
            </div>
          </div>

          {/* Location & Stall Details */}
          <div className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-100/80 space-y-2 text-xs sm:text-sm text-[#2F3B2F]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#1B5E20] flex-shrink-0" />
              <span>
                <strong>Physical Market:</strong> {credential.loc}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#1B5E20] flex-shrink-0" />
              <span>
                <strong>Verified Since:</strong> {credential.verifiedOn}
              </span>
            </div>
          </div>

          {/* Checks passed */}
          <div className="mt-5">
            <h4 className="text-xs font-bold text-[#10200F] uppercase tracking-wider mb-2">
              Verified Trust Checks
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {credential.checks.map((chk, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-[#FFF4CC] text-[#1B5E20] px-3 py-2 rounded-xl text-xs font-bold border border-amber-200/60"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#2E7D32] flex-shrink-0" />
                  <span>{chk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="mt-6 pt-5 border-t border-emerald-950/10 space-y-3">
            <a
              href="https://wa.me/2349115162081"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#1B5E20] hover:bg-[#145018] text-[#FFC107] font-bold text-sm sm:text-base py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <MessageCircle className="w-5 h-5 fill-[#FFC107] text-[#1B5E20]" />
              <span>Chat with Merchant on WhatsApp</span>
            </a>

            <div className="flex items-center justify-between text-xs text-[#6B7A6B] pt-1">
              <span>Verified anti-fraud record</span>
              <a
                href={credential.certificateUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[#1B5E20] hover:underline font-bold flex items-center gap-1"
              >
                <span>View Full Certificate</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      ) : (
        /* Unknown FID Warning */
        <div className="w-full max-w-xl bg-red-950/80 border-2 border-red-500 rounded-3xl p-6 text-center text-white">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-red-200">
            Unregistered or Unverified Merchant ID
          </h2>
          <p className="text-xs sm:text-sm text-red-300/90 mt-2 max-w-md mx-auto">
            The identifier <strong className="font-mono text-white">{fidInput}</strong> is not an active verified merchant on Floate. Please beware of impersonators or ask the seller to provide their official Floate certificate.
          </p>
        </div>
      )}

      {/* Safety Notice */}
      <div className="w-full max-w-xl mt-6 text-center text-emerald-400/80 text-xs">
        Floate connects buyers to real verified sellers in Onitsha, Enugu, and Owerri.
        <br />
        To report a merchant, send an email to <span className="text-amber-400 underline">trust@floate.xyz</span>
      </div>
    </div>
  );
};
