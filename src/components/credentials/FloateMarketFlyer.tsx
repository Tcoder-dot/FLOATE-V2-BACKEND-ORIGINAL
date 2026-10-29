import React from 'react';
import { Download, ExternalLink, Printer, MessageCircle, Sparkles, QrCode } from 'lucide-react';

interface Props {
  whatsappNumber?: string;
  cityName?: string;
  marketName?: string;
  locationDisplay?: string;
}

export const FloateMarketFlyer: React.FC<Props> = ({
  whatsappNumber = '+234 911 516 2081',
  cityName = 'Onitsha',
  marketName,
  locationDisplay,
}) => {
  const handlePrint = () => {
    window.print();
  };

  // Derive dynamic header city/market string
  const resolvedHeaderLocation = locationDisplay
    ? locationDisplay.toUpperCase()
    : marketName
    ? `${cityName.toUpperCase()} · ${marketName.toUpperCase()}`
    : cityName.toLowerCase().includes('lagos')
    ? 'LAGOS · BALOGUN · ALABA'
    : cityName.toLowerCase().includes('aba')
    ? 'ABA · ARIARIA · NGWA'
    : cityName.toLowerCase().includes('kano')
    ? 'KANO · KURMI · SABON GARI'
    : cityName.toLowerCase().includes('abuja')
    ? 'ABUJA · WUSE · GARKI'
    : cityName.toLowerCase().includes('enugu')
    ? 'ENUGU · OGBETE · KENYATTA'
    : cityName.toLowerCase().includes('owerri')
    ? 'OWERRI · RELIEF · EKE UKWU'
    : `${cityName.toUpperCase()} MARKET NETWORK`;

  const resolvedMarketMention = marketName
    ? `${marketName}, ${cityName}`
    : `${cityName} Market Hub`;

  return (
    <div className="flex flex-col items-center">
      {/* Top Action Bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-emerald-200 font-semibold uppercase tracking-wider">
            Market Flyer A5 ({cityName})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/credentials/${(whatsappNumber || '').replace(/\D/g, '') || 'FLT-ONT-00142'}/download/flyer`}
            download
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold rounded-lg transition-colors shadow-sm"
            title="Download high-resolution print-ready A5 PNG flyer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </a>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg transition-colors font-medium"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print A5</span>
          </button>
        </div>
      </div>

      {/* 
        Exact A5 Portrait Layout (matches floate-market-flyer-A5.png and flyer.html)
        Ratio 148x210mm -> 874x1240 css px
      */}
      <div
        id="floate-flyer-canvas"
        className="w-full max-w-[480px] sm:max-w-[500px] bg-[#FFFDF5] rounded-3xl overflow-hidden shadow-2xl relative select-none flex flex-col justify-between border-2 border-emerald-950/10 text-left"
        style={{ minHeight: '740px' }}
      >
        {/* Upper Green Header with Curved Bottom */}
        <div
          className="p-6 sm:p-7 relative pb-10"
          style={{
            background:
              'radial-gradient(900px 700px at 20% 0%, #2E7D32 0%, #1B5E20 45%, #0E3B12 100%)',
            borderRadius: '0 0 40px 40px',
          }}
        >
          {/* Top Brand Row */}
          <div className="flex items-center justify-between">
            <img
              src="/brand/base-kit/layers/wordmark-yellow.png"
              alt="FLOATE"
              className="h-7 sm:h-9 object-contain"
            />
            <div className="text-white/90 text-[10px] sm:text-xs font-bold tracking-widest uppercase truncate max-w-[220px] text-right">
              {resolvedHeaderLocation}
            </div>
          </div>

          {/* Pidgin Kicker */}
          <div className="text-[#FFC107] font-bold text-sm sm:text-base mt-6 flex items-center gap-1">
            Wetin you dey find? ✦
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mt-1.5">
            Tell Floate what you need. Get{' '}
            <span className="font-serif-italic text-[#FFC107] text-3xl sm:text-4xl">
              matched
            </span>{' '}
            on WhatsApp.
          </h1>

          {/* Subtitle */}
          <p className="text-[#E3F1E4] text-xs sm:text-sm leading-relaxed mt-3 max-w-[280px] sm:max-w-[320px]">
            Type it or send a voice note, in English or Pidgin. We connect you to verified sellers in {cityName}. Free.
          </p>

          {/* Floating Angled WhatsApp Chat Mockup */}
          <div
            className="absolute right-4 bottom-[-24px] sm:bottom-[-20px] w-52 sm:w-60 bg-white rounded-2xl p-3 shadow-2xl border border-gray-100 z-10"
            style={{ transform: 'rotate(3deg)' }}
          >
            {/* Header */}
            <div className="flex items-center gap-2 pb-2 border-b border-gray-100 text-xs font-bold text-gray-800">
              <div className="w-5 h-5 rounded-full bg-[#1B5E20] flex items-center justify-center p-0.5">
                <img
                  src="/brand/base-kit/layers/icon-yellow.png"
                  alt=""
                  className="w-3.5 h-3.5 object-contain"
                />
              </div>
              <span>FLOATE AI ✓</span>
            </div>
            {/* User message */}
            <div className="bg-[#DCF8C6] text-gray-900 text-[10px] sm:text-xs p-2 rounded-xl rounded-br-xs mt-2 ml-auto max-w-[90%] leading-tight">
              I need quality Ankara fabric, under ₦15k
            </div>
            {/* Floate AI Reply */}
            <div className="bg-[#FFF4CC] text-emerald-950 text-[10px] sm:text-xs p-2 rounded-xl rounded-bl-xs mt-1.5 mr-auto max-w-[92%] leading-tight font-medium">
              Found 3 verified sellers for you in {resolvedMarketMention} 👇
            </div>
          </div>
        </div>

        {/* Lower White / Cream Section */}
        <div className="p-6 sm:p-7 pt-12 flex flex-col justify-between flex-1">
          {/* Main Grid: QR Box on Left + Steps on Right */}
          <div className="flex items-start gap-5 sm:gap-6">
            {/* Left QR Box */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="w-28 h-28 sm:w-36 sm:h-36 bg-white p-2.5 rounded-2xl border-3 border-[#0E3B12] shadow-md flex items-center justify-center">
                <img
                  src="/brand/base-kit/layers/qr-buyer-whatsapp.png"
                  alt="Scan QR"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] sm:text-[10px] font-bold text-[#0E3B12] tracking-wider uppercase mt-2 text-center max-w-[120px] leading-tight">
                SCAN TO START ON WHATSAPP
              </span>
            </div>

            {/* Right Steps 1-2-3 */}
            <div className="flex-1 space-y-3.5 sm:space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FFC107] text-[#0E3B12] font-bold text-xs sm:text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                  1
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-extrabold text-[#10200F] leading-tight">
                    Scan the code
                  </strong>
                  <span className="text-[11px] sm:text-xs text-[#2F3B2F] leading-tight block">
                    WhatsApp opens with Floate
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FFC107] text-[#0E3B12] font-bold text-xs sm:text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                  2
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-extrabold text-[#10200F] leading-tight">
                    Say wetin you need
                  </strong>
                  <span className="text-[11px] sm:text-xs text-[#2F3B2F] leading-tight block">
                    Item, budget, your market
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#FFC107] text-[#0E3B12] font-bold text-xs sm:text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                  3
                </div>
                <div>
                  <strong className="block text-xs sm:text-sm font-extrabold text-[#10200F] leading-tight">
                    Chat verified sellers
                  </strong>
                  <span className="text-[11px] sm:text-xs text-[#2F3B2F] leading-tight block">
                    Real stalls, real prices
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* WhatsApp Direct Pill Button & Web Footer */}
          <div className="mt-6 pt-3">
            <a
              href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="w-full bg-[#1B5E20] hover:bg-[#145018] text-[#FFC107] font-extrabold text-sm sm:text-base py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-md transition-colors"
            >
              <MessageCircle className="w-5 h-5 fill-[#FFC107] text-[#1B5E20]" />
              <span>{whatsappNumber}</span>
            </a>

            <div className="mt-3 flex items-center justify-between text-[11px] text-[#6B7A6B] font-semibold tracking-wider">
              <span>floate.xyz</span>
              <span>Free Buyer Matchmaking</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
