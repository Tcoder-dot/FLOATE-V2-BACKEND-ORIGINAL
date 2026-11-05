import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Building2, Store, Handshake, MessageCircle, Send, Newspaper, Phone, ArrowRight, Users, Lock, ShoppingBag } from 'lucide-react';
import { useCart } from '../../context/CartContext';

interface LandingHeaderProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: 'COMPANY' | 'VENDORS_PAGE' | 'ECO_PARTNERS' | 'WHATSAPP_AI' | 'TELEGRAM_AI' | 'BLOG' | 'CONTACT' | 'PRIVACY' | 'TERMS' | 'ABOUT' | 'FOUNDER') => void;
  onExploreStalls?: () => void;
  onOpenMerchantAuth?: () => void;
  onOpenMerchantDashboard?: () => void;
  currentPage?: string;
  isDarkBg?: boolean;
}


export const LandingHeader: React.FC<LandingHeaderProps> = ({
  onNavigateHome,
  onNavigatePage,
  onExploreStalls,
  onOpenMerchantAuth,
  onOpenMerchantDashboard,
  currentPage,
  isDarkBg = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cart, setIsCartDrawerOpen } = useCart();

  const currentMerchantSlug = typeof window !== 'undefined' ? localStorage.getItem("floate_current_merchant_slug") : null;

  const menuItems = [
    {
      id: 'CUSTOMERS',
      label: 'Marketplace Search',
      icon: Users,
      desc: 'Find indexed stalls, suppliers & wholesale deals'
    },
    {
      id: 'MERCHANT_AUTH',
      label: currentMerchantSlug ? 'My Merchant Dashboard' : 'Merchant Register & Login',
      icon: Store,
      desc: currentMerchantSlug
        ? 'Manage inventory, incoming buyer orders & stall profile'
        : 'Sign in to your stall or register a new physical market business'
    },
    {
      id: 'VENDORS_PAGE',
      label: 'For Vendors',
      icon: Handshake,
      desc: 'List your physical market stall for free on Google & FLOATE'
    },
    {
      id: 'WHATSAPP_AI',
      label: 'WhatsApp AI Bot',
      icon: MessageCircle,
      desc: 'Voice search & direct WhatsApp buyer leads'
    },
    {
      id: 'COMPANY',
      label: 'About FLOATE',
      icon: Building2,
      desc: 'The Google & LLM indexing platform for African trade'
    },
    {
      id: 'FOUNDER',
      label: 'Meet the Founder (TELMAN)',
      icon: Users,
      desc: 'Chukwuemeka Rich (TELMAN) — Systems Architect & Founder'
    },
    {
      id: 'CONTACT',
      label: 'Contact Support',
      icon: Phone,
      desc: 'Direct support & brand partnership HQ inquiry'
    },
  ];

  const handleMenuClick = (itemId: string) => {
    setIsMenuOpen(false);
    setTimeout(() => {
      if (itemId === 'CUSTOMERS') {
        onNavigateHome();
      } else if (itemId === 'MERCHANT_AUTH') {
        if (currentMerchantSlug) {
          if (onOpenMerchantDashboard) {
            onOpenMerchantDashboard();
          } else {
            window.location.href = `/merchant/dashboard?slug=${encodeURIComponent(currentMerchantSlug)}`;
          }
        } else {
          if (onOpenMerchantAuth) {
            onOpenMerchantAuth();
          } else {
            window.location.href = '/register';
          }
        }
      } else {
        onNavigatePage(itemId as any);
      }
    }, 180);
  };

  return (
    <>
      {/* ── TOP NAV BAR ── */}
      <header className="absolute top-0 left-0 w-full z-50 h-32 sm:h-40 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-full flex items-center justify-between">
          {/* Left: FLOATE Brand Logo wrapped in Link */}
          <div className="flex items-center gap-4">
            <a 
              href="/"
              onClick={(e) => {
                e.preventDefault();
                onNavigateHome();
              }}
              className="flex items-center hover:opacity-90 transition-opacity cursor-pointer text-left"
            >
              <img
                src="https://i.postimg.cc/W3vJZH6m/20260929-130843.png"
                alt="FLOATE Logo"
                className="h-28 sm:h-36 w-auto object-contain block p-0 m-0 max-w-[340px] sm:max-w-[500px]"
                referrerPolicy="no-referrer"
              />
            </a>
          </div>

          {/* Center/Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-[#D9EAD9]">
            <button
              onClick={onNavigateHome}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Marketplace Search
            </button>
            <button
              onClick={() => onNavigatePage('VENDORS_PAGE')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              For Vendors
            </button>
            <button
              onClick={() => onNavigatePage('ABOUT')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              About Floate
            </button>
          </nav>

          {/* Right: Merchant Login / Dashboard & "Sell on Floate, free" + Cart Icon + Hamburger Menu */}
          <div className="flex items-center gap-2.5">
            {currentMerchantSlug ? (
              <button
                onClick={() => onOpenMerchantDashboard?.()}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs font-black uppercase tracking-wider border border-white/20 shadow-sm transition cursor-pointer"
              >
                <Store className="w-4 h-4 text-[#FFC107]" />
                <span>My Dashboard</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onOpenMerchantAuth?.()}
                  className="hidden sm:inline-flex text-xs font-black text-white hover:text-[#FFC107] transition-colors cursor-pointer px-2 py-1"
                >
                  Merchant Login
                </button>
                <button
                  onClick={() => {
                    if (onOpenMerchantAuth) onOpenMerchantAuth();
                    else window.location.href = '/register';
                  }}
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-[rgba(255,193,7,0.50)] text-[#FFC107] hover:bg-[rgba(255,193,7,0.14)] text-xs font-black uppercase tracking-wider transition cursor-pointer"
                >
                  <span>Sell on Floate, free</span>
                </button>
              </>
            )}

            {/* Tiny Cart Icon Button near Hamburger Menu */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer active:scale-90 flex items-center justify-center shadow-xs"
              aria-label="View Cart"
              title="View Cart"
            >
              <ShoppingBag className="w-4.5 h-4.5 text-white" />
              {cart.count > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#FFC107] text-[#123F16] text-[9.5px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center shadow-xs">
                  {cart.count}
                </span>
              )}
            </button>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="px-3.5 py-2 rounded-full transition-all flex items-center gap-2 border border-white/20 bg-white/10 hover:bg-white/20 text-white active:translate-y-[1px] cursor-pointer"
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <>
                  <X className="w-4 h-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Close</span>
                </>
              ) : (
                <>
                  <Menu className="w-4 h-4 text-white" />
                  <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Menu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── FULL SCREEN DEEP GREEN HAMBURGER MENU OVERLAY ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[100] w-full h-full bg-[#123F16] text-white p-6 sm:p-12 flex flex-col justify-between overflow-y-auto"
          >
            {/* Top Bar: Brand & Close Button */}
            <div className="max-w-3xl mx-auto w-full flex items-center justify-between pb-6 border-b border-white/15">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  setIsMenuOpen(false);
                  onNavigateHome();
                }}
                className="flex items-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
              >
                <img
                  src="https://i.postimg.cc/W3vJZH6m/20260929-130843.png"
                  alt="FLOATE Logo"
                  className="h-10 sm:h-12 w-auto object-contain block max-w-[200px]"
                  referrerPolicy="no-referrer"
                />
              </a>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="px-4 py-2 rounded-full bg-[#FFC107] text-[#123F16] hover:bg-[#ffcd38] font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                aria-label="Close menu"
              >
                <X className="w-4 h-4 text-[#123F16]" />
                <span>Close</span>
              </button>
            </div>

            {/* Menu Items Queue Container */}
            <div className="max-w-3xl mx-auto w-full my-auto py-8 space-y-3">
              {menuItems.map((item) => {
                const IconComp = item.icon;
                const isActive =
                  currentPage === item.id ||
                  (item.id === 'CUSTOMERS' && !currentPage) ||
                  (item.id === 'MERCHANT_AUTH' && (currentPage === 'MERCHANT_DASHBOARD' || currentPage === 'REGISTER'));
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMenuClick(item.id)}
                    className={`w-full p-4 sm:p-5 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                      isActive
                        ? 'bg-[#FFC107] text-[#123F16] border-[#FFC107] shadow-lg -translate-y-0.5'
                        : 'bg-[#1B5E20]/50 hover:bg-[#1B5E20] text-white border-white/15 hover:border-[#FFC107]/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2.5 rounded-xl border ${
                        isActive 
                          ? 'bg-[#123F16] text-[#FFC107] border-[#123F16]' 
                          : 'bg-white/10 text-[#FFC107] border-white/10'
                      }`}>
                        <IconComp className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      <div className="text-left">
                        <div className={`text-base sm:text-lg font-black tracking-tight ${
                          isActive ? 'text-[#123F16]' : 'text-white group-hover:text-[#FFC107]'
                        }`}>
                          {item.label}
                        </div>
                        <div className={`text-xs sm:text-sm font-medium ${
                          isActive ? 'text-[#123F16]/80' : 'text-[#CFE3CF]'
                        }`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <ArrowRight className={`w-5 h-5 group-hover:translate-x-1.5 transition-transform ${
                      isActive ? 'text-[#123F16]' : 'text-[#FFC107]'
                    }`} />
                  </button>
                );
              })}
            </div>

            {/* Bottom Footer Action */}
            <div className="max-w-3xl mx-auto w-full pt-6 border-t border-white/15 space-y-4">
              <div className="flex items-center justify-center gap-4 text-xs font-bold text-[#CFE3CF]">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setTimeout(() => onNavigatePage('TERMS'), 180);
                  }}
                  className="hover:text-[#FACC15] transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Terms of Service
                </button>
                <span>•</span>
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setTimeout(() => onNavigatePage('PRIVACY'), 180);
                  }}
                  className="hover:text-[#FACC15] transition-colors underline underline-offset-4 cursor-pointer"
                >
                  Privacy Policy
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
