import React, { useState, useEffect } from "react";
import { CheckCircle2, Plus, Heart } from "lucide-react";
import { Product } from "../../types/floate";
import { useCart } from "../../context/CartContext";
import { isInWishlist, toggleWishlist, subscribeWishlist } from "../../utils/wishlistStore";

interface FeedCardProps {
  product: Product;
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

export const FeedCard: React.FC<FeedCardProps> = ({
  product,
  onOpenProduct,
  onOpenVendor
}) => {
  const { addToCart, isLoading } = useCart();
  const [isSaved, setIsSaved] = useState(() => isInWishlist(product.id));

  useEffect(() => {
    setIsSaved(isInWishlist(product.id));
    const unsubscribe = subscribeWishlist(() => {
      setIsSaved(isInWishlist(product.id));
    });
    return unsubscribe;
  }, [product.id]);

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addToCart(product.id, 1);
  };

  const handleToggleHeart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newState = toggleWishlist(product);
    setIsSaved(newState);
  };

  const cleanTitle = cleanProductTitle(product.title);
  const displayPhoto =
    product.photo_url ||
    product.photos?.[0] ||
    product.vendor?.avatar_url ||
    "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80";

  return (
    <article
      onClick={() => onOpenProduct(product.id)}
      className="group relative w-full bg-[#FFFFFF] border border-[#0A4D3C]/12 rounded-2xl p-2 sm:p-2.5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer select-none active:scale-[0.98] animate-arrange-in"
    >
      {/* Compact Image Box */}
      <div className="relative w-full h-28 sm:h-36 rounded-xl overflow-hidden bg-[#13241F] flex items-center justify-center">
        <img
          src={displayPhoto}
          alt={cleanTitle}
          onError={(e) => {
            e.currentTarget.src =
              "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80";
          }}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300 ease-out"
          loading="lazy"
        />

        {/* Top Badges & Action Buttons */}
        <div className="absolute top-1.5 left-1.5 right-1.5 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1">
            {product.is_sale && (
              <span className="bg-[#F59E0B] text-[#13241F] text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-xs">
                Sale
              </span>
            )}
            <span className="bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {product.vendor?.city || "Lagos"}
            </span>
          </div>

          <div className="flex items-center gap-1.5 pointer-events-auto">
            {/* Wishlist Heart Toggle Button */}
            <button
              onClick={handleToggleHeart}
              className="p-1.5 rounded-full bg-white/95 hover:bg-white text-[#13241F] shadow-md transition-transform active:scale-90 cursor-pointer"
              aria-label={isSaved ? `Remove ${cleanTitle} from wishlist` : `Add ${cleanTitle} to wishlist`}
              title={isSaved ? "Saved in Wishlist" : "Save to Wishlist"}
            >
              <Heart
                className={`w-3.5 h-3.5 transition-colors ${
                  isSaved ? "fill-red-500 text-red-500" : "text-[#13241F] hover:text-red-500"
                }`}
              />
            </button>

            {/* Quick Add Button */}
            <button
              onClick={handleQuickAdd}
              disabled={isLoading || !product.in_stock}
              className="p-1.5 rounded-full bg-white/95 hover:bg-white text-[#13241F] shadow-md transition-transform active:scale-90 disabled:opacity-50 cursor-pointer"
              aria-label={`Add ${cleanTitle} to cart`}
              title="Add to Cart"
            >
              <Plus className="w-3.5 h-3.5 font-extrabold" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact Card Content */}
      <div className="pt-2 px-0.5 flex flex-col justify-between flex-1">
        <div>
          {/* Price */}
          <div className="text-sm sm:text-base font-black text-[#13241F] tabular-nums tracking-tight leading-tight">
            {product.formatted_price || `₦${Number(product.price_naira || product.price || 0).toLocaleString()}`}
          </div>

          {/* Title */}
          <h3 className="text-xs font-extrabold text-[#13241F] line-clamp-1 leading-snug mt-0.5 group-hover:text-[#0A4D3C] transition-colors">
            {cleanTitle}
          </h3>
        </div>

        {/* Vendor Name */}
        <div className="pt-1 mt-1 border-t border-[#0A4D3C]/10 flex items-center justify-between text-[10px] font-bold text-[#5B6E66]">
          <span
            onClick={(e) => {
              e.stopPropagation();
              onOpenVendor(product.vendor.slug);
            }}
            className="hover:underline truncate max-w-[100px] cursor-pointer text-[#123F16] font-extrabold"
          >
            {product.vendor.name}
          </span>
          {(product.vendor.isVerified === true || product.vendor.verified === true) ? (
            <div className="flex items-center gap-1">
              {product.vendor.fid && (
                <span className="text-[8.5px] font-black text-[#123F16] bg-[#FFC107] px-1.5 py-0.2 rounded-full">
                  {product.vendor.fid}
                </span>
              )}
              <span className="text-[#10B981] font-black flex items-center gap-0.5" title="Verified Merchant">
                <CheckCircle2 className="w-2.5 h-2.5" />
              </span>
            </div>
          ) : (
            <span className="text-amber-800 font-extrabold text-[9px] bg-amber-50 border border-amber-200 px-1 py-0.2 rounded" title="Merchant is not verified">
              {product.vendor.verificationStatus === "REJECTED" ? "Not verified" : "Under review"}
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

