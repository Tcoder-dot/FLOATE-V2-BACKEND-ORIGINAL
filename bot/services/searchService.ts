import { parseShoppingQuery, ParsedCommerceQuery } from './aiService.js';
import { sheetsDb, BusinessListing, isSpotlightBusiness } from './sheetsService.js';
import { meilisearchClient } from './meilisearchService.js';
import { redisClient } from './redisService.js';
import { getPublicSiteUrl, buildMerchantProfileUrl } from '../../config/siteUrls.js';

export interface SearchInput {
  query: string;
  location?: string;
  budget?: string;
}

export interface MatchedVendorResult {
  id: string;
  businessName: string;
  product: string;
  price: string;
  location: string;
  city?: string;
  state?: string;
  phone?: string;
  whatsapp?: string;
  webStoreUrl: string;
  whatsappChatUrl: string;
  isVerified: boolean;
  isHighlyRecommended?: boolean;
  verifiedStatus: 'YES' | 'PENDING';
  category: string;
  listingType: string;
  telegramDeepLink: string;
  whatsappDeepLink?: string;
  continueUrl: string;
  profileImageUrl?: string;
  productImages?: string[];
  identityVerified?: boolean;
  isVerifiedPlus?: boolean;
  isBoosted?: boolean;
}

export interface SearchExecutionResponse {
  query: string;
  parsed: ParsedCommerceQuery;
  exactMatches: MatchedVendorResult[];
  categoryMatches: MatchedVendorResult[];
  spotlightListings: MatchedVendorResult[];
  organicListings: MatchedVendorResult[];
  results: MatchedVendorResult[];
  outOfAreaRecommendations?: MatchedVendorResult[];
  totalMatches: number;
  moreBusinessesDeepLink: string;
  moreBusinessesWhatsAppDeepLink?: string;
}

/**
 * Creates a valid, URL-safe Telegram start payload and full deep link for search requests.
 * Telegram payloads must be 1-64 characters matching [a-zA-Z0-9_-].
 */
export function generateMoreBusinessesDeepLink(query: string, location?: string): string {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Floatebusinessbot';
  const cleanQ = (query || '').trim().toLowerCase();
  const cleanLoc = (location || '').trim().toLowerCase();

  let rawSlug = cleanQ.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (cleanLoc) {
    const locSlug = cleanLoc.replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (locSlug) {
      rawSlug = `${rawSlug}_in_${locSlug}`;
    }
  }

  // If slug fits neatly within Telegram's 64-char limit, use human-readable search_<slug>
  const fullSlug = `search_${rawSlug}`.substring(0, 64);
  if (rawSlug.length > 0 && fullSlug.length <= 64) {
    return `https://t.me/${botUsername}?start=${fullSlug}`;
  }

  // Fallback: base64url encoding
  try {
    const jsonStr = JSON.stringify({ q: cleanQ.substring(0, 30), l: cleanLoc ? cleanLoc.substring(0, 15) : undefined });
    const b64 = Buffer.from(jsonStr).toString('base64url').substring(0, 60);
    return `https://t.me/${botUsername}?start=s_${b64}`;
  } catch {
    return `https://t.me/${botUsername}?start=search_${rawSlug.substring(0, 55)}`;
  }
}

/**
 * Decodes a Telegram /start search deep link payload back into query and location
 */
export function parseSearchDeepLinkPayload(payload: string): { query: string; location?: string } {
  if (!payload) return { query: '' };

  const trimmed = payload.trim();

  // 1. Check base64 encoded payload: s_<base64url> or q_<base64url>
  if (trimmed.startsWith('s_') || trimmed.startsWith('q_')) {
    const b64 = trimmed.substring(2);
    try {
      const decoded = Buffer.from(b64, 'base64url').toString('utf8');
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const obj = JSON.parse(decoded);
        return {
          query: obj.q || '',
          location: obj.l || undefined,
        };
      } else if (decoded) {
        return { query: decoded };
      }
    } catch {
      // Fall through to slug handling if base64 decoding fails
    }
  }

  // 2. Standard slug format: search_<query> or find_<query> or more_<query>
  let cleanSlug = trimmed.replace(/^(search_|find_|more_|s_|q_)/, '');

  let location: string | undefined;
  if (cleanSlug.includes('_in_')) {
    const parts = cleanSlug.split('_in_');
    cleanSlug = parts[0] || '';
    const locPart = parts.slice(1).join(' ').replace(/_+/g, ' ').trim();
    if (locPart) location = locPart;
  }

  const query = cleanSlug.replace(/_+/g, ' ').trim();
  return { query, location };
}

