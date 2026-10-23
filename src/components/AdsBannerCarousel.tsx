import React, { useState, useEffect } from 'react';
import { ExternalLink, Sparkles, TrendingUp, Eye } from 'lucide-react';

export function AdsBannerCarousel() {
  const [ads, setAds] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/ads/banner')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.ads && data.ads.length > 0) {
          setAds(data.ads);
          // Track view on first ad
          if (data.ads[0]?.id) {
            fetch(`/api/ads/${data.ads[0].id}/view`, { method: 'POST' }).catch(() => {});
          }
        } else {
          // Fallback demo banner if no active ads yet
          setAds([
            {
              id: 'demo-banner-1',
              merchantName: 'Chivora Ventures & Stores',
              headline: 'Bulk Foodstuff & Provisions in Enugu - Direct Wholesale Prices',
              designedBannerUrl: '',
              targetUrl: 'https://wa.me/2348030000000',
              impressions: 1420,
              clicks: 89,
            },
          ]);
        }
      })
      .catch(() => {
        setAds([
          {
            id: 'demo-banner-1',
            merchantName: 'Chivora Ventures & Stores',
            headline: 'Bulk Foodstuff & Provisions in Enugu - Direct Wholesale Prices',
            designedBannerUrl: '',
            targetUrl: 'https://wa.me/2348030000000',
            impressions: 1420,
            clicks: 89,
          },
        ]);
      });
  }, []);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const next = (prev + 1) % ads.length;
        if (ads[next]?.id) {
          fetch(`/api/ads/${ads[next].id}/view`, { method: 'POST' }).catch(() => {});
        }
        return next;
      });
    }, 6000);
    return () => clearInterval(interval);
  }, [ads]);

  if (ads.length === 0) return null;

  const currentAd = ads[currentIndex] || ads[0];

  const handleBannerClick = () => {
    if (currentAd?.id) {
      fetch(`/api/ads/${currentAd.id}/click`, { method: 'POST' }).catch(() => {});
    }
    if (currentAd?.targetUrl) {
      window.open(currentAd.targetUrl, '_blank');
    }
  };

  return (
    <div className="w-full bg-gradient-to-r from-amber-950/40 via-slate-900 to-emerald-950/40 border border-amber-500/30 rounded-2xl p-4 md:p-5 relative overflow-hidden shadow-lg mb-6">
      <div className="absolute top-2 right-3 flex items-center gap-2 text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800/60">
        <Sparkles className="w-3 h-3 text-amber-400 animate-pulse" />
        Sponsored Featured Ad
      </div>

      <div className="flex flex-col md:flex-row items-center justify-between gap-4 cursor-pointer" onClick={handleBannerClick}>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="w-16 h-16 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
            {currentAd.designedBannerUrl ? (
              <img src={currentAd.designedBannerUrl} alt="Ad Banner" className="w-full h-full object-cover" />
            ) : (
              <Sparkles className="w-7 h-7 text-amber-400" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold text-amber-300 flex items-center gap-2">
              {currentAd.merchantName || 'Verified Floate Merchant'}
              <span className="text-[10px] text-slate-400 font-normal">({currentAd.adType || 'BUSINESS_AD'})</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-100 mt-0.5">{currentAd.headline}</h3>
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">{currentAd.description || currentAd.offerText || 'Tap to chat with vendor instantly on WhatsApp'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono hidden sm:flex">
            <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5 text-slate-400" /> {currentAd.impressions || 0} views</span>
            <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5 text-emerald-400" /> {currentAd.clicks || 0} clicks</span>
          </div>
          <button className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all shrink-0">
            Connect on WhatsApp <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
