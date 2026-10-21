import React, { useState, useRef } from 'react';
import {
  Search,
  Sparkles,
  ShoppingBag,
  MapPin,
  Tag,
  ExternalLink,
  ShieldCheck,
  Clock,
  Loader2,
  AlertCircle,
  ArrowRight,
  Store,
  Bot,
  ChevronLeft,
  ChevronRight,
  ListFilter,
  PhoneCall,
} from 'lucide-react';

interface SearchResult {
  id: string;
  businessName: string;
  category: string;
  product: string;
  price: string;
  location: string;
  isVerified: boolean;
  isHighlyRecommended?: boolean;
  identityVerified?: boolean;
  leadDeepLink: string;
  telegramDeepLink?: string;
  whatsappDeepLink?: string;
  profileImageUrl?: string;
  productImages?: string[];
}

function formatDisplayPrice(rawPrice?: string | null): string {
  if (!rawPrice) return 'Contact for price';
  const clean = String(rawPrice).trim();
  const lower = clean.toLowerCase();
  if (
    !clean ||
    lower === 'contact for price' ||
    lower === 'contact for pricing' ||
    lower === 'negotiable' ||
    lower === 'market rate' ||
    lower === 'best price' ||
    lower === '0' ||
    lower === '₦0' ||
    lower === 'n0'
  ) {
    return 'Contact for price';
  }
  if (/\d/.test(clean)) {
    const withoutNaira = clean.replace(/^[₦\s]+/, '').replace(/^naira\s*/i, '').replace(/^ngn\s*/i, '').trim();
    return `₦${withoutNaira}`;
  }
  return 'Contact for price';
}

