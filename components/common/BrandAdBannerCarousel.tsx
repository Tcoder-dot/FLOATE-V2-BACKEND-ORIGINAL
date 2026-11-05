import React, { useState, useEffect, useRef } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { FLOATE_BACKEND_URL } from "../../services/backendUrl";

interface BrandAd {
  id: string;
  brandName: string;
  title: string;
  subtitle: string;
  ctaText: string;
  imageUrl: string;
  targetUrl?: string;
  category: string;
}

export const BrandAdBannerCarousel: React.FC = () => {
  const [ads, setAds] = useState<BrandAd[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadAds = async () => {
      try {
        const response = await fetch(`${FLOATE_BACKEND_URL}/api/ads/banner`, {
          headers: { Accept: "application/json" }
        });
        if (!response.ok) throw new Error(`Ads request failed (HTTP ${response.status}).`);
        const data = await response.json();
        if (!data.success || !Array.isArray(data.ads)) {
          throw new Error("Ads endpoint returned an invalid response.");
        }

        const activeAds = data.ads
          .filter((ad: any) => ad && ad.status === "ACTIVE")
          .map((ad: any): BrandAd => ({
            id: String(ad.id),
            brandName: ad.merchantName || "Floate Partner",
            title: ad.headline || "Sponsored placement",
            subtitle: ad.description || "",
            ctaText: ad.ctaText || "View offer",
            imageUrl: ad.designedBannerUrl || ad.rawImageUrl || ad.imageUrl || "",
            targetUrl: ad.targetUrl || "",
            category: ad.adType || "Sponsored"
          }))
          .filter((ad: BrandAd) => ad.id && ad.title);

        if (active) {
          setAds(activeAds);
          setCurrentIndex(0);
          for (const ad of activeAds) {
            fetch(`${FLOATE_BACKEND_URL}/api/ads/${encodeURIComponent(ad.id)}/view`, {
              method: "POST"
            }).catch((error) => console.warn(`[Ads] Impression tracking failed for ${ad.id}:`, error));
          }
        }
      } catch (error) {
        console.error("[Ads] Could not load active campaigns:", error);
      }
    };

    loadAds();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (isPaused || ads.length < 2) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 3500);

    return () => clearInterval(interval);
  }, [ads.length, isPaused]);

  // Smooth horizontal scroll position sync
  useEffect(() => {
    if (scrollRef.current) {
      const container = scrollRef.current;
      const targetChild = container.children[currentIndex] as HTMLElement;
      if (targetChild) {
        container.scrollTo({
          left: targetChild.offsetLeft - container.offsetLeft,
          behavior: "smooth"
        });
      }
    }
  }, [currentIndex]);

  if (ads.length === 0) return null;

  const trackClick = (adId: string) => {
    fetch(`${FLOATE_BACKEND_URL}/api/ads/${encodeURIComponent(adId)}/click`, {
      method: "POST"
    }).catch((error) => console.warn(`[Ads] Click tracking failed for ${adId}:`, error));
  };

  return (
    <div className="w-full my-6 py-2">
      {/* Brand Header (Clean: No dots) */}
      <div className="flex items-center gap-1.5 pb-2 px-1">
        <ShieldCheck className="w-4 h-4 text-[#10B981]" />
        <h3 className="text-xs font-black text-[#13241F] uppercase tracking-wider">
          Official Brand Partner Showcase
        </h3>
      </div>

      {/* Continuous Auto-Moving Horizontal Ad Track */}
      <div
        ref={scrollRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1"
      >
        {ads.map((ad) => (
          <div
            key={ad.id}
            className="flex-shrink-0 w-[92%] sm:w-[95%] snap-center select-none group"
          >
            {/* Banner Box */}
            <div className="relative w-full rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#123F16] to-[#0A290E] p-4 sm:p-6 text-white shadow-md overflow-hidden flex flex-col sm:flex-row items-center justify-between gap-4 border border-white/20">
              {/* Left Content */}
              <div className="space-y-2 z-10 max-w-md">
                <div className="flex items-center gap-2">
                  <span
                    className="bg-[#FFC107] text-[#123F16] text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs"
                  >
                    ✦ {ad.category}
                  </span>
                  <span className="text-xs font-extrabold text-white/90">
                    {ad.brandName}
                  </span>
                </div>

                <h3 className="text-lg sm:text-2xl font-black tracking-tight leading-tight">
                  {ad.title}
                </h3>

                <p className="text-xs sm:text-sm font-medium text-white/90 leading-snug">
                  {ad.subtitle}
                </p>

                <div className="pt-2">
                  {ad.targetUrl && (
                    <a
                      href={ad.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackClick(ad.id)}
                      className="px-4 py-2 rounded-full bg-white text-[#13241F] hover:bg-[#FACC15] text-xs font-black shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
                    >
                      <span>{ad.ctaText}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#0A4D3C]" />
                    </a>
                  )}
                </div>
              </div>

              {/* Right Image */}
              <div className="relative w-full sm:w-48 h-32 sm:h-36 rounded-xl overflow-hidden shadow-lg border border-white/20 flex-shrink-0">
                {ad.imageUrl && (
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                )}
                <div className="absolute inset-0 bg-black/10" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
