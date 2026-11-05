import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, CheckCircle2, MapPin, Store, MessageSquare, 
  ArrowLeft, Share2, Check, Download, AlertCircle, ExternalLink, Sparkles 
} from "lucide-react";
import { api } from "../services/api";
import { Vendor } from "../types/floate";
import { LoadingScreen } from "../components/common/LoadingScreen";
import { SEO } from "../components/common/SEO";

interface PublicVerificationPageProps {
  fid: string;
  onNavigateHome: () => void;
  onOpenStorefront: (slug: string) => void;
}

export const PublicVerificationPage: React.FC<PublicVerificationPageProps> = ({
  fid,
  onNavigateHome,
  onOpenStorefront
}) => {
  const [data, setData] = useState<{
    verified: boolean;
    isVerified: boolean;
    fid: string;
    businessName: string;
    name: string;
    location: string;
    stallAddress?: string;
    whatsappNumber: string;
    badgeUrl: string;
    verifiedChecks: string[];
    merchant: Vendor;
    vendor: Vendor;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchVerification = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await api.getPublicVerification(fid);
        if (!res.verified || !res.isVerified) {
          throw new Error("This merchant does not have an approved FLOATE verification record.");
        }
        if (isMounted) setData(res);
      } catch (err: any) {
        console.warn("[PublicVerification] Could not load an approved verification record:", err);
        if (isMounted) setError(err?.message || "Could not resolve an approved merchant verification record.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchVerification();
    return () => { isMounted = false; };
  }, [fid]);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href).catch(() => null);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen
        message="Authenticating Floate Merchant..."
        subtitle="Verifying physical stall registration & digital badge credentials..."
      />
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F7F7F2] text-[#111111] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#111111] tracking-tight">Merchant Record Not Found</h2>
        <p className="text-sm text-[#555555] max-w-md mt-2 font-medium">
          No active verified merchant is registered under FID: <span className="font-black text-[#123F16]">{fid}</span>.
        </p>
        <button
          onClick={onNavigateHome}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#123F16] text-[#FFC107] text-xs font-black uppercase tracking-wider hover:bg-[#1B5E20] transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Homepage</span>
        </button>
      </div>
    );
  }

  const merchant = data.merchant || data.vendor;
  const digits = String(data.whatsappNumber || merchant?.whatsapp_number || "2348000000000").replace(/[^0-9]/g, "");
  const intlPhone = digits.startsWith("0") ? "234" + digits.slice(1) : (digits.startsWith("234") ? digits : "234" + digits);
  const waLink = `https://wa.me/${intlPhone}?text=Hello%20${encodeURIComponent(data.businessName || data.name)},%20I%20verified%20your%20stall%20on%20Floate%20(FID:%20${data.fid})%20and%20would%20like%20to%20place%20an%20order.`;

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#111111] font-sans antialiased selection:bg-[#FFC107]/20 selection:text-[#123F16] pb-24">
      <SEO
        title={`${data.businessName} — FLOATE Review Status (${data.fid})`}
        description={`FLOATE reviewed submitted business evidence for ${data.businessName} in ${data.location}.`}
      />

      {/* Top Navigation */}
      <header className="bg-[#123F16] border-b border-white/10 px-4 sm:px-8 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-black text-[#D9EAD9] hover:text-[#FFC107] transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Marketplace Search</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-black transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-[#FFC107]" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? "Copied" : "Share"}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Verification Hero Banner (Signature Deep Green with Soft Radial Glow) */}
      <section className="relative bg-[#123F16] text-white pt-10 pb-16 px-4 sm:px-8 overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none opacity-40"
          style={{
            background: "radial-gradient(circle at 50% 20%, rgba(255,193,7,0.25) 0%, transparent 60%)"
          }}
        />

        <div className="max-w-2xl mx-auto text-center relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFC107]/15 border border-[#FFC107]/50 text-[#FFC107] text-xs font-extrabold uppercase tracking-widest">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Floate Registry</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            FLOATE Business Review. <br />
            <span className="text-[#FFC107]">Evidence reviewed.</span>
          </h1>

          <p className="text-sm sm:text-base text-[#E3F0E3] font-medium max-w-lg mx-auto">
            FLOATE manually reviewed evidence submitted for this business. This does not certify identity, guarantee product quality, or guarantee a safe transaction.
          </p>
        </div>
      </section>

      {/* Main Verification Card */}
      <main className="max-w-xl mx-auto px-4 -mt-10 relative z-20 space-y-6">
        <div className="bg-white border-2 border-[#123F16] rounded-[32px] p-6 sm:p-8 shadow-2xl space-y-6 text-center">
          
          {/* Badge Seal & Merchant Code */}
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <img
                src={data.badgeUrl || "https://i.postimg.cc/mkSLsdxb/20260929-122817.jpg"}
                alt="Floate Verified"
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-4 border-[#FFC107] shadow-lg object-cover"
              />
              <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#1B5E20] text-[#FFC107] border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#123F16] text-[#FFC107] font-black text-xs tracking-wider uppercase shadow-xs">
              <span>FID: {data.fid}</span>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              {data.businessName || data.name}
            </h2>

            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-[#555555] font-bold">
              <MapPin className="w-4 h-4 text-[#1B5E20] shrink-0" />
              <span>{data.stallAddress || data.location}</span>
            </div>

            {merchant?.category && (
              <span className="inline-block bg-[#E8F5E9] text-[#1B5E20] border border-[#1B5E20]/20 text-[11px] font-black px-3 py-0.5 rounded-full mt-1">
                {merchant.category}
              </span>
            )}
          </div>

          {/* Verified Criteria Checklist */}
          <div className="bg-[#F7F7F2] border border-[#123F16]/10 rounded-2xl p-4 sm:p-5 text-left space-y-3">
            <div className="text-xs font-black uppercase tracking-wider text-[#123F16] pb-1 border-b border-[#123F16]/10 flex items-center justify-between">
              <span>Review scope</span>
              <span className="text-[10px] text-[#1B5E20] font-black">Manually reviewed</span>
            </div>

            <div className="space-y-2.5 pt-1">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-[#E8F5E9] text-[#1B5E20] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  ✓
                </div>
                <div>
                  <div className="text-xs font-black text-[#111111]">Business evidence reviewed</div>
                  <p className="text-[11px] text-[#666666] font-medium leading-tight">
                    The evidence shown to FLOATE was reviewed by an administrator. A physical shop visit is not implied.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {/* Big Green Chat Vendor on WhatsApp Button */}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-[#123F16] font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg transition active:translate-y-[1px] cursor-pointer"
            >
              <MessageSquare className="w-5 h-5 fill-[#123F16]" />
              <span>Chat Vendor on WhatsApp</span>
            </a>

            {/* Visit Storefront Button */}
            <button
              onClick={() => onOpenStorefront(merchant?.slug || merchant?.whatsapp_number || fid)}
              className="w-full py-3 px-6 rounded-2xl bg-[#123F16] hover:bg-[#1B5E20] text-[#FFC107] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md transition active:translate-y-[1px] cursor-pointer"
            >
              <Store className="w-4 h-4" />
              <span>View Business Storefront & Listings</span>
            </button>

          </div>

        </div>

        {/* Security & Verification Guarantee */}
        <div className="p-4 rounded-2xl bg-[#E8F5E9] border border-[#1B5E20]/20 text-center space-y-1">
          <div className="text-xs font-black text-[#1B5E20] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Review status is not a transaction guarantee</span>
          </div>
          <p className="text-[11px] text-[#2E7D32] font-medium leading-relaxed max-w-md mx-auto">
            Always check the seller, listing, payment destination, and transaction terms before paying.
          </p>
        </div>
      </main>
    </div>
  );
};
