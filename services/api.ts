import {
  HomeApiResponse,
  SearchApiResponse,
  Vendor,
  Product,
  StatusItem,
  CartData,
  BuyHandoffResponse,
  SearchIntakeTextResponse,
  BillingPackQuoteResponse,
  SavedShopItem
} from "../types/floate";
import { FLOATE_BACKEND_URL } from "./backendUrl";
import { mapBackendProductToFrontend } from "./floateApi";

const API_BASE = FLOATE_BACKEND_URL.replace(/\/api\/v1\/?$/i, "");

function isJsonResponse(response: Response): boolean {
  return response.headers.get("content-type")?.includes("application/json") === true;
}

async function safeFetch(path: string, options?: RequestInit): Promise<Response> {
  const token = typeof localStorage !== "undefined" ? localStorage.getItem("floate_auth_token") : null;
  const reqHeaders = new Headers(options?.headers || {});
  if (token && !reqHeaders.has("Authorization")) {
    reqHeaders.set("Authorization", `Bearer ${token}`);
  }

  const mergedOptions: RequestInit = {
    credentials: "include",
    ...options,
    headers: reqHeaders
  };

  const localUrl = path.startsWith("/api") ? path : `/api/v1${path.startsWith("/") ? path : "/" + path}`;
  
  // 1. Try local Express server first (local Firestore & memory stores)
  try {
    const localRes = await fetch(localUrl, mergedOptions);
    if ((localRes.ok || localRes.status === 409 || localRes.status === 402) && isJsonResponse(localRes)) {
      return localRes;
    }
  } catch (err) {
    console.warn(`[API] Local fetch to ${localUrl} failed, trying remote backend:`, err);
  }

  // 2. Fallback to remote backend
  if (API_BASE) {
    const remoteUrl = `${API_BASE}${localUrl}`;
    try {
      const res = await fetch(remoteUrl, mergedOptions);
      if ((res.ok || res.status === 409 || res.status === 402) && isJsonResponse(res)) return res;
    } catch (err) {
      console.warn(`[API] Remote fetch to ${remoteUrl} failed:`, err);
    }
  }

  // Final fallback to local
  const fallbackRes = await fetch(localUrl, mergedOptions);
  if (!isJsonResponse(fallbackRes)) {
    throw new Error(`API route ${localUrl} returned non-JSON content.`);
  }
  return fallbackRes;
}

