import React from 'react';
import { LandingHeader } from './common/LandingHeader';
import { PageHero } from './common/PageHero';
import { ClosingCtaBand } from './common/ClosingCtaBand';
import { Footer } from './common/Footer';
import { SEO } from './common/SEO';
import { 
  Building2, Sparkles, Target, Users, Mail, ArrowRight, ShieldCheck, CheckCircle2, User, Globe, Store, MessageCircle
} from 'lucide-react';

interface AboutUsPageProps {
  onBack?: () => void;
  onNavigateHome?: () => void;
  onNavigatePage?: (page: any) => void;
  onExploreStalls?: () => void;
}

export default function AboutUsPage({ onBack, onNavigateHome, onNavigatePage, onExploreStalls }: AboutUsPageProps) {
  const WHATSAPP_BOT_URL = 'https://wa.me/message/YYWEZAZZIXBRF1';
  const handleHome = onNavigateHome || onBack || (() => {});

  // Organization Schema JSON-LD Structured Data
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": "https://www.floate.xyz/#organization",
    "name": "FLOATE AFRICA LTD",
    "alternateName": ["FLOATE", "FLOATE AI", "MBó by FLOATE"],
    "legalName": "FLOATE AFRICA LTD",
    "url": "https://www.floate.xyz",
    "logo": "https://i.postimg.cc/W3vJZH6m/20260929-130843.png",
    "email": "support@floate.xyz",
    "description": "FLOATE AFRICA LTD is an AI-native Market Operating System building digital search and lead-routing infrastructure for the African informal retail economy.",
    "founder": {
      "@type": "Person",
      "name": "Chukwuemeka Rich",
      "alternateName": "TELMAN",
      "jobTitle": "Founder & Chief Executive Officer",
      "url": "https://www.floate.xyz/founder"
    },
    "foundingLocation": {
      "@type": "Place",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "Nigeria",
        "addressRegion": "Lagos & Enugu State"
      }
    },
    "areaServed": [
      {
        "@type": "Place",
        "name": "Sub-Saharan Africa"
      },
      {
        "@type": "Place",
        "name": "Nigeria"
      },
      {
        "@type": "Place",
        "name": "Computer Village Lagos"
      },
      {
        "@type": "Place",
        "name": "Onitsha Main Market"
      },
      {
        "@type": "Place",
        "name": "Agbani, Enugu"
      }
    ],
    "knowsAbout": [
      "African Informal Market Commerce",
      "Pay-Per-Lead Credit System",
      "WhatsApp Commerce Search Engine",
      "Market Operating System Nigeria",
      "Local SME Digital Indexing"
    ]
  };

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="About Floate — The Market Don Enter Your Phone | FLOATE AFRICA LTD"
        description="FLOATE AFRICA LTD is an AI-native Market Operating System digitizing Africa's $1.5T informal economy via zero-friction WhatsApp lead routing."
        url="https://www.floate.xyz/about"
        type="website"
        schemaData={organizationSchema}
      />

      <LandingHeader
        onNavigateHome={handleHome}
        onNavigatePage={onNavigatePage || (() => {})}
        onExploreStalls={onExploreStalls}
        currentPage="ABOUT"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="ABOUT FLOATE AFRICA LTD"
        titleLine1="About Floate."
        titleLine2="The market don enter your phone."
        subtitle="Digitizing Africa's $1.5 Trillion informal commerce engine with zero-friction WhatsApp search and direct buyer lead routing."
      >
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <a
            href={WHATSAPP_BOT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#FFC107] hover:bg-[#FFD54F] text-[#123F16] font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 fill-[#123F16]" />
            <span>Try Floate Search</span>
          </a>

          {onNavigatePage && (
            <button
              onClick={() => onNavigatePage('FOUNDER')}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-transparent hover:bg-white/10 text-white border border-[#FFC107]/60 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4 text-[#FFC107]" />
              <span>Meet Founder Chukwuemeka Rich (TELMAN)</span>
            </button>
          )}
        </div>
      </PageHero>

      {/* ── OUR STORY SECTION (Cream Background) ── */}
      <section className="bg-[#FFF8E1] py-16 sm:py-24 px-4 sm:px-8 border-b border-[#123F16]/10">
        <div className="max-w-[760px] mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#123F16]/10 text-[#123F16] text-xs font-bold uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-[#2E7D32]" />
            <span>OUR STORY & MISSION</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#123F16] tracking-tight">
            Connecting Physical Stalls Directly to Shoppers
          </h2>

          <div className="space-y-5 text-base sm:text-lg text-[#123F16]/80 leading-relaxed font-normal">
            <p>
              Over 80% of retail commerce across Sub-Saharan Africa takes place in informal physical markets like Computer Village Lagos, Onitsha Main Market, Agbani Enugu, and Ariaria Market Aba.
            </p>
            <p>
              Despite rapid smartphone adoption, traditional e-commerce accounts for under 2% of total retail sales. Legacy storefront apps fail because they force low-margin micro-traders into complex app downloads, heavy inventory management software, and commission fees that destroy their margins.
            </p>
            <p className="font-semibold text-[#123F16]">
              FLOATE eliminates platform adoption barriers through a lightweight web search console paired directly with WhatsApp—where 95%+ of informal market negotiation and trade settlement already happens.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW FLOATE WORKS FOR BUYERS & SELLERS (Two White Cards Side-by-Side) ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center space-y-3 mb-12">
          <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">TWO-SIDED VALUE</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#123F16]">How Floate Works</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Card 1: For Buyers */}
          <div className="bg-white border border-[#123F16]/10 rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#E8F5E9] text-[#123F16] flex items-center justify-center font-bold text-lg">
              🔍
            </div>
            <h3 className="text-2xl font-bold text-[#123F16]">For Shoppers & Buyers</h3>
            <ul className="space-y-4 text-sm text-[#123F16]/80 font-normal">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <span><strong>Zero Registration Needed:</strong> Search thousands of physical market stalls without creating an account or downloading an app.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <span><strong>Real-Time Stall Matching:</strong> Type or send voice notes in Pidgin or English to find exactly which stall has your product in stock.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <span><strong>Direct WhatsApp Connection:</strong> Click one button to chat directly with verified stall owners to negotiate, request video verification, or arrange delivery.</span>
              </li>
            </ul>
          </div>

          {/* Card 2: For Sellers */}
          <div className="bg-white border border-[#123F16]/10 rounded-2xl p-8 sm:p-10 shadow-sm space-y-6">
            <div className="w-12 h-12 rounded-xl bg-[#FFC107]/20 text-[#123F16] flex items-center justify-center font-bold text-lg">
              🏪
            </div>
            <h3 className="text-2xl font-bold text-[#123F16]">For Market Stall Owners</h3>
            <ul className="space-y-4 text-sm text-[#123F16]/80 font-normal">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <span><strong>100% Free Stall Setup:</strong> Set up your digital market stall in under 60 seconds with your WhatsApp phone number.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <span><strong>Pay-Per-Lead Unit Model:</strong> No monthly SaaS subscriptions. Pay 1 Credit only when a live, ready-to-buy customer chats up your stall.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#2E7D32] shrink-0 mt-0.5" />
                <span><strong>Indexed on Google & Floate:</strong> Your stall items automatically index on Google search and FLOATE AI search results.</span>
              </li>
            </ul>
          </div>

        </div>
      </section>

      {/* ── HOW VERIFICATION WORKS ── */}
      <section className="bg-[#FFF8E1] py-16 sm:py-24 px-4 sm:px-8 border-t border-b border-[#123F16]/10">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">TRUST & AUTHENTICITY</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#123F16]">How Stall Verification Works</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#123F16]/10 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#123F16] text-[#FFC107] font-bold flex items-center justify-center text-sm">1</div>
              <h4 className="font-bold text-base text-[#123F16]">WhatsApp Auth</h4>
              <p className="text-xs text-[#123F16]/80">Merchants sign in via 1-click WhatsApp session challenge code to verify phone ownership.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#123F16]/10 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#123F16] text-[#FFC107] font-bold flex items-center justify-center text-sm">2</div>
              <h4 className="font-bold text-base text-[#123F16]">Physical Stall Audit</h4>
              <p className="text-xs text-[#123F16]/80">Physical line address (e.g. Line 4 Shop 12, Computer Village) is cross-referenced by local market reps.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#123F16]/10 shadow-xs space-y-3">
              <div className="w-8 h-8 rounded-full bg-[#123F16] text-[#FFC107] font-bold flex items-center justify-center text-sm">3</div>
              <h4 className="font-bold text-base text-[#123F16]">Verified Badge Issued</h4>
              <p className="text-xs text-[#123F16]/80">A green Verified Stall badge is assigned, unlocking buyer confidence and top search placement.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE MARKETS CHIPS & COMPANY FACTS CARD ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-8 max-w-5xl mx-auto space-y-12">
        
        {/* Market Chips */}
        <div className="text-center space-y-4">
          <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-widest">ACTIVE TRADE HUBS</span>
          <h3 className="text-2xl font-bold text-[#123F16]">Markets Indexed on Floate</h3>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {['Computer Village Lagos', 'Onitsha Main Market', 'Agbani, Enugu', 'Ariaria Market Aba', 'Ogbete Main Market', 'Alaba International'].map((market) => (
              <span key={market} className="px-4 py-2 rounded-xl bg-white border border-[#123F16]/15 text-xs sm:text-sm font-semibold text-[#123F16] shadow-xs">
                📍 {market}
              </span>
            ))}
          </div>
        </div>

        {/* Company Facts Card & Founder Teaser */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
          
          {/* Corporate Card */}
          <div className="bg-white border border-[#123F16]/10 rounded-2xl p-8 shadow-sm space-y-4">
            <div className="flex items-center gap-2 font-extrabold text-lg text-[#123F16]">
              <ShieldCheck className="w-5 h-5 text-[#2E7D32]" />
              <span>Corporate Entity Facts</span>
            </div>
            <div className="space-y-2 text-xs sm:text-sm text-[#123F16]/80">
              <p><strong>Legal Name:</strong> FLOATE AFRICA LTD</p>
              <p><strong>CAC Registration:</strong> RC 9365804</p>
              <p><strong>Operating Regions:</strong> Lagos, Enugu, Anambra, Imo, Abia</p>
              <p><strong>Support Email:</strong> <a href="mailto:support@floate.xyz" className="text-[#2E7D32] underline font-bold">support@floate.xyz</a></p>
            </div>
          </div>

          {/* Founder Teaser Card */}
          <div className="bg-[#123F16] text-white rounded-2xl p-8 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#FFC107] uppercase tracking-wider">FOUNDER & CEO</span>
              <h4 className="text-xl sm:text-2xl font-extrabold text-white">Chukwuemeka Rich (TELMAN)</h4>
              <p className="text-xs text-white/80 leading-relaxed">
                Systems Architect, AI Engineer, and Founder of FLOATE AFRICA LTD. Building digital infrastructure for the African informal economy.
              </p>
            </div>
            {onNavigatePage && (
              <button
                onClick={() => onNavigatePage('FOUNDER')}
                className="inline-flex items-center gap-2 text-xs font-bold text-[#FFC107] hover:underline cursor-pointer pt-2"
              >
                <span>Read Founder Bio & Storyline</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

        </div>

      </section>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={handleHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
