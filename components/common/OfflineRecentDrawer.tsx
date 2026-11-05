import React, { useState, useEffect } from "react";
import { X, WifiOff, Clock, Search, MessageSquare, ExternalLink, Trash2 } from "lucide-react";
import { Product } from "../../types/floate";
import { getRecentProducts, getRecentSearchQueries, RecentSearchEntry } from "../../utils/recentSearchesStore";

interface OfflineRecentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (id: string) => void;
  onSelectQuery?: (query: string) => void;
}

export const OfflineRecentDrawer: React.FC<OfflineRecentDrawerProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onSelectQuery
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [queries, setQueries] = useState<RecentSearchEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setProducts(getRecentProducts());
      setQueries(getRecentSearchQueries());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWhatsApp = (p: Product) => {
    let cleanNumber = (p.vendor.whatsapp_number || "+2348031234567").replace(/[^0-9]/g, "");
    if (cleanNumber.startsWith("0")) cleanNumber = "234" + cleanNumber.slice(1);
    if (!cleanNumber.startsWith("234")) cleanNumber = "234" + cleanNumber;

    const message = encodeURIComponent(
      `Hello ${p.vendor.name}, I am placing an offline order for "${p.title}" (${p.formatted_price}) found on FLOATE.`
    );
    window.location.href = `https://wa.me/${cleanNumber}?text=${message}`;
  };

  const clearHistory = () => {
    localStorage.removeItem("floate_pwa_offline_recent_products");
    localStorage.removeItem("floate_pwa_offline_recent_queries");
    setProducts([]);
    setQueries([]);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-[420px] bg-white h-full flex flex-col shadow-2xl overflow-hidden animate-slide-left">
        {/* Header */}
        <div className="p-4 bg-[#123F16] text-white flex items-center justify-between border-b border-[#1B5E20]">
          <div className="flex items-center gap-2">
            <WifiOff className="w-5 h-5 text-[#FFC107]" />
            <div>
              <h3 className="font-bold text-sm">Offline Searched Products</h3>
              <p className="text-[11px] text-[#CFE3CF]">Available without internet connection</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Recent Search Queries */}
          {queries.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#1B5E20] uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#1B5E20]" />
                  Recent Search Phrases
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {queries.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (onSelectQuery) onSelectQuery(q.query);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-[#F7F7F2] border border-slate-200 hover:border-[#1B5E20] rounded-full text-xs font-medium text-[#111111] transition"
                  >
                    <Search className="w-3 h-3 text-[#1B5E20]" />
                    <span>"{q.query}"</span>
                    <span className="text-[10px] text-[#666666] ml-1">({q.city})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Recently Viewed Products Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#1B5E20] uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#1B5E20]" />
                Saved Products ({products.length})
              </span>
              {products.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[11px] text-red-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {products.length === 0 ? (
              <div className="p-8 text-center bg-[#F7F7F2] rounded-2xl border border-dashed border-slate-200">
                <WifiOff className="w-8 h-8 text-[#666666] mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-[#111111]">No offline items saved yet</p>
                <p className="text-[11px] text-[#666666] mt-1">
                  Products you search or view while online will automatically be saved here for offline access.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:border-[#1B5E20] transition flex gap-3"
                  >
                    <img
                      src={p.photo_url}
                      alt={p.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-slate-200"
                      onClick={() => {
                        onSelectProduct(p.id);
                        onClose();
                      }}
                    />
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h4
                          onClick={() => {
                            onSelectProduct(p.id);
                            onClose();
                          }}
                          className="text-xs font-bold text-[#111111] truncate cursor-pointer hover:text-[#1B5E20]"
                        >
                          {p.title}
                        </h4>
                        <p className="text-xs font-extrabold text-[#1B5E20] mt-0.5">
                          {p.formatted_price}
                        </p>
                        <p className="text-[10px] text-[#666666] truncate">
                          {p.vendor.name} • {p.vendor.city}
                        </p>
                      </div>

                      {/* WhatsApp Order Direct */}
                      <button
                        onClick={() => handleWhatsApp(p)}
                        className="mt-2 flex items-center justify-center gap-1 w-full py-1 bg-[#25D366] hover:bg-[#20bd5a] text-[#123F16] text-[11px] font-bold rounded-md shadow-xs transition"
                      >
                        <MessageSquare className="w-3 h-3 text-[#123F16]" />
                        <span>Order on WhatsApp</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
