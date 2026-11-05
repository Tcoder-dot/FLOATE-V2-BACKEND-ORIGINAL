import React, { useState, useEffect } from "react";
import { Product } from "../types/floate";
import { api } from "../services/api";
import { getVendorWhatsAppLink } from "../services/floateConnection";
import { inquireLead } from "../services/floateApi";
import { useCart } from "../context/CartContext";
import { DetailHeader } from "../components/common/DetailHeader";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { SEO } from "../components/common/SEO";
import { saveRecentProduct } from "../utils/recentSearchesStore";
import { createMerchantSlug } from "../utils/merchantSlug";
import { buildProductUrl, buildProductPath } from "../utils/productUrl";
import { isInWishlist, toggleWishlist, subscribeWishlist } from "../utils/wishlistStore";
import {
  CheckCircle2,
  MapPin,
  MessageCircle,
  Plus,
  Minus,
  Store,
  ArrowRight,
  Heart,
  Loader2,
  Share2
} from "lucide-react";

interface ProductPageProps {
  id: string;
  onBack: () => void;
  onOpenVendor: (slug: string) => void;
  onOpenProduct?: (id: string) => void;
}

export const ProductPage: React.FC<ProductPageProps> = ({
  id,
  onBack,
  onOpenVendor,
  onOpenProduct
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  const { addToCart, isLoading: isCartLoading, setIsCartDrawerOpen } = useCart();

  useEffect(() => {
    const loadProductData = async () => {
      setIsLoading(true);
      try {
        const res = await api.getProduct(id);
        if (res.success && res.product) {
          setProduct(res.product);
          const canonicalPath = buildProductPath(
            res.product.id,
            createMerchantSlug(res.product.vendor.name) || res.product.vendor.slug
          );
          if (window.location.pathname !== canonicalPath) {
            const currentUrl = new URL(window.location.href);
            currentUrl.pathname = canonicalPath;
            window.history.replaceState({}, "", currentUrl);
          }
          saveRecentProduct(res.product);

          setIsSaved(isInWishlist(res.product.id));

          // Load related products from the same vendor or city
          if (res.product.vendor?.slug) {
            try {
              const vendorRes = await api.getVendorProducts(res.product.vendor.slug);
              if (vendorRes.success && vendorRes.products) {
                const others = vendorRes.products.filter((p) => p.id !== res.product.id).slice(0, 4);
                setRelatedProducts(others);
              }
            } catch (e) {
              // fallback
            }
          }
        }
      } catch (err) {
        console.error("Error loading product details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProductData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setIsSaved(isInWishlist(product.id));
    const unsubscribe = subscribeWishlist(() => {
      setIsSaved(isInWishlist(product.id));
    });
    return unsubscribe;
  }, [product]);

  const toggleSaveProduct = () => {
    if (!product) return;
    const newState = toggleWishlist(product);
    setIsSaved(newState);
  };

  const handleShare = () => {
    const shareUrl = product
      ? buildProductUrl(product.id, createMerchantSlug(product.vendor.name) || product.vendor.slug)
      : window.location.href;
    if (navigator.share && product) {
      navigator
        .share({
          title: product.title,
          text: `Check out ${product.title} (${product.formatted_price}) on FLOATE verified market stalls:`,
          url: shareUrl
        })
        .catch(() => {});
    } else {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;
    await addToCart(product.id, quantity);
    setIsCartDrawerOpen(true);
  };

  const handleChatSeller = () => {
    if (!product) return;
    inquireLead({
      productId: product.id,
      productName: product.title,
      vendorPhone: product.vendor.whatsapp_number
    }).catch(() => null);

    window.location.href = getVendorWhatsAppLink(product.vendor.whatsapp_number, product.title);
  };

  if (isLoading) {
    return (
      <LoadingScreen
        message="Loading Product..."
        subtitle="Fetching verified market stall details..."
      />
    );
  }

  if (!product) {
    return (
      <div className="w-full min-h-screen bg-[#FAF8F2]">
        <DetailHeader title="Product Unavailable" onBack={onBack} />
        <div className="max-w-[720px] mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#E6F4EA] flex items-center justify-center mx-auto text-[#0A4D3C]">
            <Store className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black text-[#13241F]">Item Not Found</h3>
          <p className="text-xs text-[#5B6E66]">
            This physical stall item may have been sold or moved to another line.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-3 rounded-full bg-[#0A4D3C] text-white text-xs font-black shadow-md hover:bg-[#064E3B] transition-all cursor-pointer"
          >
            Return to Marketplace Feed
          </button>
        </div>
      </div>
    );
  }

  const rawPhotos = product.photos && product.photos.length > 0
    ? product.photos
    : [product.photo_url || "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"];
  const allPhotos = rawPhotos.map((photo) =>
    photo.startsWith("data:image/")
      ? `https://www.floate.xyz/product-image/${encodeURIComponent(product.id)}`
      : photo
  );

  const currentDisplayPhoto = allPhotos[activePhotoIdx] || allPhotos[0];
  const canonicalUrl = buildProductUrl(
    product.id,
    createMerchantSlug(product.vendor.name) || product.vendor.slug
  );
  const merchantCanonicalSlug = createMerchantSlug(product.vendor.name) || product.vendor.slug;
  const itemCondition = product.condition?.toLowerCase() === "new"
    ? "https://schema.org/NewCondition"
    : product.condition?.toLowerCase() === "used"
    ? "https://schema.org/UsedCondition"
    : product.condition?.toLowerCase() === "refurbished"
    ? "https://schema.org/RefurbishedCondition"
    : undefined;

  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonicalUrl}#product`,
    url: canonicalUrl,
    sku: product.id,
    name: product.title,
    image: allPhotos,
    description:
      product.description ||
      `${product.title} available from verified merchant ${product.vendor.name} in ${product.vendor.city}. Direct physical trade price.`,
    offers: {
      "@type": "Offer",
      url: canonicalUrl,
      price: product.price_naira,
      priceCurrency: "NGN",
      ...(itemCondition ? { itemCondition } : {}),
      availability: product.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Store",
        "@id": `https://www.floate.xyz/vendor/${encodeURIComponent(merchantCanonicalSlug)}#store`,
        url: `https://www.floate.xyz/vendor/${encodeURIComponent(merchantCanonicalSlug)}`,
        name: product.vendor.name,
        address: {
          "@type": "PostalAddress",
          addressLocality: product.vendor.city,
          addressCountry: "NG"
        }
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#F7F7F2] pb-24 sm:pb-16 animate-arrange-in">
      <SEO
        title={`${product.title} — ${product.formatted_price} | FLOATE`}
        description={`${product.title} for ${product.formatted_price} from ${product.vendor.name} in ${product.vendor.city}. View listing details and contact the seller directly on WhatsApp through FLOATE.`}
        image={currentDisplayPhoto}
        url={canonicalUrl}
        type="product"
        schemaData={productSchema}
      />

      {/* Top Header */}
      <DetailHeader
        title={product.title}
        city={product.vendor.city}
        onBack={onBack}
      />

      {/* Main Container */}
      <div className="max-w-[720px] mx-auto px-4 pt-4 space-y-4">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between text-xs font-bold text-[#666666] px-1">
          <button
            onClick={onBack}
            className="hover:text-[#1B5E20] hover:underline flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>← Back to Marketplace</span>
          </button>

          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 hover:text-[#1B5E20] transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>{copiedLink ? "Link Copied!" : "Share Item"}</span>
          </button>
        </div>

        {/* 1) Hero Image Showcase */}
        <div className="relative w-full rounded-2xl sm:rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-sm group">
          <div className="relative w-full h-72 sm:h-96 flex items-center justify-center overflow-hidden product-placeholder-gradient">
            <img
              src={currentDisplayPhoto}
              alt={product.title}
              onError={(e) => {
                e.currentTarget.src =
                  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80";
              }}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
            />
            {/* Subtle Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Top Badges */}
          <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2">
              <span className="bg-[#1B5E20] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1 pointer-events-auto">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FFC107]" />
                <span>Verified Stall Item</span>
              </span>

              {product.is_sale && (
                <span className="bg-[#FFC107] text-[#123F16] text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md pointer-events-auto">
                  ✦ Sale Deal
                </span>
              )}
            </div>

            {/* Floating Heart / Bookmark Button */}
            <button
              onClick={toggleSaveProduct}
              className="pointer-events-auto w-10 h-10 rounded-full bg-white/95 hover:bg-white text-[#111111] shadow-md flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              aria-label="Save to Favourites"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  isSaved ? "fill-[#EF4444] text-[#EF4444]" : "text-[#111111]"
                }`}
              />
            </button>
          </div>

          {/* Thumbnail Strip (if multiple photos) */}
          {allPhotos.length > 1 && (
            <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center gap-2 overflow-x-auto hide-scrollbar py-1">
              {allPhotos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIdx(idx)}
                  className={`w-12 h-12 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 cursor-pointer ${
                    activePhotoIdx === idx
                      ? "border-[#FFC107] scale-105 shadow-md"
                      : "border-white/60 opacity-80 hover:opacity-100"
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2) Main Pricing & Action Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="text-3xl sm:text-4xl font-black text-[#1B5E20] tabular-nums tracking-tight leading-none">
                {product.formatted_price}
              </div>

              <span className="text-[11px] font-extrabold text-[#1B5E20] bg-[#E8F5E9] px-2.5 py-1 rounded-full border border-[#1B5E20]/20">
                Direct Stall Price
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-black text-[#111111] tracking-tight leading-snug mt-2">
              {product.title}
            </h1>

            {/* Unboxed Metadata */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#666666] mt-2 flex-wrap">
              <span className="flex items-center gap-1 text-[#1B5E20] font-bold">
                <MapPin className="w-3.5 h-3.5 text-[#1B5E20]" />
                <span>{product.vendor.city} Commercial Hub</span>
              </span>
              <span>·</span>
              <span>In Stock</span>
              <span>·</span>
              <span>Same-Day Dispatch Available</span>
            </div>
          </div>

          {/* Quantity Stepper & Dual CTA Buttons */}
          <div className="pt-2 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#111111] uppercase tracking-wide">
                Quantity
              </span>
              <div className="flex items-center gap-3 bg-[#F7F7F2] border border-slate-200 rounded-xl px-2 py-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-lg bg-white text-[#111111] hover:bg-[#E8F5E9] flex items-center justify-center font-black transition-colors cursor-pointer shadow-xs active:scale-90"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black text-[#111111] tabular-nums min-w-[20px] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-7 h-7 rounded-lg bg-white text-[#111111] hover:bg-[#E8F5E9] flex items-center justify-center font-black transition-colors cursor-pointer shadow-xs active:scale-90"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  onClick={handleAddToCart}
                  disabled={isCartLoading || !product.in_stock}
                  className="w-full py-3.5 px-5 rounded-full bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 font-extrabold text-[#FFC107]" />
                  <span>Add to Shopping Cart</span>
                </button>

                <button
                  onClick={handleChatSeller}
                  className="w-full py-3.5 px-5 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-[#123F16] text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-[#123F16]" />
                  <span>Chat & Order on WhatsApp</span>
                </button>
              </div>

              <button
                onClick={handleShare}
                className="w-full py-3 px-4 rounded-full bg-[#F7F7F2] hover:bg-[#E8F5E9] text-[#1B5E20] border border-[#1B5E20]/20 text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs active:scale-95"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? "Link Copied to Clipboard!" : "Share Product & Get Deep-Link"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3) Verified Vendor Stall Profile Card */}
        <div
          onClick={() => onOpenVendor(product.vendor.slug)}
          className="group bg-white rounded-2xl sm:rounded-3xl border border-slate-200 p-4 sm:p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-center justify-between gap-4 cursor-pointer select-none"
        >
          <div className="flex items-center gap-3.5 w-full sm:w-auto">
            <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-[#FFC107] border-2 border-slate-200 flex-shrink-0">
              {product.vendor.avatar_url ? (
                <img
                  src={product.vendor.avatar_url}
                  alt={product.vendor.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#1B5E20] font-black text-lg bg-[#FFC107]">
                  {product.vendor.name.charAt(0)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#7CFC8A] border-2 border-white rounded-full" />
            </div>

            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm sm:text-base font-black text-[#111111] group-hover:text-[#1B5E20] transition-colors">
                  {product.vendor.name}
                </h3>
                <span className="inline-flex items-center gap-1 bg-[#E8F5E9] text-[#1B5E20] text-[10px] font-black px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-[#1B5E20]" />
                  Verified
                </span>
              </div>

              <p className="text-xs text-[#666666] font-semibold mt-0.5">
                Verified Market Merchant · {product.vendor.city} Commercial Hub
              </p>
              <p className="text-[11px] text-[#1B5E20] font-extrabold mt-0.5">
                ● Active on WhatsApp · Quick Response
              </p>
            </div>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleChatSeller();
              }}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-full bg-[#E8F5E9] hover:bg-[#C8E6C9] text-[#1B5E20] text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat Stall</span>
            </button>

            <button
              onClick={() => onOpenVendor(product.vendor.slug)}
              className="flex-1 sm:flex-initial py-2.5 px-4 rounded-full bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Visit Stall</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#FACC15]" />
            </button>
          </div>
        </div>

        {/* 5) Product Specifications & Description */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-[#0A4D3C]/12 p-5 sm:p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-black text-[#13241F] uppercase tracking-wider">
            Item Details & Specifications
          </h3>

          <p className="text-xs sm:text-sm text-[#13241F] leading-relaxed whitespace-pre-line font-medium">
            {product.description ||
              "Inspected and verified directly from the merchant's physical stall shelf."}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#0A4D3C]/10 text-xs">
            <div className="space-y-1">
              <span className="text-[#5B6E66] font-semibold text-[11px] uppercase tracking-wider block">
                Condition
              </span>
              <span className="font-extrabold text-[#13241F]">
                Verified Grade A / Market New
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[#5B6E66] font-semibold text-[11px] uppercase tracking-wider block">
                Availability
              </span>
              <span className="font-extrabold text-[#10B981]">
                {product.in_stock ? "In Stock (Ready to dispatch)" : "Pre-order available"}
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[#5B6E66] font-semibold text-[11px] uppercase tracking-wider block">
                Market Location
              </span>
              <span className="font-extrabold text-[#13241F]">
                {product.vendor.city} Commercial Line
              </span>
            </div>
          </div>
        </div>

        {/* 6) Related Items from Same Vendor or Market */}
        {relatedProducts.length > 0 && (
          <div className="space-y-3 pt-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-[#13241F] uppercase tracking-wider">
                More from {product.vendor.name}
              </h3>
              <button
                onClick={() => onOpenVendor(product.vendor.slug)}
                className="text-xs font-black text-[#0A4D3C] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5">
              {relatedProducts.map((item) => (
                <article
                  key={item.id}
                  onClick={() => {
                    if (onOpenProduct) onOpenProduct(item.id);
                    else window.location.href = `/product/${item.id}`;
                  }}
                  className="group bg-white rounded-2xl border border-[#0A4D3C]/12 p-2 sm:p-2.5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="relative w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-[#13241F]">
                    <img
                      src={
                        item.photo_url ||
                        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"
                      }
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                    />
                  </div>

                  <div className="pt-2 px-0.5">
                    <div className="text-sm font-black text-[#13241F] tabular-nums">
                      {item.formatted_price}
                    </div>
                    <h4 className="text-xs font-extrabold text-[#13241F] line-clamp-1 leading-snug mt-0.5 group-hover:text-[#0A4D3C] transition-colors">
                      {item.title}
                    </h4>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
