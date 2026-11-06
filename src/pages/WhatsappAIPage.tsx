import React from 'react';
import { LandingHeader } from '../components/common/LandingHeader';
import { PageHero } from '../components/common/PageHero';
import { ClosingCtaBand } from '../components/common/ClosingCtaBand';
import { Footer } from '../components/common/Footer';
import { SEO } from '../components/common/SEO';
import { MessageCircle, Sparkles, ArrowRight, Search, CheckCircle2, Bot } from 'lucide-react';

interface WhatsappAIPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onExploreStalls?: () => void;
}

export default function WhatsappAIPage({ onNavigateHome, onNavigatePage, onExploreStalls }: WhatsappAIPageProps) {
  const WHATSAPP_BOT_URL = 'https://wa.me/message/YYWEZAZZIXBRF1';

  const promptChips = [
    'iPhone 13 128GB under ₦350k Onitsha',
    'Original HP Laptop charger Computer Village',
    'Solomon wholesale jeans Agbani Enugu',
    'Samsung S22 Ultra screen replacement'
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="FLOATE WhatsApp AI Search Bot — Search Physical Stalls via WhatsApp"
        description="Search thousands of physical market stalls across Onitsha, Lagos, and Enugu via voice notes or text on WhatsApp."
        url="https://www.floate.xyz/whatsapp-ai"
        type="website"
      />

      <LandingHeader
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
        currentPage="WHATSAPP_AI"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="WHATSAPP COMMERCE ENGINE"
        titleLine1="FLOATE WhatsApp AI."
        titleLine2="Voice search physical stalls directly on WhatsApp."
        subtitle="Search thousands of physical market stalls across Onitsha, Lagos, Enugu, and Owerri using natural text or voice notes."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a
            href={WHATSAPP_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-[#123F16] font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5 fill-[#123F16]" />
            <span>OPEN FLOATE WHATSAPP BOT</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </PageHero>

      {/* ── PHONE MOCKUP & PROMPT CHIPS SECTION ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-16">
        
        {/* Sample Prompts Chips */}
        <div className="text-center space-y-4">
          <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">TRY THESE PROMPTS ON WHATSAPP</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123F16]">Tap a sample search prompt:</h2>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {promptChips.map((prompt, idx) => (
              <a
                key={idx}
                href={`https://wa.me/message/YYWEZAZZIXBRF1?text=${encodeURIComponent(prompt)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-white border border-[#123F16]/15 hover:border-[#2E7D32] text-xs sm:text-sm font-bold text-[#123F16] shadow-xs hover:shadow-md transition-all flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-[#2E7D32]" />
                <span>"{prompt}"</span>
              </a>
            ))}
          </div>
        </div>

        {/* WhatsApp Chat Screen Mockup Card */}
        <div className="max-w-md mx-auto bg-[#efeae2] border-4 border-[#123F16] rounded-[24px] overflow-hidden shadow-xl font-sans">
          {/* Chat Header */}
          <div className="bg-[#123F16] text-white p-4 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center text-[#123F16] font-extrabold text-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1">
                <span>FLOATE AI Search</span>
                <span className="text-[#FFC107]">✓</span>
              </div>
              <p className="text-[11px] text-white/70">Official Market Operating System Bot</p>
            </div>
          </div>

          {/* Chat Body Messages */}
          <div className="p-4 space-y-4 text-xs">
            {/* Bot Greeting */}
            <div className="bg-white rounded-xl p-3 max-w-[85%] shadow-xs space-y-1">
              <p className="font-semibold text-[#123F16]">
                I'm FLOATE AI! Tell me what product or market item you are searching for today.
              </p>
              <span className="text-[9px] text-[#123F16]/50 block text-right">10:00 AM</span>
            </div>

            {/* Buyer Prompt */}
            <div className="bg-[#d9fdd3] rounded-xl p-3 max-w-[85%] ml-auto shadow-xs space-y-1">
              <p className="font-semibold text-[#123F16]">
                iPhone 13 128GB Onitsha Main Market under ₦350,000
              </p>
              <span className="text-[9px] text-[#123F16]/50 block text-right">10:01 AM</span>
            </div>

            {/* Bot Match Response */}
            <div className="bg-white rounded-xl p-3.5 max-w-[90%] shadow-xs space-y-2 border-l-4 border-[#25D366]">
              <div className="flex items-center gap-1.5 text-[#123F16] font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#25D366]" />
                <span>Found 2 Verified Stalls in Onitsha:</span>
              </div>
              <div className="p-2 rounded-lg bg-[#F7F7F2] space-y-1 text-[11px]">
                <p className="font-bold text-[#123F16]">📱 Emeka Gadgets (Line 3 Shop 14)</p>
                <p className="text-[#2E7D32] font-bold">₦345,000 · Verified Stock</p>
              </div>
              <a
                href={WHATSAPP_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2 rounded-lg bg-[#25D366] text-[#123F16] font-bold text-[11px]"
              >
                Connect Direct on WhatsApp →
              </a>
              <span className="text-[9px] text-[#123F16]/50 block text-right">10:01 AM</span>
            </div>
          </div>
        </div>

      </main>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
