import React from "react";
import { AlertCircle, ArrowRight, X } from "lucide-react";
import { useCart } from "../../context/CartContext";

export const CartConflictModal: React.FC = () => {
  const { conflictData, setConflictData, replaceCart, isLoading } = useCart();

  if (!conflictData) return null;

  const { current_vendor, new_vendor, item } = conflictData;

  const handleReplace = async () => {
    await replaceCart(item.id, 1);
  };

  const handleKeep = () => {
    setConflictData(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FFFFFF] w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#1B5E20]">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111111]">Single Vendor Cart</h3>
              <p className="text-xs text-[#666666]">Floate connects you directly to one seller</p>
            </div>
          </div>
          <button
            onClick={handleKeep}
            className="p-1.5 rounded-full hover:bg-[#F7F7F2] text-[#666666] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conflict Description */}
        <div className="py-4 space-y-3">
          <p className="text-sm text-[#111111] leading-relaxed">
            Your cart currently contains items from{" "}
            <strong className="text-[#1B5E20] font-semibold">{current_vendor.name}</strong>.
          </p>

          <div className="p-3 bg-[#F7F7F2] border border-slate-200 rounded-xl flex items-center gap-3">
            <img
              src={item.photo_url}
              alt={item.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[#111111] truncate">{item.title}</p>
              <p className="text-xs text-[#666666]">
                New seller: <span className="font-medium text-[#111111]">{new_vendor.name}</span>
              </p>
            </div>
          </div>

          <p className="text-xs text-[#666666]">
            Would you like to replace your cart items with this new item from {new_vendor.name}?
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleKeep}
            className="flex-1 py-2.5 px-4 rounded-full border border-slate-200 bg-[#FFFFFF] hover:bg-[#F7F7F2] text-xs font-semibold text-[#111111] transition-colors"
          >
            Keep Existing Cart
          </button>

          <button
            onClick={handleReplace}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-full bg-[#1B5E20] hover:bg-[#2E7D32] text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95 disabled:opacity-50"
          >
            <span>Replace Cart</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
