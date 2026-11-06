import React, { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { BuyHandoffResponse } from "../types/floate";
import { floateApi } from "../services/floateApi";
import { MessageSquare, ArrowLeft, ShieldCheck, CheckCircle, Loader2, ArrowRight } from "lucide-react";

interface BuyPageProps {
  onBackToShopping: () => void;
}

export const BuyPage: React.FC<BuyPageProps> = ({ onBackToShopping }) => {
  const { cart, buyCart, clearCart } = useCart();
  const [handoff, setHandoff] = useState<BuyHandoffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [orderNote, setOrderNote] = useState("");

  const initHandoff = async () => {
    setIsLoading(true);

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const waToken = params.get("wa_token") || params.get("watoken");
      const orderId = params.get("order_id") || params.get("orderId");

      if (waToken) {
        try {
          const exchangeRes = await floateApi.exchangeWhatsappToken(waToken);
          if (exchangeRes.authenticated) {
            if (exchangeRes.token) localStorage.setItem("floate_auth_token", exchangeRes.token);
            if (exchangeRes.slug) localStorage.setItem("floate_current_merchant_slug", exchangeRes.slug);
            if (exchangeRes.vendor) localStorage.setItem("floate_vendor_data", JSON.stringify(exchangeRes.vendor));
          }
        } catch (err) {
          console.warn("[BuyPage] Auto-login via wa_token notice:", err);
        } finally {
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("wa_token");
          cleanUrl.searchParams.delete("watoken");
          window.history.replaceState({}, "", cleanUrl.toString());
        }
      }

      if (orderId) {
        try {
          const orderRes = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}`);
          if (orderRes.ok) {
            const orderData = await orderRes.json();
            if (orderData && orderData.handoff) {
              setHandoff(orderData.handoff);
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {}
      }
    }

    const res = await buyCart(orderNote);
    setHandoff(res);
    setIsLoading(false);
  };

  useEffect(() => {
    initHandoff();
  }, []);

  const handleContinueToWhatsApp = () => {
    if (!handoff?.whatsapp_url) return;
    // Clear cart after checkout initiated
    clearCart();
    // Open seller's verified WhatsApp URL directly
    window.location.href = handoff.whatsapp_url;
  };

  if (isLoading) {
    return (
      <LoadingScreen
        message="Preparing Order Handoff..."
        subtitle="Connecting directly to merchant WhatsApp..."
      />
    );
  }

  if (!handoff) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center space-y-4 bg-[#FAF8F2]">
        <h3 className="text-base font-black text-[#13241F]">No active cart found</h3>
        <p className="text-xs text-[#5B6E66]">Please add items from a verified shop to checkout.</p>
        <button
          onClick={onBackToShopping}
          className="px-6 py-2.5 rounded-full bg-[#0A4D3C] text-white text-xs font-black shadow-md hover:bg-[#064E3B] cursor-pointer"
        >
          Return to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F2] flex flex-col justify-between py-6 px-4 animate-arrange-in">
      {/* Top Header Strip */}
      <div className="max-w-md mx-auto w-full flex items-center justify-between pb-4 border-b border-[#0A4D3C]/12">
        <button
          onClick={onBackToShopping}
          className="inline-flex items-center gap-1.5 text-xs font-black text-[#5B6E66] hover:text-[#0A4D3C] cursor-pointer transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Cart</span>
        </button>

        <span className="text-xs font-black bg-[#E6F4EA] text-[#0A4D3C] px-3 py-1 rounded-full border border-[#0A4D3C]/20">
          Ref: {handoff.lead_code}
        </span>
      </div>

      {/* Center Body */}
      <div className="max-w-md mx-auto w-full py-6 space-y-5">
        {/* Vendor Header Strip */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] border border-[#0A4D3C]/20 flex items-center justify-center mx-auto text-[#0A4D3C] shadow-xs">
            <MessageSquare className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-[#13241F] tracking-tight">
            Order Directly from {handoff.vendor.name}
          </h1>
          <p className="text-xs text-[#5B6E66] font-semibold">
            Verified Physical Merchant in {handoff.vendor.city}
          </p>
        </div>

        {/* WhatsApp Prefill Preview Box */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#5B6E66]">
            WhatsApp Message Preview
          </span>
          <div className="bg-white border border-[#0A4D3C]/12 rounded-2xl p-4 text-xs font-mono text-[#13241F] whitespace-pre-line leading-relaxed shadow-xs">
            {handoff.prefill}
          </div>
        </div>

        {/* Explicit Floate Payment Boundary Microcopy */}
        <div className="bg-[#E6F4EA]/80 border border-[#0A4D3C]/15 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-[#0A4D3C] flex-shrink-0 mt-0.5" />
          <div className="text-xs text-[#13241F] space-y-0.5">
            <p className="font-black text-[#0A4D3C]">SafeTrade Direct Hand-off</p>
            <p className="text-[#5B6E66] font-medium leading-tight">
              You will chat, confirm specifications, and arrange delivery or physical pickup directly with the verified merchant on WhatsApp.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Sticky Action Area */}
      <div className="max-w-md mx-auto w-full pt-4 border-t border-[#0A4D3C]/12 space-y-2">
        <button
          onClick={handleContinueToWhatsApp}
          className="w-full py-4 px-6 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full font-black text-sm sm:text-base shadow-md border-2 border-[#128C7E] flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <span>Continue to WhatsApp</span>
          <ArrowRight className="w-5 h-5" />
        </button>

        <p className="text-[11px] text-center text-[#5B6E66] font-semibold">
          Opens merchant's official WhatsApp ({handoff.vendor.whatsapp_number})
        </p>
      </div>
    </div>
  );
};