function formatResultItem(listing: BusinessListing): MatchedVendorResult {
  const rawPhone = listing.whatsapp || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const city = listing.city || '';
  const state = listing.state || '';
  const locationStr = [city, state].filter(Boolean).join(', ') || 'Nigeria';
  const listingId = listing.id || cleanPhone;
  const businessName = listing.businessName || 'Verified Merchant';
  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'Floatebusinessbot';
  const deepLink = `https://t.me/${botUsername}?start=connect_${slug}`;

  const floateWaMeLink = process.env.WHATSAPP_DIRECT_LINK || 'https://wa.me/message/YYWEZAZZIXBRF1';
  const waDeepLink = `${floateWaMeLink}?text=CONNECT_VENDOR_${encodeURIComponent(listingId)}`;

  const webStoreUrl = buildMerchantProfileUrl(businessName || cleanPhone);

  let waDigits = cleanPhone;
  if (waDigits.startsWith('0')) {
    waDigits = '234' + waDigits.slice(1);
  } else if (!waDigits.startsWith('234') && waDigits.length <= 10) {
    waDigits = '234' + waDigits;
  }
  const whatsappChatUrl = `https://wa.me/${waDigits}?text=${encodeURIComponent(`HI ${businessName.toUpperCase()}, I found you on FLOATE.`)}`;

  return {
    id: listingId,
    businessName,
    product: listing.product || '',
    price: listing.price || 'Negotiable',
    location: locationStr,
    city,
    state,
    phone: cleanPhone,
    whatsapp: cleanPhone,
    webStoreUrl,
    whatsappChatUrl,
    isVerified: Boolean(listing.isVerified || listing.verifiedStatus === 'YES'),
    isHighlyRecommended: Boolean(listing.isHighlyRecommended || isSpotlightBusiness(businessName)),
    verifiedStatus: listing.verifiedStatus || 'YES',
    category: listing.category || 'General',
    listingType: listing.listingType || 'Product',
    telegramDeepLink: deepLink,
    whatsappDeepLink: waDeepLink,
    continueUrl: webStoreUrl,
    profileImageUrl: listing.profileImageUrl || undefined,
    productImages: listing.productImages && listing.productImages.length > 0 ? listing.productImages : undefined,
    identityVerified: Boolean(listing.identityVerified),
    isVerifiedPlus: Boolean(listing.isVerifiedPlus),
    isBoosted: Boolean(listing.isBoosted),
  };
}

/**
 * Central shared search function for both Telegram Bot and External Web API (floate.xyz)
 */
