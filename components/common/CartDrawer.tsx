import React from "react";
import { X, Trash2, Plus, Minus, ShoppingBag, MessageCircle, CheckCircle2, Store, ArrowRight } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { CartItem } from "../../types/floate";

interface CartDrawerProps {
  onNavigateToBuy?: () => void;
  onOpenVendor?: (slug: string) => void;
}

interface VendorCartGroup {
  slug: string;
  name: string;
  phone: string;
  city: string;
  verified: boolean;
  fid?: string;
  items: CartItem[];
  totalNaira: number;
}

function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return "2349115162081";
  let cleaned = phone.replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "234" + cleaned.slice(1);
  }
  if (!cleaned.startsWith("234") && cleaned.length === 10) {
    cleaned = "234" + cleaned;
  }
  return cleaned || "2349115162081";
}

function generateWhatsAppOrderMessage(
  vendorName: string,
  items: CartItem[],
  totalNaira: number
): string {
  const itemLines = items
    .map((item) => {
      const price = item.price_naira || 0;
      const subtotal = price * item.quantity;
      if (item.quantity > 1) {
        return `• ${item.title} (${item.quantity}x @ ₦${price.toLocaleString()} each = ₦${subtotal.toLocaleString()})`;
      }
      return `• ${item.title} — ₦${price.toLocaleString()}`;
    })
    .join("\n");

  return `Hello, I got you from your Floate store.

I would like to enquire/order from ${vendorName}:
${itemLines}

Total Price Today: ₦${totalNaira.toLocaleString()}

Are they available?`;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onNavigateToBuy, onOpenVendor }) => {
  const {
    cart,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeItem,
    clearCart
  } = useCart();

  if (!isCartDrawerOpen) return null;

  // Group cart items by vendor
  const vendorGroupsMap: Record<string, VendorCartGroup> = {};

  cart.items.forEach((item) => {
    const v = item.vendor || cart.vendor || {
      slug: "floate-merchant",
      name: "Floate Verified Merchant",
      whatsapp_number: "2349115162081",
      city: "Lagos",
      verified: true,
      fid: "FLT-LOS-00525"
    };

    const key = v.slug || v.whatsapp_number || v.name;
    if (!vendorGroupsMap[key]) {
      vendorGroupsMap[key] = {
        slug: v.slug || "floate-merchant",
        name: v.name || "Floate Verified Merchant",
        phone: v.whatsapp_number || "2349115162081",
        city: v.city || "Lagos",
        verified: v.verified === true || v.isVerified === true,
        fid: v.fid,
        items: [],
        totalNaira: 0
      };
    }

    vendorGroupsMap[key].items.push(item);
    const itemPrice = item.price_naira || 0;
    vendorGroupsMap[key].totalNaira += itemPrice * item.quantity;
  });

  const vendorGroups = Object.values(vendorGroupsMap);
  const grandTotal = vendorGroups.reduce((sum, g) => sum + g.totalNaira, 0);

  const handleChatVendor = (group: VendorCartGroup) => {
    const textMessage = generateWhatsAppOrderMessage(group.name, group.items, group.totalNaira);
    const cleanPhone = formatWhatsAppPhone(group.phone);
    const targetUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(textMessage)}`;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={() => setIsCartDrawerOpen(false)}
    >
      {/* Drawer Container */}
      <div
        className="w-full sm:max-w-md bg-[#F7F7F2] h-full flex flex-col justify-between shadow-2xl border-l border-slate-200 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-white border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#1B5E20]" />
            <h2 className="text-base font-black text-[#111111]">Your Floate Cart</h2>
            <span className="text-xs bg-[#E8F5E9] text-[#1B5E20] font-extrabold px-2.5 py-0.5 rounded-full">
              {cart.count} {cart.count === 1 ? "item" : "items"}
            </span>
          </div>

          <button
            onClick={() => setIsCartDrawerOpen(false)}
            className="p-1.5 rounded-full hover:bg-[#F7F7F2] text-[#666666] transition-colors cursor-pointer"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-8 h-8 text-[#666666]" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-[#111111]">Your cart is empty</h3>
                <p className="text-xs text-[#666666] max-w-xs mx-auto">
                  Browse verified stall catalogues across Lagos, Onitsha & Enugu and tap "Add" to order directly from sellers.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Multi-Vendor Alert Banner if > 1 Vendor */}
              {vendorGroups.length > 1 && (
                <div className="bg-[#E8F5E9] border border-[#1B5E20]/20 rounded-xl p-3 text-xs text-[#123F16] font-extrabold flex items-center justify-between">
                  <span>Cart contains items from {vendorGroups.length} different sellers</span>
                  <span className="bg-[#1B5E20] text-white px-2 py-0.5 rounded-full text-[10px] uppercase">
                    Multi-Vendor
                  </span>
                </div>
              )}

              {/* Vendor Groups List */}
              {vendorGroups.map((group) => (
                <div
                  key={group.slug || group.phone}
                  className="bg-white border-2 border-[#0A4D3C]/12 rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3"
                >
                  {/* Vendor Group Header */}
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Store className="w-4 h-4 text-[#1B5E20]" />
                        <span className="text-sm font-black text-[#111111]">{group.name}</span>
                        {group.verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-[#666666] mt-0.5">
                        <span>{group.city} Commercial Hub</span>
                        {group.fid && (
                          <span className="bg-[#FFC107] text-[#123F16] px-1.5 py-0.2 rounded font-black">
                            FID: {group.fid}
                          </span>
                        )}
                      </div>
                    </div>

                    {onOpenVendor && (
                      <button
                        onClick={() => {
                          onOpenVendor(group.slug);
                          setIsCartDrawerOpen(false);
                        }}
                        className="text-xs font-bold text-[#1B5E20] hover:underline cursor-pointer"
                      >
                        View Stall
                      </button>
                    )}
                  </div>

                  {/* Vendor Items List */}
                  <div className="space-y-2.5">
                    {group.items.map((item) => {
                      const unitPrice = item.price_naira || 0;
                      const itemTotal = unitPrice * item.quantity;

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 bg-[#F7F7F2] border border-slate-200 rounded-xl p-2.5 shadow-2xs"
                        >
                          <img
                            src={item.photo_url || "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&q=80"}
                            alt={item.title}
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-white"
                          />

                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-[#111111] truncate">{item.title}</h4>
                            <div className="flex items-center justify-between text-xs font-bold text-[#1B5E20] tabular-nums mt-0.5">
                              <span>{item.formatted_price || `₦${unitPrice.toLocaleString()}`} each</span>
                              {item.quantity > 1 && (
                                <span className="text-[11px] text-[#111111] font-black">
                                  Subtotal: ₦{itemTotal.toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* Quantity Controls & Remove */}
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="p-1 hover:bg-[#E8F5E9] text-[#666666] transition-colors rounded-l-lg cursor-pointer active:scale-90"
                                  aria-label="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="px-2.5 text-xs font-black tabular-nums text-[#111111]">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="p-1 hover:bg-[#E8F5E9] text-[#666666] transition-colors rounded-r-lg cursor-pointer active:scale-90"
                                  aria-label="Increase quantity"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>

                              <button
                                onClick={() => removeItem(item.id)}
                                className="p-1 text-[#666666] hover:text-red-600 transition-colors cursor-pointer"
                                aria-label="Remove item"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Vendor Group Total & Chat CTA */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#666666] font-semibold">Vendor Subtotal ({group.items.length} items)</span>
                      <span className="text-sm font-black text-[#111111] tabular-nums">
                        ₦{group.totalNaira.toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => handleChatVendor(group)}
                      className="w-full py-3 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-[#123F16] rounded-xl font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4 fill-[#123F16]" />
                      <span>Chat {group.name} on WhatsApp</span>
                    </button>
                  </div>
                </div>
              ))}

              {/* Clear Entire Cart Option */}
              <div className="pt-1 text-center">
                <button
                  onClick={clearCart}
                  className="text-xs text-[#666666] hover:text-red-600 font-semibold transition-colors cursor-pointer underline"
                >
                  Clear Entire Cart
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Overall Total Summary */}
        {cart.items.length > 0 && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-white space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#666666] font-extrabold">Overall Total Today</span>
              <span className="text-lg sm:text-xl font-black text-[#1B5E20] tabular-nums">
                ₦{grandTotal.toLocaleString()}
              </span>
            </div>

            <p className="text-[11px] text-[#666666] leading-tight font-medium">
              Clicking "Chat Vendor" constructs a prefilled WhatsApp order message directly for that merchant.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
