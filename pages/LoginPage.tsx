import React, { useState, useEffect } from "react";
import { MessageCircle, Phone, ArrowRight, ArrowLeft, Copy, Check, Loader2, ShieldCheck, RefreshCcw, Sparkles, Store } from "lucide-react";
import { floateApi, FLOATE_WHATSAPP_AUTH_NUMBER } from "../services/floateApi";

interface LoginPageProps {
  onBackToHome: () => void;
  onLoginSuccess: (slug: string) => void;
  onNavigateRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onBackToHome,
  onLoginSuccess,
  onNavigateRegister
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Phone Entry, 2: Verification Screen & Polling, 3: Success
  const [phone, setPhone] = useState("");
  const [challengeCode, setChallengeCode] = useState("");
  const [whatsappLink, setWhatsappLink] = useState("");
  const [isRequesting, setIsRequesting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  
  // Timer state (5 minutes = 300 seconds default)
  const [timeLeft, setTimeLeft] = useState(300);
  const [isExpired, setIsExpired] = useState(false);
  
  // Polling state
  const [isPolling, setIsPolling] = useState(false);
  const [pollAttempts, setPollAttempts] = useState(0);

  // Step 1: Request code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setErrorMessage("Please enter a valid WhatsApp phone number (e.g. +234 803 123 4567)");
      return;
    }

    setIsRequesting(true);
    setErrorMessage("");

    try {
      const data = await floateApi.requestWhatsappCode(phone);

      const code = data.challenge_code;
      const link = data.whatsapp_link;
      const expireSecs = data.expires_in_seconds || 300;

      setChallengeCode(code);
      setWhatsappLink(link);
      setTimeLeft(expireSecs);
      setStep(2);
      setIsExpired(false);
      setIsPolling(true);
      setPollAttempts(0);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate authentication code. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  // Step 2 & 3: Countdown timer
  useEffect(() => {
    if (step !== 2 || isExpired) return;

    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setIsExpired(true);
      setIsPolling(false);
    }
  }, [step, timeLeft, isExpired]);

  // Toast notification for redirecting to registration
  const [redirectToast, setRedirectToast] = useState("");

