import React from 'react';
import { LandingHeader } from '../components/common/LandingHeader';
import { PageHero } from '../components/common/PageHero';
import { ClosingCtaBand } from '../components/common/ClosingCtaBand';
import { Footer } from '../components/common/Footer';
import { SEO } from '../components/common/SEO';
import { Send, ArrowRight, Search, CheckCircle2, Bot } from 'lucide-react';

interface TelegramAIPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onExploreStalls?: () => void;
}

export default function TelegramAIPage({ onNavigateHome, onNavigatePage, onExploreStalls }: TelegramAIPageProps) {
  const TELEGRAM_BOT_URL = 'https://t.me/floate_bot';

  const promptChips = [
    'Original Samsung charger Computer Village',
    'Laptops wholesale Onitsha Main Market',
    'Fairly used iPhone 12 Pro Max Enugu'
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="FLOATE Telegram AI Bot — Physical Market Search on Telegram"
        description="Search thousands of physical market stalls across Nigeria directly on Telegram with zero app downloads."
        url="https://www.floate.xyz/telegram-ai"
        type="website"
      />

      <LandingHeader
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
        currentPage="TELEGRAM_AI"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="TELEGRAM COMMERCE BOT"
        titleLine1="FLOATE Telegram AI."
        titleLine2="Instant physical market search on Telegram."
        subtitle="Connect directly with verified physical market stalls across Onitsha, Lagos, and Enugu via Telegram."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a
            href={TELEGRAM_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#0088cc] hover:bg-[#0077b3] text-white font-extrabold text-base shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-5 h-5 fill-white" />
            <span>OPEN FLOATE TELEGRAM BOT</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </PageHero>

      {/* ── PHONE MOCKUP & PROMPT CHIPS ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-16">
        
        {/* Sample Prompts Chips */}
        <div className="text-center space-y-4">
          <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">TRY THESE PROMPTS ON TELEGRAM</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123F16]">Tap a sample search prompt:</h2>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {promptChips.map((prompt, idx) => (
              <a
                key={idx}
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-3 rounded-xl bg-white border border-[#123F16]/15 hover:border-[#0088cc] text-xs sm:text-sm font-bold text-[#123F16] shadow-xs hover:shadow-md transition-all flex items-center gap-2"
              >
                <Search className="w-3.5 h-3.5 text-[#0088cc]" />
                <span>"{prompt}"</span>
              </a>
            ))}
          </div>
        </div>

        {/* Telegram Chat Screen Mockup */}
        <div className="max-w-md mx-auto bg-[#0e1621] text-white border-4 border-[#123F16] rounded-[24px] overflow-hidden shadow-xl font-sans">
          {/* Header */}
          <div className="bg-[#17212b] p-4 flex items-center gap-3 border-b border-white/10">
            <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center text-white font-extrabold text-sm">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="font-bold text-sm flex items-center gap-1">
                <span>FLOATE Telegram Bot</span>
                <span className="text-[#0088cc]">✓</span>
              </div>
              <p className="text-[11px] text-white/60">@floate_bot</p>
            </div>
          </div>

          {/* Chat Body */}
          <div className="p-4 space-y-4 text-xs">
            <div className="bg-[#182533] rounded-xl p-3 max-w-[85%] shadow-xs space-y-1">
              <p className="font-normal text-white/90">
                Welcome to FLOATE AI Telegram search! Tell me what product or market stall item you are looking for.
              </p>
            </div>

            <div className="bg-[#2b5278] rounded-xl p-3 max-w-[85%] ml-auto shadow-xs space-y-1">
              <p className="font-semibold text-white">
                HP EliteBook i7 Computer Village
              </p>
            </div>

            <div className="bg-[#182533] rounded-xl p-3.5 max-w-[90%] shadow-xs space-y-2 border-l-4 border-[#0088cc]">
              <div className="flex items-center gap-1.5 text-white font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#0088cc]" />
                <span>Found 3 Verified Stalls:</span>
              </div>
              <p className="text-white/80 text-[11px]">
                • TechHub Nig (Line 2 Shop 8, Computer Village) — ₦220,000
              </p>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center py-2 rounded-lg bg-[#0088cc] text-white font-bold text-[11px]"
              >
                Chat Direct on Telegram →
              </a>
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
