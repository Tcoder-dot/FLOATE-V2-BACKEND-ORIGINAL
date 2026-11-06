import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, MessageSquare } from "lucide-react";

interface BillingDonePageProps {
  txRef?: string;
  onGoHome: () => void;
}

export const BillingDonePage: React.FC<BillingDonePageProps> = ({
  txRef: propTxRef,
  onGoHome
}) => {
  const [txRef, setTxRef] = useState<string>("");
  const [status, setStatus] = useState<"pending" | "paid" | "failed" | "loading">("loading");
  const [billingData, setBillingData] = useState<{
    live_until?: string;
    boost_until?: string;
    spotlight_until?: string;
    pack?: string;
  }>({});

  useEffect(() => {
    // Determine tx_ref from prop or window location
    let refParam = propTxRef;
    if (!refParam && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      refParam = urlParams.get("ref") || urlParams.get("tx_ref") || urlParams.get("reference") || "floate-tx-demo";
    }
    const currentRef = refParam || "floate-tx-demo";
    setTxRef(currentRef);

    const checkStatus = async () => {
      try {
        const res = await api.getBillingStatus(currentRef);
        if (res.success) {
          setStatus(res.status || "paid");
          setBillingData({
            live_until: res.live_until,
            boost_until: res.boost_until,
            spotlight_until: res.spotlight_until,
            pack: res.pack
          });
        } else {
          setStatus("failed");
        }
      } catch (e) {
        console.error("Billing verification error:", e);
        setStatus("failed");
      }
    };

    checkStatus();

    // If pending, poll every 3 seconds
    let interval: NodeJS.Timeout;
    if (status === "pending" || status === "loading") {
      interval = setInterval(checkStatus, 3000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [propTxRef, status]);

  const handleAskSupportOnWA = () => {
    const msg = encodeURIComponent(`Hello Floate Support, I am inquiring about my merchant subscription payment (Reference: ${txRef}).`);
    window.location.href = `https://wa.me/2348031234567?text=${msg}`;
  };

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center p-4 animate-fade-in">
      <div className="max-w-[480px] w-full bg-[#FFFFFF] border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-floate space-y-6 text-center">
        {/* Logo / Brand Header */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-black uppercase tracking-widest text-[#1B5E20]">
            FLOATE MERCHANT BILLING
          </span>
          <span className="text-[11px] text-[#666666] font-mono">
            Ref: {txRef}
          </span>
        </div>

        {/* Status Views */}
        {status === "loading" || status === "pending" ? (
          <div className="py-6 space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto text-[#1B5E20]">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#111111]">Confirming payment…</h2>
              <p className="text-xs text-[#666666] mt-1">
                Verifying transaction with payment gateway. Please hold on.
              </p>
            </div>
          </div>
        ) : status === "paid" ? (
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-full bg-[#E8F5E9] flex items-center justify-center mx-auto text-[#1B5E20] shadow-sm">
              <CheckCircle2 className="w-9 h-9 fill-[#1B5E20] text-white" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">
                Payment Confirmed!
              </h2>
              <p className="text-xs sm:text-sm text-[#666666] mt-2 leading-relaxed">
                You're on Floate until{" "}
                <strong className="text-[#111111] font-bold">
                  {billingData.live_until || "Next Month"}
                </strong>
                .
              </p>

              {/* Boost and Spotlight timestamps if active */}
              {billingData.boost_until && (
                <p className="text-xs text-[#1B5E20] font-semibold mt-1">
                  • Boost active until {billingData.boost_until}
                </p>
              )}
              {billingData.spotlight_until && (
                <p className="text-xs text-[#1B5E20] font-semibold mt-1">
                  • Spotlight active until {billingData.spotlight_until}
                </p>
              )}
            </div>

            <div className="bg-[#F7F7F2] border border-slate-200 rounded-xl p-3.5 text-xs text-[#666666] space-y-1 text-left">
              <div className="flex items-center gap-1.5 font-bold text-[#111111]">
                <ShieldCheck className="w-4 h-4 text-[#1B5E20]" />
                <span>Stall Active on Marketplace Aisle</span>
              </div>
              <p>Your items are now live and discoverable for buyers in your city hub.</p>
            </div>

            <button
              onClick={onGoHome}
              className="w-full py-3 px-5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
            >
              <span>Return to Floate Marketplace</span>
              <ArrowRight className="w-4 h-4 text-[#FFC107]" />
            </button>
          </div>
        ) : (
          <div className="py-4 space-y-5">
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto text-red-600 shadow-sm">
              <AlertCircle className="w-9 h-9" />
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-[#111111] tracking-tight">
                Payment didn’t go through
              </h2>
              <p className="text-xs sm:text-sm text-[#666666] mt-2 leading-relaxed">
                Ask Floate on WhatsApp for the link again or check your account balance.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleAskSupportOnWA}
                className="w-full py-3 px-5 bg-[#25D366] hover:bg-[#22bf5b] text-[#123F16] rounded-full text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-[#123F16]" />
                <span>Ask Floate on WhatsApp</span>
              </button>

              <button
                onClick={onGoHome}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#F7F7F2] border border-slate-200 text-[#111111] rounded-full text-xs font-semibold cursor-pointer"
              >
                Go to Marketplace Home
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
