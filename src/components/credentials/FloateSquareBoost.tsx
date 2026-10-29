import React, { useState } from 'react';
import { Download, ExternalLink, MessageCircle, Upload, Image as ImageIcon } from 'lucide-react';

interface Props {
  headline?: string;
  italicWord?: string;
  body?: string;
  tag?: string;
  productPhotoUrl?: string;
  whatsappNumber?: string;
  cityName?: string;
  locationDisplay?: string;
}

export const FloateSquareBoost: React.FC<Props> = ({
  headline = 'Skip the traffic.',
  italicWord = 'Find it',
  body,
  tag = 'WETIN YOU DEY FIND?',
  productPhotoUrl,
  whatsappNumber = '+234 911 516 2081',
  cityName = 'Onitsha',
  locationDisplay,
}) => {
  const [photo, setPhoto] = useState<string | undefined>(productPhotoUrl);

  const resolvedBody = body
    ? body
    : locationDisplay
    ? `Verified sellers in ${locationDisplay}. Tell Floate what you need.`
    : cityName.toLowerCase().includes('lagos')
    ? 'Verified sellers in Lagos. Tell Floate what you need.'
    : `Verified sellers in ${cityName}. Tell Floate what you need.`;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
    }
  };

  return (
    <div className="flex flex-col items-center">
      {/* Top Action Bar */}
      <div className="w-full max-w-xl flex items-center justify-between mb-4 bg-emerald-950/60 p-3 rounded-2xl border border-emerald-800/40 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
          <span className="text-emerald-200 font-semibold uppercase tracking-wider">
            1080×1080 Product Boost Square
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 px-3 py-1.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 rounded-lg transition-colors cursor-pointer font-medium">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Photo</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </label>
          <a
            href={`/api/credentials/${(whatsappNumber || '').replace(/\D/g, '') || 'FLT-ONT-00142'}/download/square`}
            download
            className="flex items-center gap-1 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-emerald-950 font-bold rounded-lg transition-colors shadow-sm"
            title="Download 1080×1080 Square Status PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </a>
        </div>
      </div>

      {/* 
        Exact 1080x1080 Square Layout (matches floate-square-template.png and square.html)
      */}
      <div
        id="floate-square-canvas"
        className="w-full max-w-[480px] sm:max-w-[520px] aspect-square rounded-3xl overflow-hidden shadow-2xl relative select-none flex flex-col justify-between"
        style={{
          background:
            'radial-gradient(1000px 800px at 85% 10%, #2E7D32 0%, #1B5E20 40%, #0E3B12 90%)',
        }}
      >
        {/* Ghost background watermark icon */}
        <img
          src="/brand/base-kit/layers/icon-yellow.png"
          alt=""
          className="absolute -right-8 bottom-24 w-64 opacity-5 pointer-events-none"
        />

        {/* Top Bar: Floate Wordmark + Yellow Pill Tag */}
        <div className="p-6 sm:p-7 flex items-center justify-between z-10">
          <img
            src="/brand/base-kit/layers/wordmark-yellow.png"
            alt="FLOATE"
            className="h-7 sm:h-9 object-contain"
          />
          <div className="bg-[#FFC107] text-[#0E3B12] font-extrabold text-[10px] sm:text-xs tracking-wider px-3.5 py-1.5 rounded-full uppercase shadow-md">
            {tag}
          </div>
        </div>

        {/* Middle Section: Left Copy & Right 400x520 Photo Box */}
        <div className="px-6 sm:px-7 flex items-center gap-4 sm:gap-6 my-auto z-10">
          {/* Left Text */}
          <div className="flex-1 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
              {headline}{' '}
              <span className="font-serif-italic text-[#FFC107] text-2xl sm:text-3xl">
                {italicWord}
              </span>{' '}
              on WhatsApp.
            </h1>
            <p className="text-[#E3F1E4] text-xs sm:text-sm mt-3 leading-relaxed">
              {resolvedBody}
            </p>
          </div>

          {/* Right Photo Placeholder / Boost Image */}
          <div className="w-36 h-48 sm:w-44 sm:h-56 rounded-2xl bg-[#145018] border-2 border-dashed border-[#FFC107]/70 flex flex-col items-center justify-center text-center p-3 overflow-hidden relative shadow-lg flex-shrink-0">
            {photo ? (
              <img
                src={photo}
                alt="Product"
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <div className="flex flex-col items-center text-[#FFC107]">
                <ImageIcon className="w-6 h-6 mb-2 opacity-80" />
                <span className="text-[10px] sm:text-xs font-bold tracking-wider uppercase leading-tight">
                  PRODUCT OR<br />MERCHANT PHOTO
                </span>
                <span className="text-[9px] text-[#FFC107]/70 font-mono mt-1">
                  400 × 520
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Cream Bar: WhatsApp Button + Web URL */}
        <div className="bg-[#FFFDF5] p-5 sm:p-6 flex items-center justify-between border-t-2 border-emerald-950/10 z-10">
          <a
            href={`https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noreferrer"
            className="bg-[#1B5E20] hover:bg-[#145018] text-[#FFC107] font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4 fill-[#FFC107] text-[#1B5E20]" />
            <span>Chat Floate</span>
          </a>

          <div className="text-right">
            <span className="text-xs sm:text-sm font-bold text-[#0E3B12] block">
              floate.xyz
            </span>
            <span className="text-[10px] sm:text-xs text-[#6B7A6B] font-semibold">
              {whatsappNumber}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
