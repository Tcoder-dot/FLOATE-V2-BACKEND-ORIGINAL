import React, { useState } from 'react';
import { LandingHeader } from '../components/common/LandingHeader';
import { PageHero } from '../components/common/PageHero';
import { ClosingCtaBand } from '../components/common/ClosingCtaBand';
import { Footer } from '../components/common/Footer';
import { SEO } from '../components/common/SEO';
import { Store, MessageCircle, ArrowRight, ShieldCheck, Zap, ChevronDown } from 'lucide-react';

interface VendorsPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onExploreStalls?: () => void;
}

const FAQS = [
  {
    q: "Is registering my market stall on FLOATE really 100% free?",
    a: "Yes! Listing your business or catalog on FLOATE is free. There are no monthly SaaS software fees."
  },
  {
    q: "Do I need a computer or website to manage my stall?",
    a: "No! All you need is your mobile phone and WhatsApp. You register, upload photos, and chat buyers directly."
  },
  {
    q: "How do buyers pay me for goods?",
    a: "Buyers pay you directly via bank transfer, cash on pickup at your physical stall line, or waybill delivery."
  },
  {
    q: "How does the Pay-Per-Lead credit model work?",
    a: "You get 10 free trial credits upon sign-up. After that, 1 Credit (₦200) is deducted only when a live buyer initiates a direct WhatsApp message."
  }
];

export default function VendorsPage({ onNavigateHome, onNavigatePage, onExploreStalls }: VendorsPageProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="For Vendors & Physical Stalls — Sell Free on FLOATE"
        description="List your physical market stall for free on Google & FLOATE. Receive direct buyer leads on WhatsApp every day."
        url="https://www.floate.xyz/vendors"
        type="website"
      />

      <LandingHeader
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
        currentPage="VENDORS_PAGE"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="FOR PHYSICAL MARKET STALL OWNERS"
        titleLine1="Turn Your Market Stall Into a"
        titleLine2="Digital Sales Magnet."
        subtitle="Get direct buyer leads on WhatsApp every day. Shoppers searching across physical trade markets find your stall directly — no website or ad budgets required."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={() => onNavigatePage('REGISTER')}
            className="px-8 py-4 rounded-xl bg-[#FFC107] hover:bg-[#FFD54F] text-[#123F16] font-extrabold text-base shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Store className="w-5 h-5 text-[#123F16]" />
            <span>Register Stall Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </PageHero>

      {/* ── ADVANTAGES ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-16">
        
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">MERCHANT ADVANTAGES</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#123F16]">Why Stall Owners Trust FLOATE</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#123F16]/10 p-8 rounded-2xl shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-lg">
              <Zap className="w-6 h-6 text-[#2E7D32]" />
            </div>
            <h3 className="text-xl font-bold text-[#123F16]">No Website or Coding</h3>
            <p className="text-xs sm:text-sm text-[#123F16]/80 leading-relaxed font-normal">
              No technical setup or app downloads. List products directly using voice notes or photos over WhatsApp.
            </p>
          </div>

          <div className="bg-white border border-[#123F16]/10 p-8 rounded-2xl shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#FFC107]/20 text-[#123F16] flex items-center justify-center font-bold text-lg">
              <ShieldCheck className="w-6 h-6 text-[#123F16]" />
            </div>
            <h3 className="text-xl font-bold text-[#123F16]">Verified Stall Badge</h3>
            <p className="text-xs sm:text-sm text-[#123F16]/80 leading-relaxed font-normal">
              Physical address and line number build instant trust with buyers across African trade markets.
            </p>
          </div>

          <div className="bg-white border border-[#123F16]/10 p-8 rounded-2xl shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center font-bold text-lg">
              <MessageCircle className="w-6 h-6 text-[#2E7D32]" />
            </div>
            <h3 className="text-xl font-bold text-[#123F16]">Direct WhatsApp Leads</h3>
            <p className="text-xs sm:text-sm text-[#123F16]/80 leading-relaxed font-normal">
              Shoppers chat you directly on WhatsApp. Video call buyers, send bank details, and dispatch waybills.
            </p>
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-3xl mx-auto space-y-6 pt-6">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">QUESTIONS & ANSWERS</span>
            <h3 className="text-2xl font-bold text-[#123F16]">Frequently Asked Questions</h3>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, idx) => (
              <div key={idx} className="bg-white border border-[#123F16]/10 rounded-2xl overflow-hidden shadow-xs">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base text-[#123F16] flex items-center justify-between"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${openFaq === idx ? 'rotate-180 text-[#2E7D32]' : ''}`} />
                </button>
                {openFaq === idx && (
                  <div className="p-5 pt-0 text-xs sm:text-sm text-[#123F16]/80 border-t border-[#123F16]/5 leading-relaxed font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
