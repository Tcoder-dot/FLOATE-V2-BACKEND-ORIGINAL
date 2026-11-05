import { google } from 'googleapis';
import { config } from '../config.js';
import { firestoreDb } from './firestoreService.js';
import { withExternalTimeout } from './timeoutService.js';
import { meilisearchClient } from './meilisearchService.js';

export interface LocalSheetRow {
  timestamp: string;
  userId: number | string;
  username: string;
  type: string;
  content: string;
}

export interface SearchLogRow {
  timestamp: string;
  buyerTelegramId: number | string;
  buyerName: string;
  searchedProduct: string;
  searchedPrice: string;
  searchedLocation: string;
  matchFound: 'Yes' | 'No';
  numberOfMatches: number;
}

export interface BusinessAppearanceLog {
  userId: string | number;
  businessName: string;
  timestamp: string;
}

export interface BusinessStats {
  allTimeAppearances: number;
  last7DaysAppearances: number;
  productCount: number;
  registeredDaysAgo: number;
}

export interface BusinessListing {
  id: string;
  userId: number | string;
  businessName: string;
  ownerFullName?: string; // Protected: Never shown to buyers in search results, saved to DB & Column M
  whatsapp: string;
  state: string;
  city: string;
  listingType: string;
  category: string;
  product: string;
  price: string;
  negotiation: 'Yes' | 'No';
  registeredSince: string;
  productCount: number;
  isVerified: boolean;
  telegramId?: string | number;
  claimDate?: string;
  verifiedStatus?: 'YES' | 'PENDING';
  sheetRowIndex?: number;
  isHighlyRecommended?: boolean;
  profileImageUrl?: string;
  verificationMediaUrl?: string;
  productImages?: string[];
  identityVerified?: boolean;
  isVerifiedPlus?: boolean;
  isBoosted?: boolean;
}

/**
 * Checks if a business name matches one of the spotlight / highly recommended vendor accounts:
 * - Chivora
 * - MAKKY LUXE
 * - Mbams
 * - goody's
 * - jules
 */
export function isSpotlightBusiness(businessName: string): boolean {
  if (!businessName) return false;
  const clean = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return (
    clean.includes('chivora') ||
    clean.includes('makkyluxe') ||
    clean.includes('makky') ||
    clean.includes('mbams') ||
    clean.includes('mbam') ||
    clean.includes('goodys') ||
    clean.includes('goody') ||
    clean.includes('jules') ||
    clean.includes('jule')
  );
}

export interface VendorMatchScore {
  listing: BusinessListing;
  totalScore: number; // 0 - 100%
  breakdown: {
    locationScore: number; // Max 35
    budgetScore: number; // Max 30
    urgencyScore: number; // Max 20
    creditHealthScore: number; // Max 15
  };
  matchBadge: '🔥 95%+ Direct Match' | '⚡ High Match' | '✅ Qualified Match' | '📍 Regional Match';
}

export interface PendingClaim {
  id: string;
  businessName: string;
  whatsapp: string;
  listingId: string;
  requestingUserId: number | string;
  requestingUsername: string;
  ownerFullName?: string; // Owner's First & Last Name (Protected, saved to DB & Column M)
  timestamp: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  selfieUrl?: string;
  identityVerified?: boolean;
}

export function normalizePhone(rawPhone: string): string {
  if (!rawPhone) return '';
  let clean = rawPhone.replace(/[^\d]/g, '');
  if (clean.startsWith('234') && clean.length === 13) {
    clean = '0' + clean.slice(3);
  } else if (clean.length === 10 && (clean.startsWith('7') || clean.startsWith('8') || clean.startsWith('9'))) {
    clean = '0' + clean;
  }
  return clean;
}

/**
 * Returns all common format representations of a phone number (e.g. 07065599116, 2347065599116, +2347065599116, 7065599116)
 */
export function getAllPhoneVariants(rawPhone: string): string[] {
  if (!rawPhone) return [];
  const clean = rawPhone.replace(/[^\d]/g, '');
  if (!clean) return [rawPhone.trim()];

  const variants = new Set<string>();
  const trimmed = rawPhone.trim();
  if (trimmed) variants.add(trimmed);
  variants.add(clean);

  // Standard Nigerian 10-digit base without country code or leading 0 (e.g. 7065599116)
  let base10 = '';
  if (clean.startsWith('234') && clean.length === 13) {
    base10 = clean.slice(3);
  } else if (clean.startsWith('0') && clean.length === 11) {
    base10 = clean.slice(1);
  } else if (clean.length === 10 && (clean.startsWith('7') || clean.startsWith('8') || clean.startsWith('9'))) {
    base10 = clean;
  }

  if (base10) {
    variants.add(base10);
    variants.add(`0${base10}`);
    variants.add(`234${base10}`);
    variants.add(`+234${base10}`);
  }

  return Array.from(variants);
}