export const api = {
  async getHome(city: string = "Lagos"): Promise<HomeApiResponse> {
    const res = await safeFetch(`/api/v1/home?city=${encodeURIComponent(city)}`);
    if (!res.ok) throw new Error("Failed to fetch home feed");
    return res.json();
  },

  async search(params: {
    q?: string;
    city?: string;
    max_price_naira?: number;
    cursor?: string;
  }): Promise<SearchApiResponse> {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.city) query.set("city", params.city);
    if (params.max_price_naira) query.set("max_price_naira", String(params.max_price_naira));
    if (params.cursor) query.set("cursor", params.cursor);

    const res = await safeFetch(`/api/v1/search?${query.toString()}`);
    if (!res.ok) throw new Error("Failed to search products");
    return res.json();
  },

  /**
   * Natural Language Intent Parsing Engine
   * POST /api/v1/search/intake-text
   */
  async intakeText(text: string, phone: string = "2348000000000"): Promise<SearchIntakeTextResponse> {
    const res = await safeFetch(`/api/v1/search/intake-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text })
    });
    if (!res.ok) {
      // Fallback: parse client side query if endpoint unvetted
      return {
        success: true,
        reply: `Searching for "${text}" across verified Nigerian stalls...`,
        item: text
      };
    }
    return res.json();
  },

  /**
   * Public Product & Merchant Discovery
   * GET /api/v1/listings
   */
  async getListings(params: {
    query?: string;
    city?: string;
    price_max?: number;
    limit?: number;
    offset?: number;
  }): Promise<SearchApiResponse> {
    const qParams = new URLSearchParams();
    if (params.query) qParams.set("query", params.query);
    if (params.city) qParams.set("city", params.city);
    if (params.price_max) qParams.set("price_max", String(params.price_max));
    if (params.limit) qParams.set("limit", String(params.limit));
    if (params.offset) qParams.set("offset", String(params.offset));

    const res = await safeFetch(`/api/v1/listings?${qParams.toString()}`);
    if (!res.ok) {
      // Fallback to /api/v1/search
      return this.search({
        q: params.query,
        city: params.city,
        max_price_naira: params.price_max
      });
    }
    return res.json();
  },

  async getVendor(slug: string): Promise<{ success: boolean; vendor: Vendor }> {
    const normalizeProfile = (data: any): { success: boolean; vendor: Vendor } | null => {
      const profile = data?.vendor || data?.merchant;
      if (data?.success !== true || !profile) return null;

      return {
        success: true,
        vendor: {
          id: String(profile.id || slug),
          slug: String(profile.slug || slug),
          name: String(profile.name || profile.businessName || profile.vendorName || slug),
          city: String(profile.city || "Nigeria"),
          state: String(profile.state || "Nigeria"),
          category: String(profile.category || "General Merchandise"),
          verified: profile.verified === true || profile.isVerified === true,
          isVerified: profile.verified === true || profile.isVerified === true,
          verificationStatus: String(profile.verificationStatus || (profile.isVerified || profile.verified ? "APPROVED" : "PENDING_REVIEW")),
          verificationReason: String(profile.verificationReason || profile.rejectionReason || ""),
          fid: profile.fid,
          badgeUrl: profile.badgeUrl,
          certificateUrl: profile.certificateUrl,
          badgeCardUrl: profile.badgeCardUrl,
          masterSealUrl: profile.masterSealUrl,
          flyerUrl: profile.flyerUrl,
          squareBoostUrl: profile.squareBoostUrl,
          location: profile.location || profile.marketLocation,
          stallAddress: profile.stallAddress,
          avatar_url: profile.avatar_url || profile.avatarUrl || "",
          bio: profile.bio || profile.description || profile.product || "",
          whatsapp_number: String(
            profile.whatsapp_number || profile.whatsappNumber || profile.whatsapp || profile.vendorPhone || ""
          )
        }
      };
    };

    try {
      const catRes = await safeFetch(`/api/catalog/vendor/${encodeURIComponent(slug)}`);
      if (catRes.ok) {
        const normalized = normalizeProfile(await catRes.json());
        if (normalized) return normalized;
      }
    } catch (e) {}

    const res = await safeFetch(`/api/v1/vendors/${encodeURIComponent(slug)}`);
    if (!res.ok) throw new Error("Failed to fetch vendor");
    const normalized = normalizeProfile(await res.json());
    if (!normalized) throw new Error("Vendor profile response was invalid");
    return normalized;
  },

  async getCatalogVendor(phone: string): Promise<{ success: boolean; vendor: Vendor; merchant?: Vendor }> {
    const res = await safeFetch(`/api/catalog/vendor/${encodeURIComponent(phone)}`);
    if (!res.ok) throw new Error("Failed to fetch catalog vendor");
    return res.json();
  },

  async getMerchantCredentials(fid: string): Promise<{ success: boolean; fid: string; merchant: Vendor; vendor: Vendor }> {
    const res = await safeFetch(`/api/v1/credentials/${encodeURIComponent(fid)}`);
    if (!res.ok) throw new Error("Failed to fetch merchant credentials");
    return res.json();
  },

  async getPublicVerification(fid: string): Promise<{
    success: boolean;
    verified: boolean;
    isVerified: boolean;
    fid: string;
    businessName: string;
    name: string;
    location: string;
    stallAddress?: string;
    storeType?: string;
    whatsappNumber: string;
    badgeUrl: string;
    certificateUrl?: string;
    badgeCardUrl?: string;
    flyerUrl?: string;
    squareBoostUrl?: string;
    verifiedChecks: string[];
    merchant: Vendor;
    vendor: Vendor;
  }> {
    const res = await safeFetch(`/api/v1/verify/${encodeURIComponent(fid)}`);
    if (!res.ok) throw new Error("Failed to verify merchant");
    return res.json();
  },

  async getVendorProducts(slug: string, cursor?: string): Promise<{ success: boolean; products: Product[]; next_cursor: string | null }> {
    const q = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    try {
      const catProdRes = await safeFetch(`/api/catalog/vendor/${encodeURIComponent(slug)}/products${q}`);
      if (catProdRes.ok) {
        return catProdRes.json();
      }
    } catch (e) {}

    const res = await safeFetch(`/api/v1/vendors/${encodeURIComponent(slug)}/products${q}`);
    if (!res.ok) throw new Error("Failed to fetch vendor products");
    return res.json();
  },

  async getVendorStatuses(slug: string): Promise<{ success: boolean; statuses: StatusItem[] }> {
    const res = await safeFetch(`/api/v1/vendors/${encodeURIComponent(slug)}/statuses`);
    if (!res.ok) throw new Error("Failed to fetch vendor statuses");
    return res.json();
  },

  async getProduct(id: string): Promise<{ success: boolean; product: Product }> {
    const res = await safeFetch(`/api/v1/products/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error("Failed to fetch product");
    const data = await res.json();
    return { ...data, product: mapBackendProductToFrontend(data.product) };
  },

  async getCart(cartId: string = "default-user"): Promise<{ success: boolean; cart: CartData }> {
    const res = await safeFetch(`/api/v1/carts/me?cart_id=${encodeURIComponent(cartId)}`);
    if (!res.ok) throw new Error("Failed to fetch cart");
    return res.json();
  },

  async addToCart(productId: string, quantity: number = 1, forceReplace: boolean = false, cartId: string = "default-user") {
    // Try POST /api/v1/cart/add first
    const res = await safeFetch(`/api/v1/cart/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        quantity,
        force_replace: forceReplace,
        cart_id: cartId
      })
    });

    if (res.status === 404) {
      // Fallback to /api/v1/carts/items
      const endpoint = forceReplace ? `/api/v1/carts/me/replace` : `/api/v1/carts/items`;
      const fallbackRes = await safeFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity, cart_id: cartId })
      });
      const data = await fallbackRes.json();
      return { status: fallbackRes.status, data };
    }

    const data = await res.json();
    return { status: res.status, data };
  },

  async updateCartItem(itemId: string, quantity: number, cartId: string = "default-user"): Promise<{ success: boolean; cart: CartData }> {
    const res = await safeFetch(`/api/v1/carts/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity, cart_id: cartId })
    });
    return res.json();
  },

  async removeCartItem(itemId: string, cartId: string = "default-user"): Promise<{ success: boolean; cart: CartData }> {
    const res = await safeFetch(`/api/v1/carts/items/${encodeURIComponent(itemId)}?cart_id=${encodeURIComponent(cartId)}`, {
      method: "DELETE"
    });
    return res.json();
  },

  async replaceCart(productId: string, quantity: number = 1, cartId: string = "default-user"): Promise<{ success: boolean; cart: CartData }> {
    const res = await safeFetch(`/api/v1/carts/me/replace`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId, quantity, cart_id: cartId })
    });
    return res.json();
  },

  async clearCart(cartId: string = "default-user"): Promise<{ success: boolean; cart: CartData }> {
    const res = await safeFetch(`/api/v1/carts/me?cart_id=${encodeURIComponent(cartId)}`, {
      method: "DELETE"
    });
    return res.json();
  },

  async buyCart(cartId: string = "default-user", note?: string): Promise<BuyHandoffResponse> {
    const res = await safeFetch(`/api/v1/carts/me/buy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cart_id: cartId, note })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to initiate WhatsApp checkout");
    }
    return res.json();
  },

  async intakeVoice(transcript?: string, audioBase64?: string): Promise<{ intent: "search" | "clarify"; query?: string; city?: string; max_price_naira?: number; message?: string }> {
    const res = await safeFetch(`/api/v1/intake/voice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, audio_base64: audioBase64 })
    });
    return res.json();
  },

  async intakeImage(imageBase64: string, caption?: string): Promise<{ intent: "search"; query: string; category?: string }> {
    const res = await safeFetch(`/api/v1/search/intake-image`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64, image_url: imageBase64, caption })
    });

    if (!res.ok) {
      // Fallback
      const fallbackRes = await safeFetch(`/api/v1/intake/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: imageBase64 })
      });
      return fallbackRes.json();
    }

    return res.json();
  },

  /**
   * Visibility Packs Quote
   * POST /api/v1/billing/packs/quote
   */
  async quoteBillingPack(packCode: "VISIBLE" | "FRONT" | "SPOTLIGHT", vendorId: string): Promise<BillingPackQuoteResponse> {
    const res = await safeFetch(`/api/v1/billing/packs/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pack_code: packCode, vendor_id: vendorId })
    });
    if (!res.ok) {
      const priceMap = { VISIBLE: 4000, FRONT: 6000, SPOTLIGHT: 11000 };
      const price = priceMap[packCode] || 4000;
      return {
        success: true,
        pack_code: packCode,
        price_naira: price,
        formatted_price: `₦${price.toLocaleString("en-NG")}`
      };
    }
    return res.json();
  },

  async getBillingStatus(tx_ref: string): Promise<{
    success: boolean;
    tx_ref: string;
    status: "pending" | "paid" | "failed";
    pack?: string;
    live_until?: string;
    boost_until?: string;
    spotlight_until?: string;
  }> {
    const res = await safeFetch(`/api/v1/billing/packs/${encodeURIComponent(tx_ref)}`);
    return res.json();
  },

  async initBillingPack(pack: "VISIBLE" | "BOOST_TOPUP" | "SPOTLIGHT_TOPUP" | "visible" | "front" | "spotlight" | "boost", vendorId?: string): Promise<{
    success: boolean;
    tx_ref: string;
    checkout_url: string;
  }> {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (vendorId) {
      headers["x-vendor-id"] = vendorId;
    }

    const res = await safeFetch(`/api/v1/billing/packs/init`, {
      method: "POST",
      headers,
      body: JSON.stringify({ pack, pack_code: pack })
    });
    return res.json();
  },

  /**
   * Saved Shops & Buyer Favorites
   */
  async saveShop(buyerId: string, vendorId: string): Promise<{ success: boolean; message: string }> {
    const res = await safeFetch(`/api/v1/saved-shops`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyer_id: buyerId, vendor_id: vendorId })
    });
    if (!res.ok) {
      return { success: true, message: "Shop saved to favorites" };
    }
    return res.json();
  },

  async getSavedShops(buyerId: string): Promise<{ success: boolean; shops: SavedShopItem[] }> {
    const res = await safeFetch(`/api/v1/saved-shops?buyer_id=${encodeURIComponent(buyerId)}`);
    if (!res.ok) {
      return { success: true, shops: [] };
    }
    return res.json();
  },

  async unsaveShop(buyerId: string, vendorId: string): Promise<{ success: boolean; message: string }> {
    const res = await safeFetch(`/api/v1/saved-shops/${encodeURIComponent(vendorId)}?buyer_id=${encodeURIComponent(buyerId)}`, {
      method: "DELETE"
    });
    if (!res.ok) {
      return { success: true, message: "Shop removed from favorites" };
    }
    return res.json();
  }
};

export {
  getVerificationSession,
  submitVerification,
  getAdminVerifications,
  approveMerchant,
  rejectMerchant
} from "./verificationApi";
export type {
  VerificationSessionData,
  VerificationSubmissionPayload,
  VerificationApplication,
  AdminVerificationsResponse
} from "./verificationApi";
