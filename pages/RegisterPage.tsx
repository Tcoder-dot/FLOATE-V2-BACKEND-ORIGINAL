import React, { useState, useEffect, useRef } from "react";
import { 
  Store, 
  User, 
  Phone, 
  MapPin, 
  Building2, 
  Tag, 
  Package, 
  Upload, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  Loader2, 
  Gift, 
  X, 
  Image as ImageIcon,
  ShieldCheck,
  Camera,
  RotateCcw,
  Navigation,
  Percent,
  AlertCircle,
  HelpCircle,
  Lock,
  Layers,
  Check
} from "lucide-react";
import { registerBusiness, sendRegistrationOtp, verifyRegistrationOtp } from "../services/floateApi";
import { NIGERIAN_STATES } from "../data/nigeriaConstants";

interface RegisterPageProps {
  onBackToHome: () => void;
  onOpenStorefront: (phoneOrSlug: string) => void;
  onNavigatePage?: (page: any) => void;
  onNavigateLogin?: () => void;
}

const POPULAR_HUBS = [
  "Computer Village, Ikeja",
  "Alaba International Market",
  "Onitsha Main Market",
  "Balogun Market, Lagos Island",
  "Trade Fair Complex, Lagos",
  "Ariaria Market, Aba",
  "Wuse Market, Abuja",
  "Enugu Tech Hub, Independence Layout",
  "Bodija Market, Ibadan",
  "Kano Kurmi Market"
];

