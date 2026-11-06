import React, { useState, useEffect, useMemo } from "react";
import { Vendor, Product, StatusItem } from "../types/floate";
import { api } from "../services/api";
import { getVendor, sendBuyerInquiry } from "../services/floateApi";
import { SEO } from "../components/common/SEO";
import { StatusViewer } from "../components/common/StatusViewer";
import { useCart } from "../context/CartContext";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { normalizeWhatsAppNumber } from "../utils/whatsapp";
import { createMerchantSlug } from "../utils/merchantSlug";
import { 
  CheckCircle2, 
  MapPin, 
  MessageSquare, 
  ShoppingBag, 
  Bookmark, 
  BookmarkCheck,
  ArrowLeft,
  Share2,
  Store,
  Search,
  Check,
  ShieldCheck,
  Loader2,
  Layers
} from "lucide-react";

interface VendorPageProps {
  slug: string;
  onBack: () => void;
  onOpenProduct: (id: string) => void;
  onNavigateHome?: () => void;
  onNavigatePage?: (page: 'COMPANY' | 'VENDORS_PAGE' | 'ECO_PARTNERS' | 'WHATSAPP_AI' | 'TELEGRAM_AI' | 'BLOG' | 'CONTACT' | 'PRIVACY' | 'TERMS' | 'ABOUT') => void;
  onOpenPublicVerify?: (fid: string) => void;
}

const REGISTER_BUSINESS_URL = "https://wa.me/message/YYWEZAZZIXBRF1?text=REGISTER_BUSINESS";

