import React from 'react';
import { LandingHeader } from '../components/common/LandingHeader';
import { PageHero } from '../components/common/PageHero';
import { ClosingCtaBand } from '../components/common/ClosingCtaBand';
import { Footer } from '../components/common/Footer';
import { SEO } from '../components/common/SEO';
import { Building2, ArrowRight, ShieldCheck, CheckCircle2, Users } from 'lucide-react';

interface CompanyPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onExploreStalls?: () => void;
}

export default function CompanyPage({ onNavigateHome, onNavigatePage, onExploreStalls }: CompanyPageProps) {
  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="Company & Corporate Vision | FLOATE AFRICA LTD"
        description="FLOATE AFRICA LTD is digitizing physical market stall merchants across major African trade hubs."
        url="https://www.floate.xyz/company"
        type="website"
      />

      <LandingHeader
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
        currentPage="COMPANY"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="COMPANY & LEADERSHIP"
        titleLine1="The Operating System for"
        titleLine2="Pan-African Physical Commerce."
        subtitle="Digitizing physical market stall merchants across major African trade hubs — connecting them directly to shoppers over WhatsApp and Telegram."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigatePage('FOUNDER')}
            className="px-8 py-3.5 rounded-xl bg-[#FFC107] hover:bg-[#FFD54F] text-[#123F16] font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>Read Founder's Storyline</span>
          </button>
          <button
            onClick={() => onNavigatePage('CONTACT')}
            className="px-8 py-3.5 rounded-xl bg-transparent hover:bg-white/10 text-white border border-[#FFC107]/60 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Contact Corporate HQ</span>
          </button>
        </div>
      </PageHero>

      {/* ── FOUNDER SPOTLIGHT CARD ── */}
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-12">
        <div className="bg-white border border-[#123F16]/10 rounded-[18px] p-8 sm:p-12 shadow-sm space-y-8">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-[#123F16]/10 pb-6">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden bg-[#E8F5E9] border border-[#123F16]/20 shrink-0">
              <img
                src="https://i.postimg.cc/3xvq0kRg/1768560369161.jpg"
                alt="Chukwuemeka Rich (TELMAN)"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1.5 text-center sm:text-left">
              <span className="px-3 py-1 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-xs font-bold uppercase tracking-wider">
                Founder & Chief Executive Officer
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#123F16]">
                Chukwuemeka Rich (TELMAN)
              </h2>
              <p className="text-xs sm:text-sm text-[#123F16]/70 font-semibold">
                Systems Architect, AI Engineer, Commerce Pioneer
              </p>
            </div>
          </div>

          <div className="space-y-4 text-sm sm:text-base text-[#123F16]/80 leading-relaxed font-normal">
            <p className="text-base sm:text-lg font-semibold text-[#123F16]">
              "Africa’s real commerce does not happen on complex web storefronts or rigid e-commerce apps — it happens inside physical trade hubs across African cities."
            </p>
            <p>
              Millions of verified stall owners sell billions of dollars in inventory, but buyers struggle to find specific products without walking for hours under the hot sun. FLOATE was built to bridge this gap cleanly.
            </p>
            <p>
              We empower physical market merchants to list their live stall catalogs in seconds using voice notes in Pidgin and English. Buyers search naturally, video call stall owners, and complete trades directly over WhatsApp with zero middleman fees.
            </p>
          </div>
        </div>
      </main>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