  // Step 3: Real-Time Verification Polling every 2 seconds
  useEffect(() => {
    if (step !== 2 || !isPolling || isExpired || !challengeCode) return;

    const pollInterval = setInterval(async () => {
      setPollAttempts((prev) => prev + 1);

      try {
        const response = await floateApi.checkWhatsappSessionStatus(challengeCode);

        if (!response) return;

        // 1. If response status === "VERIFIED" (authenticated: true)
        if (response.status === "VERIFIED" || response.status === "AUTHENTICATED" || response.authenticated) {
          if (response.token) {
            localStorage.setItem("floate_auth_token", response.token);
          }
          if (response.vendor) {
            try {
              localStorage.setItem("floate_vendor_data", JSON.stringify(response.vendor));
            } catch (e) {}
          }

          const merchantSlug = response.slug || response.vendor?.slug || phone.replace(/[^a-zA-Z0-9]/g, "") || "merchant";
          localStorage.setItem("floate_current_merchant_slug", merchantSlug);

          setIsPolling(false);
          setStep(3);

          setTimeout(() => {
            onLoginSuccess(merchantSlug);
          }, 1200);
          return;
        }

        // 2. If response status === "REQUIRES_REGISTRATION" (unregistered phone number)
        if (response.status === "REQUIRES_REGISTRATION" || response.requires_registration) {
          setIsPolling(false);
          const userPhone = response.phone || phone;
          setRedirectToast("Phone number not registered. Redirecting to stall registration...");

          setTimeout(() => {
            const regUrl = new URL(window.location.origin + "/register");
            if (userPhone) {
              regUrl.searchParams.set("phone", userPhone);
            }
            window.history.pushState({}, "", regUrl.toString());
            window.dispatchEvent(new Event("popstate"));
            onNavigateRegister();
          }, 1500);
          return;
        }

        // 3. If response status === "EXPIRED"
        if (response.status === "EXPIRED") {
          setIsExpired(true);
          setIsPolling(false);
          setErrorMessage("Authentication code expired. Please generate a new code.");
          return;
        }
      } catch (err) {
        if (pollAttempts >= 4) {
          setErrorMessage(err instanceof Error ? err.message : "Could not verify the WhatsApp login. Retrying...");
        }
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [step, isPolling, challengeCode, isExpired, pollAttempts, phone, onLoginSuccess, onNavigateRegister]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(challengeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const activeWhatsappDeepLink = whatsappLink || `https://wa.me/${FLOATE_WHATSAPP_AUTH_NUMBER}?text=${encodeURIComponent(`AUTH: ${challengeCode}`)}`;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#13241F] flex flex-col font-sans selection:bg-[#FACC15] selection:text-[#13241F]">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-black text-[#5B6E66] hover:text-[#13241F] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketplace</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#E6F4EA] text-[#0A4D3C] text-[11px] font-black uppercase tracking-wider border border-[#0A4D3C]/20">
              🔒 Secure WhatsApp Auth
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12 flex flex-col justify-center">
        <div className="bg-white border-2 border-[#13241F] rounded-[32px] shadow-[8px_8px_0px_#13241F] p-8 space-y-6">

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border-2 border-red-500 text-red-900 text-xs font-bold flex items-center gap-2">
              <span>{errorMessage}</span>
            </div>
          )}

          {redirectToast && (
            <div className="p-4 rounded-2xl bg-[#FEF3C7] border-2 border-[#13241F] text-[#78350F] text-xs font-black flex items-center gap-2.5 shadow-[2px_2px_0px_#13241F]">
              <Sparkles className="w-4 h-4 text-[#D97706] shrink-0 animate-spin" />
              <span>{redirectToast}</span>
            </div>
          )}

          {/* Entry Choice Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF8F2] border-2 border-[#13241F] rounded-2xl">
            <button
              type="button"
              className="py-2.5 text-xs font-black rounded-xl bg-[#13241F] text-white shadow-xs"
            >
              Merchant Login
            </button>
            <button
              type="button"
              onClick={onNavigateRegister}
              className="py-2.5 text-xs font-black rounded-xl text-[#5B6E66] hover:text-[#13241F] hover:bg-white/80 transition cursor-pointer"
            >
              Register Business
            </button>
          </div>

          {/* STEP 1: Phone Entry Input */}
          {step === 1 && (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 rounded-2xl bg-[#E6F4EA] text-[#0A4D3C] border-2 border-[#13241F] shadow-[3px_3px_0px_#13241F] mx-auto flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 fill-[#0A4D3C] text-white" />
                </div>
                <h1 className="text-2xl font-black text-[#13241F] tracking-tight">WhatsApp Merchant Login</h1>
                <p className="text-xs text-[#5B6E66] font-medium leading-relaxed">
                  Enter your registered WhatsApp phone number to instantly sign in to your FLOATE merchant stall manager.
                </p>
              </div>

              <div className="space-y-2 text-left">
                <label className="text-xs font-black text-[#13241F] uppercase tracking-wider">WhatsApp Phone Number</label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-[#5B6E66] pointer-events-none flex items-center gap-1 select-none">
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 08031234567 or 8031234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-22 pr-4 py-3.5 rounded-2xl bg-[#FAF8F2] border-2 border-[#13241F] text-sm font-bold text-[#13241F] focus:outline-none focus:ring-2 focus:ring-[#0A4D3C]"
                  />
                </div>
                <p className="text-[11px] text-[#5B6E66]">Type in any format (080..., 803...). Backend automatically normalizes your number.</p>
              </div>

              <button
                type="submit"
                disabled={isRequesting}
                className="w-full py-4 rounded-2xl bg-[#FACC15] hover:bg-[#EAB308] text-[#13241F] text-xs font-black uppercase tracking-wider border-2 border-[#13241F] shadow-[4px_4px_0px_#13241F] transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isRequesting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Code...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with WhatsApp</span>
                    <ArrowRight className="w-4 h-4 text-[#13241F]" />
                  </>
                )}
              </button>

              <div className="text-center pt-2 border-t border-slate-100">
                <p className="text-xs text-[#5B6E66] font-medium">
                  Don't have a merchant stall yet?{" "}
                  <button
                    type="button"
                    onClick={onNavigateRegister}
                    className="text-[#0A4D3C] font-black underline hover:text-[#13241F] cursor-pointer"
                  >
                    Register Business
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* STEP 2: Verification Screen (Active Code & Real-Time Polling) */}
          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="space-y-2">
                <span className="px-3.5 py-1 rounded-full bg-[#FEF3C7] text-[#78350F] text-xs font-black uppercase tracking-wider border-2 border-[#13241F]">
                  Step 2 of 2 • WhatsApp Handshake
                </span>
                <h2 className="text-xl font-black text-[#13241F]">Send Authentication Code</h2>
                <p className="text-xs text-[#5B6E66] font-medium">
                  Your secure 1-time challenge code is generated. Send it to our WhatsApp bot to complete login.
                </p>
              </div>

              {/* Prominent Challenge Code Box */}
              <div className="p-5 rounded-3xl bg-[#FEF3C7] border-2 border-[#13241F] shadow-[4px_4px_0px_#13241F] flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-[#78350F] tracking-widest block">Active Challenge Code</span>
                  <span className="text-3xl font-black font-mono tracking-wider text-[#13241F]">{challengeCode}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-[#13241F] text-xs font-black border-2 border-[#13241F] transition flex items-center gap-1.5 cursor-pointer shadow-xs active:translate-y-[1px]"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>

              {/* CTA Button: Open WhatsApp to Authenticate */}
              <div className="space-y-3">
                <a
                  href={activeWhatsappDeepLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black uppercase tracking-wider border-2 border-[#13241F] shadow-[4px_4px_0px_#13241F] transition flex items-center justify-center gap-2 cursor-pointer active:translate-y-[1px]"
                >
                  <MessageCircle className="w-5 h-5 fill-[#FFFFFF] text-[#0A4D3C]" />
                  <span>Open WhatsApp to Authenticate</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-[11px] text-[#5B6E66] font-medium leading-relaxed">
                  Click the button above and press 'Send' inside WhatsApp. This page will update automatically once verified.
                </p>
              </div>

              {/* Pulsing Real-Time Polling Indicator & Expiration Clock */}
              <div className="p-4 rounded-2xl bg-[#E6F4EA] border-2 border-[#13241F] space-y-3">
                <div className="flex items-center justify-center gap-2 text-xs font-black text-[#0A4D3C]">
                  {!isExpired ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#0A4D3C]" />
                      <span>Waiting for WhatsApp confirmation...</span>
                    </>
                  ) : (
                    <span className="text-red-700">Code expired. Please request a new code.</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] font-bold text-[#5B6E66] pt-2 border-t border-[#0A4D3C]/10">
                  <span>Session Expiry: <strong className="text-[#13241F] font-mono">{formatTime(timeLeft)}</strong></span>
                  <button
                    onClick={async () => {
                      setIsRequesting(true);
                      setErrorMessage("");
                      try {
                        const data = await floateApi.requestWhatsappCode(phone);
                        const code = data.challenge_code;
                        const link = data.whatsapp_link;
                        setChallengeCode(code);
                        setWhatsappLink(link);
                        setTimeLeft(data.expires_in_seconds || 300);
                        setIsExpired(false);
                        setIsPolling(true);
                        setPollAttempts(0);
                      } catch (err) {
                        setErrorMessage(err instanceof Error ? err.message : "Could not request a new authentication code.");
                      } finally {
                        setIsRequesting(false);
                      }
                    }}
                    className="flex items-center gap-1 text-[#0A4D3C] hover:underline cursor-pointer font-black"
                  >
                    <RefreshCcw className="w-3 h-3" />
                    <span>New Code</span>
                  </button>
                </div>
              </div>

              {/* Back to phone entry */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setIsPolling(false);
                  }}
                  className="text-xs font-black text-[#5B6E66] hover:text-[#13241F] underline cursor-pointer"
                >
                  Change phone number
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="space-y-6 text-center py-6">
              <div className="w-16 h-16 rounded-3xl bg-[#E6F4EA] text-[#0A4D3C] border-2 border-[#13241F] shadow-[4px_4px_0px_#13241F] mx-auto flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#0A4D3C]" />
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-black text-[#13241F]">Logged in successfully!</h2>
                <p className="text-xs text-[#5B6E66] font-medium">
                  WhatsApp verification handshake confirmed. Redirecting you to your merchant dashboard...
                </p>
              </div>

              <div className="pt-2">
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-[#13241F]">
                  <div className="bg-[#0A4D3C] h-full rounded-full animate-pulse w-full"></div>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-[#5B6E66] font-medium">
        <p>© 2026 FLOATE AFRICA LTD. WhatsApp One-Click Merchant Authentication.</p>
      </footer>
    </div>
  );
};
