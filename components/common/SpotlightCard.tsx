import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, Heart, Star, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { SpotlightData, SpotlightSlide } from "../../types/floate";

interface SpotlightCardProps {
  data: SpotlightData | null;
  onOpenProduct: (id: string) => void;
  onOpenVendor: (slug: string) => void;
}

// Clean title helper: strip SKU codes or bracketed junk
function cleanProductTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  return rawTitle
    .replace(/(?:#|SKU-|SKU_|ID:?|ITEM:?)\s*[A-Z0-9_-]+/gi, "")
    .replace(/\[.*?\]|\(.*?\)/g, "")
    .trim();
}

export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  data,
  onOpenProduct,
  onOpenVendor
}) => {
  if (!data) return null;

  // Normalize slides array from API + default curated spotlights if single
  const baseSlides: SpotlightSlide[] =
    data.slides && data.slides.length > 0
      ? data.slides
      : data.reel && data.reel.length > 0
      ? data.reel
      : data.id && data.title
      ? [
          {
            id: data.id,
            title: data.title,
            price_naira: data.price_naira || 0,
            formatted_price: data.formatted_price || "",
            photo_url: data.photo_url || "",
            category: data.category,
            badge_text: data.badge_text,
            vendor: data.vendor || { slug: "emeka-mac-plaza", name: "Emeka Mac Plaza", city: "Lagos", verified: true }
          }
        ]
      : [];

  // Fallback enriched spotlight banners for horizontal auto-passing if only 1 slide
  const slides: SpotlightSlide[] = baseSlides.length >= 2 
    ? baseSlides 
    : [
        ...baseSlides,
        {
          id: "spotlight_2",
          title: "Grade A UK Used MacBook Air M2 16GB",
          price_naira: 780000,
          formatted_price: "₦780,000",
          photo_url: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80",
          category: "Computer Village",
          badge_text: "Top Seller",
          vendor: { slug: "emeka-mac-plaza", name: "Emeka Mac Plaza", city: "Lagos", verified: true }
        },
        {
          id: "spotlight_3",
          title: "Original Swiss Voile Lace & Aso-Oke Sets",
          price_naira: 45000,
          formatted_price: "₦45,000",
          photo_url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1000&q=80",
          category: "Onitsha Main",
          badge_text: "Wholesale Line",
          vendor: { slug: "madam-nkechi-lace", name: "Madam Nkechi Fabrics", city: "Onitsha", verified: true }
        },
        {
          id: "spotlight_4",
          title: "Handcrafted Italian Leather Loafers",
          price_naira: 28000,
          formatted_price: "₦28,000",
          photo_url: "https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=1000&q=80",
          category: "Ariaria Aba",
          badge_text: "Direct Artisan",
          vendor: { slug: "aba-master-craftsman", name: "Aba Master Craftsman", city: "Aba", verified: true }
        }
      ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [isPaused, setIsPaused] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-slide horizontally every 3.5 seconds
  useEffect(() => {
    if (isPaused || slides.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 3500);

    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  // Scroll active slide into view smoothly
  useEffect(() => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const child = container.children[currentIndex] as HTMLElement;
      if (child) {
        container.scrollTo({
          left: child.offsetLeft - container.offsetLeft,
          behavior: 'smooth'
        });
      }
    }
  }, [currentIndex]);

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Duplicated slides array for continuous infinite scroll
  const displaySlides = [...slides, ...slides];

  return (
    <div className="w-full py-2">
      {/* Header bar for Spotlight Carousel (Clean: No emoji, No dots) */}
      <div className="pb-2 px-1">
        <h3 className="text-xs font-black text-[#13241F] uppercase tracking-wider">
          Featured Market Spotlight
        </h3>
      </div>

      {/* Horizontal Continuous Auto-Passing Carousel Container */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory hide-scrollbar py-1"
      >
        {displaySlides.map((slide, idx) => {
          const cleanTitle = cleanProductTitle(slide.title);
          const isFav = !!favorites[`${slide.id}_${idx}`];

          return (
            <div
              key={`${slide.id}_${idx}`}
              onClick={() => {
                if (slide.id && !slide.id.startsWith("spotlight_")) {
                  onOpenProduct(slide.id);
                } else if (slide.vendor?.slug) {
                  onOpenVendor(slide.vendor.slug);
                }
              }}
              className="flex-shrink-0 w-[88%] sm:w-[92%] snap-center cursor-pointer select-none group"
            >
              {/* Card Shell */}
              <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0A4D3C]/10 p-2.5 sm:p-3 shadow-xs hover:shadow-md transition-all">
                {/* Image Box */}
                <div className="relative w-full h-40 sm:h-52 rounded-xl sm:rounded-2xl overflow-hidden bg-[#13241F]">
                  <img
                    src={slide.photo_url}
                    alt={cleanTitle}
                    className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                    loading="lazy"
                  />

                  {/* Top Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="bg-[#0A4D3C] text-white text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-md tracking-wider">
                      ✦ {slide.badge_text || slide.category || "Spotlight"}
                    </span>
                  </div>

                  {/* Floating Heart Button */}
                  <button
                    onClick={(e) => toggleFavorite(e, `${slide.id}_${idx}`)}
                    className="absolute top-2.5 right-2.5 z-10 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#13241F] shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
                    aria-label="Save spotlight item"
                  >
                    <Heart
                      className={`w-4 h-4 transition-colors ${
                        isFav ? "fill-[#DC2626] text-[#DC2626]" : "text-[#13241F]"
                      }`}
                    />
                  </button>
                </div>

                {/* Details Section */}
                <div className="pt-2.5 px-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-base sm:text-lg font-black text-[#13241F] tracking-tight leading-snug group-hover:text-[#0A4D3C] transition-colors">
                      {slide.vendor?.name || cleanTitle}
                    </h4>
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] fill-[#10B981] text-white flex-shrink-0" />
                  </div>

                  {/* Subtitle Details: Location & Price (Star ratings removed) */}
                  <div className="flex items-center gap-2 text-xs font-bold text-[#5B6E66] pt-1 flex-wrap">
                    <span className="text-[#0A4D3C]">
                      📍 {slide.vendor?.city || "Lagos"} Hub
                    </span>
                    <span>•</span>
                    <span className="text-[#10B981] font-extrabold">
                      {slide.formatted_price || "Direct Wholesale"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