const CATEGORIES = [
  "Footwear & Shoes",
  "Phones & Gadgets",
  "Fashion & Apparel",
  "Jewelries & Perfumes",
  "Electronics & Appliances",
  "Tech & Software Solutions",
  "Cosmetics & Beauty",
  "Home & Kitchen",
  "Automotive & Spare Parts",
  "Food & Provisions",
  "General Merchandise"
];

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onBackToHome,
  onOpenStorefront,
  onNavigateLogin
}) => {
  // Wizard Step: 1 = Business Details, 2 = Profile Photo, 3 = Optional Location, 4 = First Listing, 5 = Success/Dashboard
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // STEP 1: Business Details (NO selfie on this first form)
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("Phones & Gadgets");
  const [marketHub, setMarketHub] = useState("");
  const [stallAddress, setStallAddress] = useState("");
  const [businessModel, setBusinessModel] = useState<"physical_stall" | "dropshipper_online" | "freelancer_service">("physical_stall");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isOtpLoading, setIsOtpLoading] = useState(false);
  const [businessDescription, setBusinessDescription] = useState<string>("");
  const [isDescriptionCustomized, setIsDescriptionCustomized] = useState<boolean>(false);

  // STEP 2: Optional profile photo
  const [selfieBase64, setSelfieBase64] = useState<string>("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [flashEffect, setFlashEffect] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const selfieFileInputRef = useRef<HTMLInputElement | null>(null);

  // STEP 3: Location Geotagging
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [gpsCoordinates, setGpsCoordinates] = useState<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null>(null);
  const [gpsError, setGpsError] = useState("");

  // STEP 4: First Product (with Discount Sale option)
  const [prodName, setProdName] = useState("");
  const [prodPrice, setProdPrice] = useState("");
  const [prodDescription, setProdDescription] = useState("");
  const [prodImageBase64, setProdImageBase64] = useState<string>("");
  const [prodImagePreview, setProdImagePreview] = useState<string>("");
  const [isDiscountSale, setIsDiscountSale] = useState(false);
  const [originalPrice, setOriginalPrice] = useState("");
  const prodFileInputRef = useRef<HTMLInputElement | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [registrationSuccess, setRegistrationSuccess] = useState<any | null>(null);
  const [countdown, setCountdown] = useState(4);

  // Pre-fill form fields from URL query parameters (phone, name, biz, cat, loc)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlPhone = params.get("phone");
      const urlName = params.get("name");
      const urlBiz = params.get("biz");
      const urlCat = params.get("cat");
      const urlLoc = params.get("loc");

      if (urlPhone) setPhone(urlPhone);
      if (urlName) setOwnerName(urlName);
      if (urlBiz) setBusinessName(urlBiz);
      if (urlCat) setCategory(urlCat);
      if (urlLoc) {
        setMarketHub(urlLoc);
        const matchedState = NIGERIAN_STATES.find(s => urlLoc.toLowerCase().includes(s.toLowerCase()));
        if (matchedState) setState(matchedState);
      }
    } catch (e) {
      console.warn("Could not parse query parameters for registration pre-fill:", e);
    }
  }, []);

  // Auto-generate store description based on physical store status and inputs
  useEffect(() => {
    if (isDescriptionCustomized) return;
    
    const bName = businessName.trim() || "Our business";
    if (businessModel === "physical_stall") {
      const locStr = stallAddress.trim() 
        ? `${stallAddress.trim()}, ${marketHub.trim() || city}` 
        : (marketHub.trim() || `${city}, ${state}`);
      setBusinessDescription(
        `${bName} is an active market merchant with a physical stall located at ${locStr}. Specializing in authentic ${category} with in-person walk-in customer shopping, real-time stock inspection, and fast doorstep waybill dispatch.`
      );
    } else if (businessModel === "freelancer_service") {
      setBusinessDescription(
        `${bName} provides ${category.toLowerCase()} services from ${city}, ${state}. Contact the business directly for project details and service availability.`
      );
    } else {
      setBusinessDescription(
        `${bName} is an online & dispatch store operating out of ${city}, ${state}. Specializing in verified ${category} with direct order fulfillment, nationwide delivery waybills, and responsive WhatsApp customer care.`
      );
    }
  }, [businessModel, businessName, category, marketHub, stallAddress, city, state, isDescriptionCustomized]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [cameraStream]);

  // Countdown redirect on success
  useEffect(() => {
    if (!registrationSuccess || currentStep !== 5) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      const targetPhone = registrationSuccess.phone || phone;
      onOpenStorefront(targetPhone);
    }
  }, [registrationSuccess, countdown, currentStep, onOpenStorefront, phone]);

  // CAMERA CONTROLS FOR STEP 2
  const startCamera = async () => {
    setCameraError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (selfieFileInputRef.current) {
          selfieFileInputRef.current.click();
        }
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 1280 }, 
          height: { ideal: 960 } 
        }
      });
      setCameraStream(stream);
      setIsCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 150);
    } catch (err: any) {
      console.warn("Camera access failed or denied, prompting file capture:", err);
      if (selfieFileInputRef.current) {
        selfieFileInputRef.current.click();
      } else {
        setCameraError("Camera unavailable. Please upload a clear photo from your device.");
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      setFlashEffect(true);
      setTimeout(() => setFlashEffect(false), 200);

      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror horizontally if user facing camera
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setSelfieBase64(dataUrl);
      }
      stopCamera();
    }
  };

  const handleSelfieFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setCameraError("Selfie photo exceeds 10MB. Please choose a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelfieBase64(result);
      setCameraError("");
      stopCamera();
    };
    reader.readAsDataURL(file);
  };

  // GPS GEOTAG CONTROLS FOR STEP 3
  const handleDetectGps = () => {
    setIsDetectingGps(true);
    setGpsError("");

    if (!navigator.geolocation) {
      setGpsError("Geolocation is not supported by your browser. You can confirm your market landmark below.");
      setIsDetectingGps(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoordinates({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          address: `${stallAddress ? stallAddress + ", " : ""}${marketHub || city}, ${state}`
        });
        setIsDetectingGps(false);
      },
      (err) => {
        console.warn("GPS error:", err.message);
        setGpsError("Could not retrieve your location. You can continue without sharing GPS.");
        setIsDetectingGps(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // PRODUCT FILE UPLOAD FOR STEP 4
  const handleProductImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg("Product image exceeds 8MB. Please select a smaller photo.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setProdImageBase64(result);
      setProdImagePreview(result);
      setErrorMsg("");
    };
    reader.readAsDataURL(file);
  };

  // STEP NAVIGATION & VALIDATIONS
  const handleSendOtp = async () => {
    setErrorMsg("");
    const cleanDigits = phone.replace(/[^0-9]/g, "");
    if (!cleanDigits || cleanDigits.length < 10) {
      setErrorMsg("Please enter a valid WhatsApp phone number before requesting a code.");
      return;
    }

    setIsOtpLoading(true);
    try {
      await sendRegistrationOtp(phone);
      setOtpSent(true);
      setIsPhoneVerified(false);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Could not send a WhatsApp code.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleVerifyPhone = async () => {
    setErrorMsg("");
    if (otpCode.trim().length !== 4) {
      setErrorMsg("Enter the 4-digit code sent to your WhatsApp.");
      return;
    }

    setIsOtpLoading(true);
    try {
      await verifyRegistrationOtp(phone, otpCode);
      setIsPhoneVerified(true);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "The WhatsApp code could not be verified.");
    } finally {
      setIsOtpLoading(false);
    }
  };

  const handleGoToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!businessName.trim()) {
      setErrorMsg("Please enter your business or stall name.");
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg("Please enter your full name as the business owner.");
      return;
    }
    if (!state.trim() || !city.trim()) {
      setErrorMsg("Please select your state and enter your city.");
      return;
    }
    if (!isPhoneVerified) {
      setErrorMsg("Verify your WhatsApp number before continuing.");
      return;
    }

    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToStep3 = () => {
    setErrorMsg("");
    stopCamera();
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleGoToStep4 = () => {
    setErrorMsg("");
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // FINAL REGISTRATION SUBMISSION (STEP 4 -> 5)
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!prodName.trim()) {
      setErrorMsg("Please enter the name or title of your first product.");
      return;
    }
    if (!prodPrice.trim()) {
      setErrorMsg("Please enter the product price in Naira.");
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanDigits = phone.replace(/[^0-9]/g, "");
      const intlPhone = cleanDigits.startsWith("0") 
        ? "234" + cleanDigits.slice(1) 
        : (cleanDigits.startsWith("234") ? cleanDigits : "234" + cleanDigits);

      const payload = {
        businessName: businessName.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        hasPhysicalStore: businessModel === "physical_stall",
        businessModel,
        storeType: businessModel === "physical_stall" ? "physical_store" : "online_dispatch",
        addressType: "Home Address",
        addressDetail: stallAddress.trim(),
        portfolioUrl: portfolioUrl.trim(),
        description: businessDescription.trim(),
        state: state.trim(),
        city: city.trim(),
        category: category.trim(),
        marketHub: marketHub.trim(),
        selfieUrl: selfieBase64,
        coordinates: gpsCoordinates || undefined,
        initialProduct: {
          name: prodName.trim(),
          price: prodPrice.trim().replace(/[^0-9.]/g, ""),
          description: prodDescription.trim() || `${prodName.trim()} available at ${businessName.trim()}`,
          image: prodImageBase64 || undefined,
          isDiscount: isDiscountSale,
          originalPrice: isDiscountSale ? originalPrice.trim() : undefined
        }
      };

      const result = await registerBusiness(payload);
      if (!result.success) {
        throw new Error(result.error || result.message || "Registration could not be saved. Please try again.");
      }

      // Save locally so merchant is immediately recognized and logged in
      const existingMerchants = JSON.parse(localStorage.getItem("floate_merchants") || "[]");
      const localMerchant = {
        id: `vendor_${intlPhone}`,
        slug: intlPhone,
        name: businessName.trim(),
        ownerName: ownerName.trim(),
        city: city.trim(),
        state: state.trim(),
        category: category.trim(),
        hasPhysicalStore: businessModel === "physical_stall",
        storeType: businessModel === "physical_stall" ? "physical_store" : "online_dispatch",
        businessModel,
        location: `${city.trim()}, ${state.trim()}`,
        marketLocation: marketHub.trim(),
        verificationStatus: result.verification_status || "REGISTERED",
        verified: false,
        isVerified: false,
        verification_status: result.verification_status || "registered",
        portfolioUrl: portfolioUrl.trim(),
        avatar_url: selfieBase64,
        bio: businessDescription.trim(),
        whatsapp_number: intlPhone
      };

      const updatedMerchants = [localMerchant, ...existingMerchants.filter((m: any) => m.slug !== intlPhone)];
      localStorage.setItem("floate_merchants", JSON.stringify(updatedMerchants));
      localStorage.setItem("floate_current_merchant_slug", intlPhone);

      setRegistrationSuccess({
        ...result,
        success: true,
        creditsAwarded: result.creditsAwarded || 25,
        phone: intlPhone,
        storeUrl: result.storeUrl || `/vendor/${intlPhone}`
      });
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred during submission. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Discount percentage calculation helper
  const calculateDiscount = () => {
    const sale = parseFloat(prodPrice.replace(/[^0-9.]/g, ""));
    const orig = parseFloat(originalPrice.replace(/[^0-9.]/g, ""));
    if (sale && orig && orig > sale) {
      const pct = Math.round(((orig - sale) / orig) * 100);
      return `Save ₦${(orig - sale).toLocaleString()} (-${pct}% OFF)`;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[#FAF8F2] text-[#13241F] flex flex-col font-sans">
      {/* ── TOP HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 text-xs font-black text-[#5B6E66] hover:text-[#13241F] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Marketplace</span>
            <span className="sm:hidden">Home</span>
          </button>

          {/* Stepper Indicator */}
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs font-black">
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              currentStep === 1 
                ? 'bg-[#13241F] text-[#FACC15]' 
                : currentStep > 1 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              1. Business Info
            </span>
            <span className="text-slate-300">/</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              currentStep === 2 
                ? 'bg-[#13241F] text-[#FACC15]' 
                : currentStep > 2 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              2. Profile Photo
            </span>
            <span className="text-slate-300">/</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              currentStep === 3 
                ? 'bg-[#13241F] text-[#FACC15]' 
                : currentStep > 3 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              3. Location (Optional)
            </span>
            <span className="text-slate-300">/</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-colors ${
              currentStep === 4 
                ? 'bg-[#13241F] text-[#FACC15]' 
                : currentStep > 4 
                ? 'bg-emerald-100 text-emerald-800' 
                : 'bg-slate-100 text-slate-400'
            }`}>
              4. Product
            </span>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT WIZARD ── */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Global Error Notice */}
        {errorMsg && (
          <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1: BUSINESS QUESTIONS & DETAILS (NO SELFIE ON THIS FORM)
            ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-fade-in">
            {/* Entry Choice Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-white border-2 border-[#13241F] rounded-2xl max-w-sm">
              <button
                type="button"
                className="py-2.5 text-xs font-black rounded-xl bg-[#13241F] text-white shadow-xs"
              >
                Register Business
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateLogin) {
                    onNavigateLogin();
                  } else {
                    window.history.pushState({}, "", "/login");
                    window.dispatchEvent(new Event("popstate"));
                  }
                }}
                className="py-2.5 text-xs font-black rounded-xl text-[#5B6E66] hover:text-[#13241F] hover:bg-slate-50 transition cursor-pointer"
              >
                Merchant Login
              </button>
            </div>

            <div className="space-y-2 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4EA] border border-[#0A4D3C]/20 text-[#0A4D3C] text-xs font-black uppercase tracking-wider">
                <Store className="w-3.5 h-3.5" />
                <span>Step 1 of 4 • Business Questions</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#13241F] tracking-tight">
                Register Your Market Stall or Business
              </h1>
              <p className="text-sm text-[#5B6E66] font-medium leading-relaxed">
                Add your business details, confirm your WhatsApp number, and choose what evidence to submit for manual review. A selfie is used as a profile photo, not proof of identity.
              </p>
            </div>

            <form onSubmit={handleGoToStep2} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Business Name */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Business or Stall Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Chivora Footwears, Goody Global Electronics"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#13241F] placeholder-slate-400 font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
              </div>

              {/* Owner Name */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Owner / Trader Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Chinedu Okafor"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#13241F] placeholder-slate-400 font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
              </div>

              {/* WhatsApp Phone */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  WhatsApp Contact Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xs font-bold text-[#5B6E66] pointer-events-none flex items-center gap-1 select-none">
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </span>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setOtpSent(false);
                      setOtpCode("");
                      setIsPhoneVerified(false);
                    }}
                    placeholder="e.g. 08031234567 or 8031234567"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-22 pr-4 py-3 text-sm text-[#13241F] placeholder-slate-400 font-bold focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
                <p className="text-[11px] text-[#5B6E66]">
                  We will send a one-time code to confirm you control this WhatsApp number.
                </p>
                {isPhoneVerified ? (
                  <p className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="w-4 h-4" /> WhatsApp number verified
                  </p>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    {otpSent && (
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        maxLength={4}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="4-digit code"
                        className="w-full sm:w-40 bg-[#FAF8F2] border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-bold tracking-widest"
                      />
                    )}
                    <button
                      type="button"
                      onClick={otpSent ? handleVerifyPhone : handleSendOtp}
                      disabled={isOtpLoading}
                      className="px-4 py-2.5 rounded-xl bg-[#13241F] text-white text-xs font-bold disabled:opacity-50"
                    >
                      {isOtpLoading ? "Please wait..." : otpSent ? "Verify number" : "Send WhatsApp code"}
                    </button>
                    {otpSent && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isOtpLoading}
                        className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs font-bold disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* State & City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                    State <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  >
                    <option value="">Select state</option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                    City / Commercial Hub <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Ikeja, Onitsha, Aba, Lagos Island"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
              </div>

              {/* Trade Category */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Primary Product Category <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Market Hub */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Market, service area, or hub <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    list="hubs-list"
                    value={marketHub}
                    onChange={(e) => setMarketHub(e.target.value)}
                    placeholder="e.g. Computer Village, Ikeja"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                  <datalist id="hubs-list">
                    {POPULAR_HUBS.map((hub) => (
                      <option key={hub} value={hub} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Private contact address */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Current contact address <span className="text-slate-400 font-normal">(Optional, private)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stallAddress}
                    onChange={(e) => setStallAddress(e.target.value)}
                    placeholder="You may provide your home address; it will not be shown publicly."
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-10 pr-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
              </div>

              {/* Seller model */}
              <div className="space-y-2 text-left pt-2 border-t border-slate-100">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Which best describes your business? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessModel("physical_stall");
                      setIsDescriptionCustomized(false);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      businessModel === "physical_stall"
                        ? "border-[#0A4D3C] bg-[#E6F4EA]/60 text-[#13241F] shadow-sm"
                        : "border-slate-200 bg-[#FAF8F2] hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Store className={`w-5 h-5 ${businessModel === "physical_stall" ? "text-[#0A4D3C]" : "text-slate-400"}`} />
                        <span className="text-xs font-black uppercase tracking-wide">Yes, Physical Stall / Shop</span>
                      </div>
                      {businessModel === "physical_stall" && <CheckCircle2 className="w-4 h-4 text-[#0A4D3C]" />}
                    </div>
                    <p className="text-[11px] text-[#5B6E66] font-medium leading-normal">
                      Customers can walk into our stall, plaza, or booth in person to inspect and purchase goods.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setBusinessModel("dropshipper_online");
                      setIsDescriptionCustomized(false);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      businessModel === "dropshipper_online"
                        ? "border-[#0A4D3C] bg-[#E6F4EA]/60 text-[#13241F] shadow-sm"
                        : "border-slate-200 bg-[#FAF8F2] hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-5 h-5 ${businessModel === "dropshipper_online" ? "text-[#0A4D3C]" : "text-slate-400"}`} />
                        <span className="text-xs font-black uppercase tracking-wide">No, Online & Dispatch Only</span>
                      </div>
                      {businessModel === "dropshipper_online" && <CheckCircle2 className="w-4 h-4 text-[#0A4D3C]" />}
                    </div>
                    <p className="text-[11px] text-[#5B6E66] font-medium leading-normal">
                      We operate online or from a warehouse. All buyer orders are fulfilled via courier waybill and delivery.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessModel("freelancer_service");
                      setIsDescriptionCustomized(false);
                    }}
                    className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      businessModel === "freelancer_service"
                        ? "border-[#0A4D3C] bg-[#E6F4EA]/60 text-[#13241F] shadow-sm"
                        : "border-slate-200 bg-[#FAF8F2] hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Layers className={`w-5 h-5 ${businessModel === "freelancer_service" ? "text-[#0A4D3C]" : "text-slate-400"}`} />
                        <span className="text-xs font-black uppercase tracking-wide">Freelancer / Services</span>
                      </div>
                      {businessModel === "freelancer_service" && <CheckCircle2 className="w-4 h-4 text-[#0A4D3C]" />}
                    </div>
                    <p className="text-[11px] text-[#5B6E66] font-medium leading-normal">
                      Offer freelance services and share project samples or a portfolio link.
                    </p>
                  </button>
                </div>
              </div>

              {businessModel === "freelancer_service" && (
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                    Portfolio or work-sample URL <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://yourportfolio.example"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
              )}

              {/* Store Description */}
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                    Store Bio & Description
                  </label>
                </div>
                <textarea
                  rows={3}
                  value={businessDescription}
                  onChange={(e) => {
                    setBusinessDescription(e.target.value);
                    setIsDescriptionCustomized(true);
                  }}
                  placeholder="Describe your store, products, and customer offerings..."
                  className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl p-3.5 text-xs text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C] leading-relaxed resize-none"
                />
              </div>

              {/* Action Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-sm font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99]"
                >
                  <span>Continue to profile photo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2: KYC BUSINESS VERIFICATION (SELFIE SNAPSHOT)
            ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 2 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FEF3C7] border border-[#F59E0B]/30 text-[#78350F] text-xs font-black uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>Step 2 of 4 • Optional Profile Photo</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#13241F] tracking-tight">
                Selfie Snapshot (Official Profile Photo)
              </h1>
              <p className="text-xs sm:text-sm text-[#5B6E66] font-medium leading-relaxed">
                Add a clear photo for your merchant profile. This photo is not identity verification and does not automatically approve your business.
              </p>
            </div>

            {/* Error Message for Camera */}
            {cameraError && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 px-4 py-2.5 rounded-2xl text-xs font-medium">
                {cameraError}
              </div>
            )}

            {/* SPACIOUS LARGE CAMERA FRAME */}
            <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="relative w-full max-w-lg mx-auto aspect-[4/3] min-h-[380px] sm:min-h-[440px] rounded-3xl overflow-hidden bg-slate-950 border-4 border-[#0A4D3C] shadow-2xl flex items-center justify-center">
                {flashEffect && (
                  <div className="absolute inset-0 bg-white z-30 animate-ping opacity-90" />
                )}

                {/* If photo captured, show preview */}
                {selfieBase64 ? (
                  <div className="relative w-full h-full">
                    <img
                      src={selfieBase64}
                      alt="Merchant KYC Selfie"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 bg-[#0A4D3C] text-white px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 shadow-md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      <span>Selfie Captured</span>
                    </div>
                  </div>
                ) : isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover scale-x-[-1]"
                    />

                    {/* Oval Face Alignment Guideline */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-56 h-72 sm:w-64 sm:h-80 rounded-[50%] border-2 border-dashed border-[#FACC15] shadow-[0_0_20px_rgba(250,204,21,0.3)] flex items-center justify-center">
                        <span className="text-[11px] font-black text-[#FACC15] bg-black/60 px-3 py-1 rounded-full">
                          Fit Face Inside
                        </span>
                      </div>
                    </div>

                    {/* Camera Control Action Overlay */}
                    <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-4 z-20">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="px-6 py-3 rounded-full bg-[#FACC15] hover:bg-[#EAB308] text-[#13241F] font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer border-2 border-[#13241F]"
                      >
                        <Camera className="w-4 h-4 text-[#13241F]" />
                        <span>Snap Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={stopCamera}
                        className="px-4 py-3 rounded-full bg-black/70 hover:bg-black text-white text-xs font-bold transition cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  /* Initial State before camera is triggered */
                  <div className="text-center p-6 space-y-4 text-white">
                    <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center mx-auto text-[#FACC15]">
                      <Camera className="w-10 h-10" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white">Large Viewfinder Ready</h3>
                      <p className="text-xs text-slate-300 max-w-xs mx-auto">
                        Position your device in good lighting so your face is clearly visible.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#FACC15] hover:bg-[#EAB308] text-[#13241F] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer shadow-md"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Open Live Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => selfieFileInputRef.current?.click()}
                        className="w-full sm:w-auto px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-white/20"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Photo File</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Hidden file input fallback */}
              <input
                ref={selfieFileInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={handleSelfieFileUpload}
                className="hidden"
              />

              {/* Retake controls if selfie was captured */}
              {selfieBase64 && (
                <div className="flex items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieBase64("");
                      startCamera();
                    }}
                    className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retake Selfie</span>
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setCurrentStep(1);
                }}
                className="px-6 py-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-[#13241F] text-xs font-black transition cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleGoToStep3}
                className="px-8 py-3.5 rounded-2xl bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black transition cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <span>{selfieBase64 ? "Continue to optional location" : "Skip photo and continue"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3: LOCATION GEOTAGGING
            ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 3 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4EA] border border-[#0A4D3C]/20 text-[#0A4D3C] text-xs font-black uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" />
                <span>Step 3 of 4 • Optional Location Evidence</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#13241F] tracking-tight">
                Add optional location evidence
              </h1>
              <p className="text-xs sm:text-sm text-[#5B6E66] font-medium leading-relaxed">
                A shop address or GPS pin is not required. If you choose to share a GPS pin, it is used for admin review and will not be shown to buyers.
              </p>
            </div>

            {gpsError && (
              <div className="bg-amber-50 border border-amber-300 text-amber-800 px-4 py-2.5 rounded-2xl text-xs font-medium">
                {gpsError}
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Geotag Card Display */}
              <div className="p-5 rounded-2xl bg-[#FAF8F2] border-2 border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-[#0A4D3C] uppercase tracking-wider">
                      Optional GPS evidence
                    </span>
                  </div>
                  {gpsCoordinates && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      <Check className="w-3 h-3" /> Geotagged
                    </span>
                  )}
                </div>

                {gpsCoordinates ? (
                  <div className="space-y-2 text-xs text-[#13241F]">
                    <div className="grid grid-cols-2 gap-2 p-3 bg-white rounded-xl border border-slate-200 font-mono">
                      <div>
                        <span className="text-[#5B6E66] text-[10px] block">LATITUDE:</span>
                        <strong className="text-sm font-black text-[#0A4D3C]">{gpsCoordinates.latitude}° N</strong>
                      </div>
                      <div>
                        <span className="text-[#5B6E66] text-[10px] block">LONGITUDE:</span>
                        <strong className="text-sm font-black text-[#0A4D3C]">{gpsCoordinates.longitude}° E</strong>
                      </div>
                    </div>
                    <div className="text-[11px] text-[#5B6E66] flex items-center justify-between">
                      <span>Accuracy: ±{gpsCoordinates.accuracy || 10} meters</span>
                      <span>Target Market: {marketHub}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#5B6E66] font-medium">
                    No GPS pin shared. You can continue without one.
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleDetectGps}
                  disabled={isDetectingGps}
                  className="w-full py-3 rounded-xl bg-[#FACC15] hover:bg-[#EAB308] text-[#13241F] text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer border border-[#13241F] shadow-sm disabled:opacity-50"
                >
                  {isDetectingGps ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Capturing optional GPS...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4 text-[#13241F]" />
                      <span>{gpsCoordinates ? "Update optional GPS pin" : "Share optional GPS pin"}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Stall Location Summary */}
              <div className="space-y-2 text-xs">
                <span className="font-black text-[#13241F] uppercase tracking-wider block">
                Public service area
                </span>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <div><strong>City & State:</strong> {city}, {state}</div>
                  <div><strong>Market / service area:</strong> {marketHub || "Not provided"}</div>
                  <div><strong>Private address:</strong> {stallAddress ? "Provided for admin review" : "Not provided"}</div>
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4 pt-4">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="px-6 py-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-[#13241F] text-xs font-black transition cursor-pointer flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleGoToStep4}
                className="px-8 py-3.5 rounded-2xl bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black transition cursor-pointer shadow-lg flex items-center gap-2"
              >
                <span>Continue to Add First Product</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4: ADD FIRST PRODUCT (WITH DISCOUNT SALE OPTION)
            ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 4 && (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E6F4EA] border border-[#0A4D3C]/20 text-[#0A4D3C] text-xs font-black uppercase tracking-wider">
                <Package className="w-3.5 h-3.5" />
                <span>Step 4 of 4 • Add First Product</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#13241F] tracking-tight">
                Add Your First Product or Service
              </h1>
              <p className="text-xs sm:text-sm text-[#5B6E66] font-medium leading-relaxed">
                Upload your first item image, specify the price, write a brief description, and choose if this is an active discount sale.
              </p>
            </div>

            <form onSubmit={handleFinalSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
              {/* Product Photo Upload from Device Gallery */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                    Product Photo <span className="text-slate-400 font-normal">(Select from Device Gallery)</span>
                  </label>
                  <span className="text-[10px] font-bold text-[#0A4D3C] bg-emerald-50 px-2 py-0.5 rounded-full">
                    Gallery Upload
                  </span>
                </div>

                {prodImagePreview ? (
                  <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-[#0A4D3C] shadow-sm">
                    <img
                      src={prodImagePreview}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProdImageBase64("");
                        setProdImagePreview("");
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white hover:bg-black transition cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => prodFileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 hover:border-[#0A4D3C] rounded-2xl p-6 text-center cursor-pointer transition bg-[#FAF8F2] space-y-2 group"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-50 group-hover:bg-[#E6F4EA] text-[#0A4D3C] flex items-center justify-center mx-auto transition-colors">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                    <div className="text-xs font-black text-[#13241F]">
                      Tap to Choose Image from Gallery
                    </div>
                    <div className="text-[11px] text-[#5B6E66]">
                      Select any photo from your phone or computer gallery (JPEG, PNG, WebP)
                    </div>
                  </div>
                )}

                <input
                  ref={prodFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProductImageChange}
                  className="hidden"
                />
              </div>

              {/* Product Title */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Product Name / Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Italian Leather Monk Strap Shoes"
                  className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                />
              </div>

              {/* Price in Naira */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Sale Price in Naira (₦) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-sm text-slate-500">₦</span>
                  <input
                    type="number"
                    required
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    placeholder="e.g. 35000"
                    className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl pl-9 pr-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                  />
                </div>
              </div>

              {/* DISCOUNT SALE TOGGLE */}
              <div className="p-4 rounded-2xl bg-[#FEF3C7]/40 border border-[#F59E0B]/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-[#F59E0B]" />
                    <span className="text-xs font-black text-[#78350F] uppercase tracking-wider">
                      Is this a Discount Sale / Promo Offer?
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDiscountSale}
                      onChange={(e) => setIsDiscountSale(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0A4D3C]"></div>
                  </label>
                </div>

                {/* If Discount Sale is ON */}
                {isDiscountSale && (
                  <div className="space-y-2 pt-2 border-t border-[#F59E0B]/20 animate-fade-in">
                    <label className="block text-[11px] font-black uppercase text-[#78350F]">
                      Original / Regular Price (₦) before discount
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-xs text-slate-500">₦</span>
                      <input
                        type="number"
                        value={originalPrice}
                        onChange={(e) => setOriginalPrice(e.target.value)}
                        placeholder="e.g. 45000"
                        className="w-full bg-white border border-[#F59E0B]/40 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#13241F] font-semibold focus:outline-none focus:border-[#0A4D3C]"
                      />
                    </div>
                    {calculateDiscount() && (
                      <span className="inline-block text-[11px] font-black text-[#0A4D3C] bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        {calculateDiscount()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Product Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black uppercase tracking-wider text-[#13241F]">
                  Product Description <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={prodDescription}
                  onChange={(e) => setProdDescription(e.target.value)}
                  placeholder="e.g. 100% genuine calfskin leather, available in sizes 40-45. Available for immediate pickup or interstate delivery."
                  className="w-full bg-[#FAF8F2] border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#13241F] font-medium focus:outline-none focus:border-[#0A4D3C]"
                />
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-3.5 rounded-2xl bg-slate-200 hover:bg-slate-300 text-[#13241F] text-xs font-black transition cursor-pointer flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-8 py-3.5 rounded-2xl bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black transition cursor-pointer shadow-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Registering & Launching...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration & Open Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 5: REGISTRATION COMPLETE & 25 FREE CREDITS BANNER
            ═══════════════════════════════════════════════════════════════════ */}
        {currentStep === 5 && registrationSuccess && (
          <div className="bg-white rounded-3xl border-2 border-[#0A4D3C] p-6 sm:p-10 shadow-xl space-y-6 animate-fade-in text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-200 text-[#0A4D3C] flex items-center justify-center mx-auto shadow-sm">
              <Gift className="w-10 h-10 animate-bounce" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-50 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Registration submitted</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#13241F]">
                {businessName} is under review
              </h1>
              <p className="text-sm text-[#5B6E66] max-w-lg mx-auto font-medium">
                Your business profile has been submitted. You can manage your storefront and add up to two products while our team reviews it.
              </p>
            </div>

            {/* Notice: Verification in Progress */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-left space-y-1.5 max-w-lg mx-auto">
              <div className="flex items-center gap-2 text-amber-900 text-xs font-black">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Verification Status: Under review</span>
              </div>
              <p className="text-[12px] text-amber-800 leading-relaxed font-medium">
                We’ll notify you on WhatsApp when your review is complete. Until then, your storefront and up to two products will be marked as not verified.
              </p>
            </div>

            {/* Storefront summary card */}
            <div className="bg-[#FAF8F2] border border-slate-200 rounded-2xl p-4 max-w-md mx-auto text-left space-y-2">
              <div className="flex items-center justify-between text-xs text-[#5B6E66]">
                <span>Registered Merchant:</span>
                <span className="text-[#0A4D3C] font-bold">{ownerName}</span>
              </div>
              <div className="text-sm font-black text-[#13241F] font-mono break-all">
                {registrationSuccess.storeUrl || `/vendor/${registrationSuccess.phone || phone}`}
              </div>
              <div className="text-[11px] text-[#5B6E66]">
                Your storefront is listed while your verification is pending.
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              {registrationSuccess.verificationUrl && (
                <a
                  href={registrationSuccess.verificationUrl}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#FACC15] hover:bg-[#EAB308] text-[#13241F] text-xs font-black shadow-lg flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Submit review evidence</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => onOpenStorefront(registrationSuccess.phone || phone)}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#0A4D3C] hover:bg-[#064E3B] text-white text-xs font-black shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Open My Business Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <div className="text-xs text-[#5B6E66] font-medium">
                Auto-redirecting in <strong className="text-[#0A4D3C] font-mono font-black">{countdown}s</strong>...
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
