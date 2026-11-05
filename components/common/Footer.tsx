import React from 'react';
import { MessageCircle, Send, ShieldCheck, Mail, ArrowUpRight } from 'lucide-react';

interface FooterProps {
  onNavigateHome?: () => void;
  onNavigatePage?: (page: any) => void;
  onOpenMerchantAuth?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateHome, onNavigatePage, onOpenMerchantAuth }) => {
  const WHATSAPP_BOT_URL = 'https://wa.me/message/YYWEZAZZIXBRF1';
  const TELEGRAM_BOT_URL = 'https://t.me/floate_bot';

  const handleNav = (page: string, fallbackUrl: string, e: React.MouseEvent) => {
    if (onNavigatePage) {
      e.preventDefault();
      onNavigatePage(page as any);
    } else {
      // Let standard link navigation proceed
    }
  };

  return (
    <footer className="bg-[#123F16] text-white border-t border-[#FFC107]/20 pt-16 pb-12 px-4 sm:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Top Section: Brand & Quick Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
          
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <a 
              href="/" 
              onClick={(e) => {
                if (onNavigateHome) {
                  e.preventDefault();
                  onNavigateHome();
                }
              }}
              className="inline-block"
            >
              <img
                src="https://i.postimg.cc/W3vJZH6m/20260929-130843.png"
                alt="FLOATE Logo"
                className="h-16 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </a>
            <p className="text-sm text-white/80 max-w-sm font-normal leading-relaxed">
              Digitizing Africa's $1.5 Trillion informal commerce engine through zero-friction WhatsApp search & direct lead routing.
            </p>
            <div className="flex items-center gap-3 pt-2">
              <a
                href={WHATSAPP_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-[#FFC107] text-[#123F16] hover:bg-[#FFD54F] transition-colors"
                title="Floate WhatsApp AI Bot"
              >
                <MessageCircle className="w-4 h-4 fill-[#123F16]" />
              </a>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
                title="Floate Telegram AI Bot"
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/floate_xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors text-xs font-bold"
                title="Floate on X / Twitter"
              >
                𝕏
              </a>
            </div>
          </div>

          {/* Buyers Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FFC107] uppercase tracking-wider">Buyers</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a 
                  href="/search" 
                  onClick={(e) => handleNav('CUSTOMERS', '/search', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Marketplace Search
                </a>
              </li>
              <li>
                <a 
                  href="/vendors" 
                  onClick={(e) => handleNav('VENDORS_PAGE', '/vendors', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Browse Stores
                </a>
              </li>
              <li>
                <a 
                  href={WHATSAPP_BOT_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#FFC107] transition-colors inline-flex items-center gap-1"
                >
                  TRY FLOATE on WhatsApp
                  <ArrowUpRight className="w-3 h-3 text-[#FFC107]" />
                </a>
              </li>
              <li>
                <a 
                  href="/telegram-ai" 
                  onClick={(e) => handleNav('TELEGRAM_AI', '/telegram-ai', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Telegram Bot
                </a>
              </li>
            </ul>
          </div>

          {/* Sellers Column */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FFC107] uppercase tracking-wider">Sellers</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a 
                  href="/register" 
                  onClick={(e) => {
                    if (onOpenMerchantAuth) {
                      e.preventDefault();
                      onOpenMerchantAuth();
                    } else {
                      handleNav('REGISTER', '/register', e);
                    }
                  }}
                  className="hover:text-[#FFC107] transition-colors font-medium text-white"
                >
                  Sell Free on Floate
                </a>
              </li>
              <li>
                <a 
                  href="/login" 
                  onClick={(e) => {
                    if (onOpenMerchantAuth) {
                      e.preventDefault();
                      onOpenMerchantAuth();
                    } else {
                      handleNav('LOGIN', '/login', e);
                    }
                  }}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Merchant Login
                </a>
              </li>
              <li>
                <a 
                  href="/verify" 
                  onClick={(e) => handleNav('VERIFY', '/verify', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Stall Verification Process
                </a>
              </li>
            </ul>
          </div>

          {/* Company & Legal Columns */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#FFC107] uppercase tracking-wider">Company & Legal</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <a 
                  href="/about" 
                  onClick={(e) => handleNav('ABOUT', '/about', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  About Floate
                </a>
              </li>
              <li>
                <a 
                  href="/founder" 
                  onClick={(e) => handleNav('FOUNDER', '/founder', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Founder Bio (TELMAN)
                </a>
              </li>
              <li>
                <a 
                  href="/blog" 
                  onClick={(e) => handleNav('BLOG', '/blog', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Blog & Insights
                </a>
              </li>
              <li>
                <a 
                  href="/contact" 
                  onClick={(e) => handleNav('CONTACT', '/contact', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <a 
                  href="/privacy" 
                  onClick={(e) => handleNav('PRIVACY', '/privacy', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a 
                  href="/terms" 
                  onClick={(e) => handleNav('TERMS', '/terms', e)}
                  className="hover:text-[#FFC107] transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Divider & Rights Row */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>
            © {new Date().getFullYear()} FLOATE AFRICA LTD · CAC RC 9365804. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a href="mailto:support@floate.xyz" className="hover:text-[#FFC107] transition-colors inline-flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-[#FFC107]" />
              <span>support@floate.xyz</span>
            </a>
            <span className="inline-flex items-center gap-1 text-[#FFC107]">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official CAC Verified</span>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
