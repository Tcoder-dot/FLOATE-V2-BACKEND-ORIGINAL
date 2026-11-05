import React, { useState, useEffect } from "react";
import { Heart, Trash2, ArrowRight, ShoppingBag } from "lucide-react";
import { Header } from "../components/common/Header";
import { PageHero } from "../components/common/PageHero";
import { Footer } from "../components/common/Footer";
import { ClosingCtaBand } from "../components/common/ClosingCtaBand";
import { FeedCard } from "../components/common/FeedCard";
import { Product } from "../types/floate";
import { getWishlistProducts, subscribeWishlist, removeFromWishlist } from "../utils/wishlistStore";

interface WishlistPageProps {
  onNavigateHome: () => void;
  onNavigatePage: (page: any) => void;
  onOpenProduct: (id: string) => void;
  onOpenVendor: (slug: string) => void;
  onExploreStalls: () => void;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  onNavigateHome,
  onNavigatePage,
  onOpenProduct,
  onOpenVendor,
  onExploreStalls
}) => {
  const [savedProducts, setSavedProducts] = useState<Product[]>(() => getWishlistProducts());

  useEffect(() => {
    setSavedProducts(getWishlistProducts());
    const unsubscribe = subscribeWishlist(() => {
      setSavedProducts(getWishlistProducts());
    });
    return unsubscribe;
  }, []);

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear your saved items wishlist?")) {
      savedProducts.forEach((p) => removeFromWishlist(p.id));
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#111111] flex flex-col font-sans">
      {/* Universal Header */}
      <Header
        onNavigateHome={onNavigateHome}
        onNavigatePage={onNavigatePage}
        onExploreStalls={onExploreStalls}
      />

      {/* Hero Header */}
      <PageHero
        microLabel="WISHLIST · SAVED ITEMS"
        headline="Your Saved Products. / Ready when you are."
        subtitle="Saved products from verified market stalls across Lagos, Onitsha, Enugu & Kano."
      />

      {/* Main Wishlist Content */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-12 py-10">
        {savedProducts.length > 0 ? (
          <div className="space-y-6">
            {/* Header Control Strip */}
            <div className="flex items-center justify-between pb-4 border-b border-[#0A4D3C]/10">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#EF4444] fill-[#EF4444]" />
                <h2 className="text-lg sm:text-xl font-black text-[#13241F]">
                  Saved Items ({savedProducts.length})
                </h2>
              </div>

              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer border border-red-200"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Wishlist</span>
              </button>
            </div>

            {/* Product Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {savedProducts.map((product) => (
                <FeedCard
                  key={product.id}
                  product={product}
                  onOpenProduct={onOpenProduct}
                  onOpenVendor={onOpenVendor}
                />
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="max-w-[560px] mx-auto py-16 px-6 bg-white border border-[#0A4D3C]/12 rounded-3xl text-center space-y-5 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center mx-auto">
              <Heart className="w-8 h-8 text-[#1B5E20]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-[#13241F]">
                Your Wishlist is Empty
              </h2>
              <p className="text-sm text-[#5B6E66] max-w-md mx-auto leading-relaxed font-medium">
                Tap the heart icon on any product in the marketplace feed or merchant storefront to save items for quick access later.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={onExploreStalls}
                className="px-8 py-3.5 rounded-full bg-[#FFC107] hover:bg-[#ffcd38] text-[#123F16] font-black text-sm shadow-md transition-transform active:scale-95 inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Browse Marketplace Feed</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Closing CTA Band */}
      <ClosingCtaBand onExploreStalls={onExploreStalls} />

      {/* Universal Footer */}
      <Footer onNavigatePage={onNavigatePage} />
    </div>
  );
};
