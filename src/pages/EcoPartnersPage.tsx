import React from 'react';
import { LandingHeader } from '../components/common/LandingHeader';
import { PageHero } from '../components/common/PageHero';
import { ClosingCtaBand } from '../components/common/ClosingCtaBand';
import { Footer } from '../components/common/Footer';
import { SEO } from '../components/common/SEO';
import { Handshake, ArrowRight, ShieldCheck, Globe, Building2 } from 'lucide-react';

interface EcoPartnersPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onExploreStalls?: () => void;
}

export default function EcoPartnersPage({ onNavigateHome, onNavigatePage, onExploreStalls }: EcoPartnersPageProps) {
  const partners = [
    { name: 'Meta / WhatsApp Business', category: 'Messaging Infrastructure', desc: 'Official WhatsApp Cloud API & deep link lead routing partner.' },
    { name: 'Bachs.io & Paystack', category: 'Payment Infrastructure', desc: 'Compliant payment processing for merchant credit top-ups.' },
    { name: 'Telegram Open Platform', category: 'Messaging Infrastructure', desc: 'AI bot search integration for Telegram users across Africa.' },
    { name: 'Market Traders Associations', category: 'Local Market Partners', desc: 'Direct market stall verification reps in Computer Village, Onitsha, and Agbani.' }
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="Eco Partners & Strategic Ecosystem | FLOATE AFRICA LTD"
        description="Partnerships powering FLOATE AFRICA LTD digital search and lead routing infrastructure across African markets."
        url="https://www.floate.xyz/eco-partners"
        type="website"
      />

      <LandingHeader
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
        currentPage="ECO_PARTNERS"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="ECOSYSTEM PARTNERS"
        titleLine1="Ecosystem Partners."
        titleLine2="Building together for African commerce."
        subtitle="Collaboration with technology platforms, payment gateways, and market trader associations across West Africa."
      />

      {/* ── PARTNERS GRID ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {partners.map((p, idx) => (
            <div key={idx} className="bg-white border border-[#123F16]/10 rounded-2xl p-8 shadow-sm space-y-3">
              <span className="text-xs font-bold text-[#2E7D32] uppercase tracking-wider">{p.category}</span>
              <h3 className="text-xl font-bold text-[#123F16]">{p.name}</h3>
              <p className="text-xs sm:text-sm text-[#123F16]/80 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Partner CTA Card */}
        <div className="bg-[#123F16] text-white rounded-2xl p-8 sm:p-12 text-center space-y-4 max-w-2xl mx-auto shadow-md">
          <h3 className="text-2xl font-extrabold text-white">Partner with FLOATE</h3>
          <p className="text-xs sm:text-sm text-white/80 max-w-md mx-auto">
            Are you a payment provider, logistics network, or market association interested in expanding informal market commerce?
          </p>
          <button
            onClick={() => onNavigatePage('CONTACT')}
            className="px-8 py-3.5 rounded-xl bg-[#FFC107] hover:bg-[#FFD54F] text-[#123F16] font-bold text-sm transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Get in Touch with Corporate HQ</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </main>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
