import React, { useState, useEffect } from "react";
import { Header } from "./components/common/Header";
import { CitySelectorModal } from "./components/common/CitySelectorModal";
import { CartDrawer } from "./components/common/CartDrawer";
import { CartConflictModal } from "./components/common/CartConflictModal";
import { BottomNav } from "./components/common/BottomNav";
import { OfflineIndicator } from "./components/common/OfflineIndicator";
import { OfflineRecentDrawer } from "./components/common/OfflineRecentDrawer";
import { VendorPage } from "./pages/VendorPage";
import { ProductPage } from "./pages/ProductPage";
import { BuyPage } from "./pages/BuyPage";
import { BillingDonePage } from "./pages/BillingDonePage";
import { LoadingScreen } from "./components/common/LoadingScreen";
import LandingPage from "./components/LandingPage";
import ProgrammaticHubPage from "./components/ProgrammaticHubPage";
import AboutUsPage from "./components/AboutUsPage";
import FounderBioPage from "./components/FounderBioPage";
import PrivacyPolicyPage from "./components/PrivacyPolicyPage";
import TermsOfServicePage from "./components/TermsOfServicePage";
import BlogPage from "./components/BlogPage";
import CompanyPage from "./pages/CompanyPage";
import VendorsPage from "./pages/VendorsPage";
import EcoPartnersPage from "./pages/EcoPartnersPage";
import WhatsappAIPage from "./pages/WhatsappAIPage";
import TelegramAIPage from "./pages/TelegramAIPage";
import ContactPage from "./pages/ContactPage";
import { VerificationPage } from "./pages/VerificationPage";
import { AdminVerificationsPage } from "./pages/AdminVerificationsPage";
import { AdminDashboard } from "./components/AdminDashboard";
import { SEO_HUBS_DATA } from "./data/seoHubs";
import { CartProvider, useCart } from "./context/CartContext";
import { CookieConsentBanner } from "./components/common/CookieConsentBanner";
import { MerchantAuthModal } from "./components/vendor/MerchantAuthModal";
import { MerchantDashboard } from "./components/vendor/MerchantDashboard";
import { RegisterPage } from "./pages/RegisterPage";
import { LoginPage } from "./pages/LoginPage";
import { PublicVerificationPage } from "./pages/PublicVerificationPage";
import { WishlistPage } from "./pages/WishlistPage";
import { floateApi } from "./services/floateApi";

type RouteType =
  | { type: "LANDING" }
  | { type: "FEED" }
  | { type: "REGISTER" }
  | { type: "LOGIN" }
  | { type: "WISHLIST" }
  | { type: "SEARCH"; query?: string; category?: string; maxPrice?: number }
  | { type: "VENDOR"; slug: string }
  | { type: "PUBLIC_VERIFY"; fid: string }
  | { type: "PRODUCT"; id: string }
  | { type: "HUB"; slug: string }
  | { type: "COMPANY" }
  | { type: "VENDORS_PAGE" }
  | { type: "ECO_PARTNERS" }
  | { type: "WHATSAPP_AI" }
  | { type: "TELEGRAM_AI" }
  | { type: "BLOG" }
  | { type: "CONTACT" }
  | { type: "ABOUT" }
  | { type: "FOUNDER" }
  | { type: "PRIVACY" }
  | { type: "TERMS" }
  | { type: "BUY" }
  | { type: "VERIFICATION"; token?: string; ref?: string; phone?: string }
  | { type: "ADMIN_VERIFICATIONS" }
  | { type: "MERCHANT_DASHBOARD"; slug: string }
  | { type: "BILLING_DONE"; txRef?: string };

import { NIGERIAN_STATES } from "./data/nigeriaConstants";

const MAJOR_CITIES = NIGERIAN_STATES;

