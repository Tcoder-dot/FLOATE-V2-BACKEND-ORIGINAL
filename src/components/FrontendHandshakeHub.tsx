import React, { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Code2,
  ExternalLink,
  MessageCircle,
  ShoppingBag,
  Sparkles,
  Layers,
  ShieldAlert,
  Terminal,
  Activity,
  Smartphone,
  Eye,
  Sliders,
  Store,
  Clock,
  ShieldCheck,
} from 'lucide-react';

interface HandshakeResponse {
  success: boolean;
  status: string;
  handshake: string;
  service: string;
  version: string;
  clientOrigin: string;
  corsAllowed: boolean;
  timestamp: string;
  channels: {
    whatsApp: string;
    telegram: string;
    webfront: string;
  };
  features: {
    safePayEscrow: string;
    safePayNotice: string;
    merchantCatalog: string;
    dailyStatusUpdates: string;
    searchAndRecommendation: string;
    buyerInquiryRelay: string;
  };
  endpoints: Record<string, string>;
}

export function FrontendHandshakeHub() {
  const [backendUrl, setBackendUrl] = useState<string>(
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  );
  const [handshakeData, setHandshakeData] = useState<HandshakeResponse | null>(null);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [pingLoading, setPingLoading] = useState<boolean>(false);
  const [pingError, setPingError] = useState<string | null>(null);

  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'service' | 'stories' | 'search' | 'inquiry' | 'env'>('service');

  // Live simulation states for www.floate.xyz
  const [simProducts, setSimProducts] = useState<any[]>([]);
  const [simStatuses, setSimStatuses] = useState<any[]>([]);
  const [simLoading, setSimLoading] = useState<boolean>(false);
  const [simQuery, setSimQuery] = useState<string>('purse');
  const [simLocation, setSimLocation] = useState<string>('Lagos');

  // Test Handshake Ping
  const testHandshake = async () => {
    setPingLoading(true);
    setPingError(null);
    const start = performance.now();

    try {
      const trimmedUrl = backendUrl.replace(/\/+$/, '');
      const res = await fetch(`${trimmedUrl}/api/handshake`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'x-floate-client': 'www.floate.xyz',
        },
      });

      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data: HandshakeResponse = await res.json();
      setHandshakeData(data);
    } catch (err: any) {
      setPingError(err?.message || 'Handshake failed. Check CORS and backend connectivity.');
      setHandshakeData(null);
    } finally {
      setPingLoading(false);
    }
  };

  // Run initial handshake test
  useEffect(() => {
    testHandshake();
    fetchSimData();
  }, []);

  const fetchSimData = async () => {
    setSimLoading(true);
    try {
      const trimmedUrl = backendUrl.replace(/\/+$/, '');
      const [prodRes, statusRes] = await Promise.all([
        fetch(`${trimmedUrl}/api/catalog/products?limit=6`).then((r) => r.json()).catch(() => ({ products: [] })),
        fetch(`${trimmedUrl}/api/catalog/statuses`).then((r) => r.json()).catch(() => ({ statuses: [] })),
      ]);

      setSimProducts(prodRes.products || []);
      setSimStatuses(statusRes.statuses || []);
    } catch {
      // Ignore initial test err
    } finally {
      setSimLoading(false);
    }
  };

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Code templates for www.floate.xyz
  const envSnippet = `# .env.local (Next.js) or .env (Vite / React)
# Replace with your live Render / Cloud Run backend URL
NEXT_PUBLIC_FLOATE_BACKEND_URL="${backendUrl}"

# If building in Vite:
VITE_FLOATE_BACKEND_URL="${backendUrl}"`;

  const frontendIntegrationPrompt = `You are tasked with connecting our existing Floate frontend (www.floate.xyz) to our live backend without redesigning or altering the established UI layout.

Your objective is purely integration: wire up the real backend API so product listings, 24-hour merchant daily status updates, search queries, and buyer WhatsApp click-to-chat connections work seamlessly.

CRITICAL ARCHITECTURE RULES:
1. DO NOT implement or reference SafePay or escrow payment flows. SafePay checkout is strictly reserved for Version 3. All buyer purchases and inquiries connect directly to the verified merchant via WhatsApp.
2. DO NOT change existing UI styling, component layouts, or brand theme. Only connect data fetching and user action handlers.
3. Configure the backend URL via environment variable:
   - For Next.js: NEXT_PUBLIC_FLOATE_BACKEND_URL="${backendUrl}"
   - For Vite / React: VITE_FLOATE_BACKEND_URL="${backendUrl}"
   (Fallback default: "${backendUrl}")

BACKEND ENDPOINTS SPECIFICATION:
1. Handshake & Health:
   GET \${BACKEND_URL}/api/handshake
   - Returns { success: true, service: "floate-backend", corsAllowed: true, status: "healthy" }
   - Verify connection on mount. If the backend is waking up (cold-start on Render/Cloud Run), display a smooth skeleton loader.

2. Merchant Daily Status Updates (24h WhatsApp-Style Stories):
   GET \${BACKEND_URL}/api/catalog/statuses
   - Returns: { statuses: Array<{ id, merchantId, vendorPhone, businessName, marketHub, caption, mediaUrl, imageUrl, category, createdAt, expiresAt }> }
   - Wire this to the horizontal story bubbles at the top of the homepage. Clicking an update opens the modal showing the merchant's daily special or flash stock, with a direct WhatsApp reply button.

3. Merchant Products Catalog:
   GET \${BACKEND_URL}/api/catalog/products?limit=50&category={optional}
   - Returns: { products: Array<{ id, businessName, product, price, numericPrice, whatsapp, vendorPhone, city, state, marketHub, category, imageUrl, isVerified, description }> }
   - Populate the storefront grid with these active items.

4. Buyer Search & Recommendations:
   GET \${BACKEND_URL}/api/search?q={query}&location={location}
   - Returns ranked matching products and verified physical stall merchants.

5. Direct WhatsApp Chat Handshake:
   When a buyer clicks "Contact Seller" or "Buy on WhatsApp":
   - Use helper to build the WhatsApp URL:
     https://wa.me/{sanitizedIntlPhone}?text={encodedPrefilledMessage}
     Example format:
     "Hello! I saw your [Product Name] on floate.xyz (ID: [Product ID]). Is this item available for delivery today?"
   - (Optional) Fire POST \${BACKEND_URL}/api/buyer/inquire with { buyerName, buyerPhone, productId, productName, vendorPhone } so the lead is logged in our merchant CRM before opening WhatsApp.

Please implement these API calls cleanly in a dedicated service file (e.g., src/services/floateApi.ts) and plug them into the existing components.`;

  const frontendVerificationPrompt = `You are tasked with integrating or building the Merchant Visual Verification protocol on the Floate frontend (www.floate.xyz) connected to our live Floate backend.

BACKGROUND & PROTOCOL LOGIC:
1. When a merchant registers on WhatsApp (or taps "Verify My Business"), they fill out their basic store information:
   - Owner Full Name: Required (important for identity & anti-fraud)
   - Store / Shop Name: Required
   - Operation Model: Either 'physical_stall' (🏬 Physical stall in market) OR 'dropshipper_online' (📦 Online merchant / dropshipper)
   - Shop Address: Recommended for physical stalls (e.g., "Shop B14, Line 3, Balogun Market"), optional for dropshippers.
2. Upon submitting, the Floate backend creates a pending verification session with a unique token & reference (e.g., FLT-VR-123456) and immediately sends an automated WhatsApp message to the merchant with their direct verification link:
   https://www.floate.xyz/verify?token=\${token}&ref=\${ref}&phone=\${phone}
3. The merchant taps this link, opening your frontend's '/verify' route on their mobile browser to submit visual proof and activate their "✓ Verified Merchant Badge".

YOUR OBJECTIVE:
Check if the '/verify' page/route already exists in our frontend repository:
- IF IT ALREADY EXISTS: Ensure its form, camera capture, and submission logic connect to the live Floate backend endpoints below.
- IF IT DOES NOT EXIST: Create a sleek, mobile-first verification page at '/verify' (e.g., 'src/pages/verify.tsx' or 'app/verify/page.tsx').

BACKEND API ENDPOINTS TO CONNECT:

1. Fetch Verification Session Details:
   GET \${BACKEND_URL}/api/verify/session?token={token}&ref={ref}&phone={phone}
   - Returns:
     {
       success: true,
       session: {
         token: string,
         ref: string,
         phone: string,
         businessName: string,
         ownerFullName: string,
         businessModel: 'physical_stall' | 'dropshipper_online',
         shopAddress: string,
         marketLocation: string,
         category: string,
         status: 'PENDING_VISUAL' | 'VERIFIED',
         photoUrl?: string
       }
     }
   - Read query params 'token', 'ref', and 'phone' from the current URL.
   - Differentiate the UI instructions based on 'businessModel':
     * For 'physical_stall': Instruct the merchant to "Snap a live photo of your physical stall storefront, signboard, or stall number in {marketLocation}."
     * For 'dropshipper_online': Instruct the merchant to "Snap a photo of your inventory in hand, supplier delivery waybill, or owner ID."

2. Submit Visual Verification Proof:
   POST \${BACKEND_URL}/api/verify/submit-visual
   - Headers: { 'Content-Type': 'application/json' }
   - Body:
     {
       token: string,
       ref: string,
       phone: string,
       verificationType: 'stall_photo' | 'dropshipper_proof' | 'waybill_receipt' | 'id_card',
       photoBase64: string, // data:image/jpeg;base64,...
       notes?: string,      // e.g. "Shop B14 near front gate"
       gpsCoords?: { lat: number, lng: number } // Optional: navigator.geolocation coordinates
     }
   - Returns:
     {
       success: true,
       status: 'VERIFIED',
       message: 'Visual verification recorded and badge activated!',
       badgeType: 'VERIFIED_PHYSICAL_STALL' | 'VERIFIED_DROP_SHIPPER',
       photoUrl: string
     }

3. UI & Camera Implementation Guide:
   - Provide an image input for mobile camera capture:
     <input type="file" accept="image/*" capture="environment" onChange={handleImageCapture} />
   - Show an immediate photo preview once selected.
   - (Optional) Prompt for browser geolocation via navigator.geolocation.getCurrentPosition(...) to attach real-world coordinates.
   - On successful submission:
     - Display a celebratory success message: "✓ Verified Badge Activated! Your store now displays the verified shield on floate.xyz."
     - Show a button: "💬 Return to WhatsApp" linking to 'https://wa.me/{phone}' so the merchant seamlessly returns to WhatsApp.

4. Backend URL Configuration:
   - Next.js: process.env.NEXT_PUBLIC_FLOATE_BACKEND_URL || "${backendUrl}"
   - Vite: import.meta.env.VITE_FLOATE_BACKEND_URL || "${backendUrl}"`;

  const apiServiceSnippet = `// src/services/floateApi.ts
// Complete TypeScript API Client for www.floate.xyz

const BACKEND_URL = process.env.NEXT_PUBLIC_FLOATE_BACKEND_URL || '${backendUrl}';

export interface FloateProduct {
  id: string;
  businessName: string;
  product: string;
  name?: string;
  price: string;
  numericPrice?: number;
  whatsapp: string;
  vendorPhone: string;
  city: string;
  state: string;
  marketHub: string;
  category: string;
  imageUrl: string;
  isVerified: boolean;
  description?: string;
}

export interface MerchantStatusStory {
  id: string;
  merchantId: string;
  vendorPhone: string;
  businessName: string;
  marketHub: string;
  caption: string;
  statusText?: string;
  mediaUrl?: string;
  imageUrl?: string;
  badge: string;
  category: string;
  createdAt: string;
  expiresAt: string;
}

export interface BuyerInquiryPayload {
  buyerName: string;
  buyerPhone: string;
  buyerLocation?: string;
  productId: string;
  productName: string;
  vendorPhone: string;
  message?: string;
}

export const floateApi = {
  // 1. Handshake & Health Check
  async checkHandshake() {
    const res = await fetch(\`\${BACKEND_URL}/api/handshake\`);
    return res.json();
  },

  // 2. Fetch Active Products Catalog for Storefront
  async getProducts(params?: { category?: string; vendorPhone?: string }) {
    const query = new URLSearchParams(params as any).toString();
    const res = await fetch(\`\${BACKEND_URL}/api/catalog/products?\${query}\`);
    return res.json();
  },

  // 3. Fetch 24-Hour Merchant Daily Status Updates (WhatsApp Stories Feed)
  async getDailyStatuses() {
    const res = await fetch(\`\${BACKEND_URL}/api/catalog/statuses\`);
    return res.json();
  },

  // 4. Search Products & Verified Merchants with Recommendation Ranking
  async search(query: string, location?: string, budget?: string) {
    const params = new URLSearchParams({
      q: query,
      ...(location ? { location } : {}),
      ...(budget ? { budget } : {}),
    });
    const res = await fetch(\`\${BACKEND_URL}/api/search?\${params.toString()}\`);
    return res.json();
  },

  // 5. Submit Buyer Inquiry and Generate Direct WhatsApp Click-to-Chat Link
  async submitInquiry(payload: BuyerInquiryPayload) {
    const res = await fetch(\`\${BACKEND_URL}/api/buyer/inquire\`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  // 6. Direct WhatsApp Link Helper (Opens WhatsApp with prefilled message)
  createWhatsAppLink(vendorPhone: string, productName: string, productId?: string) {
    const cleanPhone = vendorPhone.replace(/\\D/g, '');
    const intlPhone = cleanPhone.startsWith('0') ? '234' + cleanPhone.slice(1) : cleanPhone;
    const msg = encodeURIComponent(
      \`Hello! I saw your "\${productName}" on floate.xyz (ID: \${productId || 'web'}). Is this item available for delivery today?\`
    );
    return \`https://wa.me/\${intlPhone}?text=\${msg}\`;
  }
};`;

  const storiesComponentSnippet = `// src/components/MerchantDailyStatusFeed.tsx
// Renders WhatsApp / Instagram style 24h stories at top of www.floate.xyz
import React, { useEffect, useState } from 'react';
import { floateApi, MerchantStatusStory } from '../services/floateApi';

export function MerchantDailyStatusFeed() {
  const [statuses, setStatuses] = useState<MerchantStatusStory[]>([]);
  const [activeStory, setActiveStory] = useState<MerchantStatusStory | null>(null);

  useEffect(() => {
    floateApi.getDailyStatuses().then((data) => {
      if (data.statuses) setStatuses(data.statuses);
    });
  }, []);

  if (statuses.length === 0) return null;

  return (
    <div className="py-4 border-b border-slate-200">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-4">
        Live Merchant Daily Status Updates (24h)
      </h3>
      <div className="flex gap-4 overflow-x-auto px-4 pb-2 no-scrollbar">
        {statuses.map((story) => (
          <button
            key={story.id}
            onClick={() => setActiveStory(story)}
            className="flex flex-col items-center gap-1.5 shrink-0 group focus:outline-none"
          >
            <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 via-teal-400 to-sky-500 group-hover:scale-105 transition-transform">
              <img
                src={story.mediaUrl || story.imageUrl || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa'}
                alt={story.businessName}
                className="w-full h-full object-cover rounded-full border-2 border-white"
              />
            </div>
            <span className="text-[11px] font-medium text-slate-700 max-w-[70px] truncate">
              {story.businessName}
            </span>
          </button>
        ))}
      </div>

      {/* Story Popup Modal */}
      {activeStory && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="font-bold text-sm">{activeStory.businessName}</h4>
                <p className="text-[11px] text-emerald-400">{activeStory.marketHub}</p>
              </div>
              <button onClick={() => setActiveStory(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <img src={activeStory.mediaUrl || activeStory.imageUrl} className="w-full h-64 object-cover" />
            <div className="p-4">
              <p className="text-sm text-slate-200 mb-4">{activeStory.caption || activeStory.statusText}</p>
              <a
                href={floateApi.createWhatsAppLink(activeStory.vendorPhone, 'Daily Status Item')}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 text-xs"
              >
                Reply on WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Top Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Frontend: www.floate.xyz
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                SafePay Escrow: PAUSED
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-sky-950 text-sky-400 border border-sky-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                CORS 100% Configured
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Backend ↔ www.floate.xyz Handshake Architecture
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Your backend is fully primed to feed products, daily merchant status updates (24h stories),
              search recommendations, and 1-tap WhatsApp lead handshakes directly into <strong className="text-white">www.floate.xyz</strong>.
              SafePay escrow is cleanly paused—buyers connect directly with verified merchants on WhatsApp.
            </p>
          </div>

          {/* Quick Ping Status Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 min-w-[280px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-400">Handshake Status</span>
              {pingLoading ? (
                <span className="flex items-center gap-1 text-xs text-sky-400 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Pinging...
                </span>
              ) : handshakeData?.success ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-mono font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> CONNECTED
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-400 font-mono font-bold">
                  DISCONNECTED
                </span>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Handshake Ping:</span>
                <span className="font-mono text-slate-200">{pingLatency !== null ? `${pingLatency}ms` : '—'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Domain Handshake:</span>
                <span className="font-mono text-emerald-400">www.floate.xyz</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SafePay Escrow:</span>
                <span className="font-mono text-amber-400 font-bold">Paused (Direct Relay)</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Catalog Feed:</span>
                <span className="font-mono text-emerald-400 font-bold">Active & Seeded</span>
              </div>
            </div>

            <button
              onClick={testHandshake}
              disabled={pingLoading}
              className="mt-4 w-full py-2 bg-slate-800 hover:bg-slate-700 active:scale-98 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${pingLoading ? 'animate-spin' : ''}`} />
              Re-test Handshake Ping
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: WHAT APART FROM BACKEND URL DO YOU NEED TO ADD? */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              What To Add to the Frontend (Apart from the Backend URL)
            </h2>
            <p className="text-xs text-slate-400">
              Here is the exact 5-point checklist to make www.floate.xyz 100% functional with this backend:
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center mb-3 font-bold text-xs">
              01
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">1. Environment Variable Setup</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Add <code className="text-sky-300 font-mono">NEXT_PUBLIC_FLOATE_BACKEND_URL</code> in Next.js or <code className="text-sky-300 font-mono">VITE_FLOATE_BACKEND_URL</code> in Vite.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300">
              NEXT_PUBLIC_FLOATE_BACKEND_URL=...
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 font-bold text-xs">
              02
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">2. Daily Status Updates Stories</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Consume <code className="text-emerald-300 font-mono">GET /api/catalog/statuses</code> to display 24h merchant circular story avatars (new arrivals, discounts, live inventory) at the top of floate.xyz.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-400">
              GET /api/catalog/statuses
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-3 font-bold text-xs">
              03
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">3. WhatsApp Click-to-Chat Deep Link</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              On every product card, generate an instant link to the seller: <code className="text-purple-300 font-mono">wa.me/234...</code> pre-filling the item name and product ID so the seller knows what the buyer wants!
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-purple-300">
              https://wa.me/234XXXXXXXXXX?text=...
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3 font-bold text-xs">
              04
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">4. Buyer Inquiry Relay (Optional Webhook)</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Before redirecting to WhatsApp, post the buyer inquiry to <code className="text-amber-300 font-mono">POST /api/buyer/inquire</code>. The backend logs the lead and pings the merchant!
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300">
              POST /api/buyer/inquire
            </div>
          </div>

          {/* Card 5 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3 font-bold text-xs">
              05
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">5. Direct WhatsApp Connect</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Buyers chat directly with verified stall merchants on WhatsApp. All orders and inquiries are routed directly to the seller with zero checkout barriers.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-emerald-300">
              Direct Merchant Chat (v3 SafePay Deferred)
            </div>
          </div>

          {/* Card 6 */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all">
            <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-3 font-bold text-xs">
              06
            </div>
            <h3 className="text-sm font-bold text-white mb-1.5">6. Cold-Start Loading Handling</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              On free tiers (like Render sleeping dyno), the first ping takes 30s. The frontend should show a friendly skeleton loader rather than erroring out.
            </p>
            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] font-mono text-teal-300">
              showSkeletonWhileConnecting()
            </div>
          </div>
        </div>
      </div>

      {/* PROMPT FOR FRONTEND DEVELOPER / AI WITH 1-CLICK COPY BUTTON */}
      <div className="bg-gradient-to-r from-purple-950/40 via-slate-900 to-indigo-950/40 border-2 border-purple-500/30 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-purple-500/20 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700/50">
                PROMPT FOR FRONTEND AI / DEV
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700/50">
                SafePay Excluded (v3 Reserved)
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Copy-Paste Integration Prompt for www.floate.xyz
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Give this exact prompt to whoever is coding your frontend (or paste into Cursor, Claude, or ChatGPT). It sets up the backend connection, daily status stories, and WhatsApp buyer chats without altering your existing design or adding SafePay.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(frontendIntegrationPrompt, 'frontend-prompt-btn')}
            className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0 shadow-lg ${
              copiedSection === 'frontend-prompt-btn'
                ? 'bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400'
                : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-600/30 active:scale-95'
            }`}
          >
            {copiedSection === 'frontend-prompt-btn' ? (
              <>
                <Check className="w-4 h-4 text-emerald-200" />
                Prompt Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Integration Prompt
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800 text-xs text-purple-200/90 font-mono overflow-x-auto max-h-80 leading-relaxed whitespace-pre-wrap">
            {frontendIntegrationPrompt}
          </pre>
          <div className="absolute top-3 right-3">
            <button
              onClick={() => copyToClipboard(frontendIntegrationPrompt, 'frontend-prompt-btn')}
              className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 text-purple-200 border border-purple-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* PROMPT FOR MERCHANT VERIFICATION PROTOCOL (/verify) WITH 1-CLICK COPY BUTTON */}
      <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border-2 border-emerald-500/30 rounded-3xl p-6 md:p-8 space-y-4 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              Merchant Trust & Verification Protocol
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              📋 Ready-to-Send Prompt: Merchant Verification Page (<span className="text-emerald-400 font-mono">/verify</span>)
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Give this exact prompt to your frontend engineer or AI (Cursor, Claude, ChatGPT). It checks if the <code className="bg-slate-800 px-1.5 py-0.5 rounded text-emerald-300 font-mono">/verify</code> page exists on <span className="text-white font-semibold">www.floate.xyz</span>, instructs them to build it if missing, and connects camera capture for physical stalls and dropshippers directly to the Floate backend.
            </p>
          </div>

          <button
            onClick={() => copyToClipboard(frontendVerificationPrompt, 'frontend-verify-btn')}
            className="flex-shrink-0 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            {copiedSection === 'frontend-verify-btn' ? (
              <>
                <Check className="w-4 h-4 text-emerald-100" />
                Prompt Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Verification Prompt
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <pre className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800 text-xs text-emerald-200/90 font-mono overflow-x-auto max-h-80 leading-relaxed whitespace-pre-wrap">
            {frontendVerificationPrompt}
          </pre>
          <div className="absolute top-3 right-3">
            <button
              onClick={() => copyToClipboard(frontendVerificationPrompt, 'frontend-verify-btn')}
              className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-700/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: LIVE BACKEND URL TESTER */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Terminal className="w-4 h-4 text-sky-400" />
              Live Backend Handshake URL & Latency Tester
            </h3>
            <p className="text-xs text-slate-400">
              Test your backend endpoint URL to verify CORS, latency, and handshake JSON payload.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/80">
            CORS: Access-Control-Allow-Origin: *
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="https://your-backend.onrender.com"
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white font-mono focus:outline-none focus:border-sky-500"
          />
          <button
            onClick={testHandshake}
            disabled={pingLoading}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Zap className="w-3.5 h-3.5" />
            {pingLoading ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {pingError && (
          <div className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{pingError}</span>
          </div>
        )}

        {handshakeData && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Handshake Payload Returned to www.floate.xyz:
              </span>
              <button
                onClick={() => copyToClipboard(JSON.stringify(handshakeData, null, 2), 'handshake-json')}
                className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-mono"
              >
                {copiedSection === 'handshake-json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy JSON
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 text-xs text-emerald-300 font-mono overflow-x-auto max-h-56">
              {JSON.stringify(handshakeData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* SECTION 3: CODE INTEGRATION TABS FOR www.floate.xyz */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-purple-400" />
              Copy-Paste Code for www.floate.xyz Frontend
            </h3>
            <p className="text-xs text-slate-400">
              Add these exact files to your frontend project to connect all product feeds, status stories, and WhatsApp links.
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
            <button
              onClick={() => setActiveCodeTab('service')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCodeTab === 'service' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              floateApi.ts (Client)
            </button>
            <button
              onClick={() => setActiveCodeTab('stories')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCodeTab === 'stories' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              DailyStatusFeed.tsx
            </button>
            <button
              onClick={() => setActiveCodeTab('env')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                activeCodeTab === 'env' ? 'bg-purple-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              .env Config
            </button>
          </div>
        </div>

        {activeCodeTab === 'service' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>File: <code className="text-purple-300 font-mono">src/services/floateApi.ts</code></span>
              <button
                onClick={() => copyToClipboard(apiServiceSnippet, 'api-service')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono flex items-center gap-1.5"
              >
                {copiedSection === 'api-service' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Code
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 font-mono overflow-x-auto max-h-96">
              {apiServiceSnippet}
            </pre>
          </div>
        )}

        {activeCodeTab === 'stories' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>File: <code className="text-purple-300 font-mono">src/components/MerchantDailyStatusFeed.tsx</code></span>
              <button
                onClick={() => copyToClipboard(storiesComponentSnippet, 'stories-comp')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono flex items-center gap-1.5"
              >
                {copiedSection === 'stories-comp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Code
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 font-mono overflow-x-auto max-h-96">
              {storiesComponentSnippet}
            </pre>
          </div>
        )}

        {activeCodeTab === 'env' && (
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs text-slate-400">
              <span>File: <code className="text-purple-300 font-mono">.env.local</code> or <code className="text-purple-300 font-mono">.env</code></span>
              <button
                onClick={() => copyToClipboard(envSnippet, 'env-code')}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-mono flex items-center gap-1.5"
              >
                {copiedSection === 'env-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                Copy Code
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-200 font-mono overflow-x-auto max-h-96">
              {envSnippet}
            </pre>
          </div>
        )}
      </div>

      {/* SECTION 4: LIVE PREVIEW OF DATA RETURNED TO www.floate.xyz */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              Live Data Simulator for www.floate.xyz
            </h3>
            <p className="text-xs text-slate-400">
              This preview shows exactly how the products and daily status updates appear when fetched from the backend.
            </p>
          </div>
          <button
            onClick={fetchSimData}
            disabled={simLoading}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${simLoading ? 'animate-spin' : ''}`} />
            Refresh Data Feeds
          </button>
        </div>

        {/* 24h Status Stories Row */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Active Merchant Daily Status Updates ({simStatuses.length})
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Endpoint: /api/catalog/statuses</span>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2">
            {simStatuses.map((st, i) => (
              <div
                key={st.id || i}
                className="bg-slate-950 border border-slate-800 rounded-2xl p-3 min-w-[220px] max-w-[240px] shrink-0 space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-full p-0.5 bg-gradient-to-tr from-emerald-500 to-teal-400 shrink-0">
                    <img
                      src={st.mediaUrl || st.imageUrl || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=150'}
                      alt=""
                      className="w-full h-full object-cover rounded-full"
                    />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{st.businessName}</h5>
                    <span className="text-[10px] text-emerald-400 font-mono block truncate">{st.marketHub}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 line-clamp-2 italic">
                  "{st.caption || st.statusText}"
                </p>
                <a
                  href={`https://wa.me/${(st.vendorPhone || '234').replace(/\D/g, '')}?text=${encodeURIComponent(
                    `Hello ${st.businessName}, I saw your daily status update on floate.xyz!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1"
                >
                  <MessageCircle className="w-3 h-3" />
                  Reply on WhatsApp
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
              Live Products Catalog Feed ({simProducts.length} items)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">Endpoint: /api/catalog/products</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {simProducts.slice(0, 6).map((prod, i) => (
              <div
                key={prod.id || i}
                className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="h-40 w-full overflow-hidden bg-slate-900 relative">
                  <img
                    src={prod.imageUrl || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=500'}
                    alt={prod.product || prod.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900/80 text-emerald-300 backdrop-blur border border-emerald-500/30">
                    {prod.marketHub || prod.city || 'Verified Market'}
                  </span>
                </div>

                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-white line-clamp-1">{prod.product || prod.name}</h4>
                    <p className="text-xs text-slate-400 line-clamp-1">{prod.businessName || prod.vendorName}</p>
                    <div className="mt-2 text-base font-extrabold text-amber-400">
                      {prod.price || '₦25,000'}
                    </div>
                  </div>

                  <a
                    href={`https://wa.me/${(prod.whatsapp || prod.vendorPhone || '234').replace(/\D/g, '')}?text=${encodeURIComponent(
                      `Hello ${prod.businessName}, I saw your ${prod.product || 'item'} on floate.xyz (ID: ${prod.id}). Is this available?`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Buy via WhatsApp
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
