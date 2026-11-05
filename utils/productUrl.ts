import { createMerchantSlug } from "./merchantSlug";

export function buildProductPath(productId: string, merchantNameOrSlug: string): string {
  const merchantSlug = createMerchantSlug(merchantNameOrSlug) || merchantNameOrSlug;
  return `/p/${encodeURIComponent(merchantSlug)}/${encodeURIComponent(productId)}`;
}

export function buildProductUrl(productId: string, merchantNameOrSlug: string): string {
  return `https://www.floate.xyz${buildProductPath(productId, merchantNameOrSlug)}`;
}
