import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Camera,
  Image as ImageIcon,
  UploadCloud,
  X,
  Loader2,
  ArrowRight,
  Store,
  MapPin,
  ShieldCheck,
  Sparkles,
  Phone,
  MessageCircle,
  Award,
  Navigation,
  FileText
} from "lucide-react";
import {
  getVerificationSession,
  submitVisualVerification,
  VerificationSessionData
} from "../services/verificationApi";
import { DetailHeader } from "../components/common/DetailHeader";
import { SEO } from "../components/common/SEO";
import { LoadingScreen } from "../components/common/LoadingScreen";

interface VerificationPageProps {
  token?: string;
  ref?: string;
  phone?: string;
  onNavigateHome: () => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  token: initialToken,
  ref: initialRef,
  phone: initialPhone,
  onNavigateHome
}) => {
  // Query / Route params
  const [token, setToken] = useState<string>(initialToken || "");
  const [refParam, setRefParam] = useState<string>(initialRef || "");
  const [phone, setPhone] = useState<string>(initialPhone || "");

  // Session state
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [sessionData, setSessionData] = useState<VerificationSessionData | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Verification Form State
  const [verificationType, setVerificationType] = useState<
    "STOREFRONT_SIGNBOARD" | "INVENTORY_SHELF" | "KYC_SELLER_FACE" | "PERMIT_CAC"
  >("STOREFRONT_SIGNBOARD");
  const [photoBase64, setPhotoBase64] = useState<string>("");
  const [photoName, setPhotoName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [gpsCoords, setGpsCoords] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null>(null);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [activatedBadgeUrl, setActivatedBadgeUrl] = useState<string>("");

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize and validate session from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const activeToken = initialToken || urlParams.get("token") || "";
    const activeRef = initialRef || urlParams.get("ref") || "";
    const activePhone = initialPhone || urlParams.get("phone") || "";

    setToken(activeToken);
    setRefParam(activeRef);
    setPhone(activePhone);

    const validateSession = async () => {
      setIsLoadingSession(true);
      setSessionError(null);
      try {
        const res = await getVerificationSession({
          token: activeToken,
          ref: activeRef,
          phone: activePhone
        });

        if (res && res.success !== false) {
          setSessionData(res);
          if (res.whatsapp && !activePhone) {
            setPhone(res.whatsapp);
          }
          if (res.market || res.landmark) {
            setNotes(
              `${res.business_name || ""} - ${res.market || ""}${res.landmark ? ` (${res.landmark})` : ""}`
            );
          }
        } else {
          setSessionError(res?.message || "Invalid or expired verification session.");
        }
      } catch (err: any) {
        console.warn("[VerificationPage] Session load fallback:", err);
      } finally {
        setIsLoadingSession(false);
      }
    };

    validateSession();
  }, [initialToken, initialRef, initialPhone]);

  // Handle Photo selection and conversion to Base64
  const handlePhotoFile = (file: File) => {
    if (!file) return;
    if (file.size > 12 * 1024 * 1024) {
      alert("Photo file is too large (max 12MB). Please select a compressed image.");
      return;
    }
    setPhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setPhotoBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // GPS Geolocation capture
  const handleCaptureGps = () => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser.");
      return;
    }
    setIsCapturingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy)
        });
        setIsCapturingGps(false);
      },
      (err) => {
        console.warn("[GPS] Position capture failed:", err);
        setGpsError("Could not retrieve precise GPS coordinates. Please grant location permissions.");
        setIsCapturingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  // Submit Visual Proof
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!photoBase64) {
      setSubmitError("Please capture or upload a clear photo proof of your storefront or goods.");
      return;
    }

    const cleanPhone = String(phone || sessionData?.whatsapp || "2348000000000").replace(/[^0-9]/g, "");
    const intlPhone = cleanPhone.startsWith("0") ? "234" + cleanPhone.slice(1) : (cleanPhone.startsWith("234") ? cleanPhone : "234" + cleanPhone);

    setIsSubmitting(true);
    try {
      const payload = {
        token: token || `tok_${Date.now()}`,
        ref: refParam || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
        phone: intlPhone,
        verificationType,
        photoBase64,
        notes: notes.trim(),
        gpsCoords
      };

      const res = await submitVisualVerification(payload);
      if (res && res.success !== false) {
        setActivatedBadgeUrl(res.badgeUrl || "https://i.postimg.cc/mkSLsdxb/20260929-122817.jpg");
        setSubmitSuccess(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setSubmitError(res.message || "Failed to submit verification proof. Please try again.");
      }
    } catch (err: any) {
      setSubmitError(err?.message || "An unexpected error occurred during submission.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhone = String(phone || sessionData?.whatsapp || "2348030000000").replace(/[^0-9]/g, "");
  const intlPhone = cleanPhone.startsWith("0") ? "234" + cleanPhone.slice(1) : (cleanPhone.startsWith("234") ? cleanPhone : "234" + cleanPhone);
  const waReturnUrl = `https://wa.me/${intlPhone}?text=Hello%20Floate,%20my%20store%20visual%20verification%20has%20been%20submitted%20and%20approved!`;

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#13241F] pb-24 font-sans">
      <SEO
        title="Merchant Visual Verification Protocol | FLOATE Africa"
        description="Verify your physical market stall with photo proof and GPS location on FLOATE WhatsApp Commerce Operating System."
      />

      <DetailHeader
        title="Visual Verification Protocol"
        city={sessionData?.city || "Nigeria"}
        onBack={onNavigateHome}
      />

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Loading Session Indicator */}
        {isLoadingSession && (
          <LoadingScreen
            fullScreen={false}
            message="Initializing Visual Verification Protocol..."
            subtitle="Connecting to Floate WhatsApp Commerce Gateway..."
          />
        )}

        {/* Celebratory Badge Activation Card (Success State) */}
        {!isLoadingSession && submitSuccess && (
          <div className="bg-white rounded-3xl border-2 border-[#10B981] p-6 sm:p-8 text-center space-y-6 shadow-xl animate-arrange-in">
            {/* Glowing Golden Badge */}
            <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#FFC107] to-[#10B981] opacity-30 blur-xl animate-pulse"></div>
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#123F16] to-[#0A290E] border-4 border-[#FFC107] shadow-lg flex flex-col items-center justify-center text-white p-2">
                <Award className="w-9 h-9 text-[#FFC107] mb-1" />
                <span className="text-[9px] font-black tracking-widest text-[#FFC107] uppercase">
                  VERIFIED
                </span>
              </div>
              <div className="absolute -top-1 -right-1 bg-[#10B981] text-white p-1.5 rounded-full shadow-md">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-[#E6F4EA] text-[#0A4D3C] px-3.5 py-1 rounded-full border border-[#10B981]/30">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                Badge Activated Successfully
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#13241F] tracking-tight">
                Store Verified & Active on Floate
              </h2>
              <p className="text-xs sm:text-sm text-[#5B6E66] leading-relaxed max-w-md mx-auto font-medium">
                Your visual verification proof has been registered. Your storefront is now 100% verified with the official gold trust seal and priority WhatsApp order channel.
              </p>
            </div>

            {/* Verification Metadata Box */}
            <div className="bg-[#FAF8F2] border border-[#0A4D3C]/12 rounded-2xl p-4 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#0A4D3C]/10">
                <span className="text-[#5B6E66] font-bold">Verification Ref:</span>
                <span className="font-mono font-black text-[#0A4D3C]">{refParam || "REF-VERIFIED"}</span>
              </div>
              <div className="flex items-center justify-between pb-2 border-b border-[#0A4D3C]/10">
                <span className="text-[#5B6E66] font-bold">Verified Merchant Phone:</span>
                <span className="font-mono font-black text-[#13241F]">+{intlPhone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#5B6E66] font-bold">Trust Badge Status:</span>
                <span className="inline-flex items-center gap-1 font-black text-[#10B981]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 100% Active
                </span>
              </div>
            </div>

            {/* Action Buttons: Return to WhatsApp & Storefront */}
            <div className="space-y-3 pt-2">
              <a
                href={waReturnUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 px-6 rounded-full bg-[#25D366] hover:bg-[#20ba5a] text-white text-sm font-black shadow-lg flex items-center justify-center gap-2.5 transition-transform active:scale-95"
              >
                <MessageCircle className="w-5 h-5 fill-white" />
                <span>Return to WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `/vendor/${intlPhone}`;
                }}
                className="w-full py-3.5 px-6 rounded-full bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <Store className="w-4 h-4" />
                <span>View Verified Storefront</span>
              </button>
            </div>
          </div>
        )}

        {/* Verification Form State */}
        {!isLoadingSession && !submitSuccess && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-[#0A4D3C] via-[#0E5340] to-[#064E3B] rounded-3xl p-5 sm:p-6 text-white space-y-2 shadow-md">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FFC107]" />
                <span className="text-[11px] font-black uppercase tracking-wider text-[#FFC107]">
                  Merchant Visual Verification Protocol
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight leading-snug">
                Submit Ground Visual Proof for Your Store
              </h2>
              <p className="text-xs text-white/80 leading-relaxed font-medium">
                Verify your physical store on Floate. Capture a photo of your shop signage or goods and your GPS location to instantly activate the verified badge.
              </p>

              {(refParam || token) && (
                <div className="pt-2 flex flex-wrap items-center gap-2 text-[10px] text-white/90 font-mono">
                  {refParam && (
                    <span className="bg-black/30 px-2.5 py-1 rounded-md border border-white/15">
                      REF: {refParam}
                    </span>
                  )}
                  {phone && (
                    <span className="bg-black/30 px-2.5 py-1 rounded-md border border-white/15">
                      TEL: +{phone.replace(/[^0-9]/g, "")}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Step 1: Proof Type Selection */}
            <div className="bg-white rounded-3xl border border-[#0A4D3C]/12 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#0A4D3C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-[#0A4D3C]" />
                  <h3 className="text-sm font-black text-[#13241F] uppercase tracking-wider">
                    1. Select Verification Proof Type
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  {
                    type: "STOREFRONT_SIGNBOARD",
                    title: "Storefront Signboard",
                    desc: "Shop name banner, physical board, or stall signage."
                  },
                  {
                    type: "INVENTORY_SHELF",
                    title: "Inventory / Goods Display",
                    desc: "Clear view of products arranged on stall shelves."
                  },
                  {
                    type: "KYC_SELLER_FACE",
                    title: "Merchant Live Photo",
                    desc: "Selfie or photo of merchant standing at the stall."
                  },
                  {
                    type: "PERMIT_CAC",
                    title: "Market Ticket / CAC Permit",
                    desc: "Official market allocation ticket or business doc."
                  }
                ].map((item) => {
                  const isSelected = verificationType === item.type;
                  return (
                    <button
                      type="button"
                      key={item.type}
                      onClick={() => setVerificationType(item.type as any)}
                      className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#0A4D3C] bg-[#E6F4EA]/50 text-[#0A4D3C]"
                          : "border-black/5 hover:border-black/15 bg-[#FAF8F2] text-[#13241F]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black">{item.title}</span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#10B981]" />}
                      </div>
                      <p className="text-[11px] text-[#5B6E66] font-medium leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Camera Photo Proof Capture */}
            <div className="bg-white rounded-3xl border border-[#0A4D3C]/12 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#0A4D3C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4 text-[#0A4D3C]" />
                  <h3 className="text-sm font-black text-[#13241F] uppercase tracking-wider">
                    2. Capture Photo Proof
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase text-[#DC2626] bg-[#FEE2E2] px-2 py-0.5 rounded-full">
                  Required
                </span>
              </div>

              {/* Hidden file inputs */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoFile(f);
                }}
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoFile(f);
                }}
                className="hidden"
              />

              {!photoBase64 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-[#0A4D3C]/30 hover:border-[#0A4D3C] bg-[#FAF8F2] flex flex-col items-center justify-center gap-2 group cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#E6F4EA] group-hover:scale-110 text-[#0A4D3C] flex items-center justify-center transition-transform">
                      <Camera className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black text-[#13241F]">
                      Open Shutter & Snap Photo
                    </span>
                    <span className="text-[10px] text-[#5B6E66]">
                      Direct live camera photo
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-6 rounded-2xl border-2 border-dashed border-[#0A4D3C]/30 hover:border-[#0A4D3C] bg-[#FAF8F2] flex flex-col items-center justify-center gap-2 group cursor-pointer transition-colors"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#E6F4EA] group-hover:scale-110 text-[#0A4D3C] flex items-center justify-center transition-transform">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-black text-[#13241F]">
                      Upload from Gallery
                    </span>
                    <span className="text-[10px] text-[#5B6E66]">
                      JPG, PNG, or WEBP (Max 12MB)
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden bg-black aspect-video max-h-64 mx-auto flex items-center justify-center border-2 border-[#10B981]">
                    <img
                      src={photoBase64}
                      alt="Verification proof"
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoBase64("");
                        setPhotoName("");
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition-colors"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[11px] text-center font-bold text-[#10B981] flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Photo proof attached ({photoName || "proof.jpg"})</span>
                  </p>
                </div>
              )}
            </div>

            {/* Step 3: GPS Geolocation Stall Match */}
            <div className="bg-white rounded-3xl border border-[#0A4D3C]/12 p-5 sm:p-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-[#0A4D3C]/10 pb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#0A4D3C]" />
                  <h3 className="text-sm font-black text-[#13241F] uppercase tracking-wider">
                    3. Stall GPS Geolocation Match
                  </h3>
                </div>
                <span className="text-[10px] font-black uppercase text-[#0A4D3C] bg-[#E6F4EA] px-2 py-0.5 rounded-full">
                  Recommended
                </span>
              </div>

              {!gpsCoords ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleCaptureGps}
                    disabled={isCapturingGps}
                    className="w-full py-3.5 px-4 rounded-2xl border border-[#0A4D3C]/20 bg-[#FAF8F2] hover:bg-[#E6F4EA] text-[#0A4D3C] text-xs font-black flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    {isCapturingGps ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Detecting Satellites & Coordinates...</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-4 h-4 text-[#0A4D3C]" />
                        <span>Detect Stall GPS Coordinates (1-Tap)</span>
                      </>
                    )}
                  </button>
                  {gpsError && (
                    <p className="text-[11px] text-[#DC2626] font-medium text-center">
                      {gpsError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#E6F4EA] border border-[#10B981]/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#10B981] text-white flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-[#0A4D3C] block">
                        GPS Coordinates Locked
                      </span>
                      <span className="text-[11px] font-mono text-[#0A4D3C]/80">
                        Lat: {gpsCoords.latitude}, Long: {gpsCoords.longitude} (±{gpsCoords.accuracy || 15}m)
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGpsCoords(null)}
                    className="text-xs text-[#DC2626] font-bold hover:underline"
                  >
                    Re-detect
                  </button>
                </div>
              )}

              {/* Notes / Stall Description */}
              <div className="space-y-1 pt-1">
                <label className="text-xs font-black text-[#13241F]">
                  Stall Line / Physical Landmark Remarks
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Shop 14B, Textile Line, Balogun Market"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF8F2] border border-[#0A4D3C]/15 text-xs text-[#13241F] font-bold focus:border-[#0A4D3C]"
                />
              </div>
            </div>

            {/* Error banner */}
            {submitError && (
              <div className="p-4 rounded-2xl bg-[#FEE2E2] border border-[#DC2626]/20 text-[#DC2626] text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Proof Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 rounded-full bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-sm font-black shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Submitting & Verifying Proof...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 text-[#FFC107]" />
                    <span>Submit Visual Proof & Activate Verified Badge</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[#5B6E66] font-semibold mt-2.5">
                🔒 Verified securely via Floate WhatsApp Commerce Engine Protocol
              </p>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
