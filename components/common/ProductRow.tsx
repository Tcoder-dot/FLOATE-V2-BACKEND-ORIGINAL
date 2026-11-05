import React from "react";
import { CheckCircle, MapPin, Plus } from "lucide-react";
import { Product } from "../../types/floate";
import { useCart } from "../../context/CartContext";

interface ProductRowProps {
  product: Product;
  onOpenProduct: (id: string) => void;
  onOpenVendor?: (slug: string) => void;
}

export const ProductRow: React.FC<ProductRowProps> = ({
  product,
  onOpenProduct,
  onOpenVendor
}) => {
  const { addToCart, isLoading } = useCart();

  const handleQuickAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await addToCart(product.id, 1);
  };

  return (
    <div
      onClick={() => onOpenProduct(product.id)}
      className="group bg-[#FFFFFF] hover:bg-[#F7F7F2] border border-slate-200 rounded-2xl p-3 sm:p-4 transition-all duration-200 cursor-pointer shadow-floate flex items-center gap-3.5 sm:gap-4 select-none"
    >
      {/* 16px Rounded Product Photo */}
      <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-[#F7F7F2] flex-shrink-0 border border-slate-200">
        <img
          src={product.photo_url}
          alt={product.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        {product.is_sale && (
          <span className="absolute top-1 left-1 bg-[#111111] text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
            Sale
          </span>
        )}
      </div>

      {/* Main Info */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          {/* Vendor Name & Verified Badge */}
          <div className="flex items-center gap-1.5 mb-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenVendor) onOpenVendor(product.vendor.slug);
              }}
              className="text-xs font-semibold text-[#111111] hover:text-[#1B5E20] transition-colors truncate max-w-[140px] sm:max-w-[200px]"
            >
              {product.vendor.name}
            </button>
            {product.vendor.verified && (
              <CheckCircle className="w-3.5 h-3.5 text-[#1B5E20] fill-[#E8F5E9] flex-shrink-0" />
            )}
            <span className="text-[11px] text-[#666666] flex items-center gap-0.5 flex-shrink-0">
              <MapPin className="w-2.5 h-2.5 text-[#666666]" />
              {product.vendor.city}
            </span>
          </div>

          {/* Product Title */}
          <h4 className="text-xs sm:text-sm font-medium text-[#111111] line-clamp-2 leading-tight">
            {product.title}
          </h4>
        </div>

        {/* Bottom Strip: Tabular Price + Add to Cart Button */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
          <span className="text-sm sm:text-base font-bold text-[#111111] tabular-nums tracking-tight">
            {product.formatted_price}
          </span>

          <button
            onClick={handleQuickAdd}
            disabled={isLoading || !product.in_stock}
            className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-[#E8F5E9] text-[#1B5E20] hover:bg-[#1B5E20] hover:text-white transition-all shadow-sm active:scale-95 disabled:opacity-50"
            aria-label={`Add ${product.title} to cart`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>
    </div>
  );
};
