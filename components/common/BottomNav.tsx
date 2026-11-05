import React, { useState, useEffect } from "react";
import { Heart, ShoppingBag } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { getWishlistIds, subscribeWishlist } from "../../utils/wishlistStore";

interface BottomNavProps {
  activeTab: "favourites" | "cart" | "home" | "search" | string;
  onNavigateHome?: () => void;
  onNavigateSearch?: (query?: string, category?: string, maxPrice?: number, city?: string) => void;
  onNavigateFavourites?: () => void;
  onOpenCart?: () => void;
  onSelectTab?: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigateFavourites,
  onOpenCart,
  onSelectTab,
  onNavigateSearch
}) => {
  const { cart, isCartDrawerOpen, setIsCartDrawerOpen } = useCart();
  const [wishlistCount, setWishlistCount] = useState(() => getWishlistIds().length);

  useEffect(() => {
    setWishlistCount(getWishlistIds().length);
    const unsubscribe = subscribeWishlist(() => {
      setWishlistCount(getWishlistIds().length);
    });
    return unsubscribe;
  }, []);

  const currentTab = isCartDrawerOpen ? "cart" : activeTab;

  const handleTabClick = (tab: "favourites" | "cart") => {
    if (tab === "favourites") {
      setIsCartDrawerOpen(false);
      if (onSelectTab) onSelectTab("favourites");
      if (onNavigateFavourites) {
        onNavigateFavourites();
      } else if (onNavigateSearch) {
        onNavigateSearch("");
      }
    } else if (tab === "cart") {
      if (onSelectTab) onSelectTab("cart");
      if (onOpenCart) {
        onOpenCart();
      } else {
        setIsCartDrawerOpen((prev) => !prev);
      }
    }
  };

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto min-w-[240px] max-w-[300px] z-[70] bg-[#13241F] text-white border-2 border-[#0A4D3C] rounded-full px-4 py-2 shadow-[0_16px_36px_rgba(0,0,0,0.4)] backdrop-blur-md flex items-center justify-around gap-2 pointer-events-auto">
      {/* 1) FAVOURITES */}
      <button
        onClick={() => handleTabClick("favourites")}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${
          currentTab === "favourites"
            ? "bg-[#FACC15] text-[#13241F] font-black shadow-md scale-105"
            : "text-[#9CA3AF] hover:text-white"
        }`}
        aria-label="Favourite Items"
      >
        <div className="relative flex items-center">
          <Heart className="w-4 h-4" />
          {wishlistCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#EF4444] text-white text-[9px] font-black rounded-full px-1.5 py-0.2 shadow-sm">
              {wishlistCount}
            </span>
          )}
        </div>
        <span className="text-xs tracking-wider font-extrabold uppercase">FAVOURITES</span>
      </button>

      {/* 2) CART */}
      <button
        onClick={() => handleTabClick("cart")}
        className={`relative flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${
          currentTab === "cart"
            ? "bg-[#FACC15] text-[#13241F] font-black shadow-md scale-105"
            : "text-[#9CA3AF] hover:text-white"
        }`}
        aria-label="Cart"
      >
        <div className="relative flex items-center">
          <ShoppingBag className="w-4 h-4" />
          {cart.count > 0 && (
            <span className="absolute -top-2 -right-2 bg-[#EF4444] text-white text-[9px] font-black rounded-full px-1.5 py-0.2 shadow-sm">
              {cart.count}
            </span>
          )}
        </div>
        <span className="text-xs tracking-wider font-extrabold uppercase">CART</span>
      </button>
    </nav>
  );
};
