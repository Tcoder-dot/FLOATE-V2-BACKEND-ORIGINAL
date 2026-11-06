import { Product } from "../types/floate";

const WISHLIST_KEY = "floate_saved_products";
const WISHLIST_DATA_KEY = "floate_saved_products_data";
const WISHLIST_EVENT = "floate_wishlist_updated";

/**
 * Get saved product IDs from localStorage
 */
export function getWishlistIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Failed to read wishlist IDs from localStorage", e);
    return [];
  }
}

/**
 * Get all saved full Product objects from localStorage
 */
export function getWishlistProducts(): Product[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WISHLIST_DATA_KEY);
    const map: Record<string, Product> = raw ? JSON.parse(raw) : {};
    const ids = getWishlistIds();
    return ids.map((id) => map[id]).filter(Boolean);
  } catch (e) {
    console.error("Failed to read wishlist products from localStorage", e);
    return [];
  }
}

/**
 * Check if a product ID is in the wishlist
 */
export function isInWishlist(productId: string): boolean {
  if (!productId) return false;
  const ids = getWishlistIds();
  return ids.includes(productId);
}

/**
 * Toggle a product in/out of the wishlist
 * Returns true if now saved, false if removed.
 */
export function toggleWishlist(product: Product): boolean {
  if (!product || !product.id) return false;

  const ids = getWishlistIds();
  const exists = ids.includes(product.id);

  let updatedIds: string[];
  let updatedDataMap: Record<string, Product> = {};

  try {
    const rawData = localStorage.getItem(WISHLIST_DATA_KEY);
    if (rawData) updatedDataMap = JSON.parse(rawData);
  } catch (e) {}

  if (exists) {
    updatedIds = ids.filter((id) => id !== product.id);
    delete updatedDataMap[product.id];
  } else {
    updatedIds = [product.id, ...ids.filter((id) => id !== product.id)];
    updatedDataMap[product.id] = product;
  }

  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updatedIds));
    localStorage.setItem(WISHLIST_DATA_KEY, JSON.stringify(updatedDataMap));
  } catch (e) {
    console.error("Failed to save wishlist to localStorage", e);
  }

  notifyWishlistChange();
  return !exists;
}

/**
 * Remove an item from the wishlist by ID
 */
export function removeFromWishlist(productId: string): void {
  if (!productId) return;
  const ids = getWishlistIds();
  const updatedIds = ids.filter((id) => id !== productId);

  let updatedDataMap: Record<string, Product> = {};
  try {
    const rawData = localStorage.getItem(WISHLIST_DATA_KEY);
    if (rawData) {
      updatedDataMap = JSON.parse(rawData);
      delete updatedDataMap[productId];
    }
  } catch (e) {}

  try {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(updatedIds));
    localStorage.setItem(WISHLIST_DATA_KEY, JSON.stringify(updatedDataMap));
  } catch (e) {}

  notifyWishlistChange();
}

/**
 * Subscribe to wishlist updates
 */
export function subscribeWishlist(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handler = () => callback();
  window.addEventListener(WISHLIST_EVENT, handler);
  window.addEventListener("storage", handler);

  return () => {
    window.removeEventListener(WISHLIST_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

function notifyWishlistChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WISHLIST_EVENT));
  }
}
