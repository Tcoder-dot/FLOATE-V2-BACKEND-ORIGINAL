import React from 'react';
import { MessageCircle, Store, ArrowRight, Sparkles } from 'lucide-react';

interface ClosingCtaBandProps {
  onNavigatePage?: (page: any) => void;
  onOpenMerchantAuth?: () => void;
}

export const ClosingCtaBand: React.FC<ClosingCtaBandProps> = ({ onNavigatePage, onOpenMerchantAuth }) => {
  const WHATSAPP_BOT_URL = 'https://wa.me/message/YYWEZAZZIXBRF1';

  return (
    <section className="relative bg-gradient-to-br from-[#1B5E20] via-[#123F16] to-[#0A290E] text-white py-16 sm:py-24 px-4 sm:px-8 overflow-hidden border-t border-[#FFC107]/20">
      {/* Background Soft Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,193,7,0.12)_0%,transparent_70%)] pointer-events-none" />

      <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#FFC107]/10 text-[#FFC107] border border-[#FFC107]/30 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ZERO-FRICTION MARKET SEARCH</span>
        </div>

        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Wetin you dey find? <br className="hidden sm:inline" />
          <span className="text-[#FFC107]">Floate go find am.</span>
        </h2>

        <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto font-normal leading-relaxed">
          Search thousands of verified physical market stalls across Onitsha, Lagos, Enugu, and Owerri. Connect directly with stall owners on WhatsApp in seconds.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <a
            href={WHATSAPP_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#FFC107] hover:bg-[#FFD54F] text-[#123F16] font-bold text-base shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer active:scale-95"
          >
            <MessageCircle className="w-5 h-5 fill-[#123F16]" />
            <span>TRY FLOATE ON WHATSAPP</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>

          <button
            onClick={() => {
              if (onOpenMerchantAuth) {
                onOpenMerchantAuth();
              } else if (onNavigatePage) {
                onNavigatePage('REGISTER');
              } else {
                window.location.href = '/register';
              }
            }}
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-transparent hover:bg-white/10 text-white border-2 border-[#FFC107]/60 hover:border-[#FFC107] font-bold text-base transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Store className="w-5 h-5 text-[#FFC107]" />
            <span>Sell on Floate, free</span>
          </button>
        </div>
      </div>
    </section>
  );
};
