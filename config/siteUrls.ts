/**
 * Single Source of Truth for all frontend / public URLs across Floate OS.
 * Reads safely in both Node.js server and Vite browser environments.
 */
export function getPublicSiteUrl(): string {
  let envUrl: string | undefined;

  // 1. Check Node.js process.env
  if (typeof process !== 'undefined' && process.env) {
    envUrl = process.env.PUBLIC_SITE_URL || process.env.FRONTEND_URL || process.env.VITE_PUBLIC_SITE_URL;
  }

  // 2. Check Vite import.meta.env
  if (!envUrl && typeof import.meta !== 'undefined' && (import.meta as any).env) {
    const metaEnv = (import.meta as any).env;
    envUrl = metaEnv.VITE_PUBLIC_SITE_URL || metaEnv.PUBLIC_SITE_URL;
  }

  // 3. Check browser window location
  if (!envUrl && typeof window !== 'undefined' && window.location && window.location.origin) {
    envUrl = window.location.origin;
  }

  if (!envUrl || typeof envUrl !== 'string' || !envUrl.trim().startsWith('http')) {
    return 'https://www.floate.xyz';
  }

  return envUrl.trim().replace(/\/+$/, '');
}

/**
 * Startup assertion to enforce the single source of truth at process boot
 */
export function assertPublicSiteUrl(): string {
  const url = getPublicSiteUrl();
  console.log(`[Public Site URL] ✅ Single source of truth active: ${url}`);
  return url;
}

/**
 * Clean slug generation for merchant business names
 * e.g. "Rich Build" -> "richbuild" (or "rich-build")
 */
export function slugifyBusinessName(businessName?: string): string {
  if (!businessName) return '';
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Compact slug generation (no spaces or hyphens)
 * e.g. "Rich Build" -> "richbuild"
 */
export function compactBusinessName(businessName?: string): string {
  if (!businessName) return '';
  return businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Canonical merchant profile URL builder
 * Generates: https://floate.xyz/vendor/:slug (or :phone if no business name)
 */
export function buildMerchantProfileUrl(
  merchantOrIdentifier: { businessName?: string; whatsapp?: string; phone?: string; slug?: string } | string
): string {
  const base = getPublicSiteUrl();
  if (typeof merchantOrIdentifier === 'string') {
    const raw = merchantOrIdentifier.trim();
    const isPureDigits = /^\+?\d+$/.test(raw);
    if (isPureDigits) {
      const cleanPhone = raw.replace(/\D/g, '');
      const canonicalPhone = cleanPhone.startsWith('0') ? `234${cleanPhone.slice(1)}` : cleanPhone;
      return `${base}/vendor/${canonicalPhone}`;
    }
    const cleanSlug = slugifyBusinessName(raw) || raw;
    return `${base}/vendor/${cleanSlug}`;
  }

  const cleanSlug = merchantOrIdentifier.slug || slugifyBusinessName(merchantOrIdentifier.businessName);
  if (cleanSlug) {
    return `${base}/vendor/${cleanSlug}`;
  }

  const rawPhone = merchantOrIdentifier.whatsapp || merchantOrIdentifier.phone || '';
  const digits = rawPhone.replace(/\D/g, '');
  const canonicalPhone = digits.startsWith('0') ? `234${digits.slice(1)}` : digits;
  return `${base}/vendor/${canonicalPhone || 'verified-store'}`;
}

/**
 * Canonical product permalink URL with both merchant and product identity.
 * Generates: https://www.floate.xyz/p/:merchantSlug/:productId
 */
export function buildProductUrl(productId: string, merchantIdentifier: string): string {
  const base = getPublicSiteUrl();
  const merchantSlug = slugifyBusinessName(merchantIdentifier) || merchantIdentifier.trim();
  return `${base}/p/${encodeURIComponent(merchantSlug)}/${encodeURIComponent(productId)}`;
}

/**
 * Canonical merchant registration URL
 * Generates: https://floate.xyz/register?...
 */
export function buildRegisterUrl(params?: Record<string, string>): string {
  const base = getPublicSiteUrl();
  if (!params || Object.keys(params).length === 0) {
    return `${base}/register`;
  }
  const cleanParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      cleanParams[k] = String(v);
    }
  }
  const qs = new URLSearchParams(cleanParams).toString();
  return qs ? `${base}/register?${qs}` : `${base}/register`;
}

/**
 * Canonical checkout URL (with order bound params)
 * Generates: https://floate.xyz/checkout?orderId=...
 */
export function buildCheckoutUrl(params: { orderId?: string; waToken?: string; [key: string]: any }): string {
  const base = getPublicSiteUrl();
  const cleanParams: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      cleanParams[k] = String(v);
    }
  }
  const qs = new URLSearchParams(cleanParams).toString();
  return `${base}/checkout?${qs}`;
}

/**
 * Canonical certificate download URL
 * Generates: https://floate.xyz/certificate/:phoneOrSlug
 */
export function buildCertificateDownloadUrl(phoneOrSlug: string): string {
  const base = getPublicSiteUrl();
  const clean = phoneOrSlug.trim();
  const isPureDigits = /^\+?\d+$/.test(clean);
  const identifier = isPureDigits ? clean.replace(/\D/g, '') : slugifyBusinessName(clean) || clean;
  return `${base}/certificate/${encodeURIComponent(identifier)}`;
}
