import React from "react";
import { ChevronLeft, MapPin } from "lucide-react";

interface DetailHeaderProps {
  title: string;
  city?: string;
  onBack: () => void;
}

export const DetailHeader: React.FC<DetailHeaderProps> = ({
  title,
  city,
  onBack
}) => {
  return (
    <header className="sticky top-0 z-40 w-full h-[60px] bg-gradient-to-b from-[#0A4D3C] to-[#064E3B] text-white shadow-md flex items-center border-b border-white/10">
      <div className="max-w-[720px] w-full mx-auto px-4 flex items-center justify-between gap-3">
        {/* Left: 40x40 Chevron Back Button */}
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-white active:scale-90 transition-all focus:outline-none flex-shrink-0 cursor-pointer"
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>

        {/* Center / Mid: Truncated Title */}
        <div className="flex-1 text-center min-w-0 px-2">
          <h1 className="text-sm sm:text-base font-extrabold text-white truncate leading-tight tracking-tight">
            {title}
          </h1>
        </div>

        {/* Right: City Chip (Display Only) or Placeholder */}
        <div className="flex-shrink-0 min-w-[40px] flex justify-end">
          {city ? (
            <div className="flex items-center gap-1 bg-[#13241F]/60 border border-white/15 rounded-full px-2.5 py-1 text-[11px] font-extrabold text-[#FACC15]">
              <MapPin className="w-3 h-3 text-[#FACC15]" />
              <span>{city}</span>
            </div>
          ) : (
            <div className="w-10 h-10" />
          )}
        </div>
      </div>
    </header>
  );
};
