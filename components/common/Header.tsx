import React, { useState, useEffect } from "react";
import { MessageSquare, ShieldCheck, ShoppingBag } from "lucide-react";
import { CommandBar } from "./CommandBar";
import { useCart } from "../../context/CartContext";

interface HeaderProps {
  currentCity?: string;
  onSelectCity?: (city: string) => void;
  onOpenMoreCitiesModal?: () => void;
  onNavigateHome: () => void;
  onNavigateSearch: (query?: string, category?: string, maxPrice?: number) => void;
  src?: string | null;
}

const HEADER_LANGUAGES = [
  { code: "PIDGIN", text: "Wetin you dey find?" },
  { code: "IGBO", text: "Kedu ihe ị na-achọ?" },
  { code: "YORUBA", text: "Kí ni o ń wá?" },
  { code: "HAUSA", text: "Mene ne kake nema?" },
  { code: "ENGLISH", text: "What are you looking for?" }
];

export const Header: React.FC<HeaderProps> = ({
  onNavigateHome,
  onNavigateSearch,
  src
}) => {
  const [langIdx, setLangIdx] = useState(0);
  const { cart, setIsCartDrawerOpen } = useCart();
  const isFromWhatsApp = src === "wa";

  // Auto-rotate languages every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setLangIdx((prev) => (prev + 1) % HEADER_LANGUAGES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="relative w-full z-40 bg-gradient-to-b from-[#0A4D3C] to-[#064E3B] text-white transition-all shadow-md">
      {/* Top Bar for WhatsApp in-app browser sessions */}
      {isFromWhatsApp && (
        <div className="h-9 bg-[#E6F4EA] text-[#0A4D3C] border-b border-[#0A4D3C]/10 px-4 flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 fill-[#0A4D3C]" />
            <span>Opened from Floate WhatsApp</span>
          </div>
          <span className="text-[11px] text-[#5B6E66]">Verified Session</span>
        </div>
      )}

      {/* Header Container */}
      <div className="max-w-[720px] mx-auto px-4 pt-4 pb-10 flex flex-col justify-between">
        {/* Top Bar: FLOATE Wordmark + Cart + City Chip */}
        <div className="flex items-center justify-between relative">
          {/* Left: FLOATE Logo inside app */}
          <div className="flex flex-col">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="flex items-center hover:opacity-90 transition-opacity cursor-pointer"
            >
              <img
                src="https://i.postimg.cc/hvHgYf4r/20260929-130945.png"
                alt="FLOATE Logo"
                className="h-24 sm:h-32 w-auto object-contain block p-0 m-0 max-w-[320px] sm:max-w-[440px]"
                referrerPolicy="no-referrer"
              />
            </a>
          </div>

          {/* Right: Cart Button & Trade Hub Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2.5 rounded-full bg-white/12 border border-white/20 hover:bg-white/20 text-white transition-all cursor-pointer active:scale-90 flex items-center justify-center shadow-xs"
              aria-label="View Cart"
              title="View Cart"
            >
              <ShoppingBag className="w-4 h-4 text-white" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FFC107] text-[#123F16] text-[9.5px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-xs">
                  {cart.count}
                </span>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-1.5 bg-white/12 border border-white/20 rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-xs backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse shrink-0" />
              <span className="text-white/95 text-[11px] sm:text-xs">All Trade Hubs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Command Bar: Half overlaps Header into Content */}
      <div className="max-w-[720px] mx-auto px-4 -mb-6 relative z-10">
        <CommandBar onSearch={onNavigateSearch} />
      </div>
    </header>
  );
};
