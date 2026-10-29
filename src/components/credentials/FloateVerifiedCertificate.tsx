import React from 'react';
import { FloateCredential } from '../../bot/services/credentialService';
import { Award, CheckCircle2, Download, ExternalLink, Printer, Share2, MessageCircle } from 'lucide-react';

interface Props {
  credential: FloateCredential;
  onDownload?: () => void;
  scale?: number;
}

export const FloateVerifiedCertificate: React.FC<Props> = ({
  credential,
  onDownload,
}) => {
  const isPlus = credential.tier === 'plus';
  const [copied, setCopied] = React.useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(credential.verifyUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Action Bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-emerald-200 font-semibold uppercase tracking-wider">
            {isPlus ? 'Verified Plus Certificate' : 'Verified Merchant Certificate'}
          </span>
          <span className="bg-amber-400 text-emerald-950 font-bold px-2 py-0.5 rounded-full text-[10px]">
            {credential.fid}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/credentials/${credential.fid}/download/certificate`}
            download
            className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold rounded-lg transition-colors shadow-sm"
            title="Download high-resolution 1080×1920 PNG certificate"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `🏆 Official Floate Verified Merchant Certificate\n\n🏪 Store: ${credential.biz}\n📍 Location: ${credential.loc}\n🔖 Floate ID: ${credential.fid}\n\n🛡️ Verify Authentic Record:\nhttps://floate.xyz/v/${credential.fid}\n\n📥 Download Certificate:\n${typeof window !== 'undefined' ? window.location.origin : 'https://floate.xyz'}/api/credentials/${credential.fid}/download/certificate`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors"
            title="Share on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">WhatsApp</span>
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg transition-colors"
            title="Print certificate"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 
        Exact Certificate Layout - proportional to 1080x1920
        Rendered cleanly on modern screens with deep green backdrop and cream inner card
      */}
      <div
        id="floate-certificate-canvas"
        className="w-full max-w-[480px] sm:max-w-[520px] rounded-3xl overflow-hidden shadow-2xl relative select-none"
        style={{
          background: 'radial-gradient(1200px 900px at 50% -10%, #2E7D32 0%, #1B5E20 40%, #0E3B12 85%)',
          minHeight: '840px',
        }}
      >
        {/* Top Wordmark */}
        <div className="pt-8 pb-5 flex justify-center items-center">
          <img
            src="/brand/base-kit/layers/wordmark-yellow.png"
            alt="FLOATE"
            className="h-10 sm:h-12 object-contain"
          />
        </div>

        {/* Inner Cream Card Sheet */}
        <div className="mx-4 sm:mx-6 mb-8 rounded-[28px] bg-[#FFFDF5] p-6 sm:p-8 relative shadow-2xl text-center flex flex-col items-center border-[3px] border-[#FFC107] ring-1 ring-[#1B5E20]/25">
          {/* Subtle inner decorative frame */}
          <div className="absolute inset-3 border border-emerald-900/15 rounded-[22px] pointer-events-none"></div>

          {/* Avatar with Gold Ring & Mini Seal Badge */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 -mt-3 mb-3">
            <div
              className="w-full h-full rounded-full p-2"
              style={{
                background:
                  'conic-gradient(from 200deg, #FFC107, #FFE082, #FFC107, #C79100, #FFC107)',
                boxShadow: '0 12px 30px rgba(14,59,18,0.3)',
              }}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-800 to-emerald-950 flex items-center justify-center border-4 border-[#FFFDF5] relative">
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
            {/* Scalloped Verified Seal Badge in bottom-right corner */}
            <img
              src="/brand/base-kit/layers/seal-verified-256.png"
              alt="Verified Seal"
              className="absolute -bottom-2 -right-2 w-14 h-14 sm:w-16 sm:h-16 drop-shadow-lg"
            />
          </div>

          {/* Kicker */}
          <div className="text-[#1B5E20] text-xs sm:text-sm font-bold tracking-[0.25em] uppercase mb-1">
            {isPlus ? 'VERIFIED PLUS ✦ CERTIFICATE' : 'CERTIFICATE OF VERIFICATION'}
          </div>

          {/* Heading with Serif Italic Accent */}
          <h1 className="text-3xl sm:text-4xl font-bold text-[#0E3B12] leading-tight mb-2">
            Verified <span className="font-serif-italic text-3xl sm:text-4xl text-[#1B5E20]">Merchant</span>
          </h1>

          {/* This certifies that */}
          <p className="text-[#4F5E4F] text-xs sm:text-sm mb-1">This certifies that</p>

          {/* Merchant Name */}
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#10200F] tracking-tight leading-tight max-w-[340px]">
            {credential.name}
          </h2>

          {/* Gold Gradient Rule */}
          <div className="w-48 sm:w-64 h-[2px] bg-gradient-to-r from-transparent via-[#FFC107] to-transparent my-3"></div>

          {/* Business Name */}
          <div className="text-base sm:text-lg font-bold text-[#1B5E20] leading-snug">
            {credential.biz}
          </div>

          {/* Location / Market */}
          <div className="text-xs sm:text-sm text-[#4F5E4F] mt-1 font-medium">
            {credential.loc}
          </div>

          {/* Verification Statement */}
          <p className="text-xs sm:text-sm text-[#2F3B2F] leading-relaxed mt-4 max-w-sm">
            has been verified by FLOATE as a real seller with a real stall. Buyers can trust this merchant and chat directly on WhatsApp.
          </p>

          {/* Check Badge Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
            {credential.checks.map((check, i) => (
              <span
                key={i}
                className="bg-[#FFF4CC] text-[#2E7D32] text-[11px] sm:text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-sm border border-amber-200/50"
              >
                <CheckCircle2 className="w-3 h-3 text-[#1B5E20]" />
                {check}
              </span>
            ))}
          </div>

          {/* Footer Metadata & Scannable QR */}
          <div className="w-full mt-6 pt-4 border-t-2 border-dashed border-[#1B5E20]/25 flex items-center justify-between">
            {/* Left: Issued Date */}
            <div className="text-left">
              <span className="block text-[10px] tracking-widest text-[#6B7A6B] font-bold uppercase">
                VERIFIED ON
              </span>
              <strong className="block text-xs sm:text-sm text-[#10200F] font-bold mt-0.5">
                {credential.verifiedOn}
              </strong>
            </div>

            {/* Center: QR Code */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-xl border-2 border-[#0E3B12] shadow-sm">
                <img
                  src="/brand/base-kit/layers/qr-buyer-whatsapp.png"
                  alt="QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[8px] sm:text-[9px] font-bold text-[#0E3B12] tracking-wider uppercase mt-1">
                SCAN TO VERIFY
              </span>
            </div>

            {/* Right: FLOATE ID */}
            <div className="text-right">
              <span className="block text-[10px] tracking-widest text-[#6B7A6B] font-bold uppercase">
                FLOATE ID
              </span>
              <strong className="block text-xs sm:text-sm text-[#10200F] font-bold mt-0.5 font-mono">
                {credential.fid}
              </strong>
            </div>
          </div>
        </div>

        {/* Outer Bottom Footer */}
        <div className="pb-8 text-center text-[#FFC107] font-semibold text-sm sm:text-base">
          <div>Find me on FLOATE ✦ floate.xyz</div>
          <span className="text-white/85 text-xs sm:text-sm font-medium mt-1 block">
            floate.xyz/m/{credential.slug}
          </span>
        </div>
      </div>
    </div>
  );
};
