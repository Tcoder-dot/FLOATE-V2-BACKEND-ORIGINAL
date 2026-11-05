/**
 * FLOATE Render Backend Search Service
 * 
 * Routes all searches directly to the live Render backend API:
 * https://floate-v2-backend-original.onrender.com/api/search
 * 
 * Completely free of client-side Gemini / Google AI Studio calls.
 */

import { Product, Vendor } from "../types/floate";
import { ParsedSearchCriteria } from "../types/storefront";

// Deterministic Floate Backend API Base URL with environment variable fallbacks
export const RENDER_BACKEND_URL: string = (
  (typeof process !== "undefined" && (process.env?.NEXT_PUBLIC_FLOATE_API_URL || process.env?.NEXT_PUBLIC_FLOATE_BACKEND_URL)) ||
  (typeof import.meta !== "undefined" && (import.meta.env?.NEXT_PUBLIC_FLOATE_API_URL || import.meta.env?.VITE_FLOATE_API_URL || import.meta.env?.VITE_FLOATE_BACKEND_URL || import.meta.env?.NEXT_PUBLIC_FLOATE_BACKEND_URL)) ||
  "https://floate-v2-backend-original.onrender.com"
).replace(/\/+$/, "");

export const FLOATE_API_URL = RENDER_BACKEND_URL;

export const FLOATE_SEARCH_API_KEY: string = (
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_FLOATE_API_KEY) ||
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_FLOATE_SEARCH_API_KEY) ||
  (typeof process !== "undefined" && process.env?.FLOATE_SEARCH_API_KEY) ||
  "floate_live_sk_7f8a92b3c4e5d6"
);

export interface SearchBackendResult {
  success: boolean;
  query: string;
  totalMatches: number;
  results: any[];
  merchants?: Vendor[];
  merchantRecommendations?: Vendor[];
  products?: Product[];
  spotlightMatches?: any[];
  regularMatches?: any[];
  exactMatches?: any[];
  categoryMatches?: any[];
  criteria?: ParsedSearchCriteria;
  hasPriceFilter?: boolean;
  hasExactMatch?: boolean;
  exactMatchesCount?: number;
  error?: string;
}

export interface SearchOptions {
  location?: string;
  userCity?: string;
  userLat?: number;
  userLng?: number;
  category?: string;
  budget?: string | number;
  signal?: AbortSignal;
}

// In-memory instant client cache for sub-10ms response on repeat/instant searches
const searchMemoryCache = new Map<string, { data: SearchBackendResult; timestamp: number }>();
const CLIENT_CACHE_TTL_MS = 30 * 1000;

export function clearSearchCache(): void {
  searchMemoryCache.clear();
}