function AppContent() {
  const [currentCity, setCurrentCity] = useState(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const cityParam = urlParams.get("city");
      if (cityParam) return cityParam;
      try {
        const saved = localStorage.getItem("floate_city");
        if (saved) return saved;
      } catch (e) {}
    }
    return "Lagos";
  });

  const [isCityModalOpen, setIsCityModalOpen] = useState(false);
  const [isOfflineDrawerOpen, setIsOfflineDrawerOpen] = useState(false);
  const [isMerchantAuthModalOpen, setIsMerchantAuthModalOpen] = useState(false);
  const [isAutoAuthenticating, setIsAutoAuthenticating] = useState(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      return Boolean(p.get("wa_token") || p.get("watoken"));
    }
    return false;
  });
  const [route, setRoute] = useState<RouteType>({ type: "LANDING" });
  const [srcParam, setSrcParam] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"home" | "favourites" | "cart">("home");
  const { setIsCartDrawerOpen } = useCart();

  const [isColdStartWakingUp, setIsColdStartWakingUp] = useState(false);

  // Ping backend handshake on initial load
  useEffect(() => {
    let active = true;
    floateApi.checkHandshake().then((res) => {
      if (!active) return;
      if (res.isWakingUp) {
        setIsColdStartWakingUp(true);
        const interval = setInterval(async () => {
          try {
            const check = await floateApi.checkHandshake();
            if (check.isHealthy) {
              if (active) setIsColdStartWakingUp(false);
              clearInterval(interval);
            }
          } catch (e) {}
        }, 2500);

        setTimeout(() => {
          clearInterval(interval);
          if (active) setIsColdStartWakingUp(false);
        }, 15000);
      }
    }).catch(() => null);

    return () => {
      active = false;
    };
  }, []);

  // Parse Initial Route from window.location
  useEffect(() => {
    const parseUrl = () => {
      const url = new URL(window.location.href);
      const pathname = url.pathname.replace(/\/$/, "") || "/";
      const params = url.searchParams;

      const src = params.get("src");
      if (src) setSrcParam(src);

      const city = params.get("city");
      if (city) setCurrentCity(city);

      // WhatsApp Deep-Link Auto-Login (wa_token)
      const waToken = params.get("wa_token") || params.get("watoken");
      const redirectParam = params.get("redirect");

      if (waToken) {
        setIsAutoAuthenticating(true);
        floateApi.exchangeWhatsappToken(waToken).then((res) => {
          if (res && res.authenticated) {
            if (res.token) {
              localStorage.setItem("floate_auth_token", res.token);
            }
            if (res.vendor) {
              try {
                localStorage.setItem("floate_vendor_profile", JSON.stringify(res.vendor));
                localStorage.setItem("floate_vendor_data", JSON.stringify(res.vendor));
              } catch (e) {}
            }
            if (res.order) {
              try {
                localStorage.setItem("floate_active_order", JSON.stringify(res.order));
              } catch (e) {}
            }
            const merchantSlug = res.slug || res.vendor?.slug;
            if (merchantSlug) {
              localStorage.setItem("floate_current_merchant_slug", merchantSlug);
            }

            if (res.order || pathname === "/buy" || pathname === "/checkout") {
              setRoute({ type: "BUY" });
              updateUrl("/buy");
            }
          }
        }).catch((err) => {
          console.warn("[WhatsApp Auto-Login] Token exchange notice:", err);
        }).finally(() => {
          setIsAutoAuthenticating(false);
          // Strip wa_token from URL without page reload
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("wa_token");
          cleanUrl.searchParams.delete("watoken");
          window.history.replaceState({}, "", cleanUrl.toString());

          if (redirectParam) {
            window.history.pushState({}, "", redirectParam);
            window.dispatchEvent(new Event("popstate"));
          } else if (pathname === "/login" || pathname === "/merchant/dashboard") {
            const savedSlug = localStorage.getItem("floate_current_merchant_slug");
            if (savedSlug) {
              setRoute({ type: "MERCHANT_DASHBOARD", slug: savedSlug });
              updateUrl("/merchant/dashboard", { slug: savedSlug });
            }
          }
        });
      }

      if (pathname.startsWith("/vendor/") || pathname.startsWith("/store/")) {
        const phone = pathname.replace(/^\/(vendor|store)\//, "");
        setRoute({ type: "VENDOR", slug: phone });
      } else if (pathname.startsWith("/v/")) {
        const fid = pathname.replace("/v/", "");
        setRoute({ type: "PUBLIC_VERIFY", fid });
      } else if (pathname.startsWith("/p/")) {
        const productPath = pathname.slice(3).split("/");
        const id = decodeURIComponent(productPath.length > 1 ? productPath.slice(1).join("/") : productPath[0]);
        setRoute({ type: "PRODUCT", id });
      } else if (pathname.startsWith("/hub/") || pathname.startsWith("/solutions/")) {
        const slug = pathname.replace(/^\/(hub|solutions)\//, "");
        setRoute({ type: "HUB", slug });
      } else if (pathname.startsWith("/merchant/dashboard")) {
        const slug = params.get("slug") || localStorage.getItem("floate_current_merchant_slug");
        if (slug) {
          setRoute({ type: "MERCHANT_DASHBOARD", slug });
        } else {
          setRoute({ type: "LOGIN" });
          updateUrl("/login");
        }
      } else if (pathname === "/search" || pathname === "/feed" || pathname === "/app") {
        setRoute({ type: "LANDING" });
        setActiveTab("home");
      } else if (pathname === "/wishlist" || pathname === "/favourites") {
        setRoute({ type: "WISHLIST" });
        setActiveTab("favourites");
      } else if (pathname === "/login" || pathname.startsWith("/login")) {
        setRoute({ type: "LOGIN" });
      } else if (pathname === "/register" || pathname.startsWith("/register")) {
        setRoute({ type: "REGISTER" });
      } else if (pathname === "/buy" || pathname === "/checkout") {
        setRoute({ type: "BUY" });
      } else if (pathname === "/company") {
        setRoute({ type: "COMPANY" });
      } else if (pathname === "/vendors") {
        setRoute({ type: "VENDORS_PAGE" });
      } else if (pathname === "/eco-partners") {
        setRoute({ type: "ECO_PARTNERS" });
      } else if (pathname === "/whatsapp-ai") {
        setRoute({ type: "WHATSAPP_AI" });
      } else if (pathname === "/telegram-ai") {
        setRoute({ type: "TELEGRAM_AI" });
      } else if (pathname === "/blog") {
        setRoute({ type: "BLOG" });
      } else if (pathname === "/contact") {
        setRoute({ type: "CONTACT" });
      } else if (pathname === "/about") {
        setRoute({ type: "ABOUT" });
      } else if (pathname === "/founder" || pathname === "/founder-bio" || pathname === "/telman" || pathname === "/chukwuemeka-rich") {
        setRoute({ type: "FOUNDER" });
      } else if (pathname === "/privacy") {
        setRoute({ type: "PRIVACY" });
      } else if (pathname === "/terms") {
        setRoute({ type: "TERMS" });
      } else if (pathname === "/verify" || pathname.startsWith("/verify/") || params.get("token") || params.get("ref")) {
        const token = params.get("token") || (pathname.startsWith("/verify/") ? pathname.replace("/verify/", "") : undefined);
        const ref = params.get("ref") || undefined;
        const phone = params.get("phone") || undefined;
        setRoute({ type: "VERIFICATION", token, ref, phone });
      } else if (pathname === "/admin/verifications" || pathname === "/admin") {
        setRoute({ type: "ADMIN_VERIFICATIONS" });
      } else if (pathname.startsWith("/billing/done") || pathname === "/billing") {
        const txRef = params.get("ref") || params.get("tx_ref") || undefined;
        setRoute({ type: "BILLING_DONE", txRef });
      } else if (pathname === "/cart") {
        setRoute({ type: "FEED" });
        setActiveTab("cart");
        setIsCartDrawerOpen(true);
      } else {
        // Spec 2: Root slug redirects (/:slug -> /vendor/:slug)
        const cleanSlug = pathname.replace(/^\//, "").trim();
        const RESERVED_ROOT_PATHS = [
          "", "search", "feed", "app", "wishlist", "favourites", "login", "register",
          "buy", "checkout", "company", "vendors", "eco-partners", "whatsapp-ai",
          "telegram-ai", "blog", "contact", "about", "founder", "founder-bio",
          "telman", "chukwuemeka-rich", "privacy", "terms", "verify", "admin",
          "billing", "cart", "api", "hub", "solutions", "vendor", "store", "v", "p", "merchant"
        ];
        if (cleanSlug && !cleanSlug.includes("/") && !RESERVED_ROOT_PATHS.includes(cleanSlug.toLowerCase())) {
          setRoute({ type: "VENDOR", slug: cleanSlug });
          updateUrl(`/vendor/${cleanSlug}`);
        } else {
          setRoute({ type: "LANDING" });
          setActiveTab("home");
        }
      }
    };

    parseUrl();
    window.addEventListener("popstate", parseUrl);
    return () => window.removeEventListener("popstate", parseUrl);
  }, [setIsCartDrawerOpen]);

  // Update browser URL state with src param preserved
  const updateUrl = (newPath: string, extraParams: Record<string, string | undefined> = {}) => {
    const url = new URL(window.location.origin + newPath);
    if (srcParam) url.searchParams.set("src", srcParam);
    if (currentCity && currentCity !== "Lagos") url.searchParams.set("city", currentCity);

    Object.entries(extraParams).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });

    window.history.pushState({}, "", url.toString());
  };

  const handleNavigateLanding = () => {
    setRoute({ type: "LANDING" });
    updateUrl("/");
  };

  const handleNavigateWishlist = () => {
    setRoute({ type: "WISHLIST" });
    setActiveTab("favourites");
    updateUrl("/favourites");
  };

  const handleNavigateFeed = () => {
    setRoute({ type: "LANDING" });
    updateUrl("/");
  };

  const handleNavigateSearch = (_query?: string, _category?: string, _maxPrice?: number) => {
    setRoute({ type: "LANDING" });
    updateUrl("/");
  };

  const handleOpenVendor = (slug: string) => {
    setRoute({ type: "VENDOR", slug });
    updateUrl(`/vendor/${slug}`);
  };

  const handleOpenPublicVerify = (fid: string) => {
    setRoute({ type: "PUBLIC_VERIFY", fid });
    updateUrl(`/v/${fid}`);
  };

  const handleOpenProduct = (id: string) => {
    setRoute({ type: "PRODUCT", id });
    updateUrl(`/p/${encodeURIComponent(id)}`);
  };

  const handleOpenHub = (slug: string) => {
    setRoute({ type: "HUB", slug });
    updateUrl(`/hub/${slug}`);
  };

  const handleNavigatePage = (page: 'COMPANY' | 'VENDORS_PAGE' | 'ECO_PARTNERS' | 'WHATSAPP_AI' | 'TELEGRAM_AI' | 'BLOG' | 'CONTACT' | 'PRIVACY' | 'TERMS' | 'ABOUT' | 'FOUNDER') => {
    if (page === 'COMPANY') {
      setRoute({ type: "COMPANY" });
      updateUrl("/company");
    } else if (page === 'VENDORS_PAGE') {
      setRoute({ type: "VENDORS_PAGE" });
      updateUrl("/vendors");
    } else if (page === 'ECO_PARTNERS') {
      setRoute({ type: "ECO_PARTNERS" });
      updateUrl("/eco-partners");
    } else if (page === 'WHATSAPP_AI') {
      setRoute({ type: "WHATSAPP_AI" });
      updateUrl("/whatsapp-ai");
    } else if (page === 'TELEGRAM_AI') {
      setRoute({ type: "TELEGRAM_AI" });
      updateUrl("/telegram-ai");
    } else if (page === 'BLOG') {
      setRoute({ type: "BLOG" });
      updateUrl("/blog");
    } else if (page === 'CONTACT') {
      setRoute({ type: "CONTACT" });
      updateUrl("/contact");
    } else if (page === 'ABOUT') {
      setRoute({ type: "ABOUT" });
      updateUrl("/about");
    } else if (page === 'FOUNDER') {
      setRoute({ type: "FOUNDER" });
      updateUrl("/founder");
    } else if (page === 'PRIVACY') {
      setRoute({ type: "PRIVACY" });
      updateUrl("/privacy");
    } else if (page === 'TERMS') {
      setRoute({ type: "TERMS" });
      updateUrl("/terms");
    }
  };

  const handleNavigateBuy = () => {
    setRoute({ type: "BUY" });
    updateUrl("/buy");
  };

  const handleSelectCity = (city: string) => {
    setCurrentCity(city);
    try {
      localStorage.setItem("floate_city", city);
    } catch (e) {}

    const url = new URL(window.location.href);
    url.searchParams.set("city", city);
    window.history.pushState({}, "", url.toString());
  };

  // Compute active mobile bottom nav tab
  const getActiveTab = (): "home" | "search" | "saved" | "activity" | "profile" | "other" => {
    if (route.type === "FEED") return "home";
    if (route.type === "SEARCH") return "search";
    return "other";
  };

  // Auto-authenticating via WhatsApp deep-link
  if (isAutoAuthenticating) {
    return (
      <LoadingScreen
        message="Authenticating via WhatsApp..."
        subtitle="Verifying your secure session..."
      />
    );
  }

  // Merchant Login Route (/login)
  if (route.type === "LOGIN") {
    return (
      <LoginPage
        onBackToHome={handleNavigateLanding}
        onLoginSuccess={(slug) => {
          setRoute({ type: "MERCHANT_DASHBOARD", slug });
          updateUrl("/merchant/dashboard", { slug });
        }}
        onNavigateRegister={() => {
          setRoute({ type: "REGISTER" });
          updateUrl("/register");
        }}
      />
    );
  }

  // Business Registration Form Route (/register)
  if (route.type === "REGISTER") {
    return (
      <RegisterPage
        onBackToHome={handleNavigateLanding}
        onOpenStorefront={(phoneOrSlug) => {
          setRoute({ type: "MERCHANT_DASHBOARD", slug: phoneOrSlug });
          updateUrl("/merchant/dashboard", { slug: phoneOrSlug });
        }}
        onNavigatePage={handleNavigatePage}
        onNavigateLogin={() => {
          setRoute({ type: "LOGIN" });
          updateUrl("/login");
        }}
      />
    );
  }

  // Full-screen Buy page render without global chrome
  if (route.type === "BUY") {
    return (
      <div className="min-h-screen bg-[#FFFFFF]">
        <BuyPage onBackToShopping={handleNavigateFeed} />
      </div>
    );
  }

  // Marketing Landing Page Entry
  if (route.type === "LANDING") {
    return (
      <>
        <LandingPage
          onSearch={(q) => handleNavigateSearch(q)}
          onExploreStalls={handleNavigateFeed}
          onOpenVendor={handleOpenVendor}
          onOpenProduct={handleOpenProduct}
          onSelectCategory={(cat) => handleNavigateSearch(cat)}
          onSelectHub={handleOpenHub}
          onNavigatePage={handleNavigatePage}
          onOpenMerchantAuth={() => {
            setRoute({ type: "REGISTER" });
            updateUrl("/register");
          }}
          onOpenMerchantDashboard={() => {
            const slug = localStorage.getItem("floate_current_merchant_slug");
            if (slug) {
              setRoute({ type: "MERCHANT_DASHBOARD", slug });
              updateUrl("/merchant/dashboard", { slug });
            } else {
              setRoute({ type: "LOGIN" });
              updateUrl("/login");
            }
          }}
        />
        <MerchantAuthModal
          isOpen={isMerchantAuthModalOpen}
          onClose={() => setIsMerchantAuthModalOpen(false)}
          onLoginSuccess={(slug) => {
            setRoute({ type: "MERCHANT_DASHBOARD", slug });
            updateUrl("/merchant/dashboard", { slug });
          }}
        />
      </>
    );
  }

  // Merchant Dashboard Route
  if (route.type === "MERCHANT_DASHBOARD") {
    return (
      <MerchantDashboard
        merchantSlug={route.slug}
        onLogout={() => {
          localStorage.removeItem("floate_current_merchant_slug");
          handleNavigateLanding();
        }}
        onNavigateHome={handleNavigateLanding}
        onOpenStorefront={handleOpenVendor}
      />
    );
  }

  // Public Merchant Verification Route (/v/:fid)
  if (route.type === "PUBLIC_VERIFY") {
    return (
      <PublicVerificationPage
        fid={route.fid}
        onNavigateHome={handleNavigateLanding}
        onOpenStorefront={handleOpenVendor}
      />
    );
  }

  // Dedicated Merchant Landing Page Route
  if (route.type === "VENDOR") {
    return (
      <VendorPage
        slug={route.slug}
        onBack={handleNavigateSearch}
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onOpenProduct={handleOpenProduct}
        onOpenPublicVerify={handleOpenPublicVerify}
      />
    );
  }

  // Dedicated Pages with Landing Aesthetics
  if (route.type === "COMPANY") {
    return (
      <CompanyPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  if (route.type === "VENDORS_PAGE") {
    return (
      <VendorsPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  if (route.type === "ECO_PARTNERS") {
    return (
      <EcoPartnersPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  if (route.type === "WHATSAPP_AI") {
    return (
      <WhatsappAIPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  if (route.type === "TELEGRAM_AI") {
    return (
      <TelegramAIPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  if (route.type === "CONTACT") {
    return (
      <ContactPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  // Informational Pages
  if (route.type === "ABOUT") {
    return (
      <AboutUsPage
        onBack={handleNavigateLanding}
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }
  if (route.type === "FOUNDER") {
    return (
      <FounderBioPage
        onBack={handleNavigateLanding}
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }
  if (route.type === "PRIVACY") {
    return (
      <PrivacyPolicyPage
        onBack={handleNavigateLanding}
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }
  if (route.type === "TERMS") {
    return (
      <TermsOfServicePage
        onBack={handleNavigateLanding}
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }
  if (route.type === "BLOG") {
    return (
      <BlogPage
        onBack={handleNavigateLanding}
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  // Programmatic Hub Page
  if (route.type === "HUB") {
    const hubData = SEO_HUBS_DATA.find((hub) => hub.slug === route.slug);
    if (!hubData) {
      return (
        <main className="min-h-screen bg-[#F7F7F2] px-6 py-24 text-center text-[#13241F]">
          <h1 className="text-2xl font-black">Market directory not found</h1>
          <p className="mt-3 text-sm">This market directory is unavailable.</p>
        </main>
      );
    }
    return (
      <ProgrammaticHubPage
        hub={hubData}
        onNavigateHome={handleNavigateLanding}
        onSelectHub={handleOpenHub}
        onNavigatePage={handleNavigatePage}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  // Merchant Stall Verification Page (WhatsApp Link Flow)
  if (route.type === "VERIFICATION") {
    return (
      <VerificationPage
        token={route.token}
        ref={route.ref}
        phone={route.phone}
        onNavigateHome={handleNavigateLanding}
      />
    );
  }

  // Wishlist / Favourites Page
  if (route.type === "WISHLIST") {
    return (
      <WishlistPage
        onNavigateHome={handleNavigateLanding}
        onNavigatePage={handleNavigatePage}
        onOpenProduct={handleOpenProduct}
        onOpenVendor={handleOpenVendor}
        onExploreStalls={handleNavigateFeed}
      />
    );
  }

  // Admin Operating System Dashboard (Live Real Database Only)
  if (route.type === "ADMIN_VERIFICATIONS") {
    return (
      <AdminDashboard
        onNavigateHome={handleNavigateLanding}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F7F2] text-[#111111] flex flex-col font-sans">
      {/* Cold-start handshake skeleton loader */}
      {isColdStartWakingUp && (
        <div className="sticky top-0 z-50 bg-[#0A4D3C] text-white py-2 px-4 shadow-sm flex items-center justify-center gap-2 text-xs font-semibold animate-pulse">
          <span className="w-2 h-2 rounded-full bg-[#FFC107] animate-ping" />
          <span>Waking up Floate live commerce engine... smooth handshake in progress</span>
        </div>
      )}

      {/* PWA Offline Banner & Offline Searched Products Drawer */}
      <OfflineIndicator onOpenOfflineDrawer={() => setIsOfflineDrawerOpen(true)} />
      <OfflineRecentDrawer
        isOpen={isOfflineDrawerOpen}
        onClose={() => setIsOfflineDrawerOpen(false)}
        onSelectProduct={handleOpenProduct}
        onSelectQuery={(q) => handleNavigateSearch(q)}
      />

      {/* Main In-App Content Area */}
      <main className="flex-1 w-full">


        {route.type === "PRODUCT" && (
          <ProductPage
            id={route.id}
            onBack={handleNavigateFeed}
            onOpenVendor={handleOpenVendor}
            onOpenProduct={handleOpenProduct}
          />
        )}

        {route.type === "BILLING_DONE" && (
          <BillingDonePage
            txRef={route.txRef}
            onGoHome={handleNavigateFeed}
          />
        )}
      </main>

      {/* City Selector Modal (Full sheet fallback for "More cities...") */}
      <CitySelectorModal
        isOpen={isCityModalOpen}
        onClose={() => setIsCityModalOpen(false)}
        currentCity={currentCity}
        availableCities={MAJOR_CITIES}
        onSelectCity={handleSelectCity}
      />

      {/* 409 CART_VENDOR_CONFLICT Modal */}
      <CartConflictModal />

      {/* Cart Drawer Bottom Sheet */}
      <CartDrawer
        onNavigateToBuy={handleNavigateBuy}
        onOpenVendor={handleOpenVendor}
      />

      {/* Mobile Bottom Navigation Dock */}
      <BottomNav
        activeTab={activeTab}
        onNavigateHome={() => {
          setActiveTab("home");
          handleNavigateFeed();
        }}
        onNavigateSearch={(q) => {
          setActiveTab("favourites");
          handleNavigateSearch(q);
        }}
        onNavigateFavourites={handleNavigateWishlist}
        onOpenCart={() => {
          setActiveTab("cart");
          setIsCartDrawerOpen(true);
        }}
        onSelectTab={(tab) => setActiveTab(tab as any)}
      />

      {/* Cookie Consent & Privacy Banner for NDPR & Ad Tracking Compliance */}
      <CookieConsentBanner onNavigatePrivacy={() => handleNavigatePage('PRIVACY')} />
    </div>
  );
}

export default function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}