export const VendorPage: React.FC<VendorPageProps> = ({
  slug,
  onBack,
  onOpenProduct,
  onNavigateHome,
  onNavigatePage,
  onOpenPublicVerify
}) => {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [statuses, setStatuses] = useState<StatusItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectedStatusIndex, setSelectedStatusIndex] = useState<number | null>(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  const { cart, setIsCartDrawerOpen } = useCart();
  const isCartWithThisVendor = cart.vendor?.slug === slug && cart.count > 0;

  useEffect(() => {
    let isMounted = true;
    const loadVendorData = async () => {
      setIsLoading(true);
      try {
        // 1. Fetch merchant profile & products via GET ${NEXT_PUBLIC_FLOATE_API_URL}/api/catalog/vendor/{identifier}
        const catalogData = await getVendor(slug);

        if (catalogData && catalogData.vendor && isMounted) {
          setVendor(catalogData.vendor);
          if (catalogData.products && catalogData.products.length > 0) {
            setProducts(catalogData.products);
            setTotalProducts(catalogData.products.length);
          }
          if (catalogData.statuses && catalogData.statuses.length > 0) {
            setStatuses(catalogData.statuses);
          }
        } else {
          // Fallback to legacy endpoint if catalog vendor didn't return
          const vRes = await api.getVendor(slug);
          if (isMounted && vRes.success && vRes.vendor) {
            setVendor(vRes.vendor);
          }
        }

        // Additional products & saved shop state check
        const [pRes, savedRes] = await Promise.all([
          api.getVendorProducts(slug).catch(() => ({ success: false, products: [], next_cursor: null })),
          api.getSavedShops("default-user").catch(() => ({ success: false, shops: [] }))
        ]);

        if (isMounted) {
          if (pRes.success && pRes.products && pRes.products.length > 0) {
            setProducts((prev) => (prev.length === 0 ? pRes.products : prev));
            setNextCursor((pRes as any).next_cursor || null);
            setTotalProducts((prev) => prev || (pRes as any).total_products || pRes.products.length);
          }
          if (savedRes.success && savedRes.shops && vendor) {
            const exists = savedRes.shops.some(
              (s) => s.vendor_id === vendor.id || s.vendor.slug === vendor.slug
            );
            setIsSaved(exists);
          }
        }
      } catch (err) {
        console.error("Error loading vendor profile:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadVendorData();
    return () => { isMounted = false; };
  }, [slug]);

  const handleToggleSaveShop = async () => {
    if (!vendor) return;
    if (isSaved) {
      setIsSaved(false);
      await api.unsaveShop("default-user", vendor.id);
    } else {
      setIsSaved(true);
      await api.saveShop("default-user", vendor.id);
    }
  };

  const handleFetchMoreProducts = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const pRes = await api.getVendorProducts(slug, nextCursor);
      if (pRes.success && pRes.products) {
        setProducts((prev) => [...prev, ...pRes.products]);
        setNextCursor(pRes.next_cursor || null);
      }
    } catch (err) {
      console.warn("Error fetching more vendor products:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleShareProfile = () => {
    const canonicalUrl = `https://www.floate.xyz/vendor/${slug}`;
    if (navigator.share) {
      navigator.share({
        title: `${vendor?.name || 'Verified Stall'} on FLOATE`,
        text: `Check out ${vendor?.name || 'Verified Stall'} on FLOATE Africa:`,
        url: canonicalUrl
      }).then(() => {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }).catch(() => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(canonicalUrl);
          setCopiedLink(true);
          setTimeout(() => setCopiedLink(false), 2500);
        }
      });
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(canonicalUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleChatSeller = (customMessage?: string) => {
    if (!vendor) return;
    const rawDigits = (vendor.whatsapp_number || vendor.phone || "").replace(/[^0-9]/g, "");
    const intlPhone = rawDigits.startsWith("0") ? "234" + rawDigits.slice(1) : (rawDigits.startsWith("234") ? rawDigits : "234" + rawDigits);
    const msg = customMessage || `Hello ${vendor.name}, I am viewing your live storefront on FLOATE. I am interested in your catalog items!`;

    // Spec 5: Relay buyer inquiry to backend CRM
    sendBuyerInquiry({
      vendorPhone: intlPhone,
      productName: vendor.name,
      message: msg
    }).catch(() => null);

    window.open(`https://wa.me/${intlPhone}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  };

  const getInitials = (name: string): string => {
    const norm = name.toUpperCase();
    if (norm.includes("CHIVORA")) return "CH";
    if (norm.includes("MAKKY")) return "ML";
    if (norm.includes("GOODY")) return "GC";
    if (norm.includes("MBAM")) return "MP";
    if (norm.includes("JULE")) return "JB";
    if (norm.includes("RICH BUILD")) return "RB";
    const words = norm.replace(/[^A-Z0-9\s]/g, "").split(/\s+/).filter(w => !["THE", "AND", "&", "OF", "CO", "LTD", "NIGERIA"].includes(w));
    if (words.length >= 2) return words[0][0] + words[1][0];
    if (words.length === 1 && words[0].length >= 2) return words[0].slice(0, 2);
    return norm.slice(0, 2) || "FL";
  };

  // Filtered categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["ALL", ...Array.from(set)];
  }, [products]);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCat = selectedCategory === "ALL" || p.category === selectedCategory;
      const matchesSearch = !catalogSearch.trim() || 
        p.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
        (p.specs && p.specs.some(s => s.toLowerCase().includes(catalogSearch.toLowerCase())));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, catalogSearch]);

  if (isLoading && !vendor) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] font-sans animate-fade-in pb-20">
        {/* Cover Hero Banner Skeleton */}
        <div className="w-full bg-gradient-to-b from-[#123F16] via-[#0A4D3C] to-[#064E3B] text-white pt-8 pb-14 px-4 sm:px-8">
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center gap-2 text-xs text-[#FFC107] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              <span>Opening Verified Stall...</span>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 border-2 border-white/30 animate-pulse shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <div className="w-48 sm:w-64 h-6 bg-white/25 rounded-full animate-pulse" />
                <div className="w-36 h-4 bg-white/15 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Storefront Content Skeleton */}
        <div className="max-w-4xl mx-auto px-4 -mt-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center justify-between animate-pulse">
            <div className="w-40 h-4 bg-slate-200 rounded-full" />
            <div className="w-28 h-9 bg-slate-200 rounded-full" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-2.5 space-y-2.5 animate-pulse">
                <div className="w-full h-32 bg-slate-200 rounded-xl" />
                <div className="w-3/4 h-3.5 bg-slate-200 rounded-full" />
                <div className="w-1/2 h-3 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-[#FAF8F2] text-[#13241F] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-white border-2 border-[#13241F] flex items-center justify-center text-[#13241F] shadow-[3px_3px_0px_#13241F]">
          <Store className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-black text-[#13241F]">Merchant Storefront Not Found</h2>
          <p className="text-xs text-[#5B6E66] max-w-sm font-medium">
            No registered verified merchant matches the handle "@{slug}".
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#13241F] text-white text-xs font-black uppercase tracking-wider hover:bg-[#0A4D3C] transition cursor-pointer border-2 border-[#13241F] shadow-[3px_3px_0px_#13241F]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Marketplace Search</span>
        </button>
      </div>
    );
  }

  const isRealPhoto = Boolean(
    vendor.avatar_url &&
    typeof vendor.avatar_url === 'string' &&
    vendor.avatar_url.startsWith('http') &&
    !vendor.avatar_url.includes('unsplash.com') &&
    !vendor.avatar_url.includes('placeholder')
  );
  const canonicalSlug = createMerchantSlug(vendor.name) || slug;
  const schemaPhone = normalizeWhatsAppNumber(vendor.whatsapp_number || vendor.phone);

  const vendorSchema = {
    "@context": "https://schema.org",
    "@type": "Store",
    "@id": `https://www.floate.xyz/vendor/${encodeURIComponent(canonicalSlug)}#store`,
    "url": `https://www.floate.xyz/vendor/${encodeURIComponent(canonicalSlug)}`,
    "name": vendor.name,
    ...(isRealPhoto ? { "image": vendor.avatar_url } : {}),
    ...(schemaPhone
      ? { "telephone": `+${schemaPhone}` }
      : {}),
    "description": vendor.bio || `${vendor.name} merchant in ${vendor.city}, ${vendor.state}.`,
    "address": {
      "@type": "PostalAddress",
      ...(vendor.stallAddress || vendor.location
        ? { "streetAddress": vendor.stallAddress || vendor.location }
        : {}),
      "addressLocality": vendor.city,
      "addressRegion": vendor.state,
      "addressCountry": "NG"
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#111111] font-sans antialiased selection:bg-[#FFC107]/20 selection:text-[#123F16] pb-20 sm:pb-12">
      <SEO
        title={`${vendor.name} (${vendor.city}) — ${vendor.verified ? "Verified" : "Storefront"} on FLOATE`}
        description={`Explore live inventory and product catalog for ${vendor.name} in ${vendor.location || `${vendor.city}, ${vendor.state}`}. Direct WhatsApp orders.`}
        image={isRealPhoto ? vendor.avatar_url : undefined}
        url={`https://www.floate.xyz/vendor/${encodeURIComponent(canonicalSlug)}`}
        type="store"
        schemaData={vendorSchema}
      />

      {/* 2. HERO STOREFRONT SECTION (OFFICIAL COVER GRADIENT & FLOATE BRAND SYSTEM) */}
      <section className="pt-6 sm:pt-8 pb-12 px-4 sm:px-8 max-w-6xl mx-auto space-y-4">
        
        {/* Navigation Action Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-xs font-black text-[#111111] border border-slate-200 shadow-sm transition cursor-pointer active:translate-y-[1px]"
          >
            <ArrowLeft className="w-4 h-4 text-[#1B5E20]" />
            <span>Back to Search</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShareProfile}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF8E1] hover:bg-[#fff2c6] text-xs font-black text-[#111111] border border-[#FFC107]/40 shadow-sm transition cursor-pointer active:translate-y-[1px]"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#1B5E20]" /> : <Share2 className="w-3.5 h-3.5 text-[#111111]" />}
              <span>{copiedLink ? "Link Copied!" : "Share Store"}</span>
            </button>
          </div>
        </div>

        {/* Pending Verification Notice Banner for Storefront */}
        {!vendor.verified && (
          <div className="p-4 rounded-3xl bg-[#FFF8E1] border border-[#FFC107]/50 text-[#111111] shadow-sm flex items-start gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFC107] animate-ping mt-1.5 shrink-0" />
            <div className="space-y-1 text-left text-xs">
              <div className="font-black uppercase tracking-wider text-[#123F16] flex items-center gap-2">
                <span>{vendor.verificationStatus === "REJECTED" ? "Merchant Not Verified" : "Verification Pending"}</span>
                <span className="bg-[#FFC107]/20 text-[#123F16] text-[10px] px-2 py-0.5 rounded-full font-black">
                  {vendor.verificationStatus === "REJECTED" ? "Not verified" : "Under review"}
                </span>
              </div>
              <p className="text-[#555555] font-medium">
                This business is not verified by Floate. Its listed products remain discoverable; contact the merchant directly to confirm details.
              </p>
            </div>
          </div>
        )}

        {/* Hero Card Container (Signature Storefront Cover Gradient) */}
        <div className="w-full storefront-cover-gradient border-2 border-white/20 rounded-[36px] sm:rounded-[44px] p-6 sm:p-10 shadow-xl space-y-6 relative overflow-hidden text-white">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            
            {/* Avatar & Info */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-6 min-w-0 flex-1">
              {isRealPhoto ? (
                <img
                  src={vendor.avatar_url}
                  alt={vendor.name}
                  className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#F7F7F2] shadow-md shrink-0"
                />
              ) : (
                <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl bg-[#FFC107] text-[#1B5E20] border-4 border-[#F7F7F2] shadow-md flex items-center justify-center font-black text-2xl sm:text-4xl tracking-wider shrink-0">
                  {getInitials(vendor.name)}
                </div>
              )}

              <div className="space-y-3 min-w-0 flex-1 text-left">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                    {vendor.name}
                  </h1>

                  {/* Official Floate Verified Badge Block */}
                  {(vendor.isVerified === true || vendor.verified === true) ? (
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <img
                        src={vendor.badgeUrl || "https://i.postimg.cc/mkSLsdxb/20260929-122817.jpg"}
                        alt="Floate Verified"
                        className="w-10 h-10 rounded-full border-2 border-[#FFC107] shadow-sm object-cover shrink-0"
                      />
                      <span className="inline-flex items-center gap-1.5 bg-[#E8F5E9] text-[#1B5E20] border border-white/20 shadow-xs text-xs font-black px-3.5 py-1.5 rounded-full shrink-0">
                        <ShieldCheck className="w-4 h-4 text-[#1B5E20]" />
                        <span>100% Verified Merchant</span>
                      </span>
                    </div>
                  ) : null}

                  {vendor.is_spotlight && (
                    <span className="bg-[#FFC107] text-[#123F16] text-xs font-black px-3 py-1 rounded-full shrink-0 shadow-xs">
                      Spotlight
                    </span>
                  )}
                </div>

                {/* Location & Category Meta */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#E3F0E3] font-bold flex-wrap">
                  <span className="flex items-center gap-1 text-white">
                    <MapPin className="w-4 h-4 text-[#FFC107] shrink-0" />
                    <span>{vendor.location || `${vendor.city}, ${vendor.state}`}</span>
                  </span>
                  <span>•</span>
                  <span className="bg-white/15 text-white border border-white/20 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                    {vendor.category}
                  </span>
                </div>

                {/* Bio / Description */}
                {(vendor.bio || vendor.product) && (
                  <p className="text-xs sm:text-sm text-[#E3F0E3] font-medium leading-relaxed max-w-2xl pt-1">
                    {vendor.product || vendor.bio}
                  </p>
                )}

                {/* Active Indicator */}
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 shadow-xs text-xs font-bold text-[#E8F5E9]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#7CFC8A] animate-pulse"></span>
                    <span>Active on WhatsApp Now</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action CTAs */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 w-full md:w-auto shrink-0 pt-2 md:pt-0">
              <button
                type="button"
                onClick={() => handleChatSeller()}
                className="w-full md:w-60 py-4 px-6 bg-[#25D366] hover:bg-[#20ba5a] text-[#123F16] rounded-full shadow-lg text-sm font-black flex items-center justify-center gap-2 transition-all active:translate-y-[1px] cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-[#123F16]" />
                <span>Chat & Order on WhatsApp</span>
              </button>

              <div className="flex items-center gap-2 w-full md:w-60">
                <button
                  type="button"
                  onClick={handleToggleSaveShop}
                  className={`flex-1 py-3 px-4 rounded-full text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    isSaved
                      ? "bg-[#E8F5E9] text-[#1B5E20] shadow-sm"
                      : "bg-white text-[#111111] hover:bg-slate-50 shadow-sm"
                  }`}
                >
                  {isSaved ? <BookmarkCheck className="w-4 h-4 text-[#1B5E20]" /> : <Bookmark className="w-4 h-4 text-[#111111]" />}
                  <span>{isSaved ? "Saved" : "Save Shop"}</span>
                </button>

                {isCartWithThisVendor && (
                  <button
                    type="button"
                    onClick={() => setIsCartDrawerOpen(true)}
                    className="flex-1 py-3 px-4 bg-[#FFC107] hover:bg-[#ffcd38] text-[#123F16] rounded-full shadow-sm text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Cart ({cart.count})</span>
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3. ACTIVE STATUS DROPS SECTION */}
      {statuses.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-8 py-6">
          <div className="bg-white border-2 border-[#13241F] rounded-[32px] p-6 shadow-[4px_4px_0px_#13241F] space-y-4">
            <div className="flex items-center justify-between gap-2 border-b-2 border-[#13241F]/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#10B981] animate-pulse"></span>
                <h2 className="text-xl font-black text-[#13241F]">
                  Today's Live Status Drops
                </h2>
              </div>
              <span className="text-xs font-black text-[#78350F] bg-[#FEF3C7] border-2 border-[#13241F] px-3 py-1 rounded-full shadow-[2px_2px_0px_#13241F]">
                {statuses.length} Active {statuses.length === 1 ? 'Story' : 'Stories'}
              </span>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {statuses.map((status, idx) => (
                <div
                  key={status.id || idx}
                  className="group relative bg-[#13241F] rounded-[24px] border-2 border-[#13241F] overflow-hidden shadow-[3px_3px_0px_#13241F] hover:-translate-y-1 transition-all cursor-pointer flex flex-col"
                  onClick={() => setSelectedStatusIndex(idx)}
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#13241F]">
                    <img
                      src={status.preview_image || status.avatar_url || vendor.avatar_url}
                      alt={status.caption || "Status drop"}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#13241F] via-transparent to-transparent opacity-90"></div>
                    
                    <span className="absolute top-2 left-2 bg-[#FDE047] text-[#13241F] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border-2 border-[#13241F]">
                      FLASH DROP
                    </span>

                    <div className="absolute bottom-2 left-2 right-2 space-y-1.5">
                      <p className="text-xs font-black text-white line-clamp-2 leading-tight">
                        {status.caption || "Live Vendor Update"}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleChatSeller(`Hello ${vendor.name}, I want to buy your status drop: "${status.caption || 'Item'}"`);
                        }}
                        className="w-full py-1.5 px-2 bg-[#25D366] text-white rounded-full text-[11px] font-black flex items-center justify-center gap-1 border-2 border-[#13241F] shadow-[2px_2px_0px_#13241F] hover:bg-[#20ba5a] transition"
                      >
                        <MessageSquare className="w-3.5 h-3.5 fill-white" />
                        <span>Claim Drop</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Full-Screen Status Viewer Overlay */}
      {selectedStatusIndex !== null && statuses.length > 0 && (
        <StatusViewer
          statuses={statuses}
          initialIndex={selectedStatusIndex}
          onClose={() => setSelectedStatusIndex(null)}
        />
      )}

      {/* 4. PRODUCT CATALOG GRID SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-[#13241F]/10 pb-4">
          <div>
            <span className="px-3.5 py-1 rounded-full bg-[#FEF3C7] text-[#78350F] text-xs font-black uppercase tracking-wider border-2 border-[#13241F] shadow-[2px_2px_0px_#13241F]">
              Direct Physical Catalog
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-[#13241F] tracking-tight mt-2">
              Verified Product Inventory ({totalProducts})
            </h2>
          </div>

          {/* Search Input & Category Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#5B6E66] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-white border-2 border-[#13241F] rounded-full focus:outline-none font-bold shadow-[2px_2px_0px_#13241F]"
              />
            </div>

            {categories.length > 2 && (
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar py-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black whitespace-nowrap transition border-2 border-[#13241F] cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-[#13241F] text-white shadow-[2px_2px_0px_#13241F]"
                        : "bg-white text-[#13241F] hover:bg-slate-50 shadow-[1px_1px_0px_#13241F]"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white border-2 border-[#13241F] rounded-[32px] p-12 text-center space-y-3 shadow-[4px_4px_0px_#13241F]">
            <Store className="w-10 h-10 text-[#5B6E66] mx-auto" />
            <h3 className="text-base font-black text-[#13241F]">No products match your search</h3>
            <p className="text-xs text-[#5B6E66] font-medium max-w-sm mx-auto">
              Try adjusting your category filter or search keywords.
            </p>
            <button
              type="button"
              onClick={() => { setCatalogSearch(""); setSelectedCategory("ALL"); }}
              className="text-xs font-black text-[#0A4D3C] hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => {
              const formattedPrice = typeof product.price_naira === 'number'
                ? `₦${product.price_naira.toLocaleString()}`
                : `₦${Number(product.price_naira || 0).toLocaleString()}`;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-[28px] border border-slate-200 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
                >
                  <div>
                    {/* Image */}
                    <div
                      className="relative aspect-square w-full product-placeholder-gradient overflow-hidden cursor-pointer border-b border-slate-200"
                      onClick={() => onOpenProduct(product.id)}
                    >
                      <img
                        src={product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                      />
                      {product.condition && (
                        <span className="absolute top-3 left-3 bg-[#1B5E20] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-white/20 shadow-xs">
                          {product.condition}
                        </span>
                      )}
                      {(vendor.isVerified === true || vendor.verified === true) && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-[#123F16]/90 backdrop-blur-xs text-[#FFC107] border border-[#FFC107]/40 px-2 py-0.5 rounded-full text-[10px] font-black z-10 shadow-xs">
                          <img
                            src={vendor.badgeUrl || "https://i.postimg.cc/mkSLsdxb/20260929-122817.jpg"}
                            alt="Floate Verified"
                            className="w-3.5 h-3.5 rounded-full object-cover shrink-0"
                          />
                          <span>{vendor.fid || "VERIFIED"}</span>
                        </div>
                      )}
                      <span className="absolute bottom-3 right-3 bg-[#E8F5E9] text-[#1B5E20] text-xs font-black px-3 py-1 rounded-full border border-[#1B5E20]/20 shadow-xs">
                        {formattedPrice}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-2">
                      <h3
                        onClick={() => onOpenProduct(product.id)}
                        className="text-sm font-black text-[#111111] hover:text-[#1B5E20] line-clamp-2 cursor-pointer transition leading-snug"
                      >
                        {product.title}
                      </h3>

                      {product.specs && product.specs.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {product.specs.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="text-[10px] font-extrabold text-[#111111] bg-[#F7F7F2] border border-slate-200 px-2 py-0.5 rounded-full"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleChatSeller(`Hello ${vendor.name}, I saw "${product.title}" (${formattedPrice}) on your FLOATE storefront. Is it available?`)}
                      className="flex-1 py-2.5 px-3 bg-[#25D366] hover:bg-[#20ba5a] text-[#123F16] rounded-full shadow-xs text-xs font-black flex items-center justify-center gap-1.5 transition active:translate-y-[1px] cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-[#123F16]" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenProduct(product.id)}
                      className="py-2.5 px-3 bg-[#F7F7F2] hover:bg-slate-200 text-[#111111] rounded-full border border-slate-200 text-xs font-black transition cursor-pointer"
                    >
                      Details
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Load More Button */}
        {nextCursor && (
          <div className="text-center pt-4">
            <button
              type="button"
              onClick={handleFetchMoreProducts}
              disabled={isLoadingMore}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs font-black uppercase tracking-wider transition cursor-pointer disabled:opacity-50 shadow-md"
            >
              {isLoadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
              <span>{isLoadingMore ? "Loading More Items..." : "Load More Catalog Items"}</span>
            </button>
          </div>
        )}

      </section>

      {/* 5. CENTER-ALIGNED VERTICAL DEEP GREEN FOOTER */}
      <footer className="footer-green text-[#CFE3CF] pt-20 pb-16 px-6 sm:px-12 text-sm border-t border-white/15">
        <div className="max-w-2xl mx-auto flex flex-col items-center text-center space-y-12">
          
          <div className="flex flex-col items-center space-y-4">
            <a 
              href="/" 
              onClick={(e) => { 
                e.preventDefault(); 
                if (onNavigateHome) onNavigateHome(); else onBack();
              }}
              className="hover:opacity-90 transition-opacity cursor-pointer block"
            >
              <img
                src="https://i.postimg.cc/hvHgYf4r/20260929-130945.png"
                alt="FLOATE Footer Logo"
                className="h-28 sm:h-36 w-auto object-contain block mx-auto"
                referrerPolicy="no-referrer"
              />
            </a>
            <p className="text-sm text-[#CFE3CF] max-w-md leading-relaxed font-normal">
              {vendor.name} Storefront • Powered by FLOATE Verified Market Registry
            </p>
            <div className="text-xs font-black text-[#FFC107] tracking-wider uppercase">
              FLOATE AFRICA LTD (RC: 9365804)
            </div>
          </div>

          <div className="w-full pt-8 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-[#CFE3CF]">
            {onNavigateHome && (
              <button onClick={onNavigateHome} className="hover:text-white transition cursor-pointer">
                FLOATE Home
              </button>
            )}
            <a href={REGISTER_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="text-[#FFC107] font-black hover:underline">
              Register Stall Free
            </a>
            {onNavigatePage && (
              <>
                <button onClick={() => onNavigatePage('PRIVACY')} className="hover:text-white transition cursor-pointer">Privacy Policy</button>
                <button onClick={() => onNavigatePage('TERMS')} className="hover:text-white transition cursor-pointer">Terms of Service</button>
              </>
            )}
          </div>

          <div className="w-full pt-8 border-t border-white/15 flex flex-col items-center gap-2 text-xs text-[#B9D6B9]">
            <p>© {new Date().getFullYear()} FLOATE AFRICA LTD. All rights reserved.</p>
            <p className="text-white font-bold">www.floate.xyz</p>
          </div>

        </div>
      </footer>

      {/* 6. STICKY BOTTOM MOBILE BAR ("Chat on WhatsApp" with #25D366 bg & #123F16 text) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg flex items-center gap-3">
        <button
          type="button"
          onClick={() => handleChatSeller()}
          className="flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#20ba5a] text-[#123F16] rounded-full font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 fill-[#123F16]" />
          <span>Chat on WhatsApp</span>
        </button>
      </div>
    </div>
  );
};
