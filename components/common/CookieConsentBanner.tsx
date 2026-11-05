import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, X, ShieldCheck } from 'lucide-react';

interface CookieConsentBannerProps {
  onNavigatePrivacy?: () => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onNavigatePrivacy }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('floate_cookie_consent');
      if (!consent) {
        // Show banner after a subtle 1-second delay for smooth onboarding
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // Fallback
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem('floate_cookie_consent', 'accepted');
      localStorage.setItem('floate_cookie_consent_timestamp', new Date().toISOString());
    } catch (e) {}
    setIsVisible(false);
  };

  const handleEssentialOnly = () => {
    try {
      localStorage.setItem('floate_cookie_consent', 'essential');
      localStorage.setItem('floate_cookie_consent_timestamp', new Date().toISOString());
    } catch (e) {}
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[90] bg-[#13241F] text-white border-2 border-[#0A4D3C] rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md"
        >
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FACC15] text-[#13241F] flex items-center justify-center flex-shrink-0 shadow-xs">
                <Cookie className="w-5 h-5 font-bold" />
              </div>
              <div>
                <h4 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>Cookie & Privacy Choice</span>
                  <ShieldCheck className="w-4 h-4 text-[#6EE7B7]" />
                </h4>
                <p className="text-[11px] text-[#9CA3AF] font-medium">NDPR & Ad Analytics Compliant</p>
              </div>
            </div>

            <button
              onClick={handleEssentialOnly}
              className="text-[#9CA3AF] hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 cursor-pointer"
              aria-label="Close cookie banner"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-[#E5E7EB] font-medium leading-relaxed my-3">
            We use cookies and local browser storage to power your market search experience, enable WhatsApp handoffs, and optimize ad performance.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
            <button
              onClick={handleAcceptAll}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-[#13241F] text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer text-center"
            >
              Accept All Cookies
            </button>

            <button
              onClick={handleEssentialOnly}
              className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/15 text-xs font-bold transition-all active:scale-95 cursor-pointer text-center"
            >
              Essential Only
            </button>
          </div>

          {onNavigatePrivacy && (
            <div className="mt-3 text-center">
              <button
                onClick={onNavigatePrivacy}
                className="text-[11px] text-[#9CA3AF] hover:text-[#FACC15] transition-colors underline underline-offset-2 font-medium cursor-pointer"
              >
                Read our Privacy Policy & Cookie Details
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
