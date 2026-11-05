import React, { useState } from 'react';
import { LandingHeader } from '../components/common/LandingHeader';
import { PageHero } from '../components/common/PageHero';
import { ClosingCtaBand } from '../components/common/ClosingCtaBand';
import { Footer } from '../components/common/Footer';
import { SEO } from '../components/common/SEO';
import { Phone, Mail, MapPin, MessageCircle, CheckCircle2, ArrowRight } from 'lucide-react';

interface ContactPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onExploreStalls?: () => void;
}

export default function ContactPage({ onNavigateHome, onNavigatePage, onExploreStalls }: ContactPageProps) {
  const WHATSAPP_BOT_URL = 'https://wa.me/message/YYWEZAZZIXBRF1';
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#123F16] font-sans antialiased relative">
      <SEO 
        title="Contact Support & Corporate HQ | FLOATE AFRICA LTD"
        description="Get in direct touch with FLOATE AFRICA LTD corporate HQ, support team, and merchant partnership team."
        url="https://www.floate.xyz/contact"
        type="website"
      />

      <LandingHeader
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
        currentPage="CONTACT"
        isDarkBg={true}
      />

      {/* ── HERO HEADER ── */}
      <PageHero
        microLabel="SUPPORT & CONTACT HQ"
        titleLine1="Talk to us."
        titleLine2="We are here to help your business scale."
        subtitle="Have questions about merchant stall onboarding, ecosystem partnerships, or FLOATE AI? Get in direct touch with our team."
      />

      {/* ── CONTACT CARDS & FORM ── */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-12 sm:py-20 space-y-12">
        
        {/* 3 White Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: WhatsApp Support */}
          <div className="bg-white border border-[#123F16]/10 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center">
                <MessageCircle className="w-5 h-5 fill-[#2E7D32]" />
              </div>
              <h3 className="font-bold text-lg text-[#123F16]">WhatsApp Support</h3>
              <p className="text-xs text-[#123F16]/80 leading-relaxed">
                Instant 24/7 automated support and merchant helpline via FLOATE AI.
              </p>
            </div>
            <a
              href={WHATSAPP_BOT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 rounded-xl bg-[#25D366] text-[#123F16] font-bold text-xs flex items-center justify-center gap-2 hover:brightness-105 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 fill-[#123F16]" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>

          {/* Card 2: Email Support */}
          <div className="bg-white border border-[#123F16]/10 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFC107]/20 text-[#123F16] flex items-center justify-center">
                <Mail className="w-5 h-5 text-[#123F16]" />
              </div>
              <h3 className="font-bold text-lg text-[#123F16]">Email Corporate HQ</h3>
              <p className="text-xs text-[#123F16]/80 leading-relaxed">
                General corporate inquiries, media requests, and data protection officer.
              </p>
            </div>
            <a
              href="mailto:support@floate.xyz"
              className="px-4 py-2.5 rounded-xl bg-[#123F16] text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#1B5E20] transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-[#FFC107]" />
              <span>support@floate.xyz</span>
            </a>
          </div>

          {/* Card 3: Sellers Help */}
          <div className="bg-white border border-[#123F16]/10 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-[#E8F5E9] text-[#123F16] flex items-center justify-center">
                <Phone className="w-5 h-5 text-[#2E7D32]" />
              </div>
              <h3 className="font-bold text-lg text-[#123F16]">Sellers Onboarding</h3>
              <p className="text-xs text-[#123F16]/80 leading-relaxed">
                Register a new market stall for free and claim 10 free trial lead credits.
              </p>
            </div>
            <button
              onClick={() => onNavigatePage('REGISTER')}
              className="px-4 py-2.5 rounded-xl bg-[#FFC107] text-[#123F16] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#FFD54F] transition-colors cursor-pointer"
            >
              <span>Register Stall Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Contact Form Card */}
        <div className="bg-white border border-[#123F16]/10 rounded-2xl p-8 sm:p-12 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="space-y-1 text-center">
            <h3 className="text-2xl font-extrabold text-[#123F16]">Send Us a Message</h3>
            <p className="text-xs text-[#123F16]/70">Our support desk responds within 2 business hours.</p>
          </div>

          {submitted ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E8F5E9] text-[#2E7D32] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-[#123F16]">Message Sent Successfully!</h4>
              <p className="text-xs text-[#123F16]/80 max-w-sm mx-auto">
                Thank you for contacting FLOATE AFRICA LTD. We have received your inquiry and will email you shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-6 py-2.5 rounded-xl bg-[#123F16] text-white text-xs font-bold cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#123F16] uppercase mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Chukwuemeka Rich"
                  className="w-full bg-[#F7F7F2] border border-[#123F16]/15 rounded-xl px-4 py-3 text-sm text-[#123F16] focus:outline-none focus:border-[#2E7D32] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123F16] uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@domain.com"
                  className="w-full bg-[#F7F7F2] border border-[#123F16]/15 rounded-xl px-4 py-3 text-sm text-[#123F16] focus:outline-none focus:border-[#2E7D32] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123F16] uppercase mb-1">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full bg-[#F7F7F2] border border-[#123F16]/15 rounded-xl px-4 py-3 text-sm text-[#123F16] focus:outline-none focus:border-[#2E7D32] focus:bg-white"
                >
                  <option value="General Inquiry">General Inquiry</option>
                  <option value="Merchant Verification">Merchant Verification & Onboarding</option>
                  <option value="Partnerships">Ecosystem & Brand Partnerships</option>
                  <option value="Technical Support">Technical Support & Billing</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#123F16] uppercase mb-1">Message</label>
                <textarea
                  required
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Describe your request..."
                  className="w-full bg-[#F7F7F2] border border-[#123F16]/15 rounded-xl px-4 py-3 text-sm text-[#123F16] focus:outline-none focus:border-[#2E7D32] focus:bg-white resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-xl bg-[#FFC107] hover:bg-[#FFD54F] text-[#123F16] font-bold text-sm transition-all cursor-pointer shadow-xs"
              >
                Send Message
              </button>
            </form>
          )}
        </div>

      </main>

      {/* ── CLOSING CTA BAND & FOOTER ── */}
      <ClosingCtaBand onNavigatePage={onNavigatePage} />
      <Footer onNavigateHome={onNavigateHome} onNavigatePage={onNavigatePage} />
    </div>
  );
}