export async function executeSearch(input: SearchInput): Promise<SearchExecutionResponse> {
  const rawQuery = (input.query || '').trim();
  if (!rawQuery) {
    return {
      query: '',
      parsed: { searchKeywords: '', isRegistrationRequest: false },
      exactMatches: [],
      categoryMatches: [],
      spotlightListings: [],
      organicListings: [],
      results: [],
      totalMatches: 0,
      moreBusinessesDeepLink: generateMoreBusinessesDeepLink(''),
    };
  }

  // 1. AI Parsing with Gemini
  let parsed: ParsedCommerceQuery;
  try {
    parsed = await parseShoppingQuery(rawQuery);
  } catch (err: any) {
    console.warn('[SearchService] parseShoppingQuery fallback:', err?.message || err);
    parsed = { searchKeywords: rawQuery, isRegistrationRequest: false };
  }

  // Apply explicit overrides from input if provided
  if (input.location) parsed.targetSellerLocation = input.location;

  // 2. Ultra-Fast Search Lookup (Meilisearch + Sheets fallback)
  const searchKeywords = parsed.searchKeywords || rawQuery;
  let searchResults;

  // Check Meilisearch cluster if available
  let meiliHits: BusinessListing[] | null = null;
  if (meilisearchClient.isAvailable()) {
    meiliHits = await meilisearchClient.search(searchKeywords, {
      location: parsed.targetSellerLocation || undefined,
      category: parsed.category || undefined,
    });
  }

  if (meiliHits && meiliHits.length > 0) {
    searchResults = {
      exactMatches: meiliHits.slice(0, 5),
      categoryMatches: meiliHits.slice(5),
      allMatches: meiliHits,
      source: 'local' as const,
    };
  } else {
    try {
      searchResults = await sheetsDb.searchBusinessListings(
        searchKeywords,
        parsed.targetSellerLocation,
        parsed.category,
        parsed.maxPriceNaira,
        parsed.inferredCategories
      );
    } catch (searchErr: any) {
      console.error('[SearchService] Search execution error:', searchErr?.message || searchErr);
      searchResults = { exactMatches: [], categoryMatches: [], allMatches: [], source: 'local' as const };
    }
  }

  // 3. Transform into clean standardized results
  const exactMatches = searchResults.exactMatches.map(formatResultItem);
  const categoryMatches = searchResults.categoryMatches.map(formatResultItem);
  const outOfAreaRecommendations = (searchResults.outOfAreaRecommendations || []).map(formatResultItem);

  // Combine exact matches and category matches without duplicates
  const seenIds = new Set<string>();
  const combinedResults: MatchedVendorResult[] = [];

  for (const match of exactMatches) {
    if (!seenIds.has(match.id)) {
      seenIds.add(match.id);
      combinedResults.push(match);
    }
  }

  for (const match of categoryMatches) {
    if (!seenIds.has(match.id)) {
      seenIds.add(match.id);
      combinedResults.push(match);
    }
  }

  // Also include out-of-area / nationwide delivery merchants who stock the item so buyers always see verified merchants
  for (const match of outOfAreaRecommendations) {
    if (!seenIds.has(match.id)) {
      seenIds.add(match.id);
      combinedResults.push(match);
    }
  }

  // 4. Partition into Spotlight (Priority / Recommended) and Organic listings
  const spotlightListings: MatchedVendorResult[] = [];
  const spotlightIds = new Set<string>();

  // A. Include spotlight businesses that legitimately matched the search query / category
  // Prioritize: Verified Plus (+25 match priority) & Boosted Products, followed by Recommended merchants
  for (const item of combinedResults) {
    if ((item.isHighlyRecommended || item.isVerifiedPlus || item.isBoosted) && !spotlightIds.has(item.id)) {
      spotlightIds.add(item.id);
      spotlightListings.push(item);
    }
  }

  // Sort spotlight so Verified Plus and Boosted products appear first
  spotlightListings.sort((a, b) => {
    const aScore = (a.isVerifiedPlus ? 30 : 0) + (a.isBoosted ? 20 : 0) + (a.isHighlyRecommended ? 10 : 0);
    const bScore = (b.isVerifiedPlus ? 30 : 0) + (b.isBoosted ? 20 : 0) + (b.isHighlyRecommended ? 10 : 0);
    return bScore - aScore;
  });

  const spotlightNames = new Set(spotlightListings.map((s) => s.businessName.toLowerCase().trim()));
  const organicListings = combinedResults.filter(
    (r) => !r.isHighlyRecommended && !r.isVerifiedPlus && !r.isBoosted && !spotlightIds.has(r.id) && !spotlightNames.has(r.businessName.toLowerCase().trim())
  );

  const moreBusinessesDeepLink = generateMoreBusinessesDeepLink(rawQuery, input.location || parsed.targetSellerLocation);
  const floateWaMeLink = process.env.WHATSAPP_DIRECT_LINK || 'https://wa.me/message/YYWEZAZZIXBRF1';
  const moreBusinessesWhatsAppDeepLink = `${floateWaMeLink}?text=SEARCH_${encodeURIComponent(rawQuery.toLowerCase().replace(/[^a-z0-9]+/g, '_'))}`;

  return {
    query: rawQuery,
    parsed,
    exactMatches,
    categoryMatches,
    spotlightListings,
    organicListings,
    results: combinedResults,
    outOfAreaRecommendations,
    totalMatches: combinedResults.length,
    moreBusinessesDeepLink,
    moreBusinessesWhatsAppDeepLink,
  };
}