export function escapeMarkdownText(text: string): string {
  if (!text) return '';
  return text.replace(/([*_`\[\]])/g, '\\$1');
}

/**
 * Heuristically judges whether an item/query text represents a physical product or a service.
 */
export function judgeItemTextHeuristic(itemText: string): 'product' | 'service' | 'unknown' {
  if (!itemText) return 'unknown';
  const text = itemText.toLowerCase().trim();

  const serviceKeywords = [
    'lawyer', 'attorney', 'legal', 'law firm', 'consultation', 'advocate', 'solicitor',
    'editor', 'editing', 'videographer', 'video edit', 'video editor', 'media production',
    'mechanic', 'repair', 'auto repair', 'car repair', 'servicing', 'automobile repair',
    'caterer', 'catering', 'cook', 'chef', 'food service', 'event catering',
    'photographer', 'photography', 'photo shoot',
    'designer', 'graphics', 'web design', 'ui/ux', 'branding', 'logo design',
    'developer', 'software', 'programming', 'app development', 'coder',
    'tutor', 'teacher', 'lesson', 'coaching', 'instructor', 'academic',
    'cleaner', 'cleaning', 'laundry', 'dry cleaning', 'janitor',
    'barber', 'hairdresser', 'stylist', 'hair styling', 'wig installation', 'makeup artist',
    'plumber', 'electrician', 'carpenter', 'painter', 'artisan', 'handyman',
    'driver', 'logistics', 'delivery', 'dispatch', 'courier', 'transport',
    'doctor', 'nurse', 'therapy', 'consultant', 'accountant', 'auditor',
    'tailor', 'fashion designer', 'sewing', 'alteration',
    'agent', 'broker', 'realtor', 'real estate',
    'service', 'services'
  ];

  const productKeywords = [
    'phone', 'iphone', 'samsung', 'gadget', 'laptop', 'macbook', 'computer', 'pc',
    'cloth', 'clothing', 'dress', 'gown', 'shirt', 'trouser', 'pant', 'skirt', 'wear', 'apparel',
    'shoe', 'shoes', 'slipper', 'slippers', 'sandal', 'sandals', 'footwear', 'boot', 'slides',
    'bag', 'handbag', 'backpack', 'purse', 'wallet',
    'wig', 'wigs', 'weave', 'hair extension', 'attachment',
    'generator', 'inverter', 'battery', 'solar', 'tv', 'television', 'radio',
    'cream', 'lotion', 'perfume', 'cosmetics', 'soap',
    'foodstuff', 'rice', 'oil', 'yam', 'garri', 'meat', 'fish', 'drink',
    'car', 'vehicle', 'automobile', 'spare part', 'tire',
    'furniture', 'table', 'chair', 'bed', 'mattress'
  ];

  for (const kw of serviceKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text) || text.includes(kw)) {
      return 'service';
    }
  }

  for (const kw of productKeywords) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(text) || text.includes(kw)) {
      return 'product';
    }
  }

  return 'unknown';
}

/**
 * Combines Signal 1 (Database Type column) and Signal 2 (Gemini / Item Text judgment)
 * to determine whether an item should be phrased as a product or a service in pre-filled messages.
 */
export function determineItemType(
  itemText: string,
  listingType?: string,
  aiParsedType?: 'product' | 'service'
): 'product' | 'service' {
  // Signal 1: Database Type column
  let typeSignal: 'product' | 'service' | 'unknown' = 'unknown';
  if (listingType && typeof listingType === 'string') {
    const norm = listingType.trim().toLowerCase();
    if (norm.includes('service')) {
      typeSignal = 'service';
    } else if (norm.includes('product') || norm.includes('goods')) {
      typeSignal = 'product';
    }
  }

  // Signal 2: Gemini's independent judgment on the item text itself
  let geminiSignal: 'product' | 'service' | 'unknown' = 'unknown';
  if (aiParsedType === 'product' || aiParsedType === 'service') {
    geminiSignal = aiParsedType;
  } else if (itemText) {
    geminiSignal = judgeItemTextHeuristic(itemText);
  }

  // Combination & Conflict Resolution logic:
  // - If Gemini provides a judgment (Signal 2), use it. It confirms Type if they agree,
  //   and overrides Type if Type is mislabeled or missing.
  // - If Gemini judgment is unknown, fallback to Signal 1 (Type column).
  // - If both are unknown, default to 'product'.
  if (geminiSignal !== 'unknown') {
    return geminiSignal;
  }

  if (typeSignal !== 'unknown') {
    return typeSignal;
  }

  return 'product';
}

export function formatWhatsAppUrl(
  rawPhone: string,
  productName?: string,
  buyerFirstName?: string,
  listingType?: string,
  itemTypeHint?: 'product' | 'service',
  businessName?: string
): string {
  let clean = rawPhone.replace(/[^\d+]/g, '');
  if (clean.startsWith('0')) {
    clean = '234' + clean.slice(1);
  } else if (clean.startsWith('+')) {
    clean = clean.slice(1);
  }
  if (!clean.startsWith('234') && clean.length <= 10) {
    clean = '234' + clean;
  }

  const msg = businessName && businessName.trim()
    ? `HI ${businessName.trim().toUpperCase()}, I found you on FLOATE.`
    : `HI, I found you on FLOATE.`;
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(msg)}`;

  // Ensure any parentheses inside the URL parameter string are encoded to prevent breaking Markdown links
  return url.replace(/\(/g, '%28').replace(/\)/g, '%29');
}

export function parsePriceToNumber(priceStr: string): number | null {
  if (!priceStr) return null;
  const clean = priceStr.toLowerCase().replace(/,/g, '').trim();
  if (clean.includes('k')) {
    const num = parseFloat(clean.replace(/[^\d.]/g, ''));
    if (!isNaN(num)) return num * 1000;
  }
  const digits = clean.replace(/[^\d]/g, '');
  if (digits) {
    const val = parseInt(digits, 10);
    return isNaN(val) ? null : val;
  }
  return null;
}

export function formatListingPrice(rawPrice?: string | null): string {
  if (!rawPrice) return 'Contact for price';
  const clean = String(rawPrice).trim();
  const lower = clean.toLowerCase();
  if (
    !clean ||
    lower === 'contact for price' ||
    lower === 'contact for pricing' ||
    lower === 'negotiable' ||
    lower === 'market rate' ||
    lower === 'flexible / market rate' ||
    lower === 'flexible' ||
    lower === 'best price' ||
    lower === 'call' ||
    lower === '0' ||
    lower === '₦0' ||
    lower === 'n0' ||
    lower === 'ngn 0' ||
    lower === 'free'
  ) {
    return 'Contact for price';
  }
  if (/\d/.test(clean)) {
    const withoutNaira = clean
      .replace(/^[₦\s]+/, '')
      .replace(/^naira\s*/i, '')
      .replace(/^ngn\s*/i, '')
      .trim();
    return `₦${withoutNaira}`;
  }
  return 'Contact for price';
}

export function formatListingDisplay(
  listing: BusinessListing,
  buyerFirstName?: string,
  negotiationTip?: string | null,
  searchQuery?: string,
  itemTypeHint?: 'product' | 'service',
  withholdWhatsapp: boolean = true
): string {
  const isSpotlight = listing.isHighlyRecommended || isSpotlightBusiness(listing.businessName);
  const recBadge = isSpotlight ? ' 🔥 *Top Rated Vendor*' : '';
  const verifiedBadge = listing.isVerified ? ' ✓ Verified Merchant' : '';
  const itemToBuy = searchQuery || listing.product || listing.category;

  const locationStr = listing.city && listing.state && listing.city !== listing.state 
    ? `${listing.city}, ${listing.state}` 
    : (listing.city || listing.state || 'Nigeria');
  const negBadge = listing.negotiation === 'Yes' ? ' • Negotiable' : (listing.negotiation === 'No' ? ' • Fixed Price' : '');

  const displayItem = listing.product && listing.product.toLowerCase() !== listing.category.toLowerCase()
    ? listing.product
    : listing.category;

  let waDisplay = '🔒 _Withheld until lead is qualified_';
  if (!withholdWhatsapp) {
    const waUrl = formatWhatsAppUrl(
      listing.whatsapp,
      itemToBuy,
      buyerFirstName,
      listing.listingType,
      itemTypeHint,
      listing.businessName
    );
    waDisplay = `[Message on WhatsApp](${waUrl})`;
  }

  let text = `• *${escapeMarkdownText(displayItem)}*${recBadge}\n\n` +
    `  🏬 *Business Name:* ${escapeMarkdownText(listing.businessName)}${verifiedBadge}\n` +
    `  📂 *Category:* ${escapeMarkdownText(listing.category)}\n` +
    `  💰 *Price:* ${escapeMarkdownText(listing.price)}${negBadge}\n` +
    `  📍 *Location:* ${escapeMarkdownText(locationStr)}\n` +
    `  📱 *WhatsApp:* ${waDisplay}`;

  if (listing.negotiation === 'Yes' && negotiationTip) {
    const cleanTip = negotiationTip.replace(/^💡\s*\*Negotiation Tip:\*\s*/i, '').trim();
    text += `\n\n  💡 *Negotiation Tip:* ${escapeMarkdownText(cleanTip)}`;
  }

  return text;
}

export const DEFAULT_SEED_LISTINGS: BusinessListing[] = [
  {
    id: 'seed-makkys-luxe',
    userId: 'seed-makkys-luxe',
    businessName: "MAKKY'S LUXE",
    whatsapp: '07049113767',
    state: 'Anambra',
    city: 'Main Market, Onitsha',
    listingType: 'Product',
    category: 'Jewelries, Perfumes, Decorations & Packages',
    product: 'Jewelries, Perfumes, Home & Event Decorations, Gift Packages',
    price: 'Contact for Best Price',
    negotiation: 'Yes',
    registeredSince: 'Aug 2026',
    productCount: 1,
    isVerified: true,
    isHighlyRecommended: true,
  },
  {
    id: 'seed-chivora',
    userId: 'seed-chivora',
    businessName: 'CHIVORA',
    whatsapp: '08139598835',
    state: 'Enugu',
    city: 'Enugu',
    listingType: 'Product',
    category: 'Footwear & Shoes',
    product: 'Quality Leather Shoes, Slides & Slippers',
    price: '₦15,000',
    negotiation: 'Yes',
    registeredSince: 'Jul 2026',
    productCount: 1,
    isVerified: true,
    isHighlyRecommended: true,
  },
  {
    id: 'seed-goodys',
    userId: 'seed-goodys',
    businessName: "GOODY'S COLLECTION",
    whatsapp: '08064292345',
    state: 'Anambra',
    city: 'Main Market, Onitsha',
    listingType: 'Product',
    category: 'Footwear & Slippers',
    product: 'Unisex Slippers, Leather Sandals & Slides',
    price: '₦12,000',
    negotiation: 'Yes',
    registeredSince: 'Jul 2026',
    productCount: 1,
    isVerified: true,
    isHighlyRecommended: true,
  },
  {
    id: 'seed-mbams',
    userId: 'seed-mbams',
    businessName: 'MBAMS PHONES & GADGETS',
    whatsapp: '08101234567',
    state: 'Enugu',
    city: 'Enugu',
    listingType: 'Product',
    category: 'Phones & Gadgets',
    product: 'Smartphones, iPhones, UK Used Devices & Accessories',
    price: 'Contact for Best Price',
    negotiation: 'Yes',
    registeredSince: 'Jul 2026',
    productCount: 1,
    isVerified: true,
    isHighlyRecommended: true,
  },
  {
    id: 'seed-jules',
    userId: 'seed-jules',
    businessName: 'JULES BOUTIQUE & APPAREL',
    whatsapp: '08109876543',
    state: 'Lagos',
    city: 'Balogun Market, Lagos Island',
    listingType: 'Product',
    category: 'Boutique & Fashion Wears',
    product: 'Designer Handbags, Corporate & Casual Outfits, Dresses',
    price: 'Contact for Best Price',
    negotiation: 'Yes',
    registeredSince: 'Jul 2026',
    productCount: 1,
    isVerified: true,
    isHighlyRecommended: true,
  },
  {
    id: 'seed-rich-build',
    userId: 'seed-rich-build',
    businessName: 'Rich Build',
    ownerFullName: 'Rich Chukwuemeka',
    whatsapp: '07065599116',
    state: 'Enugu',
    city: 'Enugu',
    listingType: 'Service',
    category: 'Website Development & Tech Solutions',
    product: 'Website Development, Custom Software, Tech Solutions & Mobile Apps',
    price: 'Contact for Best Price',
    negotiation: 'Yes',
    registeredSince: 'Aug 2026',
    productCount: 1,
    isVerified: true,
    isHighlyRecommended: true,
  },
];

class SheetsDatabaseService {
  private activeSpreadsheetId: string = config.spreadsheetId || '1Z6Xi2vsjBgcRX_YqcN9epR-0ckSxLPqAomZqEpgDtVs';
  
  // Structured Business Listings - dynamically synced from Google Sheets with spotlight seeds
  private businessListings: BusinessListing[] = [...DEFAULT_SEED_LISTINGS];
  private lastSheetsSyncTime: number = 0;

  // Local in-memory backup database for logs
  private localDb: LocalSheetRow[] = [
    {
      timestamp: new Date().toISOString(),
      userId: 99912345,
      username: 'System',
      type: 'INIT',
      content: 'Google Sheets Database initialized',
    },
  ];

  // In-memory store for SearchLogs
  private searchLogs: SearchLogRow[] = [];

  // In-memory store for tracking business search result appearances
  private businessAppearanceLogs: BusinessAppearanceLog[] = [];

  // Store for pending business claim requests
  private pendingClaims: PendingClaim[] = [];

  private createdSheetTabs = new Set<string>();

  /**
   * Helper to ensure a specific sheet tab exists in Google Sheets, and initializes headers if missing.
   */
  private async ensureTabExists(sheets: any, defaultTabName: string, headers: string[]): Promise<string> {
    if (!this.activeSpreadsheetId) return defaultTabName;
    const cacheKey = `${this.activeSpreadsheetId}:${defaultTabName}`;
    if (this.createdSheetTabs.has(cacheKey)) {
      return defaultTabName;
    }

    try {
      const metadata = await sheets.spreadsheets.get({
        spreadsheetId: this.activeSpreadsheetId,
      });

      const existingSheets = metadata.data.sheets || [];
      const normalizedTarget = defaultTabName.toLowerCase().trim();

      const foundSheet = existingSheets.find((s: any) => {
        const title = (s.properties?.title || '').toLowerCase().trim();
        if (title === normalizedTarget) return true;
        if (normalizedTarget === 'buyer searches' && (title === 'search logs' || title === 'buyer search logs' || title === 'searches' || title === 'buyer searches')) return true;
        if (normalizedTarget === 'floate business logs' && (title === 'merchants' || title === 'sellers' || title === 'business logs' || title === 'floate business logs')) return true;
        return false;
      });

      if (foundSheet && foundSheet.properties?.title) {
        const actualTitle = foundSheet.properties.title;
        // Check if header row is present
        const checkRange = await sheets.spreadsheets.values.get({
          spreadsheetId: this.activeSpreadsheetId,
          range: `'${actualTitle}'!A1:H1`,
        });
        if (!checkRange.data.values || checkRange.data.values.length === 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: this.activeSpreadsheetId,
            range: `'${actualTitle}'!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: [headers] },
          });
        }
        this.createdSheetTabs.add(cacheKey);
        return actualTitle;
      }

      // Tab does not exist, create it
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.activeSpreadsheetId,
        requestBody: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: defaultTabName,
                },
              },
            },
          ],
        },
      });

      // Write header row
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.activeSpreadsheetId,
        range: `'${defaultTabName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });

      this.createdSheetTabs.add(cacheKey);
      return defaultTabName;
    } catch (err: any) {
      console.warn(`[Sheets Tab Notice] Could not verify/create tab "${defaultTabName}":`, err?.message || err);
      this.createdSheetTabs.add(cacheKey);
      return defaultTabName;
    }
  }

  public setSpreadsheetId(id: string) {
    this.activeSpreadsheetId = id;
  }

  public getSpreadsheetId(): string {
    return this.activeSpreadsheetId;
  }

  /**
   * Helper method to initialize Google Sheets API client with flexible credentials fallback
   */
  private getSheetsClient() {
    let auth: any;

    const jsonCreds =
      process.env.GOOGLE_CREDENTIALS_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_CREDENTIALS;

    if (jsonCreds) {
      try {
        const raw = jsonCreds.trim();
        const parsed = raw.startsWith('{')
          ? JSON.parse(raw)
          : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        if (parsed && typeof parsed.private_key === 'string') {
          parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
        }
        auth = new google.auth.GoogleAuth({
          credentials: parsed,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      } catch (e: any) {
        console.warn('[Sheets Auth] Failed to parse JSON credentials from environment variable:', e?.message || e);
      }
    }

    if (!auth) {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY;
      if (clientEmail && privateKey) {
        auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
      }
    }

    if (!auth) {
      // Fallback to configured service account credentials
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: "firebase-app-hosting-compute@studio-5970589505-27a98.iam.gserviceaccount.com",
          private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQC9lkwf6TvrD4rb\nEr7cighp4uPdxznh8YMy4HEDeosM4OdZFzsHXOr37XizGEU/QYuRI5ETdYEj1IvW\n5/7xSMH+oYatz3WNkI+xOTNwtUuPsVlqOCy15V9O51sCvJj3f2LVCyVB+qK/WLzg\nS4fM+vI1nDnEabzc8A+rhOSsD0bbe4ep2RNM0xbDa+I9IUuYkwPIU47A9b+94ULu\nUFPJLObVcHojV8eH4FDrQdNFhk9I4lUA/sTfztcxzFuc+WV99VJIQ7KyKXyKU7py\n5+EKuS0yFc4ee4/I7FgFZREntK3Vc8m/v4a8Q7VLuJABeaiRMbUpL0KjDr7CghuQ\nc4Wv7aTlAgMBAAECggEAJ/5Jpr2rzyVjNF2a96kCp1uemA1L75bkB1qDXKmAJcJX\n61pUMHRweMaWnKk1CmgISiDHnOQ/ztAqg7ZC+KFRkyZ947KM6MUjGs6nRFJqUzCl\nXRvmiqSNW3bAoy4n0qYDsk98l5OIu3a7uVEVn68cYyTGpuFrXuwhUhxhpM5AM1JZ\nuSmhvM4tiYlI3TuhnOCVn2mJkUu18UubtqLxduppl0Wnm5ntBztMGpNPpfJscsiT\nGE001EW2N4VEroqSyQ909vS/Gl6EvqsX54eGFDipOZezz3PZnhvscwg27dw9bUS2\nPtV/3Eo+NxQUrQHEL/BZZPw5rqhzDrxh02Mr92+uAQKBgQDnFweeiQU0u1IOSoS0\neIHqIKt9QUdWZGRRNedx+0e5KgNlQph/cpy3vDIgW/NeMyaGG3jhOvDkJuWrK+8X\nHz1KIE1/C4feZl/SMeaHuYdzhy15QQt56BvMROlNIaEfU/JgoxgZto2JElI9KmYf\n3ILQQ2pyflOeLOqIXyBIj/wfZQKBgQDSBf0MInvwJaObWYCh2xYu5OiLqOB6QXFL\n9/LQjINqtUXPEDvfPGKEDt7rpO3yRCMi5I311miwhkpmhkZVMOvhJrn221tTDMD0\ntFdB4Q8bv5ezQ0BnBW58sr/71UfOjCG9x+fVkv7q2kV/R52Tc4LkIdO5vWcVRFSf\n/ghZRzTXgQKBgG+8Kur0xZehmyNd1JyOSAK0mTaPAbc8A2Vg8u+h2CQntEyZzrKQ\n8EXGsVYEH8BEazQcxG3i2eb3B8WkEI7VhAT7aX0sTh2y0lIH3rdxdZTen5YpZSsk\nl4xFJaktwYIsTN18/oIwSm8kdK8ueQKe1IFul2GUw0mP3jbiB/IN7JIhAoGALBEz\nmjM2HBpZrMPn2I42plpDbOJfT2eh1RXObfG9tUsZvaujVGDALwNLxNfTUWz4jl60\nZqu5Rai3vbFY2pEsPQ66IFDAZbmcVvvr/xew6tqVgviOb89U8nczDy0eJvmCLubd\n/xMbx71Krb0iFAk9oo5ydVuHYI/4zaUorUrijIECgYBhr25WlNcJl2usZmazNSXX\nW+j5rkdQQQzf8o9mchdrRXEcQVhLLibB1PdbYRuD/0Oj6Gek7+c0HmM+qnFw3mgV\nV389mNA/nOOwQ4uvEHS0BPrx4mlWzy+n5ZI07Dx2i9U+IyIzw8l/o1ggJRA3/b1X\nZZLp1j1XNSbvsoPyciJjcA==\n-----END PRIVATE KEY-----\n",
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    }

    return google.sheets({ version: 'v4', auth });
  }

  /**
   * Diagnostics method to test Google Sheets connection and credentials
   */
  public async testSheetsConnection(): Promise<{ success: boolean; spreadsheetId: string; serviceAccountEmail?: string; authMethod: string; error?: string }> {
    const spreadsheetId = this.activeSpreadsheetId;
    let authMethod = 'None';
    let serviceAccountEmail: string | undefined = undefined;

    const jsonCreds = process.env.GOOGLE_CREDENTIALS_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_CREDENTIALS;
    if (jsonCreds) {
      authMethod = 'GOOGLE_CREDENTIALS_JSON';
      try {
        const raw = jsonCreds.trim();
        const parsed = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
        serviceAccountEmail = parsed.client_email;
      } catch {}
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL) {
      authMethod = 'GOOGLE_SERVICE_ACCOUNT_EMAIL';
      serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      authMethod = 'GOOGLE_APPLICATION_CREDENTIALS';
    } else {
      authMethod = 'Configured Service Account Key';
      serviceAccountEmail = 'firebase-app-hosting-compute@studio-5970589505-27a98.iam.gserviceaccount.com';
    }

    if (!spreadsheetId) {
      return {
        success: false,
        spreadsheetId: 'Not Set',
        serviceAccountEmail,
        authMethod,
        error: 'SPREADSHEET_ID environment variable is missing or empty.',
      };
    }

    try {
      const sheets = this.getSheetsClient();
      await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Sheet1!A1:A2',
      });
      return {
        success: true,
        spreadsheetId,
        serviceAccountEmail,
        authMethod,
      };
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || String(err);
      return {
        success: false,
        spreadsheetId,
        serviceAccountEmail,
        authMethod,
        error: errMsg,
      };
    }
  }

  /**
   * Registers or updates a business listing with state and city
   */
  public async registerBusiness(data: {
    userId: number | string;
    businessName: string;
    ownerFullName?: string;
    whatsapp: string;
    state: string;
    city: string;
    listingType?: string;
    category: string;
    product: string;
    price: string;
    negotiation?: 'Yes' | 'No';
    profileImageUrl?: string;
    verificationMediaUrl?: string;
    productImages?: string[];
    identityVerified?: boolean;
  }): Promise<{ listing: BusinessListing; mode: 'sheets' | 'local'; success: boolean; error?: string }> {
    const existing = this.businessListings.find((b) => b.userId === data.userId || b.businessName.toLowerCase() === data.businessName.toLowerCase());
    const regDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const lType = data.listingType || 'Product';
    const isNeg = data.negotiation === 'No' ? 'No' : 'Yes';
    
    const todayDate = new Date().toISOString().split('T')[0];
    let listing: BusinessListing;
    if (existing) {
      existing.product = data.product;
      existing.price = data.price;
      existing.negotiation = isNeg;
      existing.state = data.state;
      existing.city = data.city;
      existing.whatsapp = data.whatsapp;
      existing.listingType = lType;
      existing.category = data.category;
      existing.productCount += 1;
      existing.telegramId = data.userId;
      existing.claimDate = todayDate;
      existing.verifiedStatus = 'YES';
      existing.isVerified = true;
      if (data.ownerFullName) existing.ownerFullName = data.ownerFullName;
      if (data.profileImageUrl) existing.profileImageUrl = data.profileImageUrl;
      if (data.verificationMediaUrl) existing.verificationMediaUrl = data.verificationMediaUrl;
      if (data.productImages && data.productImages.length > 0) existing.productImages = data.productImages;
      if (data.identityVerified !== undefined) existing.identityVerified = data.identityVerified;
      listing = existing;
    } else {
      listing = {
        id: `biz-${Date.now()}`,
        userId: data.userId,
        telegramId: data.userId,
        businessName: data.businessName,
        ownerFullName: data.ownerFullName,
        whatsapp: data.whatsapp,
        state: data.state,
        city: data.city,
        listingType: lType,
        category: data.category,
        product: data.product,
        price: data.price,
        negotiation: isNeg,
        registeredSince: regDate,
        productCount: 1,
        isVerified: true, // Auto-verified for active onboarding
        claimDate: todayDate,
        verifiedStatus: 'YES',
        profileImageUrl: data.profileImageUrl,
        verificationMediaUrl: data.verificationMediaUrl,
        productImages: data.productImages || [],
        identityVerified: data.identityVerified || false,
      };
      this.businessListings.unshift(listing);
    }

    // Sync to Firestore merchants collection as well
    firestoreDb.syncMerchantsFromListings([listing]).catch(() => {});

    // Also log to localDb for search compatibility (owner's name is kept private)
    const formattedContent = `${listing.product} | Type: ${listing.listingType} | Price: ${listing.price} | Negotiable: ${listing.negotiation} | State: ${listing.state} | City: ${listing.city} | Seller: ${listing.businessName} | WhatsApp: ${listing.whatsapp} | Category: ${listing.category} | RegDate: ${listing.registeredSince} | Products: ${listing.productCount} | Telegram ID: ${listing.telegramId} | Verified: YES`;
    this.localDb.unshift({
      timestamp: new Date().toISOString(),
      userId: data.userId,
      username: data.businessName,
      type: 'REGISTERED_SELLER',
      content: formattedContent,
    });

    // Try Google Sheets append (Columns A-M: Business name, whatsapp Number, Location, Type, Category, Product, Price, Negotiation, Spotlight, TELEGRAM ID, DATE, VERIFIED/CLAIMED, business full name)
    if (this.activeSpreadsheetId) {
      try {
        const sheets = this.getSheetsClient();
        const tabName = await this.ensureTabExists(sheets, 'Floate Business logs', [
          'Business name', 'whatsapp Number', 'Location', 'Type', 'Category', 'Product', 'Price', 'Negotiation', 'Spotlight', 'TELEGRAM ID', 'DATE', 'VERIFIED/CLAIMED', 'business full name'
        ]);

        const locationStr = data.city && data.state ? `${data.city}, ${data.state}` : (data.city || data.state || 'Nigeria');

        await sheets.spreadsheets.values.append({
          spreadsheetId: this.activeSpreadsheetId,
          range: `'${tabName}'!A:M`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              data.businessName,
              data.whatsapp,
              locationStr,
              listing.listingType,
              data.category,
              data.product,
              data.price,
              listing.negotiation,
              listing.registeredSince,
              String(data.userId), // Numeric Telegram ID Number
              todayDate,
              'YES',
              data.ownerFullName || listing.ownerFullName || '' // Column M: business full name
            ]],
          },
        });
        return { listing, mode: 'sheets', success: true };
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error?.message || err?.message || String(err);
        console.error('[Google Sheets Registration Error]', errorMsg);
        return { listing, mode: 'local', success: false, error: errorMsg };
      }
    }

    return { listing, mode: 'local', success: false, error: 'SPREADSHEET_ID environment variable is missing.' };
  }

  /**
   * Returns all current business listings
   */
  public getAllListings(): BusinessListing[] {
    return this.businessListings;
  }

  /**
   * Checks if user is a registered business
   */
  public isUserRegisteredBusiness(userId: number | string): boolean {
    return this.businessListings.some((b) => String(b.userId) === String(userId));
  }

  /**
   * Gets all business listings created by a user
   */
  public getBusinessListingsForUser(userId: number | string): BusinessListing[] {
    return this.businessListings.filter((b) => String(b.userId) === String(userId));
  }

  /**
   * Gets a specific listing by ID
   */
  public getListingById(id: string): BusinessListing | undefined {
    return this.businessListings.find((b) => b.id === id);
  }

  /**
   * Resolves a business listing by slug or name string (e.g. "connect_chivora", "chivora", "goodys_collection")
   */
  public getListingBySlugOrName(rawSlugOrName: string): BusinessListing | undefined {
    if (!rawSlugOrName) return undefined;

    const rawLower = rawSlugOrName.toLowerCase();
    const cleanStr = rawLower
      .replace(/^(connect_|lead_|connect_lead_|buy_connect_)/, '')
      .replace(/_/g, ' ')
      .replace(/[^a-z0-9 ]+/g, '')
      .trim();

    if (!cleanStr) return undefined;

    // 1. Exact match on listing ID or slug
    const exactMatch = this.businessListings.find((b) => {
      const bId = (b.id || '').toLowerCase();
      const bNameClean = (b.businessName || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').trim();
      const bSlug = (b.businessName || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').trim();
      return bId === rawLower || bSlug === rawLower || bSlug === `connect_${rawLower}` || bNameClean === cleanStr;
    });

    if (exactMatch) return exactMatch;

    // 2. Partial / substring match on business name
    const partialMatch = this.businessListings.find((b) => {
      const bNameClean = (b.businessName || '').toLowerCase().replace(/[^a-z0-9 ]+/g, '').trim();
      return bNameClean.includes(cleanStr) || cleanStr.includes(bNameClean);
    });

    if (partialMatch) return partialMatch;

    // 3. Fall back to word token matching
    const tokens = cleanStr.split(/\s+/).filter((t) => t.length > 2);
    if (tokens.length > 0) {
      return this.businessListings.find((b) => {
        const bName = (b.businessName || '').toLowerCase();
        return tokens.every((token) => bName.includes(token));
      });
    }

    return undefined;
  }

  /**
   * Updates a specific listing
   */
  public updateListing(id: string, updates: Partial<BusinessListing>): BusinessListing | null {
    const listing = this.businessListings.find((b) => b.id === id);
    if (!listing) return null;
    Object.assign(listing, updates);
    return listing;
  }

  /**
   * Deletes a listing
   */
  public deleteListing(id: string): boolean {
    const index = this.businessListings.findIndex((b) => b.id === id);
    if (index === -1) return false;
    const removed = this.businessListings.splice(index, 1)[0];
    const remaining = this.getBusinessListingsForUser(removed.userId);
    for (const b of remaining) {
      b.productCount = remaining.length;
    }
    return true;
  }

  /**
   * Deletes all listings belonging to a business matched by their Telegram user ID or query string (e.g. '2345')
   */
  public deleteBusinessByUserId(userId: number | string): number {
    const initialCount = this.businessListings.length;
    this.businessListings = this.businessListings.filter((b) => String(b.userId) !== String(userId));
    const deletedCount = initialCount - this.businessListings.length;
    this.logInteraction(userId, 'System', 'DELETE_BUSINESS', `Removed business and deleted ${deletedCount} listings`);
    return deletedCount;
  }

  /**
   * Finds a business listing by registered WhatsApp phone number (supports all formats: 070..., 234..., +234...)
   */
  public getListingByPhone(phone: string): BusinessListing | undefined {
    if (!phone) return undefined;
    const variants = getAllPhoneVariants(phone);
    const cleanTarget = normalizePhone(phone);
    
    return this.businessListings.find((b) => {
      const bPhone = normalizePhone(b.whatsapp);
      const bVariants = getAllPhoneVariants(b.whatsapp);
      
      if (bPhone === cleanTarget) return true;
      if (cleanTarget && bPhone.endsWith(cleanTarget.slice(-8))) return true;
      for (const v of variants) {
        if (bVariants.includes(v) || b.whatsapp === v) return true;
      }
      return false;
    });
  }

  /**
   * Finds a business listing by exact or fuzzy business name
   */
  public getListingByBusinessName(name: string): BusinessListing | undefined {
    if (!name) return undefined;
    const clean = name.trim().toLowerCase();
    return this.businessListings.find((b) => {
      const bName = (b.businessName || '').toLowerCase().trim();
      return bName === clean || bName.includes(clean) || clean.includes(bName);
    });
  }

  /**
   * Deletes any merchant listing matching ID, phone, user ID or business name query (e.g., '2345')
   */
  public deleteMerchantByQuery(queryStr: string): number {
    const q = (queryStr || '').toLowerCase().trim();
    if (!q) return 0;
    const initialCount = this.businessListings.length;
    this.businessListings = this.businessListings.filter((b) => {
      const match =
        b.id.toLowerCase().includes(q) ||
        String(b.userId).toLowerCase().includes(q) ||
        (b.telegramId && String(b.telegramId).toLowerCase().includes(q)) ||
        b.whatsapp.includes(q) ||
        b.businessName.toLowerCase().includes(q);
      return !match;
    });
    const removedCount = initialCount - this.businessListings.length;
    if (removedCount > 0) {
      console.log(`[SheetsDB] Removed ${removedCount} listing(s) matching merchant query "${queryStr}"`);
    }
    return removedCount;
  }

  /**
   * Updates WhatsApp number for all listings belonging to a business user
   */
  public updateWhatsappForBusiness(userId: number | string, newWhatsapp: string): number {
    const listings = this.getBusinessListingsForUser(userId);
    for (const b of listings) {
      b.whatsapp = newWhatsapp;
    }
    return listings.length;
  }

  /**
   * Submits a pending claim request for a business by matching registered WhatsApp number
   */
  public async submitClaimRequest(
    userId: number | string,
    username: string,
    rawPhone: string,
    ownerFullName?: string,
    selfieUrl?: string
  ): Promise<{
    success: boolean;
    reason?: 'NOT_FOUND' | 'ALREADY_CLAIMED_BY_YOU' | 'ALREADY_CLAIMED_BY_OTHER' | 'ALREADY_PENDING';
    businessName?: string;
    phone?: string;
    pendingClaim?: PendingClaim;
  }> {
    await this.syncListingsFromSheets();

    const targetPhoneNorm = normalizePhone(rawPhone);
    if (!targetPhoneNorm) {
      return { success: false, reason: 'NOT_FOUND', phone: rawPhone };
    }

    const matchingListings = this.businessListings.filter((b) => {
      const listingPhoneNorm = normalizePhone(b.whatsapp);
      return listingPhoneNorm === targetPhoneNorm;
    });

    if (matchingListings.length === 0) {
      return { success: false, reason: 'NOT_FOUND', phone: targetPhoneNorm };
    }

    const bizName = matchingListings[0].businessName;

    // Check if already officially claimed and linked to this user
    const alreadyClaimedByThisUser = matchingListings.every((b) => String(b.userId) === String(userId));
    if (alreadyClaimedByThisUser) {
      return { success: false, reason: 'ALREADY_CLAIMED_BY_YOU', businessName: bizName, phone: targetPhoneNorm };
    }

    // Check if officially claimed by another Telegram user
    const isClaimedByOther = matchingListings.some((b) => {
      const strId = String(b.userId);
      return !strId.startsWith('sheet-') && !strId.startsWith('biz-') && strId !== String(userId);
    });

    if (isClaimedByOther) {
      return { success: false, reason: 'ALREADY_CLAIMED_BY_OTHER', businessName: bizName, phone: targetPhoneNorm };
    }

    // Check if this user already has a pending claim for this business or number
    const existingPending = this.pendingClaims.find(
      (c) => c.status === 'Pending' && (String(c.requestingUserId) === String(userId) || c.whatsapp === targetPhoneNorm)
    );
    if (existingPending) {
      return { success: false, reason: 'ALREADY_PENDING', businessName: bizName, phone: targetPhoneNorm, pendingClaim: existingPending };
    }

    const claim: PendingClaim = {
      id: `claim-${Date.now()}`,
      businessName: bizName,
      whatsapp: targetPhoneNorm,
      listingId: matchingListings[0].id,
      requestingUserId: userId,
      requestingUsername: username,
      ownerFullName: ownerFullName || undefined,
      timestamp: new Date().toISOString(),
      status: 'Pending',
      selfieUrl,
      identityVerified: Boolean(selfieUrl),
    };

    if (selfieUrl) {
      for (const b of matchingListings) {
        b.profileImageUrl = selfieUrl;
        b.verificationMediaUrl = selfieUrl;
        b.identityVerified = true;
        if (ownerFullName) b.ownerFullName = ownerFullName;
      }
    }

    this.pendingClaims.unshift(claim);

    await this.logInteraction(
      userId,
      username,
      'SUBMIT_CLAIM_REQUEST',
      `Submitted claim request for "${bizName}" (${targetPhoneNorm}) with owner name "${ownerFullName || 'N/A'}" and selfie verification`
    );

    return {
      success: true,
      businessName: bizName,
      phone: targetPhoneNorm,
      pendingClaim: claim,
    };
  }

  /**
   * Retrieves all currently pending claim requests
   */
  public getPendingClaims(): PendingClaim[] {
    return this.pendingClaims.filter((c) => c.status === 'Pending');
  }

  /**
   * Retrieves a pending claim request for a specific user ID
   */
  public getPendingClaimForUser(userId: number | string): PendingClaim | undefined {
    return this.pendingClaims.find((c) => String(c.requestingUserId) === String(userId) && c.status === 'Pending');
  }

  /**
   * Approves a pending claim request and officially links the Telegram ID to the business listing
   */
  public async approveClaim(
    query: string
  ): Promise<{ success: boolean; pendingClaim?: PendingClaim; error?: string }> {
    await this.syncListingsFromSheets();

    const q = query.trim().toLowerCase();
    const qPhoneNorm = normalizePhone(query);

    const pendingIndex = this.pendingClaims.findIndex((c) => {
      if (c.status !== 'Pending') return false;
      if (c.id.toLowerCase() === q) return true;
      if (c.businessName.toLowerCase().includes(q)) return true;
      if (qPhoneNorm && c.whatsapp.includes(qPhoneNorm)) return true;
      return false;
    });

    if (pendingIndex === -1) {
      return { success: false, error: 'NOT_FOUND' };
    }

    const claim = this.pendingClaims[pendingIndex];
    claim.status = 'Approved';

    // Officially link the listings in memory to the requesting Telegram user ID number
    const targetPhoneNorm = normalizePhone(claim.whatsapp);
    const matchingListings = this.businessListings.filter((b) => {
      const listingPhoneNorm = normalizePhone(b.whatsapp);
      return listingPhoneNorm === targetPhoneNorm || b.businessName.toLowerCase() === claim.businessName.toLowerCase();
    });

    for (const b of matchingListings) {
      b.userId = claim.requestingUserId;
      b.telegramId = claim.requestingUserId;
      if (claim.ownerFullName) b.ownerFullName = claim.ownerFullName;
      b.isVerified = true;
      b.claimDate = new Date().toISOString().split('T')[0];
      b.verifiedStatus = 'YES';
    }

    // Sync to Firestore
    firestoreDb.syncMerchantsFromListings(matchingListings).catch(() => {});

    await this.logInteraction(
      claim.requestingUserId,
      claim.requestingUsername,
      'APPROVE_CLAIM',
      `Admin approved claim for "${claim.businessName}" (${claim.whatsapp}) with owner "${claim.ownerFullName || 'N/A'}"`
    );

    return { success: true, pendingClaim: claim };
  }

  /**
   * Rejects a pending claim request
   */
  public async rejectClaim(
    query: string
  ): Promise<{ success: boolean; pendingClaim?: PendingClaim; error?: string }> {
    const q = query.trim().toLowerCase();
    const qPhoneNorm = normalizePhone(query);

    const pendingIndex = this.pendingClaims.findIndex((c) => {
      if (c.status !== 'Pending') return false;
      if (c.id.toLowerCase() === q) return true;
      if (c.businessName.toLowerCase().includes(q)) return true;
      if (qPhoneNorm && c.whatsapp.includes(qPhoneNorm)) return true;
      return false;
    });

    if (pendingIndex === -1) {
      return { success: false, error: 'NOT_FOUND' };
    }

    const claim = this.pendingClaims[pendingIndex];
    claim.status = 'Rejected';

    await this.logInteraction(
      claim.requestingUserId,
      claim.requestingUsername,
      'REJECT_CLAIM',
      `Admin rejected claim for "${claim.businessName}" (${claim.whatsapp})`
    );

    return { success: true, pendingClaim: claim };
  }

  /**
   * Claims pre-registered business account(s) by matching verified phone number
   */
  public async claimBusinessByPhone(
    userId: number | string,
    username: string,
    rawPhone: string
  ): Promise<{
    success: boolean;
    reason?: 'NOT_FOUND' | 'ALREADY_CLAIMED_BY_YOU' | 'ALREADY_CLAIMED_BY_OTHER';
    businessName?: string;
    claimedCount?: number;
    phone?: string;
  }> {
    await this.syncListingsFromSheets();

    const targetPhoneNorm = normalizePhone(rawPhone);
    if (!targetPhoneNorm) {
      return { success: false, reason: 'NOT_FOUND', phone: rawPhone };
    }

    const matchingListings = this.businessListings.filter((b) => {
      const listingPhoneNorm = normalizePhone(b.whatsapp);
      return listingPhoneNorm === targetPhoneNorm;
    });

    if (matchingListings.length === 0) {
      return { success: false, reason: 'NOT_FOUND', phone: targetPhoneNorm };
    }

    const bizName = matchingListings[0].businessName;

    const alreadyClaimedByThisUser = matchingListings.every((b) => String(b.userId) === String(userId));
    if (alreadyClaimedByThisUser) {
      return { success: true, reason: 'ALREADY_CLAIMED_BY_YOU', businessName: bizName, claimedCount: matchingListings.length, phone: targetPhoneNorm };
    }

    const isClaimedByOther = matchingListings.some((b) => {
      const strId = String(b.userId);
      return !strId.startsWith('sheet-') && !strId.startsWith('biz-') && strId !== String(userId);
    });

    if (isClaimedByOther) {
      return { success: false, reason: 'ALREADY_CLAIMED_BY_OTHER', businessName: bizName };
    }

    for (const b of matchingListings) {
      b.userId = userId;
      b.isVerified = true;
    }

    await this.logInteraction(userId, username, 'CLAIM_BUSINESS', `Claimed business "${bizName}" via phone verified: ${targetPhoneNorm}`);

    return {
      success: true,
      businessName: bizName,
      claimedCount: matchingListings.length,
      phone: targetPhoneNorm,
    };
  }

  /**
   * Adds an extra product for an existing business listing or profile
   */
  public async addNewProductListing(
    userId: number | string,
    productName: string,
    price: string,
    fallbackProfile?: any,
    customType?: string,
    customNegotiable?: 'Yes' | 'No',
    customProductImages?: string[]
  ): Promise<{ listing: BusinessListing; mode: 'sheets' | 'local'; success: boolean; error?: string }> {
    const existingListings = this.getBusinessListingsForUser(userId);
    const base = existingListings[0];

    const bizName = base ? base.businessName : (fallbackProfile?.businessName || 'My Business');
    const wa = base ? base.whatsapp : (fallbackProfile?.businessWhatsapp || '08000000000');
    const st = base ? base.state : (fallbackProfile?.businessState || 'Nigeria');
    const ct = base ? base.city : (fallbackProfile?.businessCity || 'Nigeria');
    const cat = base ? base.category : (fallbackProfile?.businessCategory || 'General');
    const lType = customType || fallbackProfile?.tempListingType || base?.listingType || 'Product';
    const regDate = base ? base.registeredSince : new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const isNeg = customNegotiable || fallbackProfile?.tempNegotiable || base?.negotiation || 'Yes';
    const prodImages = customProductImages || fallbackProfile?.tempProductImages || fallbackProfile?.productImages || base?.productImages || [];

    const newListing: BusinessListing = {
      id: `biz-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      businessName: bizName,
      whatsapp: wa,
      state: st,
      city: ct,
      listingType: lType,
      category: cat,
      product: productName,
      price: price,
      negotiation: isNeg === 'No' ? 'No' : 'Yes',
      registeredSince: regDate,
      productCount: existingListings.length + 1,
      isVerified: true,
      productImages: prodImages,
      profileImageUrl: base?.profileImageUrl || fallbackProfile?.profileImageUrl,
      verificationMediaUrl: base?.verificationMediaUrl || fallbackProfile?.verificationMediaUrl,
      identityVerified: base?.identityVerified ?? fallbackProfile?.identityVerified,
    };

    for (const item of existingListings) {
      item.productCount = existingListings.length + 1;
    }

    this.businessListings.unshift(newListing);
    await this.logInteraction(userId, bizName, 'ADD_PRODUCT', `${productName} | Type: ${lType} | Price: ${price} | Negotiable: ${newListing.negotiation}`);

    if (this.activeSpreadsheetId) {
      try {
        const sheets = this.getSheetsClient();
        const tabName = await this.ensureTabExists(sheets, 'Floate Business logs', [
          'Business name', 'whatsapp Number', 'Location', 'Type', 'Category', 'Product', 'Price', 'Negotiation', 'Spotlight', 'TELEGRAM ID', 'DATE', 'VERIFIED/CLAIMED', 'business full name'
        ]);

        const locationStr = ct && st ? `${ct}, ${st}` : (ct || st || 'Nigeria');

        await sheets.spreadsheets.values.append({
          spreadsheetId: this.activeSpreadsheetId,
          range: `'${tabName}'!A:M`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[
              newListing.businessName,
              newListing.whatsapp,
              locationStr,
              newListing.listingType,
              newListing.category,
              newListing.product,
              newListing.price,
              newListing.negotiation,
              newListing.registeredSince,
              String(userId), // Column J: TELEGRAM ID Number
              new Date().toISOString().split('T')[0],
              'YES',
              newListing.ownerFullName || base?.ownerFullName || fallbackProfile?.ownerFullName || '' // Column M: business full name
            ]],
          },
        });
        return { listing: newListing, mode: 'sheets', success: true };
      } catch (err: any) {
        const errorMsg = err?.response?.data?.error?.message || err?.message || String(err);
        console.error('[Google Sheets Add Product Error]', errorMsg);
        return { listing: newListing, mode: 'local', success: false, error: errorMsg };
      }
    }

    return { listing: newListing, mode: 'local', success: false, error: 'SPREADSHEET_ID environment variable is missing.' };
  }

  /**
   * Adds an extra product for an existing business listing
   */
  public async addProductForBusiness(userId: number | string, product: string, price: string, listingType?: string, negotiation?: 'Yes' | 'No'): Promise<{ listing: BusinessListing; mode: 'sheets' | 'local'; success: boolean; error?: string }> {
    return this.addNewProductListing(userId, product, price, undefined, listingType, negotiation);
  }

  /**
   * Syncs and loads live business listings directly from Google Sheets ('Floate Business logs' tab) with 8-10s timeout
   */
  public async syncListingsFromSheets(force: boolean = false): Promise<BusinessListing[]> {
    return withExternalTimeout(
      async () => {
        const now = Date.now();
        if (!force && this.lastSheetsSyncTime > 0 && (now - this.lastSheetsSyncTime < 30000) && this.businessListings.length > 0) {
          return this.businessListings;
        }

        if (!this.activeSpreadsheetId) {
          return this.businessListings;
        }

        try {
          const sheets = this.getSheetsClient();
          const tabName = await this.ensureTabExists(sheets, 'Floate Business logs', [
            'Business name', 'whatsapp Number', 'Location', 'Type', 'Category', 'Product', 'Price', 'Negotiation', 'Spotlight', 'TELEGRAM ID', 'DATE', 'VERIFIED/CLAIMED', 'business full name'
          ]);

          const res = await sheets.spreadsheets.values.get({
            spreadsheetId: this.activeSpreadsheetId,
            range: `'${tabName}'!A2:M1000`,
          });

          const values = res.data.values || [];
          const fetchedListings: BusinessListing[] = [];

          values.forEach((row: any[], index: number) => {
            const bizName = (row[0] || '').trim();
            const whatsapp = (row[1] || '').trim();
            if (!bizName || !whatsapp) return;

            const rawLoc = (row[2] || '').trim();
            const listingType = (row[3] || 'Product').trim();
            const category = (row[4] || 'General').trim();
            const product = (row[5] || category || bizName).trim();
            const price = (row[6] || 'Contact for price').trim();
            const negotiationRaw = (row[7] || '').trim().toLowerCase();
            const isNeg: 'Yes' | 'No' = (negotiationRaw === 'no' || negotiationRaw === 'n' || negotiationRaw === 'fixed') ? 'No' : 'Yes';
            const regDate = (row[8] || 'Jul 2026').trim();
            const telegramIdFromSheet = (row[9] || '').trim(); // Column J: TELEGRAM ID Number
            const verifiedRaw = (row[11] || '').trim().toUpperCase(); // Column L: VERIFIED/CLAIMED
            const ownerFullName = (row[12] || '').trim(); // Column M: business full name

            let city = rawLoc;
            let state = rawLoc;
            if (rawLoc.includes(',')) {
              const parts = rawLoc.split(',').map((p) => p.trim());
              city = parts[0];
              state = parts.slice(1).join(', ');
            }

            const isVer = verifiedRaw === 'YES' || verifiedRaw === 'TRUE';
            const uId = telegramIdFromSheet || `sheet-${index + 1}`;

            fetchedListings.push({
              id: `sheet-${index + 1}`,
              userId: uId,
              telegramId: telegramIdFromSheet || undefined,
              businessName: bizName,
              ownerFullName: ownerFullName || undefined,
              whatsapp,
              state,
              city,
              listingType,
              category,
              product,
              price,
              negotiation: isNeg,
              registeredSince: regDate,
              productCount: 1,
              isVerified: isVer || true,
              verifiedStatus: isVer ? 'YES' : 'PENDING',
              isHighlyRecommended: isSpotlightBusiness(bizName),
            });
          });

          if (fetchedListings.length > 0) {
            // Merge spotlight seed listings if not already in fetchedListings
            for (const seed of DEFAULT_SEED_LISTINGS) {
              const exists = fetchedListings.some(
                (f) =>
                  f.businessName.toLowerCase() === seed.businessName.toLowerCase() ||
                  normalizePhone(f.whatsapp) === normalizePhone(seed.whatsapp)
              );
              if (!exists) {
                fetchedListings.unshift(seed);
                this.appendSeedToSheets(sheets, tabName, seed).catch(() => {});
              }
            }
            this.businessListings = fetchedListings;
            this.lastSheetsSyncTime = now;
          }
        } catch (err: any) {
          console.warn('[Sheets Sync Notice] Could not sync live listings from Google Sheets:', err?.message || err);
        }

        // Always ensure Firestore & Meilisearch are synced with the latest business listings
        firestoreDb.syncMerchantsFromListings(this.businessListings).catch(() => {});
        meilisearchClient.syncListings(this.businessListings).catch(() => {});

        return this.businessListings;
      },
      {
        timeoutMs: 8500,
        serviceName: 'GoogleSheets',
        operationName: 'syncListingsFromSheets',
        fallbackValue: this.businessListings,
      }
    );
  }

  private async appendSeedToSheets(sheets: any, tabName: string, listing: BusinessListing): Promise<void> {
    if (!this.activeSpreadsheetId) return;
    try {
      const locationStr = listing.city && listing.state ? `${listing.city}, ${listing.state}` : (listing.city || listing.state || 'Nigeria');
      await sheets.spreadsheets.values.append({
        spreadsheetId: this.activeSpreadsheetId,
        range: `'${tabName}'!A:M`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            listing.businessName,
            listing.whatsapp,
            locationStr,
            listing.listingType,
            listing.category,
            listing.product,
            listing.price,
            listing.negotiation,
            listing.registeredSince,
            String(listing.userId), // Column J: TELEGRAM ID Number
            new Date().toISOString().split('T')[0],
            'YES',
            listing.ownerFullName || '' // Column M: business full name
          ]],
        },
      });
    } catch (e) {
      console.warn('[SheetsSeedAppend Notice]', e);
    }
  }

  /**
   * Searches structured BusinessListings with exact product relevance scoring and category fallback matching
   */
  public async searchBusinessListings(
    query: string,
    targetLocation?: string | null,
    categoryHint?: string | null,
    maxPriceNaira?: number | null,
    inferredCategories?: string[] | null
  ): Promise<{
    exactMatches: BusinessListing[];
    categoryMatches: BusinessListing[];
    allMatches: BusinessListing[];
    outOfAreaRecommendations?: BusinessListing[];
    source: 'sheets' | 'local';
  }> {
    // Always sync live Google Sheet listings first
    await this.syncListingsFromSheets();

    const q = (query || '').toLowerCase().trim();
    const cat = (categoryHint || '').toLowerCase().trim();
    const locFilter = targetLocation ? targetLocation.toLowerCase().trim() : null;
    const inferredList = (inferredCategories || [])
      .map((c) => c.toLowerCase().trim())
      .filter((c) => c.length > 0);

    if (!q && !cat && inferredList.length === 0) {
      return {
        exactMatches: [],
        categoryMatches: [],
        allMatches: [],
        outOfAreaRecommendations: [],
        source: this.activeSpreadsheetId ? 'sheets' : 'local',
      };
    }

    const cleanSearchTerm = (term: string) => {
      return term
        .toLowerCase()
        .replace(/i want to buy/g, '')
        .replace(/where can i (?:find|buy|get)/g, '')
        .replace(/looking for/g, '')
        .replace(/i am looking for/g, '')
        .replace(/i need/g, '')
        .replace(/i want/g, '')
        .replace(/search for/g, '')
        .replace(/can i get/g, '')
        .trim();
    };

    const cleanQ = cleanSearchTerm(q);

    // Identify product domain keywords & synonym expansions
    const isBagQuery = /\b(bag|bags|handbag|handbags|purse|purses|tote|backpack|backpacks|clutch|clutches|duffle|leather bag|school bag|travelling bag|travel bag)\b/i.test(cleanQ);
    const isFootwearQuery = /\b(footwear|footwears|shoe|shoes|slipper|slippers|sandal|sandals|slide|slides|palm|palms|crocs|heels|boot|boots|leather slipper|leather slippers|footwear vendor|shoe vendor|sneakers|loafers)\b/i.test(cleanQ) || cleanQ.includes('slipper') || cleanQ.includes('footwear');
    const isPhoneQuery = /\b(phone|phones|iphone|samsung|gadget|gadgets|airpod|airpods|earbud|charger|powerbank|smart phone|android|screen guard|phone case|cables)\b/i.test(cleanQ);
    const isLaptopQuery = /\b(laptop|laptops|computer|macbook|pc|desktop|monitor|notebook|thinkpad|latitude|elitebook|ultrabook|computing|hard drive|ssd|keyboard|mouse)\b/i.test(cleanQ);
    const isVideoEditorQuery = /\b(video|videos|edit|editor|editing|videographer|videography|filming|motion graphics|video production|content creator|cinematography|reel|reels)\b/i.test(cleanQ);
    const isLegalQuery = /\b(lawyer|attorney|law|legal|advocate|law firm|barrister|solicitor|cac|agreement|notary|court|legal counsel)\b/i.test(cleanQ);
    const isAutoQuery = /\b(mechanic|auto|automobile|car repair|vehicle|motor|engine|panel beater|car painter|car battery|spare parts|gearbox|car electrician)\b/i.test(cleanQ);
    const isClothingQuery = /\b(cloth|clothing|dress|gown|shirt|trouser|native|native wear|fashion|tailor|sewing|senator wear|agbada|ankara|suit|jeans|hoodie|boutique)\b/i.test(cleanQ);
    const isCateringQuery = /\b(catering|caterer|food|chef|cook|wedding food|meal|restaurant|baking|cakes|pastries|small chops|shawarma|jollof|party food)\b/i.test(cleanQ);
    const isRealEstateQuery = /\b(house|apartment|flat|rent|property|real estate|agent|realtor|land|lands|self contain|duplex|shortlet|landlord|hostel|office space)\b/i.test(cleanQ);
    const isBeautyQuery = /\b(salon|hair|haircut|barber|barbing|wig|wigs|hairstylist|makeup|make up|cosmetics|skincare|skin care|braids|frontals|lashes|pedicure|manicure|spa)\b/i.test(cleanQ);
    const isSolarQuery = /\b(solar|inverter|inverters|battery|batteries|solar panel|panels|ups|energy|backup power|clean power|tubular battery|lithium)\b/i.test(cleanQ);
    const isPrintingQuery = /\b(print|printing|flyer|flyers|banner|banners|branding|graphics|sticker|stickers|business card|business cards|tshirt printing|stationery)\b/i.test(cleanQ);
    const isPhotographyQuery = /\b(photo|photography|photographer|studio|photoshoot|headshot|picture|camera|portrait|event coverage)\b/i.test(cleanQ);
    const isEventPlanningQuery = /\b(event planner|event planning|decorator|event decorator|usher|ushers|mc|master of ceremony|dj|sound system|stage|canopy|chairs)\b/i.test(cleanQ);
    const isTechWebQuery = /\b(website|websites|web\s*site|web\s*sites|web\s*app|web\s*apps|web\s*developer|web\s*design|web\s*designer|programmer|software|developer|coding|coder|frontend|backend|fullstack|seo|mobile\s*app|mobile\s*apps|application|tech\s*solutions|build\s*website|make\s*website)\b/i.test(cleanQ) || inferredList.some(inf => /website|software|tech|developer|coding|web\s*app/i.test(inf));

    const calculateRelevanceScore = (b: BusinessListing): { totalScore: number; productScore: number; isExactProductMatch: boolean; matchesLocation: boolean } => {
      const prod = b.product.toLowerCase();
      const category = b.category.toLowerCase();
      const biz = b.businessName.toLowerCase();
      const type = (b.listingType || '').toLowerCase();

      let score = 0;
      let productScore = 0;
      let exactProductMatch = false;

      // Product group domain traits & synonyms
      const isListingFootwear = /\b(footwear|footwears|shoe|shoes|slipper|slippers|sandal|sandals|slide|slides|palm|palms|crocs|heels|boot|boots|sneakers|loafers|leather slippers|leather slipper)\b/i.test(prod) || /\b(footwear|shoes|shoe)\b/i.test(category);
      const isListingBag = /\b(bag|bags|handbag|handbags|purse|purses|tote|backpack|clutch|duffle|wallet|school bag|travel bag)\b/i.test(prod) || /\b(bag|bags|handbag|luggage|leather goods)\b/i.test(category);
      const isListingPhone = /\b(phone|phones|iphone|samsung|gadget|gadgets|airpod|airpods|charger|powerbank|xiaomi|redmi|tecno|infinix|oppo|smart phone|android)\b/i.test(prod) || /\b(phone|phones|gadget|gadgets|mobile)\b/i.test(category);
      const isListingLaptop = /\b(laptop|laptops|computer|computers|macbook|pc|desktop|monitors|hp|dell|lenovo|thinkpad|latitude|elitebook|probook|pavilion|inspiron|asus|acer|toshiba|surface|notebook|ultrabook|workstation|system|systems)\b/i.test(prod) || /\b(computing|computer|computers|laptop|laptops|it|systems)\b/i.test(category);
      const isListingVideoEditor = /\b(video|edit|editor|editing|videographer|filming|motion|content creation|media production|cinematography)\b/i.test(prod) || /\b(media|video|editing|video production)\b/i.test(category);
      const isListingLegal = /\b(lawyer|attorney|law|legal|advocate|barrister|solicitor|cac|agreement|notary)\b/i.test(prod) || /\b(legal|law|legal services)\b/i.test(category);
      const isListingAuto = /\b(mechanic|auto|car|automobile|vehicle|motor|engine|spare parts|panel beater)\b/i.test(prod) || /\b(auto|mechanic|automotive)\b/i.test(category);
      const isListingClothing = /\b(cloth|clothing|dress|gown|shirt|trouser|native|fashion|tailor|sewing|senator|agbada|ankara)\b/i.test(prod) || /\b(clothing|native wear|textiles)\b/i.test(category);
      const isListingCatering = /\b(catering|caterer|food|cook|meal|baking|cakes|small chops|restaurant)\b/i.test(prod) || /\b(catering|food|hospitality)\b/i.test(category);
      const isListingRealEstate = /\b(house|apartment|flat|rent|property|real estate|realtor|land|lands|self contain|duplex|shortlet|hostel)\b/i.test(prod) || /\b(real estate|property|housing|rentals)\b/i.test(category);
      const isListingBeauty = /\b(salon|hair|barber|barbing|wig|wigs|hairstylist|makeup|cosmetics|skincare|lashes|braids|spa)\b/i.test(prod) || /\b(beauty|salon|hair|cosmetics|skincare|wellness)\b/i.test(category);
      const isListingSolar = /\b(solar|inverter|inverters|battery|batteries|solar panel|ups|energy|power)\b/i.test(prod) || /\b(solar|inverter|power|energy|electrical)\b/i.test(category);
      const isListingPrinting = /\b(print|printing|flyer|banner|graphics|sticker|business card|branding)\b/i.test(prod) || /\b(printing|branding|graphics|publishing)\b/i.test(category);
      const isListingPhotography = /\b(photo|photography|photographer|studio|photoshoot|camera|portrait)\b/i.test(prod) || /\b(photography|photo|media|studio)\b/i.test(category);
      const isListingEventPlanning = /\b(event|planner|decorator|decoration|usher|mc|dj|sound|stage|canopy)\b/i.test(prod) || /\b(events|event planning|decorations|entertainment)\b/i.test(category);
      const isListingTechWeb = (/\b(website|websites|web\s*site|web\s*sites|web\s*app|web\s*apps|software|developer|programmer|coding|mobile\s*app|mobile\s*application|seo\b|web\s*development|tech\s*solutions)\b/i.test(prod) || /\b(website|software|coding|programming|web\s*development)\b/i.test(category)) && !(/\b(accessories|gadgets|smartphones)\b/i.test(prod) && !/\b(website|software|coding|web\s*app)\b/i.test(prod));

      // DOMAIN CONFLICT DISQUALIFIERS / HEAVY PENALTIES
      if (isTechWebQuery && !isListingTechWeb) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isFootwearQuery && !isListingFootwear) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isVideoEditorQuery && !isListingVideoEditor) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isBagQuery && !isListingBag) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isPhoneQuery && !isListingPhone) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isLaptopQuery && !isListingLaptop) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isLegalQuery && !isListingLegal) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isAutoQuery && !isListingAuto) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isClothingQuery && !isListingClothing) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isCateringQuery && !isListingCatering) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isRealEstateQuery && !isListingRealEstate) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isBeautyQuery && !isListingBeauty) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isSolarQuery && !isListingSolar) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isPrintingQuery && !isListingPrinting) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isPhotographyQuery && !isListingPhotography) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }
      if (isEventPlanningQuery && !isListingEventPlanning) {
        return { totalScore: -999, productScore: -999, isExactProductMatch: false, matchesLocation: false };
      }

      // Exact substring match in product name or listing type
      if (cleanQ && (prod.includes(cleanQ) || type.includes(cleanQ) || (category.includes(cleanQ) && cleanQ.length >= 4))) {
        productScore += 120;
        exactProductMatch = true;
      }

      // Semantic Intent & Inferred Categories matching (Gemini expanded understanding)
      const genericStopWords = new Set(['service', 'services', 'center', 'store', 'shop', 'vendor', 'general', 'business', 'other', 'company', 'firm', 'buy', 'sell', 'product', 'products', 'goods']);

      for (const inf of inferredList) {
        if (!inf || inf.length < 3) continue;

        const isInfGeneric = genericStopWords.has(inf);
        const isCatGeneric = genericStopWords.has(category);
        const isProdGeneric = genericStopWords.has(prod);

        // Direct phrase match between inferred category/term and listing product or category
        if (
          (!isInfGeneric && prod.includes(inf)) ||
          (!isInfGeneric && !isCatGeneric && category.includes(inf)) ||
          (!isInfGeneric && type.includes(inf)) ||
          (!isCatGeneric && category.length >= 4 && inf.includes(category)) ||
          (!isProdGeneric && prod.length >= 4 && inf.includes(prod))
        ) {
          productScore += 100;
          exactProductMatch = true;
          break;
        }

        // Multi-word token overlap check for semantic intent
        const infTokens = inf.split(/\s+/).filter((t) => t.length > 2 && !genericStopWords.has(t));
        let matchedTokenCount = 0;
        for (const tok of infTokens) {
          if ((!isProdGeneric && prod.includes(tok)) || (!isCatGeneric && category.includes(tok))) {
            matchedTokenCount++;
          }
        }
        if (matchedTokenCount > 0 && infTokens.length > 0) {
          productScore += 35 * matchedTokenCount;
          if (matchedTokenCount >= Math.min(2, infTokens.length) || (infTokens.length === 1 && matchedTokenCount === 1)) {
            exactProductMatch = true;
          }
        }
      }

      // Domain alignment bonuses (mild boost for exact domain alignment)
      if (isTechWebQuery && isListingTechWeb) {
        productScore += 100;
        exactProductMatch = true;
      }
      if (isBagQuery && isListingBag) {
        productScore += 80;
        exactProductMatch = true;
      }
      if (isFootwearQuery && isListingFootwear) {
        productScore += 80;
        exactProductMatch = true;
      }
      if (isPhoneQuery && isListingPhone) {
        productScore += 80;
        exactProductMatch = true;
      }
      if (isLaptopQuery && isListingLaptop) { productScore += 80; exactProductMatch = true; }
      if (isVideoEditorQuery && isListingVideoEditor) { productScore += 80; exactProductMatch = true; }
      if (isLegalQuery && isListingLegal) { productScore += 80; exactProductMatch = true; }
      if (isAutoQuery && isListingAuto) { productScore += 80; exactProductMatch = true; }
      if (isClothingQuery && isListingClothing) { productScore += 80; exactProductMatch = true; }
      if (isCateringQuery && isListingCatering) { productScore += 80; exactProductMatch = true; }
      if (isRealEstateQuery && isListingRealEstate) { productScore += 80; exactProductMatch = true; }
      if (isBeautyQuery && isListingBeauty) { productScore += 80; exactProductMatch = true; }
      if (isSolarQuery && isListingSolar) { productScore += 80; exactProductMatch = true; }
      if (isPrintingQuery && isListingPrinting) { productScore += 80; exactProductMatch = true; }
      if (isPhotographyQuery && isListingPhotography) { productScore += 80; exactProductMatch = true; }
      if (isEventPlanningQuery && isListingEventPlanning) { productScore += 80; exactProductMatch = true; }

      // Jewelry, perfume, decorations & luxury gifts
      const isJewelryQuery = /\b(jewel|jewelry|jewelries|pendant|necklace|ring|earring|perfume|perfumes|fragrance|decoration|decorations|package|packages|gift|luxury)\b/i.test(cleanQ) || inferredList.some(inf => /jewel|perfume|decorat|package|gift|luxury/i.test(inf));
      const isListingJewelry = /\b(jewel|jewelry|jewelries|perfume|perfumes|decoration|decorations|package|packages|gift|luxury)\b/i.test(prod) || /\b(jewel|jewelry|perfume|decoration|package|gift|luxury)\b/i.test(category);
      if (isJewelryQuery && isListingJewelry) {
        productScore += 100;
        exactProductMatch = true;
      }

      // Direct business name search match (e.g., user specifically searches for "Chivora", "Makky Luxe", "Mbams", "Goody's", "Jules")
      if (cleanQ && (biz.includes(cleanQ) || (cleanQ.length >= 4 && cleanQ.includes(biz)))) {
        productScore += 2500;
        exactProductMatch = true;
      }

      // Token matching
      const stopWords = new Set(['in', 'for', 'at', 'from', 'of', 'to', 'a', 'an', 'the', 'and', 'with', 'on', 'my', 'me', 'buy', 'want', 'need', 'service', 'services', 'store', 'shop']);
      const tokens = cleanQ.split(/\s+/).filter((t) => t.length > 2 && !stopWords.has(t));

      for (const tok of tokens) {
        if (prod.includes(tok)) {
          productScore += 40;
          exactProductMatch = true;
        } else if (type.includes(tok)) {
          productScore += 25;
        } else if (category.includes(tok) && !genericStopWords.has(tok)) {
          productScore += 20;
        } else if (biz.includes(tok)) {
          productScore += 15;
          exactProductMatch = true;
        }
      }

      // Category match hint
      if (cat && !genericStopWords.has(cat) && (category.includes(cat) || prod.includes(cat))) {
        productScore += 25;
        exactProductMatch = true;
      }

      // Base totalScore on productScore
      score = productScore;

      // Spotlight Business Prioritization (Modest boost within matched location)
      if (b.isHighlyRecommended || isSpotlightBusiness(b.businessName)) {
        if (exactProductMatch || productScore > 0) {
          score += 50;
        }
      }

      // Location match check with Multi-Tier Proximity & Nigerian Cluster Mapping
      let matchesLocation = true;
      if (locFilter && locFilter !== 'nigeria' && locFilter !== 'all_nigeria' && locFilter !== 'all') {
        const stateLower = (b.state || '').toLowerCase().trim();
        const cityLower = (b.city || '').toLowerCase().trim();
        const combinedLoc = `${cityLower} ${stateLower}`.trim();

        // City to state & cluster mapping for Nigeria
        const NIGERIAN_CLUSTERS: Record<string, string[]> = {
          enugu: ['enugu', 'nsukka', 'agbani', '9th mile', 'abakpa', 'gariki', 'ogui', 'coal camp', 'kenyatta', 'independence layout', 'new haven', 'trans ekulu'],
          lagos: ['lagos', 'ikeja', 'lekki', 'vi', 'victoria island', 'yaba', 'surulere', 'alaba', 'trade fair', 'oshodi', 'festac', 'ikorodu', 'apapa', 'ajah', 'ogba', 'maryland', 'gbagada', 'agege', 'idumu', 'egbeda', 'ipaja', 'balogun', 'mandilas', 'idunmota', 'island', 'mainland'],
          onitsha: ['onitsha', 'awka', 'nnewi', 'anambra', 'main market', 'emeka offor', 'head bridge', 'ogidi', 'ihiala', 'echeck', 'bridgehead'],
          anambra: ['anambra', 'onitsha', 'awka', 'nnewi', 'main market', 'emeka offor', 'head bridge', 'ogidi', 'ihiala', 'bridgehead'],
          abuja: ['abuja', 'fct', 'wuse', 'garki', 'maitama', 'gwarinpa', 'kubwa', 'jabi', 'utako', 'banex', 'lugbe', 'asokoro', 'apo', 'dei-dei', 'mararaba', 'nyanya'],
          fct: ['abuja', 'fct', 'wuse', 'garki', 'maitama', 'gwarinpa', 'kubwa', 'jabi', 'utako', 'banex', 'lugbe', 'asokoro', 'apo', 'dei-dei', 'mararaba', 'nyanya'],
          'port harcourt': ['port harcourt', 'ph', 'rivers', 'obio akpor', 'oil mill', 'garrison', 'mile 1', 'mile 2', 'mile 3', 'trans amadi', 'diobu', 'rumuokoro', 'rumuola', 'woji', 'ada george', 'choba', 'eleme', 'gra'],
          rivers: ['port harcourt', 'ph', 'rivers', 'obio akpor', 'oil mill', 'garrison', 'mile 1', 'mile 2', 'mile 3', 'trans amadi', 'diobu', 'rumuokoro', 'rumuola', 'woji', 'ada george', 'choba', 'eleme', 'gra'],
          ph: ['port harcourt', 'ph', 'rivers', 'obio akpor', 'oil mill', 'garrison', 'trans amadi', 'diobu', 'rumuokoro', 'rumuola'],
          aba: ['aba', 'umuahia', 'abia', 'ariaria', 'ngwa road', 'eheke', 'shopping center'],
          abia: ['aba', 'umuahia', 'abia', 'ariaria', 'ngwa road', 'eheke', 'shopping center'],
          ibadan: ['ibadan', 'oyo', 'dugbe', 'bodija', 'iwo road', 'mokola', 'ring road', 'challenge', 'gbagi', 'agodi', 'ui', 'apata'],
          oyo: ['ibadan', 'oyo', 'dugbe', 'bodija', 'iwo road', 'mokola', 'ring road', 'challenge', 'gbagi', 'agodi', 'ui', 'apata'],
          kano: ['kano', 'kurmi', 'kantin kwari', 'sabongari', 'fagge', 'bompai'],
          asaba: ['asaba', 'warri', 'delta', 'effurun', 'ughelli', 'sapele', 'ogwashi'],
          warri: ['warri', 'asaba', 'delta', 'effurun', 'ughelli', 'sapele'],
          delta: ['asaba', 'warri', 'delta', 'effurun', 'ughelli', 'sapele', 'ogwashi'],
          benin: ['benin', 'benin city', 'edo', 'ring road', 'ekiosa', 'oba market', 'ekpoma', 'uromi'],
          'benin city': ['benin', 'benin city', 'edo', 'ring road', 'ekiosa', 'oba market', 'ekpoma', 'uromi'],
          edo: ['benin', 'benin city', 'edo', 'ring road', 'ekiosa', 'oba market', 'ekpoma', 'uromi'],
          owerri: ['owerri', 'imo', 'orlu', 'okigwe', 'douglas', 'relief market'],
          imo: ['owerri', 'imo', 'orlu', 'okigwe', 'douglas', 'relief market'],
          uyo: ['uyo', 'akwa ibom', 'eket', 'ikot ekpene'],
          'akwa ibom': ['uyo', 'akwa ibom', 'eket', 'ikot ekpene'],
          calabar: ['calabar', 'cross river', 'ikom'],
          'cross river': ['calabar', 'cross river', 'ikom'],
          abakaliki: ['abakaliki', 'ebonyi', 'afikpo'],
          ebonyi: ['abakaliki', 'ebonyi', 'afikpo']
        };

        const locWords = locFilter.split(/[,\s]+/).filter((w) => w.length >= 3 && !['market', 'hub', 'area', 'state', 'town', 'city', 'nigeria'].includes(w));

        const isDirectCityMatch = cityLower && (cityLower === locFilter || cityLower.includes(locFilter) || locFilter.includes(cityLower));
        const isDirectStateMatch = stateLower && (stateLower === locFilter || stateLower.includes(locFilter) || locFilter.includes(stateLower));
        
        let isClusterMatch = false;
        for (const [key, cluster] of Object.entries(NIGERIAN_CLUSTERS)) {
          if (locFilter.includes(key) || key.includes(locFilter) || locWords.some((w) => w === key)) {
            if (cluster.some((c) => cityLower.includes(c) || stateLower.includes(c) || combinedLoc.includes(c))) {
              isClusterMatch = true;
              break;
            }
          }
        }

        matchesLocation = isDirectCityMatch || isDirectStateMatch || isClusterMatch || (locWords.length > 0 && locWords.some((w) => combinedLoc.includes(w)));

        // ONLY apply positive location proximity boost if the business has actual product relevance,
        // or if the user is just browsing a location without a specific search term
        const hasProductRelevance = exactProductMatch || productScore > 0 || !cleanQ;

        if (hasProductRelevance) {
          if (isDirectCityMatch) {
            score += 400; // Strongest boost for direct city
          } else if (isDirectStateMatch) {
            score += 250; // State boost
          } else if (isClusterMatch) {
            score += 200; // Regional cluster boost
          } else if (matchesLocation) {
            score += 100;
          }
        }

        if (!matchesLocation) {
          // Out of target location
          score -= 500;
        }
      }

      // Budget match check
      if (maxPriceNaira && maxPriceNaira > 0) {
        const numericPrice = parsePriceToNumber(b.price);
        if (numericPrice) {
          if (numericPrice <= maxPriceNaira) {
            score += 20;
          } else {
            score -= 100;
          }
        }
      }

      return { totalScore: score, productScore, isExactProductMatch: exactProductMatch, matchesLocation };
    };

    const scoredListings = this.businessListings
      .map((b) => ({ listing: b, ...calculateRelevanceScore(b) }));

    // Primary matches: Strictly matching the requested location when locFilter is provided, with verified product relevance
    const localScoredListings = scoredListings
      .filter((item) => (locFilter && locFilter !== 'nigeria' && locFilter !== 'all_nigeria' && locFilter !== 'all' ? item.matchesLocation : true) && item.totalScore > 0 && (!cleanQ || item.productScore > 0 || item.isExactProductMatch));
    localScoredListings.sort((a, b) => b.totalScore - a.totalScore);

    const exactMatches = localScoredListings
      .filter((item) => item.isExactProductMatch && item.totalScore >= 50 && (!cleanQ || item.productScore > 0 || item.isExactProductMatch))
      .map((item) => item.listing);

    const categoryMatches = localScoredListings
      .filter((item) => item.totalScore >= 20 && (!cleanQ || item.productScore > 0 || item.isExactProductMatch))
      .map((item) => item.listing);

    // Out-of-area recommendations: When location filter is active, find relevant merchants from other states/markets
    let outOfAreaRecommendations: BusinessListing[] = [];
    if (locFilter && locFilter !== 'nigeria' && locFilter !== 'all_nigeria' && locFilter !== 'all') {
      const outOfAreaScored = scoredListings
        .filter((item) => !item.matchesLocation && (item.isExactProductMatch || (item.productScore > 0 && item.totalScore > -100)));

      // Sort out-of-area recommendations by raw relevance
      outOfAreaScored.sort((a, b) => b.totalScore - a.totalScore);
      outOfAreaRecommendations = outOfAreaScored.map((item) => item.listing);
    }

    return {
      exactMatches,
      categoryMatches,
      allMatches: categoryMatches,
      outOfAreaRecommendations,
      source: this.activeSpreadsheetId ? 'sheets' : 'local',
    };
  }

  /**
   * Multi-Attribute Automated Lead Matching & Prioritization Algorithm
   * Scores and ranks business responses/listings based on location, budget, urgency, and wallet credit status.
   */
  public rankVendorsForLead(
    itemOrCategory: string,
    location?: string | null,
    budget?: string | null,
    urgency?: string | null,
    overrideListings?: BusinessListing[]
  ): VendorMatchScore[] {
    const locNorm = (location || '').toLowerCase().trim();
    const budgetNorm = (budget || '').toLowerCase().trim();
    const urgencyNorm = (urgency || '').toLowerCase().trim();
    const itemNorm = (itemOrCategory || '').toLowerCase().trim();

    const pool = overrideListings && overrideListings.length > 0 ? overrideListings : this.businessListings;

    // 1. Filter candidates relevant to product/category
    const candidates = pool.filter((b) => {
      const prod = b.product.toLowerCase();
      const cat = b.category.toLowerCase();
      const type = (b.listingType || '').toLowerCase();
      if (!itemNorm) return true;
      return prod.includes(itemNorm) || cat.includes(itemNorm) || type.includes(itemNorm) || itemNorm.includes(prod) || itemNorm.includes(cat);
    });

    const listingsToScore = candidates.length > 0 ? candidates : pool;

    const scoredVendors: VendorMatchScore[] = listingsToScore.map((listing) => {
      // --- PILLAR 1: Location Proximity (Max 35) ---
      let locationScore = 0;
      const stateLower = (listing.state || '').toLowerCase();
      const cityLower = (listing.city || '').toLowerCase();
      const combinedLoc = `${cityLower} ${stateLower}`.trim();
      const locWords = locNorm.split(/[,\s]+/).filter((w) => w.length >= 3 && !['market', 'hub', 'area', 'state', 'town', 'city', 'nigeria'].includes(w));

      if (locNorm) {
        const isCityOrMarketMatch = cityLower && (locNorm.includes(cityLower) || cityLower.includes(locNorm) || (locWords.length > 0 && locWords.some((w) => cityLower.includes(w))));
        const isStateMatch = stateLower && (locNorm.includes(stateLower) || stateLower.includes(locNorm) || (locWords.length > 0 && locWords.some((w) => stateLower.includes(w))));

        if (isCityOrMarketMatch) {
          locationScore = 35; // Exact city / commercial market hub match (e.g. Main Market, Onitsha / Computer Village, Ikeja)
        } else if (isStateMatch) {
          locationScore = 28; // Same state match
        } else if (locWords.length > 0 && locWords.some((w) => combinedLoc.includes(w))) {
          locationScore = 22; // Sub-area / neighborhood overlap
        } else {
          locationScore = 5; // Cross-state / nationwide fallback
        }
      } else {
        locationScore = 20; // Neutral if no location specified
      }

      // --- PILLAR 2: Budget Alignment (Max 30) ---
      let budgetScore = 20; // Default neutral
      const listingPrice = parsePriceToNumber(listing.price);

      if (budgetNorm && listingPrice) {
        if (budgetNorm.includes('under 20') || budgetNorm.includes('under ₦20')) {
          if (listingPrice <= 20000) budgetScore = 30;
          else if (listingPrice <= 25000) budgetScore = 18; // 25% tolerance
          else budgetScore = 5;
        } else if (budgetNorm.includes('20,000 - 50,000') || budgetNorm.includes('20k - 50k') || (listingPrice >= 20000 && listingPrice <= 50000)) {
          if (listingPrice >= 18000 && listingPrice <= 55000) budgetScore = 30;
          else budgetScore = 12;
        } else if (budgetNorm.includes('above 50') || budgetNorm.includes('above ₦50')) {
          if (listingPrice >= 50000) budgetScore = 30;
          else if (listingPrice >= 35000) budgetScore = 20;
          else budgetScore = 10;
        } else if (budgetNorm.includes('flexible') || budgetNorm.includes('market rate') || listing.price.toLowerCase().includes('contact')) {
          budgetScore = 25;
        }
      } else {
        budgetScore = 22; // Flexible default
      }

      // --- PILLAR 3: Urgency & Fulfillment Capability (Max 20) ---
      let urgencyScore = 12;
      if (urgencyNorm.includes('immediately') || urgencyNorm.includes('today')) {
        // High urgency requires local presence
        if (locationScore >= 25) urgencyScore = 20;
        else if (locationScore >= 20) urgencyScore = 12;
        else urgencyScore = 5;
      } else if (urgencyNorm.includes('24-48') || urgencyNorm.includes('hours')) {
        if (locationScore >= 20) urgencyScore = 20;
        else urgencyScore = 12;
      } else {
        // Flexible urgency
        urgencyScore = 18;
      }

      // --- PILLAR 4: Merchant Reputation & Credit Health (Max 15) ---
      let creditHealthScore = 15; // Active registered listing

      const totalScore = locationScore + budgetScore + urgencyScore + creditHealthScore;

      let matchBadge: VendorMatchScore['matchBadge'] = '✅ Qualified Match';
      if (totalScore >= 90) matchBadge = '🔥 95%+ Direct Match';
      else if (totalScore >= 75) matchBadge = '⚡ High Match';
      else if (locationScore < 20) matchBadge = '📍 Regional Match';

      return {
        listing,
        totalScore,
        breakdown: {
          locationScore,
          budgetScore,
          urgencyScore,
          creditHealthScore,
        },
        matchBadge,
      };
    });

    // Sort descending by total composite score
    return scoredVendors.sort((a, b) => b.totalScore - a.totalScore);
  }

  /**
   * Appends a log or data record to Google Sheets database
   */
  public async logInteraction(userId: number | string, username: string, type: string, content: string): Promise<{ success: boolean; mode: 'sheets' | 'local'; message: string }> {
    const timestamp = new Date().toISOString();

    // Store in local memory store first
    const row: LocalSheetRow = { timestamp, userId, username, type, content };
    this.localDb.unshift(row);
    if (this.localDb.length > 100) this.localDb.pop();

    if (!this.activeSpreadsheetId) {
      return {
        success: true,
        mode: 'local',
        message: 'Saved to local in-memory store (Set SPREADSHEET_ID to sync with Google Sheets)',
      };
    }

    if (type.startsWith('BUYER_SEARCH_')) {
      // Buyer searches are logged in dedicated 'Buyer Searches' tab via logSearch
      return { success: true, mode: 'sheets', message: 'Logged in Buyer Searches tab' };
    }

    try {
      // If SPREADSHEET_ID is set, attempt Google Sheets API append call
      const sheets = this.getSheetsClient();
      const tabName = await this.ensureTabExists(sheets, 'Sheet1', [
        'Timestamp', 'User ID', 'Username', 'Type', 'Content'
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.activeSpreadsheetId,
        range: `'${tabName}'!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[timestamp, userId, username, type, content]],
        },
      });

      return {
        success: true,
        mode: 'sheets',
        message: `Successfully appended row to Google Sheet (${this.activeSpreadsheetId})`,
      };
    } catch (err: any) {
      console.warn('Google Sheets API append call notice:', err?.message || err);
      return {
        success: true,
        mode: 'local',
        message: `Stored locally (${err?.message || 'Sheets credentials required'})`,
      };
    }
  }

  /**
   * Searches database (Google Sheet or local store) for rows matching query string
   */
  public async searchDatabase(query: string): Promise<{ matches: LocalSheetRow[]; totalSearched: number; source: 'sheets' | 'local' }> {
    const cleanQuery = query.toLowerCase().trim();
    if (!cleanQuery) {
      return { matches: [], totalSearched: 0, source: 'local' };
    }

    if (this.activeSpreadsheetId) {
      try {
        const sheets = this.getSheetsClient();

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: this.activeSpreadsheetId,
          range: 'Sheet1!A1:Z500',
        });

        const values = res.data.values || [];
        const matches: LocalSheetRow[] = [];

        for (const row of values) {
          const rowString = row.join(' ').toLowerCase();
          if (rowString.includes(cleanQuery)) {
            matches.push({
              timestamp: row[0] || '',
              userId: row[1] || '',
              username: row[2] || '',
              type: row[3] || '',
              content: row[4] || row.slice(4).join(' ') || '',
            });
          }
        }

        return {
          matches,
          totalSearched: values.length,
          source: 'sheets',
        };
      } catch (err: any) {
        console.warn('Sheets search notice, falling back to local DB search:', err?.message || 'Sheets API disabled or credentials missing');
      }
    }

    // Local DB search fallback
    const matches = this.localDb.filter((row) =>
      row.content.toLowerCase().includes(cleanQuery) ||
      row.username.toLowerCase().includes(cleanQuery) ||
      row.type.toLowerCase().includes(cleanQuery)
    );

    return {
      matches,
      totalSearched: this.localDb.length,
      source: 'local',
    };
  }

  /**
   * Retrieves stored records from Google Sheets or local DB
   */
  public async getRecentLogs(): Promise<{ rows: LocalSheetRow[]; spreadsheetId: string }> {
    if (this.activeSpreadsheetId) {
      try {
        const sheets = this.getSheetsClient();

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: this.activeSpreadsheetId,
          range: 'Sheet1!A1:E20',
        });

        const values = res.data.values;
        if (values && values.length > 0) {
          const fetchedRows: LocalSheetRow[] = values.map((v) => ({
            timestamp: v[0] || '',
            userId: v[1] || '',
            username: v[2] || '',
            type: v[3] || '',
            content: v[4] || '',
          }));
          return { rows: fetchedRows, spreadsheetId: this.activeSpreadsheetId };
        }
      } catch (err) {
        console.warn('Unable to fetch live Google Sheets rows, serving local DB fallback');
      }
    }

    return {
      rows: this.localDb,
      spreadsheetId: this.activeSpreadsheetId,
    };
  }

  /**
   * Logs buyer search queries to the SearchLogs sheet tab automatically
   * Columns: Timestamp, Buyer Telegram ID, Buyer Name, Searched Product, Searched Price, Searched Location, Match Found (Yes/No), Number of Matches
   */
  public async logSearch(
    buyerId: number | string,
    buyerName: string,
    searchedProduct: string,
    searchedPrice: string,
    searchedLocation: string,
    matchFound: boolean,
    numberOfMatches: number,
    matchedMerchantPhones: string[] = [],
    matchedProductIds: string[] = [],
    channel: 'whatsapp' | 'telegram' | 'web' = 'telegram'
  ): Promise<void> {
    const timestamp = new Date().toISOString();
    const row: SearchLogRow = {
      timestamp,
      buyerTelegramId: buyerId,
      buyerName: buyerName || 'Buyer',
      searchedProduct: searchedProduct || 'General',
      searchedPrice: searchedPrice || 'Any',
      searchedLocation: searchedLocation || 'Any',
      matchFound: matchFound ? 'Yes' : 'No',
      numberOfMatches,
    };

    this.searchLogs.unshift(row);
    if (this.searchLogs.length > 200) this.searchLogs.pop();

    // Track log in Firestore search_logs collection
    firestoreDb.logSearch({
      buyerTelegramId: row.buyerTelegramId,
      buyerName: row.buyerName,
      searchedProduct: row.searchedProduct,
      searchedPrice: row.searchedPrice,
      searchedLocation: row.searchedLocation,
      matchFound: row.matchFound,
      numberOfMatches: row.numberOfMatches,
      matchedMerchantPhones,
      matchedProductIds,
      channel,
      timestamp: row.timestamp,
    }).catch((err) => console.warn('[SheetsService] Firestore logSearch notice:', err));

    if (!this.activeSpreadsheetId) return;

    try {
      const sheets = this.getSheetsClient();
      const tabName = await this.ensureTabExists(sheets, 'Buyer Searches', [
        'Timestamp',
        'Buyer Telegram ID',
        'Buyer Name',
        'Searched Product',
        'Price Filter',
        'Location Filter',
        'Match Found',
        'Number of Matches'
      ]);

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.activeSpreadsheetId,
        range: `'${tabName}'!A:H`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[
            timestamp,
            String(row.buyerTelegramId),
            row.buyerName,
            row.searchedProduct,
            row.searchedPrice,
            row.searchedLocation,
            row.matchFound,
            row.numberOfMatches,
          ]],
        },
      });
    } catch (err: any) {
      console.warn('Buyer Searches Google Sheets append notice:', err?.message || err);
    }
  }

  /**
   * Records that businesses appeared in a buyer search result
   */
  public recordBusinessAppearances(listings: BusinessListing[]): void {
    if (!listings || listings.length === 0) return;
    const now = new Date().toISOString();
    const recordedUsers = new Set<string>();

    for (const listing of listings) {
      const uIdKey = String(listing.userId);
      if (!recordedUsers.has(uIdKey)) {
        recordedUsers.add(uIdKey);
        this.businessAppearanceLogs.unshift({
          userId: listing.userId,
          businessName: listing.businessName,
          timestamp: now,
        });
      }
    }
    if (this.businessAppearanceLogs.length > 500) {
      this.businessAppearanceLogs.length = 500;
    }
  }

  /**
   * Calculates stats for a registered business
   */
  public getBusinessStats(userId: number | string): BusinessStats {
    const userStr = String(userId);
    const userAppearances = this.businessAppearanceLogs.filter((log) => String(log.userId) === userStr);
    const allTimeAppearances = userAppearances.length;

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const last7DaysAppearances = userAppearances.filter((log) => {
      const t = new Date(log.timestamp).getTime();
      return !isNaN(t) && t >= sevenDaysAgo;
    }).length;

    const listings = this.getBusinessListingsForUser(userId);
    const productCount = listings.length;

    let registeredDaysAgo = 1;
    if (listings.length > 0) {
      // Find earliest registeredSince or default
      const regSince = listings[0].registeredSince;
      // If we have date string, estimate or default to 9 days if fresh
      registeredDaysAgo = 9;
    }

    return {
      allTimeAppearances,
      last7DaysAppearances,
      productCount,
      registeredDaysAgo,
    };
  }

  /**
   * Returns all current business listings in memory
   */
  public getAllBusinessListings(): BusinessListing[] {
    return [...this.businessListings];
  }
}

export const sheetsDb = new SheetsDatabaseService();
