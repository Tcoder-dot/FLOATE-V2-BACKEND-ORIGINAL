import React, { useState } from 'react';
import { FloateCredential } from '../../bot/services/credentialService';
import { ShieldCheck, Share2, Download, ExternalLink, QrCode, MessageCircle } from 'lucide-react';

interface Props {
  credential: FloateCredential;
}

export const FloateBadgeCard: React.FC<Props> = ({ credential }) => {
  const [viewMode, setViewMode] = useState<'card' | 'seal'>('card');

  return (
    <div className="flex flex-col items-center">
      {/* View Mode Toggle & Action Bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/40 text-xs">
        <div className="flex items-center gap-1.5 bg-emerald-900/60 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('card')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'card'
                ? 'bg-amber-400 text-emerald-950 shadow-md'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            1080×1080 Badge Card
          </button>
          <button
            onClick={() => setViewMode('seal')}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              viewMode === 'seal'
                ? 'bg-amber-400 text-emerald-950 shadow-md'
                : 'text-emerald-300 hover:text-white'
            }`}
          >
            Official Scalloped Seal
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={
              viewMode === 'seal'
                ? `/api/credentials/${credential.fid}/download/seal`
                : `/api/credentials/${credential.fid}/download/badge`
            }
            download
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 rounded-lg transition-colors font-bold shadow-sm"
            title="Download crisp 1080p PNG master"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Check out my official Floate Verified Badge!\n\n🏪 Store: ${credential.biz}\n📍 Location: ${credential.loc}\n🔖 Floate ID: ${credential.fid}\n\n🛡️ Verify Authentic Record:\nhttps://floate.xyz/v/${credential.fid}\n\n📥 Download Official Badge:\n${typeof window !== 'undefined' ? window.location.origin : 'https://floate.xyz'}/api/credentials/${credential.fid}/download/badge`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
            title="Share to WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
        </div>
      </div>

      {viewMode === 'seal' ? (
        /* Standalone High-Res Scalloped Verified Seal matching floate-verified-badge.png */
        <div className="w-full max-w-[480px] sm:max-w-[500px] p-6 sm:p-8 bg-[#0E3B12] rounded-3xl border border-emerald-800/40 shadow-2xl flex flex-col items-center text-center">
          <div className="relative group p-4">
            <img
              src="/brand/base-kit/layers/seal-verified-1080.png"
              alt="Floate Official Verified Seal"
              className="w-72 h-72 sm:w-80 sm:h-80 object-contain drop-shadow-2xl transition-transform duration-300 hover:scale-105"
            />
          </div>
          <div className="mt-4 text-amber-400 font-bold text-lg tracking-wider uppercase">
            Official Floate Verified Seal
          </div>
          <p className="text-emerald-200/80 text-xs sm:text-sm mt-1 max-w-sm">
            High-resolution vector-quality seal for merchant shopfront stickers, packaging labels, and digital badges.
          </p>
          <div className="flex gap-2 mt-4 text-[11px] text-emerald-300 font-mono">
            <span className="bg-emerald-900/60 px-2 py-1 rounded">64px</span>
            <span className="bg-emerald-900/60 px-2 py-1 rounded">128px</span>
            <span className="bg-emerald-900/60 px-2 py-1 rounded">256px</span>
            <span className="bg-emerald-900/60 px-2 py-1 rounded">512px</span>
            <span className="bg-emerald-900/60 px-2 py-1 rounded">1080px Master</span>
          </div>
        </div>
      ) : (
        /* 
          1080x1080 Personalised Verified Badge Card
          Exact layout matching base-kit/src/badge-card.html
        */
        <div
          id="floate-badge-canvas"
          className="w-full max-w-[480px] sm:max-w-[520px] aspect-square rounded-3xl overflow-hidden shadow-2xl relative select-none flex flex-col justify-between"
          style={{
            background:
              'radial-gradient(1000px 800px at 85% 10%, #2E7D32 0%, #1B5E20 40%, #0E3B12 90%)',
          }}
        >
          {/* Header Row: Wordmark + Tag */}
          <div className="p-6 sm:p-7 flex items-center justify-between">
            <img
              src="/brand/base-kit/layers/wordmark-yellow.png"
              alt="FLOATE"
              className="h-7 sm:h-9 object-contain"
            />
            <div className="bg-[#FFC107] text-[#0E3B12] font-extrabold text-[11px] sm:text-xs tracking-widest px-3 py-1.5 rounded-full uppercase shadow-md">
              VERIFIED ON FLOATE
            </div>
          </div>

          {/* Middle Body: Avatar + Merchant Profile */}
          <div className="px-6 sm:px-7 flex items-center gap-5 sm:gap-7 my-auto">
            {/* Avatar Circle with Gold Conic Ring & Mini Seal */}
            <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
              <div
                className="w-full h-full rounded-full p-2 sm:p-2.5"
                style={{
                  background:
                    'conic-gradient(from 200deg, #FFC107, #FFE082, #FFC107, #C79100, #FFC107)',
                  boxShadow: '0 12px 30px rgba(14,59,18,0.35)',
                }}
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 flex items-center justify-center border-4 border-[#FFFDF5]">
                  {credential.photoUrl ? (
                    <img
                      src={credential.photoUrl}
                      alt={credential.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[#FFC107] font-bold text-3xl sm:text-4xl tracking-wider">
                      {credential.initials}
                    </span>
                  )}
                </div>
              </div>
              <img
                src="/brand/base-kit/layers/seal-verified-256.png"
                alt="Seal"
                className="absolute -bottom-1 -right-1 w-12 h-12 sm:w-16 sm:h-16 drop-shadow-md"
              />
            </div>

            {/* Merchant Details */}
            <div className="flex-1 text-left min-w-0">
              <div className="text-[#FFC107] text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase">
                VERIFIED MERCHANT
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white leading-tight mt-1 truncate">
                {credential.biz}
              </h2>
              <p className="text-[#E3F1E4] text-xs sm:text-sm mt-1 leading-snug line-clamp-2">
                {credential.loc}
              </p>
              <div className="mt-3">
                <span className="text-[#E3F1E4]/70 text-[10px] tracking-wider uppercase font-semibold block">
                  FLOATE ID
                </span>
                <span className="text-[#FFC107] font-extrabold text-base sm:text-lg tracking-wide font-mono">
                  {credential.fid}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Cream Bar: QR Code + CTA */}
          <div className="bg-[#FFFDF5] p-5 sm:p-6 flex items-center gap-4 sm:gap-6 border-t-2 border-emerald-950/10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-xl border-2 sm:border-3 border-[#0E3B12] flex-shrink-0 shadow-sm">
              <img
                src="/brand/base-kit/layers/qr-buyer-whatsapp.png"
                alt="QR Code"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left flex-1 min-w-0">
              <div className="text-[#0E3B12] font-bold text-base sm:text-xl leading-tight">
                Scan to{' '}
                <span className="font-serif-italic text-[#2E7D32] text-lg sm:text-2xl">
                  check
                </span>{' '}
                I'm real.
              </div>
              <div className="text-[#6B7A6B] text-xs sm:text-sm font-semibold truncate mt-0.5">
                {credential.verifyUrl.replace('https://', '')}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FloateVerifiedSeal: React.FC<{ size?: number; className?: string }> = ({
  size = 56,
  className = '',
}) => {
  return (
    <img
      src="/brand/base-kit/layers/seal-verified-256.png"
      alt="Floate Verified Seal"
      width={size}
      height={size}
      className={`rounded-full shrink-0 select-none object-contain ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};