export async function searchFloateCatalog(
  searchTerm: string,
  options?: SearchOptions
): Promise<SearchBackendResult> {
  const cleanQuery = searchTerm.trim();
  if (!cleanQuery && (!options?.category || options.category === "All")) {
    return { success: true, query: "", totalMatches: 0, results: [], merchants: [] };
  }

  const params = new URLSearchParams({ q: cleanQuery });
  if (options?.location) params.set("location", options.location);
  if (options?.userCity) params.set("userCity", options.userCity);
  if (options?.userLat !== undefined) params.set("userLat", String(options.userLat));
  if (options?.userLng !== undefined) params.set("userLng", String(options.userLng));
  if (options?.category && options.category !== "All") params.set("category", options.category);

  try {
    const response = await fetch(`/api/webfront/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      signal: options?.signal
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload || payload.success === false) {
      return {
        success: false,
        query: cleanQuery,
        totalMatches: 0,
        results: [],
        merchants: [],
        error: payload?.error || `Catalog search failed (HTTP ${response.status}).`
      };
    }

    return {
      success: true,
      query: cleanQuery,
      totalMatches: Number(payload.totalFound || payload.results?.length || 0),
      results: Array.isArray(payload.results) ? payload.results : [],
      merchants: Array.isArray(payload.merchants)
        ? payload.merchants
        : Array.isArray(payload.matchingVendors)
        ? payload.matchingVendors
        : [],
      criteria: payload.criteria,
      hasPriceFilter: Boolean(payload.hasPriceFilter),
      hasExactMatch: Boolean(payload.hasExactMatch),
      exactMatchesCount: Number(payload.exactMatchesCount || 0)
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    console.error("[SearchService] Floate catalog search failed:", error);
    return {
      success: false,
      query: cleanQuery,
      totalMatches: 0,
      results: [],
      merchants: [],
      error: "Could not connect to Floate catalog search."
    };
  }
}

/**
 * Executes a search exclusively through the Render backend API.
 * Payload: { query: searchTerm }
 * Headers: Content-Type: application/json, x-api-key: <API_KEY>
 */
export async function searchRenderBackend(
  searchTerm: string,
  options?: SearchOptions
): Promise<SearchBackendResult> {
  const cleanQuery = searchTerm.trim();
  if (!cleanQuery) {
    return {
      success: true,
      query: "",
      totalMatches: 0,
      results: [],
      spotlightMatches: [],
      regularMatches: []
    };
  }

  const cacheKey = `${cleanQuery.toLowerCase()}_${(options?.location || '').toLowerCase()}_${options?.budget || ''}`;
  const cached = searchMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL_MS) {
    return cached.data;
  }

  const payload: Record<string, any> = { query: cleanQuery };
  if (options?.location) payload.location = options.location;
  if (options?.budget) payload.budget = options.budget;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    "x-api-key": FLOATE_SEARCH_API_KEY
  };

  // 1. Primary: GET ${NEXT_PUBLIC_FLOATE_API_URL}/api/search?q={query}&location={location}
  try {
    const locParam = options?.location ? `&location=${encodeURIComponent(options.location)}` : "";
    const targetGetUrl = `${RENDER_BACKEND_URL}/api/search?q=${encodeURIComponent(cleanQuery)}${locParam}`;
    let res = await fetch(targetGetUrl, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "x-api-key": FLOATE_SEARCH_API_KEY
      },
      signal: options?.signal
    });

    // Fallback to POST if GET fails or returns non-200
    if (!res.ok) {
      res = await fetch(`${RENDER_BACKEND_URL}/api/search`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: options?.signal
      });
    }

    if (res.ok) {
      const data = await res.json();
      const normalized = normalizeBackendSearchResponse(cleanQuery, data);
      searchMemoryCache.set(cacheKey, { data: normalized, timestamp: Date.now() });
      return normalized;
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw err;
    }
    console.warn("[SearchService] Direct Render backend fetch issue, trying local proxy:", err?.message);
  }

  // 2. Fallback: Local or Vercel serverless proxy route /api/search
  try {
    const proxyRes = await fetch("/api/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload),
      signal: options?.signal
    });

    if (proxyRes.ok) {
      const proxyData = await proxyRes.json();
      const actualData = proxyData.data || proxyData;
      const normalized = normalizeBackendSearchResponse(cleanQuery, actualData);
      searchMemoryCache.set(cacheKey, { data: normalized, timestamp: Date.now() });
      return normalized;
    }
  } catch (proxyErr: any) {
    if (proxyErr?.name === "AbortError") {
      throw proxyErr;
    }
    console.warn("[SearchService] Local proxy search failed:", proxyErr?.message);
  }

  // 3. Graceful fallback on complete network failure
  return {
    success: false,
    query: cleanQuery,
    totalMatches: 0,
    results: [],
    spotlightMatches: [],
    regularMatches: [],
    error: "Failed to connect to search service"
  };
}

/**
 * Normalizes backend responses from various search return shapes into a consistent format.
 */
function normalizeBackendSearchResponse(query: string, rawData: any): SearchBackendResult {
  const payload = rawData?.data || rawData || {};
  const rawList: any[] = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload.products)
    ? payload.products
    : Array.isArray(payload)
    ? payload
    : [];
  const rawProducts: Product[] = Array.isArray(payload.products)
    ? payload.products
    : Array.isArray(payload.productMatches)
    ? payload.productMatches
    : Array.isArray(payload.matchedProducts)
    ? payload.matchedProducts
    : [];
  const merchantRecommendations: Vendor[] = Array.isArray(payload.merchantRecommendations)
    ? payload.merchantRecommendations
    : Array.isArray(payload.vendorRecommendations)
    ? payload.vendorRecommendations
    : Array.isArray(payload.categoryVendors)
    ? payload.categoryVendors
    : Array.isArray(payload.recommendedMerchants)
    ? payload.recommendedMerchants
    : [];

  const rawSpotlights: any[] = Array.isArray(payload.spotlightMatches) && payload.spotlightMatches.length > 0
    ? payload.spotlightMatches
    : Array.isArray(payload.spotlightListings) && payload.spotlightListings.length > 0
    ? payload.spotlightListings
    : rawList.slice(0, 3);

  const rawRegulars: any[] = Array.isArray(payload.regularMatches) && payload.regularMatches.length > 0
    ? payload.regularMatches
    : Array.isArray(payload.organicListings) && payload.organicListings.length > 0
    ? payload.organicListings
    : rawList.slice(3);

  const totalMatches = typeof payload.totalMatches === "number"
    ? payload.totalMatches
    : rawList.length;

  return {
    success: true,
    query,
    totalMatches,
    results: rawList,
    spotlightMatches: rawSpotlights,
    regularMatches: rawRegulars,
    exactMatches: payload.exactMatches || rawSpotlights,
    categoryMatches: payload.categoryMatches || rawRegulars,
    merchants: payload.merchants || payload.matchingVendors || [],
    merchantRecommendations,
    products: rawProducts,
    criteria: payload.criteria,
    hasPriceFilter: Boolean(payload.hasPriceFilter),
    hasExactMatch: Boolean(payload.hasExactMatch),
    exactMatchesCount: Number(payload.exactMatchesCount || 0)
  };
}