export function WebSearchDemo() {
  const [query, setQuery] = useState('footwear');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTimeMs, setSearchTimeMs] = useState<number | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [spotlightListings, setSpotlightListings] = useState<SearchResult[]>([]);
  const [organicListings, setOrganicListings] = useState<SearchResult[]>([]);
  const [exactMatches, setExactMatches] = useState<SearchResult[]>([]);
  const [categoryMatches, setCategoryMatches] = useState<SearchResult[]>([]);
  const [moreBusinessesDeepLink, setMoreBusinessesDeepLink] = useState<string | null>(null);
  const [moreBusinessesWhatsAppDeepLink, setMoreBusinessesWhatsAppDeepLink] = useState<string | null>(null);

  // Spotlight carousel pagination & scroll ref
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showMoreList, setShowMoreList] = useState(false);

  React.useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        localStorage.setItem('floate_referred_by', ref);
      }
    } catch {}
  }, []);

  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const cardWidth = 300;
    carouselRef.current.scrollBy({
      left: direction === 'left' ? -cardWidth : cardWidth,
      behavior: 'smooth',
    });
  };

  const handleSearch = async (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : query;
    if (!q.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(false);
    setShowMoreList(false);
    const start = performance.now();

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'floate_live_sk_7f8a92b3c4e5d6',
        },
        body: JSON.stringify({
          query: q,
          location: location || undefined,
          budget: budget || undefined,
        }),
      });

      const data = await response.json();
      const elapsed = Math.round(performance.now() - start);
      setSearchTimeMs(elapsed);

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Search request failed');
      }

      setResults(data.results || []);
      setSpotlightListings((data.spotlightListings || []).slice(0, 7));
      setOrganicListings(data.organicListings || []);
      setExactMatches(data.exactMatches || []);
      setCategoryMatches(data.categoryMatches || []);

      if (data.moreBusinessesDeepLink) {
        setMoreBusinessesDeepLink(data.moreBusinessesDeepLink);
      } else {
        const cleanSlug = q.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        const locSlug = location ? `_in_${location.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}` : '';
        setMoreBusinessesDeepLink(`https://t.me/Floatebusinessbot?start=search_${cleanSlug}${locSlug}`);
      }

      if (data.moreBusinessesWhatsAppDeepLink) {
        setMoreBusinessesWhatsAppDeepLink(data.moreBusinessesWhatsAppDeepLink);
      }

      setHasSearched(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch search results from server.');
      setResults([]);
      setSpotlightListings([]);
      setOrganicListings([]);
      setExactMatches([]);
      setCategoryMatches([]);
      setMoreBusinessesDeepLink(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header Banner */}
      <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border border-sky-800/50 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-mono bg-sky-900/60 text-sky-300 border border-sky-700/80 px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">
              Spotlight Commerce
            </span>
            <h2 className="text-xl font-bold text-slate-100 mt-2 flex items-center gap-2">
              <Search className="w-5 h-5 text-sky-400" />
              Floate.xyz Web Search Engine
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Spotlight recommended businesses in a high-speed horizontal carousel with instant merchant connect actions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <a
              href="https://wa.me/2348000000000?text=REGISTER_BUSINESS"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-emerald-900/30 active:scale-95"
            >
              <Store className="w-4 h-4" />
              Register on WhatsApp
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>

            <a
              href="https://t.me/Floatebusinessbot?start=register_business"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-md hover:shadow-sky-900/30 active:scale-95"
            >
              <Bot className="w-4 h-4" />
              Register on Telegram
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      </div>

      {/* Interactive Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="What are you shopping for? (e.g., footwear, video editor, laptop)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-slate-100 text-sm rounded-xl px-4 py-3 outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Location (e.g., Onitsha)"
              className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 text-slate-100 text-sm rounded-xl px-3.5 py-3 outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-3">
            <button
              onClick={() => handleSearch()}
              disabled={loading || !query.trim()}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl py-3 px-4 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Run Search
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Sample Presets */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">Quick Tests:</span>
          {[
            { label: '👠 "footwear"', q: 'footwear' },
            { label: '🎬 "video editor"', q: 'video editor' },
            { label: '👞 "leather slippers"', q: 'leather slippers' },
            { label: '⚖️ "lawyer"', q: 'lawyer' },
            { label: '💻 "laptops"', q: 'laptops' },
          ].map((preset) => (
            <button
              key={preset.q}
              onClick={() => {
                setQuery(preset.q);
                handleSearch(preset.q);
              }}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-950 hover:text-sky-300 border border-slate-700 text-slate-300 transition-colors font-mono"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results View Section */}
      <div className="space-y-4">
        {/* Latency & Status Header */}
        {hasSearched && !loading && (
          <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-mono">
            <span>
              Found <strong className="text-slate-100">{results.length}</strong> matching verified business(es)
            </span>
            {searchTimeMs !== null && (
              <span className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg text-emerald-400">
                <Clock className="w-3 h-3" />
                API Latency: {searchTimeMs} ms
              </span>
            )}
          </div>
        )}

        {/* 1. Loading State Shimmer */}
        {loading && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 text-sky-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
              Retrieving Spotlight recommendations and matching listings...
            </div>
            <div className="flex gap-4 overflow-hidden">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[280px] bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3 animate-pulse">
                  <div className="h-36 bg-slate-800 rounded-xl"></div>
                  <div className="h-4 bg-slate-800 rounded w-2/3"></div>
                  <div className="h-3 bg-slate-800/60 rounded w-1/2"></div>
                  <div className="h-9 bg-emerald-950/40 border border-emerald-900/30 rounded-xl w-full mt-2"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. Error State */}
        {error && !loading && (
          <div className="bg-rose-950/40 border border-rose-900/60 rounded-2xl p-4 text-xs font-mono text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            {error}
          </div>
        )}

        {/* 3. True "No Match" State */}
        {!loading && hasSearched && results.length === 0 && !error && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-200">No matching business listings found</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              We couldn't find any verified seller for "{query}". Try searching for broader terms like "shoes", "laptops", "services", or "video".
            </p>
          </div>
        )}

        {/* 4. Results Section: SPOTLIGHT HORIZONTAL CAROUSEL + EXPANDABLE MORE LIST */}
        {!loading && (results.length > 0 || spotlightListings.length > 0) && (
          <div className="space-y-6">
            {/* SPOTLIGHT HORIZONTAL CAROUSEL */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4 relative overflow-hidden">
              {/* Carousel Top Header */}
              {(() => {
                const displayListings = spotlightListings.length > 0 ? spotlightListings : results.slice(0, 7);
                const hasSpotlight = spotlightListings.length > 0;
                return (
                  <>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                          <Sparkles className="w-4 h-4 fill-amber-400 text-amber-400" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                            {hasSpotlight ? 'Spotlight Recommended Businesses' : 'Top Verified Businesses'}
                            <span className="text-[10px] font-mono font-semibold bg-amber-950/80 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full">
                              {displayListings.length} {hasSpotlight ? 'Spotlight' : 'Verified'} {displayListings.length === 1 ? 'Slide' : 'Slides'}
                            </span>
                          </h3>
                          <p className="text-xs text-slate-400">
                            Verified Nigerian merchants matching "{query}"
                          </p>
                        </div>
                      </div>

                      {/* Left / Right Carousel Controls */}
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                          onClick={() => scrollCarousel('left')}
                          aria-label="Previous Slide"
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-slate-700 transition-colors active:scale-95"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => scrollCarousel('right')}
                          aria-label="Next Slide"
                          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center border border-slate-700 transition-colors active:scale-95"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Scroll Rail */}
                    <div
                      ref={carouselRef}
                      className="flex items-stretch gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar"
                      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                    >
                      {displayListings.map((biz, idx) => {
                        const fallbackPhoto = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop&q=80';
                        const displayImage =
                          (biz.productImages && biz.productImages[0]) || biz.profileImageUrl || fallbackPhoto;

                        const connectUrl =
                          biz.whatsappDeepLink ||
                          `https://wa.me/message/YYWEZAZZIXBRF1?text=CONNECT_VENDOR_${encodeURIComponent(biz.id)}`;

                        const isSpotlightItem = Boolean(biz.isHighlyRecommended);

                        return (
                          <div
                            key={biz.id || idx}
                            className="min-w-[270px] sm:min-w-[290px] max-w-[290px] bg-slate-950 hover:border-amber-500/50 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-md group shrink-0 snap-start relative"
                          >
                            {/* Image Container */}
                            <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-800 h-36 mb-3">
                              <img
                                src={displayImage}
                                alt={biz.product || biz.businessName}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = fallbackPhoto;
                                }}
                              />
                              <div className="absolute top-2 left-2">
                                {isSpotlightItem ? (
                                  <span className="text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm">
                                    <Sparkles className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                                    Spotlight
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-700/80 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm backdrop-blur-sm">
                                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                                    Verified
                                  </span>
                                )}
                              </div>
                              <div className="absolute bottom-2 right-2">
                                <span className="text-xs font-mono font-bold text-slate-100 bg-slate-950/90 border border-slate-700/80 px-2.5 py-0.5 rounded-lg shadow-sm backdrop-blur-sm">
                                  {formatDisplayPrice(biz.price)}
                                </span>
                              </div>
                            </div>

                            {/* Content Info */}
                            <div className="space-y-2 flex-1">
                              <div>
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="font-bold text-slate-100 text-sm truncate group-hover:text-amber-300 transition-colors">
                                    {biz.businessName}
                                  </h4>
                                  {biz.isVerified && (
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-sky-400 truncate mt-0.5">
                                  {biz.product}
                                </p>
                              </div>

                              <div className="text-[11px] text-slate-400 space-y-1 pt-1.5 border-t border-slate-900">
                                <div className="flex items-center gap-1.5 truncate">
                                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{biz.location}</span>
                                </div>
                                <div className="flex items-center gap-1.5 truncate">
                                  <Tag className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{biz.category}</span>
                                </div>
                              </div>
                            </div>

                            {/* Connect Button Under Card */}
                            <div className="mt-4 pt-3 border-t border-slate-800/80">
                              <a
                                href={connectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                                <span>Connect</span>
                                <ExternalLink className="w-3 h-3 opacity-80" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}

              {/* SIMPLE LINE PROMPT & MORE LIST TRIGGER BELOW THE CAROUSEL */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                  These are our best recommended businesses for your search. In case you want to see more businesses, let us know.
                </p>

                <button
                  onClick={() => setShowMoreList(!showMoreList)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-sky-300 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 active:scale-95"
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>{showMoreList ? 'Hide Additional List' : 'View More Businesses'}</span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${showMoreList ? 'rotate-90' : ''}`} />
                </button>
              </div>
            </div>

            {/* EXPANDED ORGANIC LISTINGS (Shown when user wants more list) */}
            {showMoreList && (() => {
              const displayedCarouselList = spotlightListings.length > 0 ? spotlightListings : results.slice(0, 7);
              const carouselBusinessNames = new Set(displayedCarouselList.map((b) => b.businessName.toLowerCase().trim()));
              const carouselIds = new Set(displayedCarouselList.map((b) => b.id));
              const additionalListings = results.filter(
                (b) => !carouselIds.has(b.id) && !carouselBusinessNames.has(b.businessName.toLowerCase().trim())
              );

              return (
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 space-y-5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                      <ListFilter className="w-4 h-4 text-sky-400" />
                      Additional Verified Business Matches ({additionalListings.length})
                    </span>
                  </div>

                  {additionalListings.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs bg-slate-950/60 border border-slate-800 rounded-2xl p-4">
                      All top matching businesses for this search are currently featured in the Spotlight carousel above.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {additionalListings.map((biz) => {
                        const deepLinkUrl = biz.telegramDeepLink || biz.leadDeepLink || 'https://t.me/Floatebusinessbot';
                        const waUrl =
                          biz.whatsappDeepLink ||
                          `https://wa.me/message/YYWEZAZZIXBRF1?text=CONNECT_VENDOR_${encodeURIComponent(biz.id)}`;

                        return (
                          <div
                            key={biz.id}
                            className="bg-slate-950 hover:border-slate-700 border border-slate-800/90 rounded-2xl p-5 flex flex-col justify-between transition-all shadow-md group"
                          >
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                {biz.profileImageUrl ? (
                                  <img
                                    src={biz.profileImageUrl}
                                    alt={biz.businessName}
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0 bg-slate-800"
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-900 to-indigo-900 border border-sky-700 flex items-center justify-center text-sky-200 font-bold text-base shrink-0">
                                    {biz.businessName.charAt(0).toUpperCase()}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <h4 className="font-bold text-slate-100 text-sm truncate group-hover:text-sky-300 transition-colors">
                                      {biz.businessName}
                                    </h4>
                                    <span className="text-xs font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-800 px-2 py-0.5 rounded-lg shrink-0">
                                      {formatDisplayPrice(biz.price)}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                    {biz.isHighlyRecommended && (
                                      <span className="text-[10px] font-mono bg-amber-950/90 text-amber-300 border border-amber-700/80 px-1.5 py-0.5 rounded font-semibold flex items-center gap-0.5">
                                        <Sparkles className="w-3 h-3 text-amber-400 fill-amber-400" />
                                        Top Rated
                                      </span>
                                    )}
                                    {biz.isVerified && (
                                      <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                                        Verified
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-slate-300 space-y-1 pt-1 border-t border-slate-900">
                                <div className="flex items-center gap-1.5 text-slate-300">
                                  <ShoppingBag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  Product / Item: <span className="text-slate-100 font-semibold">{biz.product}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-slate-400">
                                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  Location: {biz.location}
                                </div>
                              </div>
                            </div>

                            {/* Direct Connect Buttons */}
                            <div className="mt-4 pt-3 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <a
                                href={waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <ShoppingBag className="w-3.5 h-3.5" />
                                WhatsApp Connect
                                <ExternalLink className="w-3 h-3 opacity-80" />
                              </a>

                              <a
                                href={deepLinkUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-2 px-3 bg-sky-600/20 hover:bg-sky-600 text-sky-300 hover:text-white border border-sky-500/40 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                              >
                                <Bot className="w-3.5 h-3.5 text-sky-400" />
                                Telegram Connect
                                <ExternalLink className="w-3 h-3 opacity-80" />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Nationwide Network Deep Links */}
            <div className="bg-gradient-to-r from-sky-950/80 via-slate-900 to-indigo-950/80 border-2 border-sky-600/50 rounded-2xl p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
              <div className="space-y-1.5 max-w-xl">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold tracking-wide uppercase font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  Explore Full Network
                </div>
                <h4 className="text-base font-bold text-slate-100">
                  Search across all Nigerian open markets & verified stores
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Chat with Floate on WhatsApp or Telegram to search the full nationwide network for <strong className="text-sky-300">"{query}"</strong> with direct merchant quotes and waybill verification.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto shrink-0">
                <a
                  href={moreBusinessesWhatsAppDeepLink || `https://wa.me/message/YYWEZAZZIXBRF1?text=SEARCH_${encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]+/g, '_'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-emerald-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>MORE ON WHATSAPP</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <a
                  href={moreBusinessesDeepLink || `https://t.me/Floatebusinessbot?start=search_${encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]+/g, '_'))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-sky-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Bot className="w-4 h-4" />
                  <span>TELEGRAM</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
