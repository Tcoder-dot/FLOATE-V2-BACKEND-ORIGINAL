import { Product } from "../types/floate";

const RECENT_PRODUCTS_KEY = "floate_pwa_offline_recent_products";
const RECENT_QUERIES_KEY = "floate_pwa_offline_recent_queries";

export interface RecentSearchEntry {
  query: string;
  city: string;
  timestamp: number;
  sampleItems: Product[];
}

/**
  * Save a product that was viewed or searched for offline access
  */
export function saveRecentProduct(product: Product): void {
  if (!product || !product.id) return;
  try {
    const existing = getRecentProducts();
    // Filter out duplicate
    const filtered = existing.filter((p) => p.id !== product.id);
    // Unshift to top
    const updated = [product, ...filtered].slice(0, 30);
    localStorage.setItem(RECENT_PRODUCTS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save recent product to PWA storage:", err);
  }
}

/**
  * Retrieve all recently searched/viewed products stored locally
  */
export function getRecentProducts(): Product[] {
  try {
    const raw = localStorage.getItem(RECENT_PRODUCTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Product[];
  } catch (err) {
    console.warn("Failed to parse recent products from PWA storage:", err);
    return [];
  }
}

/**
  * Save a search query along with its returned items for offline viewing
  */
export function saveRecentSearchQuery(query: string, city: string, items: Product[]): void {
  if (!query || query.trim().length === 0) return;
  try {
    const cleanQuery = query.trim();
    // Also save individual products
    items.forEach((p) => saveRecentProduct(p));

    const existingQueries = getRecentSearchQueries();
    const filtered = existingQueries.filter(
      (q) => q.query.toLowerCase() !== cleanQuery.toLowerCase() || q.city.toLowerCase() !== city.toLowerCase()
    );

    const newEntry: RecentSearchEntry = {
      query: cleanQuery,
      city,
      timestamp: Date.now(),
      sampleItems: items.slice(0, 8)
    };

    const updated = [newEntry, ...filtered].slice(0, 15);
    localStorage.setItem(RECENT_QUERIES_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save search query to PWA storage:", err);
  }
}

/**
  * Get all saved offline search queries
  */
export function getRecentSearchQueries(): RecentSearchEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_QUERIES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentSearchEntry[];
  } catch (err) {
    console.warn("Failed to parse recent queries from PWA storage:", err);
    return [];
  }
}
