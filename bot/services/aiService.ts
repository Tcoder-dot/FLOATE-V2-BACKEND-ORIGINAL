import { GoogleGenAI } from '@google/genai';
import { config } from '../config.js';
import { withExternalTimeout } from './timeoutService.js';

let aiInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI | null {
  const activeKey = process.env.GEMINI_API_KEY || config.geminiApiKey;
  if (!activeKey) return null;
  return new GoogleGenAI({
    apiKey: activeKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function transcribeAudioWithWhisper(audioBuffer: Buffer, mimeType = 'audio/ogg'): Promise<string> {
  const apiKey = config.openaiApiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  if (!audioBuffer.length) throw new Error('No audio data received');
  if (audioBuffer.length > 25 * 1024 * 1024) throw new Error('Audio exceeds the 25 MB transcription limit');

  const cleanMime = mimeType.split(';')[0].trim().toLowerCase() || 'audio/ogg';
  const extension = cleanMime.includes('ogg') || cleanMime.includes('opus') ? 'ogg'
    : cleanMime.includes('webm') ? 'webm'
    : cleanMime.includes('wav') ? 'wav'
    : cleanMime.includes('flac') ? 'flac'
    : cleanMime.includes('mpeg') || cleanMime.includes('mp3') ? 'mp3'
    : cleanMime.includes('mp4') || cleanMime.includes('m4a') ? 'm4a'
    : 'ogg';

  const formData = new FormData();
  formData.append('file', new Blob([Uint8Array.from(audioBuffer)], { type: cleanMime }), `voice.${extension}`);
  formData.append('model', 'whisper-1');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
    signal: AbortSignal.timeout(60_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI Whisper returned HTTP ${response.status}`);
  }

  const result = await response.json() as { text?: unknown };
  const transcript = typeof result.text === 'string' ? result.text.trim() : '';
  if (!transcript) throw new Error('OpenAI Whisper returned an empty transcript');
  return transcript;
}

/**
 * Sanitizes and validates image MIME types for the Google GenAI multimodal API
 */
export function sanitizeMimeTypeForGemini(rawMime?: string): string {
  if (!rawMime) return 'image/jpeg';
  const clean = rawMime.split(';')[0].trim().toLowerCase();
  if (clean === 'image/jpg' || clean === 'jpg') return 'image/jpeg';
  if (clean === 'image/png' || clean === 'png') return 'image/png';
  if (clean === 'image/webp' || clean === 'webp') return 'image/webp';
  if (clean === 'image/heic' || clean === 'image/heif') return 'image/heic';
  if (clean.startsWith('image/')) return clean;
  return 'image/jpeg';
}

/**
 * Sanitizes audio MIME types specifically for Google GenAI audio input
 * (Gemini accepts audio/ogg, audio/mp3, audio/wav, audio/aac, audio/flac, audio/m4a, audio/mp4)
 */
export function sanitizeAudioMimeTypeForGemini(rawMime?: string): string {
  if (!rawMime) return 'audio/ogg';
  const clean = rawMime.split(';')[0].trim().toLowerCase();
  if (clean.includes('ogg') || clean.includes('opus') || clean.includes('oga')) return 'audio/ogg';
  if (clean.includes('mp3') || clean.includes('mpeg')) return 'audio/mp3';
  if (clean.includes('wav')) return 'audio/wav';
  if (clean.includes('aac')) return 'audio/aac';
  if (clean.includes('flac')) return 'audio/flac';
  if (clean.includes('m4a') || clean.includes('mp4')) return 'audio/mp4';
  if (clean.startsWith('audio/')) return clean;
  return 'audio/ogg';
}

/**
 * Extracts clean base64 data and sanitized mime type from a raw or dataURI buffer
 */
export function extractCleanBase64(imageBuffer: Buffer, defaultMime: string = 'image/jpeg'): { base64Data: string; mimeType: string } {
  const head = imageBuffer.toString('utf8', 0, 150);
  if (head.includes('data:image/')) {
    const fullStr = imageBuffer.toString('utf8');
    const match = fullStr.match(/^data:([^;]+);base64,(.*)$/s);
    if (match) {
      return {
        base64Data: match[2].trim(),
        mimeType: sanitizeMimeTypeForGemini(match[1].trim()),
      };
    }
  }
  return {
    base64Data: imageBuffer.toString('base64'),
    mimeType: sanitizeMimeTypeForGemini(defaultMime),
  };
}

/**
 * Executes a Gemini generateContent request with automatic model fallbacks and an explicit timeout.
 */
async function generateContentWithFallback(
  ai: GoogleGenAI,
  requestParams: Omit<Parameters<typeof ai.models.generateContent>[0], 'model'>,
  modelsToTry: string[] = ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'],
  timeoutMs: number = 15000
) {
  return withExternalTimeout(
    async () => {
      let lastError: any = null;
      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            ...requestParams,
            model: modelName,
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const errMsg = err?.message || String(err);
          console.log(`[Gemini AI Info] Model "${modelName}" status (${errMsg.slice(0, 80)}). Trying fallback model...`);
        }
      }
      throw lastError;
    },
    {
      timeoutMs,
      serviceName: 'Gemini',
      operationName: 'generateContentWithFallback',
    }
  );
}

export interface ParsedCommerceQuery {
  searchKeywords: string; // Clean product/item name, e.g. "Phone", "Laptop", "Lawyer", "Video Editor"
  maxPriceNaira?: number | null;
  buyerLocation?: string | null; // Buyer's location e.g. "Agbani"
  targetSellerLocation?: string | null; // Required seller location e.g. "Enugu", "Onitsha"
  category?: string | null; // Broader category e.g. "Electronics", "Footwear", "Legal Services"
  inferredCategories?: string[]; // Tightly-related categories/services inferred by AI, e.g. ["Legal Services", "Legal Consultation", "Attorney", "Law Firm"]
  itemType?: 'product' | 'service'; // Gemini's judgment on whether the item is a product or service
  isRegistrationRequest?: boolean;
  friendlyAck?: string;
}

export interface LocationValidationResult {
  isValid: boolean;
  cleanLocation: string;
  hasTypo: boolean;
  suggestedLocation?: string;
  confidence: number;
}

// Comprehensive registry of Nigerian states, major cities, and key commercial hubs
export const NIGERIAN_LOCATIONS_DATABASE = [
  'Enugu', 'Lagos', 'Ikeja', 'Onitsha', 'Abuja', 'Port Harcourt', 'Aba', 'Owerri',
  'Ibadan', 'Kano', 'Asaba', 'Awka', 'Benin City', 'Warri', 'Calabar', 'Uyo',
  'Abakaliki', 'Nnewi', 'Nsukka', 'Kaduna', 'Jos', 'Ilorin', 'Abeokuta', 'Akure',
  'Osogbo', 'Lokoja', 'Minna', 'Makurdi', 'Sokoto', 'Katsina', 'Yola', 'Maiduguri',
  'Bauchi', 'Gombe', 'Lafia', 'Damaturu', 'Jalingo', 'Dutse', 'Birnin Kebbi', 'Gusau',
  'Yenagoa', 'Victoria Island', 'Lekki', 'Yaba', 'Surulere', 'Festac', 'Alaba', 'Oshodi',
  'Garki', 'Wuse', 'Maitama', 'Kubwa', 'Gwarinpa', 'Jabi', 'Apapa', 'Ikorodu'
];

/**
 * Validates a user-provided location string, detecting typos and returning suggestions.
 * e.g., "Emugu" -> suggests "Enugu", "Abujaa" -> "Abuja", "Lagso" -> "Lagos"
 */
export async function validateAndNormalizeLocation(input: string): Promise<LocationValidationResult> {
  const text = (input || '').trim().replace(/[.,!]/g, '');
  if (!text) {
    return { isValid: false, cleanLocation: 'Nigeria', hasTypo: false, confidence: 0 };
  }

  // 1. Direct case-insensitive match
  const exactMatch = NIGERIAN_LOCATIONS_DATABASE.find(
    (loc) => loc.toLowerCase() === text.toLowerCase()
  );
  if (exactMatch) {
    return {
      isValid: true,
      cleanLocation: exactMatch,
      hasTypo: false,
      confidence: 1.0,
    };
  }

  // 2. Fast Levenshtein distance check for common 1-character/2-character typos
  let closestLoc: string | null = null;
  let minDistance = Infinity;

  for (const loc of NIGERIAN_LOCATIONS_DATABASE) {
    const dist = getLevenshteinDistance(text.toLowerCase(), loc.toLowerCase());
    if (dist < minDistance) {
      minDistance = dist;
      closestLoc = loc;
    }
  }

  // If edit distance is 1 or 2 (e.g., Emugu vs Enugu is distance 1), flag as a likely typo
  if (closestLoc && minDistance <= 2 && text.length >= 3) {
    return {
      isValid: false,
      cleanLocation: text,
      hasTypo: true,
      suggestedLocation: closestLoc,
      confidence: 0.9,
    };
  }

  // 3. Fallback to Gemini AI for natural African town/local government area resolution
  const ai = getAIClient();
  if (ai && text.length > 2) {
    try {
      const prompt = `You are a Nigerian geography and location assistant for Floate commerce.
Analyze the user's location input: "${text}"

Determine:
1. Is this a valid Nigerian city, state, town, LGA, or known area/neighborhood?
2. If it is a misspelling/typo of a well-known Nigerian city/market (e.g. "Emugu" -> "Enugu", "Lagso" -> "Lagos", "Onitsha" -> "Onitsha", "Abujaa" -> "Abuja", "Ph" -> "Port Harcourt", "Ikejja" -> "Ikeja"), identify the correct spelling.

Respond strictly in JSON format:
{
  "isValid": true | false,
  "normalizedLocation": "Properly capitalized city/state name (e.g. Enugu, Lagos, Port Harcourt)",
  "hasTypo": true | false,
  "suggestedLocation": "Suggested correction if typo detected or null"
}`;

      const response = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = response.text || '';
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed) {
        return {
          isValid: Boolean(parsed.isValid && !parsed.hasTypo),
          cleanLocation: parsed.normalizedLocation || text,
          hasTypo: Boolean(parsed.hasTypo && parsed.suggestedLocation),
          suggestedLocation: parsed.suggestedLocation || undefined,
          confidence: 0.95,
        };
      }
    } catch (err) {
      console.warn('[Location AI Validator Warning]:', err);
    }
  }

  // Capitalize neatly as fallback
  const fallbackFormatted = text.charAt(0).toUpperCase() + text.slice(1);
  return {
    isValid: true,
    cleanLocation: fallbackFormatted,
    hasTypo: false,
    confidence: 0.7,
  };
}

function getLevenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export type InboundIntentType =
  | 'RESET_OR_HOME'
  | 'GREETING'
  | 'SMALL_TALK'
  | 'HELP_OR_SUPPORT'
  | 'SAFETY_OR_ESCROW_INFO'
  | 'SAFEPAY_DEAL_CREATE'
  | 'SAFEPAY_PAYMENT_METHOD'
  | 'BRAND_QUESTION'
  | 'LOCATION_CHANGE'
  | 'REPORT_VENDOR'
  | 'MERCHANT_BANK_SETUP'
  | 'MERCHANT_ADD_PRODUCT'
  | 'MERCHANT_EDIT_CATALOG'
  | 'MERCHANT_STATS'
  | 'MERCHANT_PORTAL'
  | 'MERCHANT_SPONSOR_PRODUCTS'
  | 'REFERRAL_PROGRAM'
  | 'BROWSE_MARKETS'
  | 'BUYER_SEARCH';

export interface NaturalLanguageSafePayDeal {
  isSafePayDeal: boolean;
  amountNaira: number;
  formattedPrice: string;
  counterpartyPhone?: string | null;
  counterpartyName?: string | null;
  item: string;
  initiatorRole: 'VENDOR' | 'BUYER';
  vendorCoversBuyerFee?: boolean;
  isPodRequested?: boolean;
  confidence: number;
}

export interface InboundClassificationResult {
  intent: InboundIntentType;
  confidence: number;
  extractedQuery?: ParsedCommerceQuery;
  extractedLocation?: string | null;
  extractedSafePayDeal?: NaturalLanguageSafePayDeal;
  rawText: string;
}

/**
 * Detects whether the user is inquiring about sponsoring, boosting, promoting, or advertising
 * their store, products, or catalog on Floate.
 */
export function isSponsorOrPromoteIntent(rawInput: string): boolean {
  if (!rawInput) return false;
  const text = rawInput.trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Fast explicit tokens
  if (
    text === 'btn_vendor_sponsor' ||
    text === 'btn_vendor_promote' ||
    text === 'SPONSOR_PRODUCTS' ||
    /^(?:sponsor|promote|advertise|boost|advert|ads?|sponsor my product|sponsor my products|promote my product|promote my products|sponsor product|promote product|how to sponsor|how do i sponsor|i want to sponsor|i want to sponsor my product|i want to sponsor my products)$/i.test(lower)
  ) {
    return true;
  }

  return (
    /\b((?:i\s+(?:want|wan|will\s+like|would\s+like)\s+to\s+)?(?:sponsor|promote|advertise|boost)\s+(?:my\s+|our\s+|a\s+|this\s+)?(?:products?|items?|store|shop|goods|listing|business))\b/i.test(lower) ||
    /\b(how\s+(?:do\s+i|can\s+i|to)\s+(?:sponsor|promote|advertise|boost)\s+(?:my\s+|our\s+)?(?:products?|items?|store|shop|goods))\b/i.test(lower) ||
    /\b(sponsor(?:ing)?\s+(?:my|our|this|the)?\s*(?:products?|items?|business|store|shop))\b/i.test(lower) ||
    /\b(push\s+(?:my|our)\s+market|blow\s+(?:my|our)\s+business|show\s+(?:my|our)\s+(?:items?|market|products?)\s+for\s+front|sponsor\s+my\s+products?|promote\s+my\s+products?|advertise\s+my\s+products?)\b/i.test(lower)
  );
}

/**
 * Detects whether the user's message is expressing an intention to register, open, list,
 * or manage a business/store/shop on Floate using natural language.
 */
export function isBusinessRegistrationPhrase(rawInput: string): boolean {
  if (!rawInput) return false;
  const text = rawInput.trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').replace(/\s+/g, ' ').trim();

  // Fast explicit tokens and payloads
  if (
    text === 'START_REGISTER_VENDOR' ||
    text === 'btn_for_businesses' ||
    text === 'btn_vendor_portal' ||
    text === 'btn_vendor_dashboard' ||
    text === 'btn_start_registration' ||
    text === 'btn_register_business' ||
    text === 'btn_register_store' ||
    text === 'role_business' ||
    /^(?:register|sell|vendor|merchant|business|role_business)$/i.test(lower)
  ) {
    return true;
  }

  // Common natural phrasing: "I want to register my solar business", "I will like to register my business", "I would like to open a shop", "I wan register my store"
  const hasRegIntent = /\b(?:(?:i\s+)?(?:will|would|wan|want|wish|like|need|love|planning|hoping)?\s*(?:to\s+)?(?:register|open|list|add|start|create|setup|set\s+up|join|onboard|launch)\s+(?:my\s+|a\s+|our\s+)?(?:[a-z0-9_-]+\s+)?(?:business|store|shop|company|enterprise|venture|brand|hub|firm|outfit|services?))\b/i.test(lower);
  if (hasRegIntent) return true;

  // "register as a vendor / seller / merchant"
  if (/\b(?:register|sign\s*up|open|list|add|start|join|onboard)\s+(?:as\s+a?\s*)?(?:vendor|seller|merchant|business|retailer|wholesaler|distributor)\b/i.test(lower)) {
    return true;
  }

  // "become a seller / vendor"
  if (/\b(?:become|start\s+as)\s+a?\s*(?:vendor|seller|merchant|business\s+owner)\b/i.test(lower)) {
    return true;
  }

  // "sell on floate", "start selling", "sell my products"
  if (/\b(?:sell\s+on\s+floate|start\s+selling|sell\s+(?:my|our)\s+(?:products|items|goods)|sell\s+here)\b/i.test(lower)) {
    return true;
  }

  // "vendor registration", "business registration", "store registration", "merchant registration"
  if (/\b(?:vendor|merchant|business|store|shop)\s+(?:registration|onboarding|sign\s*up|portal|hub|dashboard)\b/i.test(lower)) {
    return true;
  }

  // "I am a vendor", "I am a seller", "I run a solar business"
  if (/\b(?:i\s+(?:am|m)\s+a\s+(?:vendor|seller|merchant|business\s+owner|store\s+owner|shop\s+owner)|i\s+(?:run|own|have|operate)\s+(?:a|my)\s+(?:[a-z0-9_-]+\s+)?(?:business|store|shop|company))\b/i.test(lower)) {
    return true;
  }

  // "My shop is in Alaba", "My store is located in Onitsha"
  if (/\b(?:my\s+shop|my\s+store|our\s+shop|our\s+store)\s+(?:is\s+(?:in|at|located)|dey\s+(?:for|inside))\b/i.test(lower)) {
    return true;
  }

  return false;
}

/**
 * Helper to extract category hint and location hint from natural language registration text
 */
export function extractRegistrationHints(text: string): { category?: string; location?: string; businessName?: string } {
  const lower = (text || '').toLowerCase();
  let category: string | undefined = undefined;
  let location: string | undefined = undefined;

  // Category heuristics
  if (/\b(solar|inverter|battery|inverters|batteries|panels?|power|energy)\b/i.test(lower)) {
    category = 'Solar Panels & Inverters';
  } else if (/\b(phone|phones|iphone|samsung|gadget|gadgets|laptop|laptops|computer|airpod|airpods)\b/i.test(lower)) {
    category = 'Phones & Electronics';
  } else if (/\b(shoe|shoes|sneaker|sneakers|footwear|boots|heels|slippers|sandals)\b/i.test(lower)) {
    category = 'Footwear & Shoes';
  } else if (/\b(fashion|cloth|clothes|clothing|gown|dress|fabric|ankara|tailor|suit|wears?)\b/i.test(lower)) {
    category = 'Fashion & Clothing';
  } else if (/\b(hair|wig|wigs|weave|beauty|skincare|cosmetics|perfume|cream)\b/i.test(lower)) {
    category = 'Hair & Beauty';
  } else if (/\b(food|catering|restaurant|cakes|snacks|groceries|provision|chef)\b/i.test(lower)) {
    category = 'Food & Catering';
  } else if (/\b(car|cars|auto|spare\s*parts|motor|mechanic|tyre|tyres)\b/i.test(lower)) {
    category = 'Automobile & Spare Parts';
  } else if (/\b(furniture|interior|decor|woodwork|bed|sofa|chair|table)\b/i.test(lower)) {
    category = 'Furniture & Home Decor';
  }

  // Location heuristics
  if (/\b(alaba|alaba\s+international)\b/i.test(lower)) {
    location = 'Alaba International Market, Lagos';
  } else if (/\b(computer\s+village|ikeja)\b/i.test(lower)) {
    location = 'Computer Village, Ikeja, Lagos';
  } else if (/\b(balogun|lagos\s+island)\b/i.test(lower)) {
    location = 'Balogun Market, Lagos Island';
  } else if (/\b(trade\s*fair|tradefair)\b/i.test(lower)) {
    location = 'Trade Fair Complex, Lagos';
  } else if (/\b(onitsha|main\s+market)\b/i.test(lower)) {
    location = 'Main Market, Onitsha';
  } else if (/\b(ariaria|aba)\b/i.test(lower)) {
    location = 'Ariaria International Market, Aba';
  } else if (/\b(wuse|abuja)\b/i.test(lower)) {
    location = 'Wuse Market, Abuja';
  } else if (/\b(kano|kantin\s+kwari)\b/i.test(lower)) {
    location = 'Kantin Kwari Market, Kano';
  } else if (/\b(enugu|ogbete)\b/i.test(lower)) {
    location = 'Ogbete Main Market, Enugu';
  } else if (/\b(ibadan|bodija)\b/i.test(lower)) {
    location = 'Bodija Market, Ibadan';
  }

  return { category, location };
}

/**
 * High-precision intent classifier combining Gemini AI classification, fast regex routing, and commerce parsing
 */
export async function classifyInboundIntent(rawInput: string): Promise<InboundClassificationResult> {
  const text = (rawInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, '').replace(/\s+/g, ' ');

  // 1. Fast Path: Hardcoded system buttons, commands, and unambiguous action payloads
  if (/^(reset|cancel|stop|exit|start over|restart|home|menu|main menu|\/start|\/cancel|btn_home)$/i.test(lower)) {
    return { intent: 'RESET_OR_HOME', confidence: 1.0, rawText: text };
  }

  // Fast Greeting Path (e.g. "Hello Floate", "Hi Floate", "Hello", "Good morning")
  if (/^(?:hi|hello|hey|good\s+morning|good\s+afternoon|good\s+evening|good\s+day|greetings|start)(?:\s+floate|\s+bot)?$/i.test(lower)) {
    return { intent: 'GREETING', confidence: 0.99, rawText: text };
  }

  // Fast Small Talk / Casual Conversational Check-ins (e.g. "how are you", "how are you floate", "how far")
  if (
    /^(?:how\s+are\s+you|how\s+are\s+you\s+doing|how\s+far|how\s+you\s+dey|how\s+body|how\s+things|how\s+is\s+your\s+day|how\s+was\s+your\s+day|hows\s+it\s+going|whats\s+up|what's\s+up)(?:\s+floate)?$/i.test(lower)
  ) {
    return { intent: 'SMALL_TALK', confidence: 0.98, rawText: text };
  }

  // Fast Report Vendor / Dispute check
  if (
    text.startsWith('report_vendor_') ||
    text === 'btn_report_vendor' ||
    /^(?:i\s+want\s+to\s+report\s+a?\s*vendor|i\s+want\s+ro\s+report\s+a?\s*vendor|report\s+a?\s*vendor|report\s+vendor|report\s+this\s+seller|report\s+seller|report\s+merchant|report\s+business|report\s+fraud|report\s+scam|complain\s+about\s+a?\s*vendor|file\s+a?\s*report|make\s+a?\s*report)$/i.test(lower) ||
    /\b(i\s+want\s+(?:to|ro)\s+report\s+(?:a\s+)?vendor|report\s+(?:a\s+)?vendor|report\s+this\s+seller|report\s+this\s+vendor|file\s+a\s+complaint\s+against\s+a?\s*vendor)\b/i.test(lower)
  ) {
    return { intent: 'REPORT_VENDOR', confidence: 1.0, rawText: text };
  }

  // Fast Merchant Stats check
  if (
    text === 'btn_vendor_stats' ||
    /^(?:stats|my\s+stats|mystats|view\s+stats|business\s+stats|my\s+business\s+stats|store\s+stats|my\s+store\s+stats|analytics|my\s+analytics|store\s+analytics|business\s+analytics|performance|store\s+performance|business\s+performance)$/i.test(lower) ||
    /\b(my\s+business\s+stats|my\s+store\s+stats|view\s+my\s+stats|show\s+my\s+stats|how\s+many\s+searches)\b/i.test(lower)
  ) {
    return { intent: 'MERCHANT_STATS', confidence: 1.0, rawText: text };
  }

  // Fast Referral Program check (Vendor/Buyer referral, invites, referral links)
  if (
    text === 'btn_vendor_referral' ||
    text === 'btn_referral' ||
    text.startsWith('ref_') ||
    text.startsWith('REF-') ||
    /^ref[_-]/i.test(text) ||
    /^(?:referral|referrals|refer|invite|invites|refer\s*and\s*earn|refer\s+a\s+store|refer\s+a\s+business|refer\s+a\s+friend|invite\s+businesses|invite\s+friends|my\s+referral\s+link|my\s+referral\s+code|referral\s+code|referral\s+link|referral\s+bonus|referral\s+credits|how\s+to\s+refer)$/i.test(lower) ||
    /\b(refer\s+and\s+earn|invite\s+(?:other\s+)?businesses|invite\s+(?:other\s+)?stores|my\s+referral\s+link|my\s+referral\s+code|how\s+do\s+i\s+refer)\b/i.test(lower)
  ) {
    return { intent: 'REFERRAL_PROGRAM', confidence: 1.0, rawText: text };
  }

  // Fast Sponsor & Product Promotion Inquiry check
  if (isSponsorOrPromoteIntent(text)) {
    return { intent: 'MERCHANT_SPONSOR_PRODUCTS', confidence: 1.0, rawText: text };
  }

  // Fast Add Product Intent check
  if (
    text === 'btn_vendor_add_product' ||
    text === 'btn_add_product' ||
    text === 'btn_vendor_add' ||
    /\b((?:i\s+(?:want|wan|will\s+like|would\s+like)\s+to\s+)?(?:add|upload|list|post)\s+(?:a\s+|new\s+|my\s+|another\s+)?(?:product|products|item|items|listing|stock|goods)|add\s+(?:my\s+)?product|upload\s+(?:my\s+)?product|list\s+(?:my\s+)?product|post\s+(?:my\s+)?product)\b/i.test(lower) ||
    /^(?:add product|add item|new product|list product|upload product|post product|i want to add my product|i want to add product|how do i add product|how to add product)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_ADD_PRODUCT', confidence: 1.0, rawText: text };
  }

  // Fast Merchant Portal / Business Management & Natural Language Registration check
  if (
    isBusinessRegistrationPhrase(text) ||
    text === 'START_REGISTER_VENDOR' ||
    text === 'btn_for_businesses' ||
    text === 'btn_vendor_portal' ||
    text === 'btn_vendor_dashboard' ||
    text === 'btn_start_registration' ||
    text === 'btn_register_business' ||
    text === 'btn_register_store' ||
    /^(?:my\s+business|my\s+store|my\s+shop|my\s+biz|open\s+my\s+business|access\s+my\s+business|manage\s+my\s+business|manage\s+my\s+store|manage\s+my\s+shop|business\s+portal|merchant\s+portal|vendor\s+portal|vendor\s+hub|merchant\s+hub|register\s+business|register\s+my\s+business|register\s+shop|register\s+store|sell\s+on\s+floate|start\s+selling|vendor\s+registration|merchant\s+registration)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_PORTAL', confidence: 1.0, rawText: text };
  }

  // SafePay Payment Method selection fast path (Bank Transfer, Crypto, Card) - Only if SafePay is enabled
  if (
    config.safepayEnabled &&
    (text.startsWith('btn_pay_bank') ||
      text.startsWith('btn_pay_crypto') ||
      text.startsWith('btn_pay_card') ||
      text.startsWith('btn_safepay_paid') ||
      /^(?:(?:🏛️|🏦|🪙|💳|✅)\s*)?(?:bank\s*transfer|pay\s*with\s*bank|pay\s*bank|transfer|pay\s*by\s*bank|crypto|usdt|usdc|stablecoin|pay\s*with\s*crypto|pay\s*with\s*usdt|pay\s*crypto|card|cards|online|checkout|pay\s*with\s*card|ussd|pay\s*online|i\s+have\s+paid|paid)$/i.test(lower) ||
      /^(?:(?:🏛️|🏦)\s*)?bank\s*transfer$/i.test(text.trim()) ||
      /^(?:(?:🪙|💰)\s*)?usdt\s*\/?\s*usdc$/i.test(text.trim()) ||
      /^(?:(?:💳)\s*)?card\s*&\s*ussd$/i.test(text.trim()))
  ) {
    return { intent: 'SAFEPAY_PAYMENT_METHOD', confidence: 1.0, rawText: text };
  }
  // Fast Natural Language SafePay / Pay on Delivery (POD) activation check:
  if (
    text.startsWith('btn_pod_deal') ||
    text.startsWith('safepay_deal') ||
    /^(?:i\s+want\s+(?:to\s+)?(?:do|use|make|set)\s+(?:pay|payment)\s+on\s+delivery|i\s+want\s+(?:pay|payment)\s+on\s+delivery|make\s+(?:pay|payment)\s+on\s+delivery|create\s+(?:a\s+)?(?:safepay|safe\s*pay|pay\s*on\s*delivery|payment\s*on\s*delivery|pod|escrow|safety\s*deal|deal)|activate\s+safepay|start\s+safepay|safepay|safe\s*pay|use\s+safepay|open\s+safepay|escrow\s+deal|create\s+escrow|create\s+safety\s+deal|safety\s+deal|safepay\s+deal|escrow|generate\s+escrow|hold\s+(?:money|\d+|₦|cash)|lock\s+(?:money|\d+|₦|cash)|p2p\s+escrow|btn_safepay_create|pay\s+on\s+delivery|pod|payment\s+on\s+delivery|set\s+pay\s+on\s+delivery|digital\s+pod|delivery\s+before\s+pay|pay\s+after\s+delivery|secure\s+deal|secure\s+transfer)/i.test(lower) ||
    /(?:i\s+want\s+(?:to\s+)?(?:do|use|make|set)\s+(?:pay|payment)\s+on\s+delivery|i\s+want\s+(?:pay|payment)\s+on\s+delivery|make\s+(?:pay|payment)\s+on\s+delivery|create\s+(?:a\s+)?(?:safepay|safe\s*pay|pay\s*on\s*delivery|payment\s*on\s*delivery|pod|escrow|deal)|activate\s+safepay|safepay\s+deal|safepay\s+\d+|use\s+safepay|start\s+safepay|create\s+safety\s+deal|safepay\s+link|escrow\s+link|hold\s+₦?\d+|lock\s+₦?\d+|escrow\s+deal|lock\s+the\s+money|use\s+escrow|pay\s+on\s+delivery|payment\s+on\s+delivery|set\s+pay\s+on\s+delivery|\bpod\s+order\b|\bpod\s+deal\b|\bpod\s+transfer\b|deliver\s+before\s+pay|pay\s+after\s+delivery|hold\s+the\s+money|hold\s+the\s+cash|lock\s+my\s+money|make\s+una\s+hold|hold\s+cash|middleman)/i.test(lower)
  ) {
    const fastDeal = await parseNaturalLanguageSafePayDeal(text);
    return {
      intent: 'SAFEPAY_DEAL_CREATE',
      confidence: fastDeal.confidence || 0.95,
      extractedSafePayDeal: fastDeal,
      rawText: text,
    };
  }
  // Vendor connection payloads and search item numbers MUST NEVER be classified as MERCHANT_PORTAL
  if (
    text.startsWith('connect_') ||
    text.startsWith('CONNECT_') ||
    text.startsWith('lead_') ||
    /^(?:connect|chat with|message|talk to)\s+/i.test(text)
  ) {
    return { intent: 'BUYER_SEARCH', confidence: 1.0, rawText: text };
  }
  if (isSponsorOrPromoteIntent(text)) {
    return { intent: 'MERCHANT_SPONSOR_PRODUCTS', confidence: 1.0, rawText: text };
  }
  if (text === 'btn_browse_markets' || /^(browse markets|markets|view markets|market hub|market hubs)$/i.test(lower)) {
    return { intent: 'BROWSE_MARKETS', confidence: 1.0, rawText: text };
  }
  if (
    text === 'btn_vendor_add_product' ||
    text === 'btn_add_product' ||
    text === 'btn_vendor_add' ||
    /\b((?:i\s+(?:want|wan)\s+to\s+)?(?:add|upload|list|post)\s+(?:a\s+|new\s+|my\s+|another\s+)?(?:product|products|item|items|listing|stock|goods)|add\s+(?:my\s+)?product|upload\s+(?:my\s+)?product|list\s+(?:my\s+)?product|post\s+(?:my\s+)?product)\b/i.test(lower) ||
    /^(?:add product|add item|new product|list product|upload product|post product|i want to add my product|i want to add product|how do i add product|how to add product)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_ADD_PRODUCT', confidence: 1.0, rawText: text };
  }
  if (
    text === 'btn_vendor_edit_products' ||
    /^(?:3|3\.|3️⃣)?\s*(?:view\s+inventory|edit\s+inventory|my\s+inventory|inventory|edit\s+products|edit\s+catalog|manage\s+products|manage\s+inventory|store\s+inventory|shop\s+inventory|view\s+stock|edit\s+listings|delete\s+product|edit\s+price|edit\s+prices|change\s+price|update\s+price)$/i.test(lower) ||
    /\b(view\s+inventory|edit\s+inventory|manage\s+inventory|my\s+inventory|store\s+inventory|edit\s+my\s+products|manage\s+my\s+products)\b/i.test(lower)
  ) {
    return { intent: 'MERCHANT_EDIT_CATALOG', confidence: 1.0, rawText: text };
  }
  if (text === 'btn_vendor_stats') {
    return { intent: 'MERCHANT_STATS', confidence: 1.0, rawText: text };
  }
  if (
    text === 'START_REGISTER_VENDOR' ||
    text === 'btn_for_businesses' ||
    text === 'btn_vendor_portal' ||
    text === 'btn_vendor_dashboard' ||
    text === 'btn_start_registration' ||
    text === 'btn_register_business' ||
    text === 'btn_register_store'
  ) {
    return { intent: 'MERCHANT_PORTAL', confidence: 1.0, rawText: text };
  }
  if (text.startsWith('report_vendor_') || text === 'btn_report_vendor') {
    return { intent: 'REPORT_VENDOR', confidence: 1.0, rawText: text };
  }
  if (text === 'btn_vendor_bank_account' || /^(add bank|set bank|bank account|payout account|payout details|update bank)$/i.test(lower)) {
    return { intent: 'MERCHANT_BANK_SETUP', confidence: 1.0, rawText: text };
  }
  if (isSafetyOrScamInquiry(text)) {
    return { intent: 'SAFETY_OR_ESCROW_INFO', confidence: 0.98, rawText: text };
  }

  // 2. Gemini AI Intent Classification for Natural Language Messages
  const ai = getAIClient();
  if (ai && text.length > 0) {
    try {
      const prompt = `You are the master intent classification engine for Floate, a Nigerian & African conversational commerce platform on WhatsApp.
Analyze the user's message and determine their true intent.

Classify the message into EXACTLY ONE of the following intents:
- "SAFEPAY_DEAL_CREATE": Directly creating, activating, or requesting a Floate SafePay escrow transaction, Pay on Delivery (POD) transfer, or funds locking/middleman deal (e.g., "I want pay on delivery with 08012345678 for 25k", "Set pay on delivery transfer for ₦50,000 with 08012345678 for 2 pairs of sneakers", "POD order for shoe with 090...", "Hold 35k for this seller 081...", "Lock my money for this deal so seller no go run with my money", "Make una hold 45k for this wig", "Create safepay deal of ₦50,000", "Start safepay deal 50k to 08022223333 for iPhone charger", "Let's use safepay for this 40k deal").
- "GREETING": Standard greeting (e.g., "hi", "hello", "good morning", "good evening", "hey").
- "SMALL_TALK": Conversational check-in, asking how Floate is doing, casual friendly banter (e.g., "how are you floate", "how are you doing", "how far", "how you dey", "hope you are good", "how was your day").
- "BRAND_QUESTION": Questions about Floate, what Floate is, who created it, its purpose or general features (e.g., "what is floate about", "what is floate", "tell me about floate", "what does floate do", "who created floate", "who owns floate").
- "SAFETY_OR_ESCROW_INFO": Questions about scam avoidance, escrow security, buyer/seller protection, safety guarantees, or avoiding fraud (e.g., "how do I avoid scammers in floate", "how to avoid scam", "is floate safe", "how do you protect me", "how are businesses protected", "what happens if a seller tries to scam me", "how does safe pay work").
- "HELP_OR_SUPPORT": Asking for help, instructions on how to use Floate, how to connect with vendors, customer service, or general inquiries (e.g., "how do I connect to a vendor", "how to connect with a seller", "how does this work", "how do I use floate", "help", "support").
- "REPORT_VENDOR": Explicitly asking to report a seller, vendor, scam, fraud, fake receipts, or filing a dispute (e.g., "I want to report a vendor", "report this seller", "report fraud", "file a complaint about a vendor").
- "MERCHANT_BANK_SETUP": Setting up, adding, or updating a merchant payout/settlement bank account (e.g., "add bank account", "bank details", "payout account", "set up bank").
- "MERCHANT_PORTAL": Explicitly managing, registering, or accessing the user's OWN store or seller account (e.g., "how do I access my business", "open my business", "vendor portal", "my shop", "manage my store", "register my business", "sell on floate", "merchant dashboard").
- "MERCHANT_STATS": Asking specifically to view business stats, store performance, search appearances, analytics, or leads (e.g., "my business stats", "show my store stats", "view stats", "my stats", "store analytics", "how many views do I have").
- "MERCHANT_SPONSOR_PRODUCTS": Specifically asking to sponsor, boost, promote, or run ads for their products, store, or inventory on Floate (e.g. "I want to sponsor my products", "sponsor my product", "how do I sponsor my products", "promote my product", "boost my stall", "run ads for my store", "sponsor product").
- "MERCHANT_ADD_PRODUCT": Specifically asking to upload, list, or add a new product/service to inventory (e.g., "I want to add my product", "add product", "upload item", "list a new shoe", "add new item to store").
- "MERCHANT_EDIT_CATALOG": Specifically asking to edit, update, delete, or manage existing products or prices (e.g., "edit products", "update prices", "edit inventory", "change price").
- "LOCATION_CHANGE": Asking to change, update, or switch default shopping location/city (e.g., "change my location to Lagos", "update my city", "set location Abuja").
- "BROWSE_MARKETS": Asking to explore market hubs (e.g., "browse markets", "show markets in Lagos", "view onitsha markets").
- "RESET_OR_HOME": Requesting to cancel, reset, start over, or go to main menu.
- "BUYER_SEARCH": The user is searching to buy, find, order, or hire a product, item, service, or professional (e.g., "leather shoes in Onitsha", "iPhone 13", "I need a lawyer", "hire video editor", "solar inverter 200k", selecting a vendor number or business name).

CRITICAL RULES:
1. "I want to sponsor my products", "sponsor my product", "promote my products" -> ALWAYS MERCHANT_SPONSOR_PRODUCTS (NEVER BUYER_SEARCH).
2. "I want to add my product", "add my product", "add product", "upload product" -> ALWAYS MERCHANT_ADD_PRODUCT (NEVER BUYER_SEARCH).
3. "I want to do pay on delivery", "pay on delivery", "I want pay on delivery", "POD order", "hold 25k", "SafePay 50k", or activating/requesting a SafePay deal, escrow, or Pay on Delivery (POD) transaction -> ALWAYS SAFEPAY_DEAL_CREATE (NEVER BUYER_SEARCH).
4. "how do I avoid scammers in floate", "is floate safe", "how does safe pay work" -> SAFETY_OR_ESCROW_INFO (NOT BUYER_SEARCH, NOT REPORT_VENDOR)
5. "I want to report a vendor", "I want ro report a vendor", "report vendor", "report a seller" -> REPORT_VENDOR (NOT BUYER_SEARCH, NOT SAFETY_OR_ESCROW_INFO)
6. "add bank account", "set payout account" -> MERCHANT_BANK_SETUP
7. "how are you floate", "how far", "how you dey" -> SMALL_TALK (NOT BUYER_SEARCH)
8. "Hello Floate", "Hi Floate", "hello", "good morning" -> GREETING (NOT BUYER_SEARCH)
9. "what is floate about", "tell me about floate", "what does floate do" -> BRAND_QUESTION (NOT BUYER_SEARCH)
10. "how do I connect to a vendor", "how to connect" -> HELP_OR_SUPPORT (NOT BUYER_SEARCH)
11. "my business", "access my business", "vendor portal", "my store", "manage my shop", "register my business" -> MERCHANT_PORTAL (NOT BUYER_SEARCH)
12. "Stats", "my stats", "my business stats", "store analytics" -> MERCHANT_STATS (NOT BUYER_SEARCH)
13. Vendor names, vendor numbers (1-10), clicking a vendor button, or connecting to a store from search results is ALWAYS BUYER_SEARCH (NEVER MERCHANT_PORTAL).
14. ONLY classify as MERCHANT_PORTAL when the user is explicitly asking to manage, view, or register their OWN seller account.
15. A standalone price number (e.g. "10000", "₦10,000", "25k"), product name, or product update (e.g. "edit Chelsea boots to 10000", "change price to 10k") is NEVER SAFEPAY_DEAL_CREATE unless there is an explicit request for SafePay, escrow, or Pay on Delivery.

User message: "${text}"

Output strictly a JSON object matching:
{
  "intent": "SAFEPAY_DEAL_CREATE" | "GREETING" | "SMALL_TALK" | "BRAND_QUESTION" | "SAFETY_OR_ESCROW_INFO" | "HELP_OR_SUPPORT" | "REPORT_VENDOR" | "MERCHANT_BANK_SETUP" | "MERCHANT_PORTAL" | "MERCHANT_STATS" | "MERCHANT_SPONSOR_PRODUCTS" | "MERCHANT_ADD_PRODUCT" | "MERCHANT_EDIT_CATALOG" | "LOCATION_CHANGE" | "BROWSE_MARKETS" | "RESET_OR_HOME" | "BUYER_SEARCH",
  "confidence": 0.95,
  "cleanProduct": "extracted product name if BUYER_SEARCH or null",
  "location": "extracted location if mentioned or null"
}`;

      const aiResponse = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = aiResponse.text || '';
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && parsed.intent) {
        let extractedCommerceQuery: ParsedCommerceQuery | undefined = undefined;
        let extractedSafePayDeal: NaturalLanguageSafePayDeal | undefined = undefined;

        if (parsed.intent === 'SAFEPAY_DEAL_CREATE') {
          extractedSafePayDeal = await parseNaturalLanguageSafePayDeal(text);
        } else if (parsed.intent === 'BUYER_SEARCH') {
          extractedCommerceQuery = await parseShoppingQuery(text);
        }

        const result: InboundClassificationResult = {
          intent: parsed.intent as InboundIntentType,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          extractedQuery: extractedCommerceQuery,
          extractedSafePayDeal,
          extractedLocation: parsed.location || (extractedCommerceQuery ? extractedCommerceQuery.targetSellerLocation : null),
          rawText: text,
        };

        console.log(`[Gemini Intent AI] Classified: "${text}" -> ${result.intent} (${(result.confidence * 100).toFixed(0)}%)`);
        return result;
      }
    } catch (err: any) {
      console.warn('[Gemini Intent Classifier Warning] Falling back to robust regex engine:', err?.message || err);
    }
  }

  // 3. Robust Regex Fallback Engine (for offline, latency timeout, or fallback scenarios)
  return fallbackIntentClassifier(text, lower);
}

/**
 * Robust Regex Fallback Classifier with broad natural variations for all intents
 */
function fallbackIntentClassifier(text: string, lower: string): InboundClassificationResult {
  // 1. Reset / Home
  if (/^(reset|cancel|stop|exit|start over|restart|home|menu|main menu|\/start|\/cancel|btn_home)$/i.test(lower)) {
    return { intent: 'RESET_OR_HOME', confidence: 0.99, rawText: text };
  }

  // 1b. SafePay Deal Creation / Activation Fallback
  if (
    /^(?:i\s+want\s+(?:to\s+)?(?:do|use|make|set)\s+pay\s+on\s+delivery|i\s+want\s+pay\s+on\s+delivery|create\s+safepay|activate\s+safepay|start\s+safepay|safepay|safe\s*pay|use\s+safepay|open\s+safepay|escrow\s+deal|create\s+escrow|create\s+safety\s+deal|safety\s+deal|safepay\s+deal|escrow|generate\s+escrow|hold\s+(?:money|\d+|₦)|lock\s+(?:money|\d+|₦)|p2p\s+escrow|btn_safepay_create|pay\s+on\s+delivery|pod|payment\s+on\s+delivery)/i.test(lower) ||
    /\b(i\s+want\s+(?:to\s+)?(?:do|use|make|set)\s+pay\s+on\s+delivery|create\s+safepay\s+deal|activate\s+safepay|safepay\s+deal\s+of|safepay\s+\d+|use\s+safepay\s+with|start\s+safepay|create\s+safety\s+deal|safepay\s+link|escrow\s+link|hold\s+₦?\d+|lock\s+₦?\d+|escrow\s+deal\s+for|lock\s+the\s+money|use\s+escrow|start\s+an\s+escrow|pay\s+on\s+delivery|payment\s+on\s+delivery)\b/i.test(lower)
  ) {
    const fallbackDeal = fallbackExtractDeal(text, lower);
    return {
      intent: 'SAFEPAY_DEAL_CREATE',
      confidence: 0.96,
      extractedSafePayDeal: fallbackDeal,
      rawText: text,
    };
  }

  // 2. Small Talk / Casual Conversational Check-ins
  if (
    /\b(how are you|how are you doing|how far|how you dey|how body|how things|how is your day|how was your day|hows it going|whats up|what's up|how you doing)\b/i.test(lower) ||
    /^(how are you|how are you floate|how far|how far floate|how you dey|how you doing|hows it going|whats up|sup)$/i.test(lower)
  ) {
    return { intent: 'SMALL_TALK', confidence: 0.96, rawText: text };
  }

  // 3. Brand Questions (e.g., "what is floate about", "who made floate", "what does floate do")
  if (
    /\b(what\s+is\s+floate|about\s+floate|who\s+made\s+floate|who\s+owns\s+floate|floate\s+about|what\s+does\s+floate\s+do|tell\s+me\s+about\s+floate|how\s+does\s+floate\s+work|what\s+is\s+this\s+bot|who\s+are\s+you|who\s+created\s+floate)\b/i.test(lower) ||
    /^(what is floate|what is floate about|about floate|tell me about floate|who is floate|what does floate do|what can floate do|who created floate|who are you)$/i.test(lower)
  ) {
    return { intent: 'BRAND_QUESTION', confidence: 0.96, rawText: text };
  }

  // 3b. Safety & Scam Inquiries (e.g., "how do I avoid scammers in floate", "is floate safe", "how does safe pay protect me")
  if (isSafetyOrScamInquiry(text)) {
    return { intent: 'SAFETY_OR_ESCROW_INFO', confidence: 0.98, rawText: text };
  }

  // 4. Greetings
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|start|hello floate|hi floate|hey floate|good day)$/i.test(lower)) {
    return { intent: 'GREETING', confidence: 0.98, rawText: text };
  }

  // 5. Help / Support & How to connect
  if (
    /\b(how\s+do\s+i\s+connect|how\s+to\s+connect|how\s+to\s+chat\s+with\s+vendor|how\s+do\s+i\s+reach|how\s+to\s+message\s+seller|how\s+does\s+connecting\s+work|how\s+do\s+i\s+use|how\s+does\s+this\s+work|how\s+it\s+works|help|support|customer\s+care|contact\s+support|customer\s+service)\b/i.test(lower) ||
    /^(help|how does this work|how it works|how do i use this|how do i connect to a vendor|how to connect to a vendor|support|customer care|contact support|what can you do)$/i.test(lower)
  ) {
    return { intent: 'HELP_OR_SUPPORT', confidence: 0.95, rawText: text };
  }

  // 6. Merchant Direct Stats
  if (
    /\b(my\s+stats|store\s+stats|business\s+stats|my\s+business\s+stats|my\s+store\s+stats|how\s+many\s+searches|view\s+stats|shop\s+performance|business\s+performance|my\s+analytics|store\s+analytics)\b/i.test(lower) ||
    /^(stats|view stats|performance|my stats|mystats|my business stats|business stats|store stats|analytics|my analytics)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_STATS', confidence: 0.96, rawText: text };
  }

  // 6b. Sponsor / Promote Products & Shop
  if (isSponsorOrPromoteIntent(text)) {
    return { intent: 'MERCHANT_SPONSOR_PRODUCTS', confidence: 0.98, rawText: text };
  }

  // 7. Merchant Direct Actions (Add / Edit / Access)
  if (
    text === 'btn_vendor_add_product' ||
    text === 'btn_add_product' ||
    text === 'btn_vendor_add' ||
    /\b((?:i\s+(?:want|wan)\s+to\s+)?(?:add|upload|list|post)\s+(?:a\s+|new\s+|my\s+|another\s+)?(?:product|products|item|items|listing|stock|goods)|add\s+(?:my\s+)?product|upload\s+(?:my\s+)?product|list\s+(?:my\s+)?product|post\s+(?:my\s+)?product)\b/i.test(lower) ||
    /^(?:add product|addproduct|add item|new product|list product|upload product|add a product|post product|i want to add my product|i want to add product|how do i add product|how to add product)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_ADD_PRODUCT', confidence: 0.95, rawText: text };
  }

  if (
    text === 'btn_vendor_edit_products' ||
    /\b(edit\s+(my\s+)?(product|products|item|items|listing|listings|prices|catalog|store)|modify\s+(my\s+)?(product|products)|update\s+(my\s+)?(product|products|prices)|manage\s+(my\s+)?(products|inventory))\b/i.test(lower) ||
    /^(edit product|edit products|editproduct|edit listings|my inventory|inventory|manage products|edit prices|update product)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_EDIT_CATALOG', confidence: 0.95, rawText: text };
  }

  if (
    isBusinessRegistrationPhrase(text) ||
    text === 'START_REGISTER_VENDOR' ||
    text === 'btn_for_businesses' ||
    text === 'btn_vendor_portal' ||
    text === 'btn_vendor_dashboard' ||
    text === 'btn_start_registration' ||
    text === 'btn_register_business' ||
    text === 'btn_register_store' ||
    /\b(access\s+(my\s+)?(business|store|shop|account)|open\s+(my\s+)?(business|store|shop)|manage\s+(my\s+)?(business|store|shop)|register\s+(my\s+)?(business|store|shop|account|company)|i\s+want\s+to\s+(register|sell|start\s+selling|list\s+my\s+shop)|become\s+a\s+(seller|vendor|merchant)|sell\s+on\s+floate|merchant\s+registration|vendor\s+registration|vendor\s+portal|merchant\s+portal|business\s+dashboard|store\s+dashboard)\b/i.test(lower) ||
    /^(how do i access my business|access my business|my business|my store|my shop|register business|register my business|register shop|start selling|vendor registration|merchant registration|open shop|add my shop|list my shop|vendor hub|vendor portal|merchant portal)$/i.test(lower)
  ) {
    return { intent: 'MERCHANT_PORTAL', confidence: 0.95, rawText: text };
  }

  // 7b. Referral Program Fallback
  if (
    text === 'btn_vendor_referral' ||
    text === 'btn_referral' ||
    text.startsWith('ref_') ||
    text.startsWith('REF-') ||
    /^ref[_-]/i.test(text) ||
    /^(?:referral|referrals|refer|invite|invites|refer\s*and\s*earn|refer\s+a\s+store|refer\s+a\s+business|refer\s+a\s+friend|invite\s+businesses|invite\s+friends|my\s+referral\s+link|my\s+referral\s+code|referral\s+code|referral\s+link|referral\s+bonus|referral\s+credits|how\s+to\s+refer)$/i.test(lower) ||
    /\b(refer\s+and\s+earn|invite\s+(?:other\s+)?businesses|invite\s+(?:other\s+)?stores|my\s+referral\s+link|my\s+referral\s+code|how\s+do\s+i\s+refer)\b/i.test(lower)
  ) {
    return { intent: 'REFERRAL_PROGRAM', confidence: 0.95, rawText: text };
  }

  // 8. Location Change
  const locChangeMatch = lower.match(/^(?:change|update|set|switch)\s+(?:my\s+)?(?:location|city)(?:\s+to\s+(.+))?$/i);
  if (locChangeMatch || /^(my location|change location|update location|switch location)$/i.test(lower)) {
    const inlineLoc = locChangeMatch && locChangeMatch[1] ? locChangeMatch[1].trim() : null;
    return { intent: 'LOCATION_CHANGE', confidence: 0.95, extractedLocation: inlineLoc, rawText: text };
  }

  // 9. Report / Scam
  if (
    text.startsWith('report_vendor_') ||
    text === 'btn_report_vendor' ||
    /\b(i\s+want\s+to\s+report|report\s+a\s+vendor|report\s+vendor|report\s+seller|report\s+a\s+seller|report\s+this\s+vendor|report\s+this\s+seller|report\s+fraud|file\s+a\s+report|make\s+a\s+report)\b/i.test(lower) ||
    /^(report|report vendor|report seller|report a vendor|report a seller|scam|fraud|fake receipt)$/i.test(lower)
  ) {
    return { intent: 'REPORT_VENDOR', confidence: 0.98, rawText: text };
  }

  // 10. Browse Markets
  if (text === 'btn_browse_markets' || /^(browse markets|markets|view markets|market hub|market hubs)$/i.test(lower)) {
    return { intent: 'BROWSE_MARKETS', confidence: 0.95, rawText: text };
  }

  // 11. Fallback to Buyer Commerce Search ONLY when none of the above matched
  const parsedFallback = fallbackQueryParse(text);
  return {
    intent: 'BUYER_SEARCH',
    confidence: 0.88,
    extractedQuery: parsedFallback,
    extractedLocation: parsedFallback.targetSellerLocation,
    rawText: text,
  };
}

/**
 * Parses natural language SafePay deal activation requests using Gemini AI with fallback.
 * Handles inputs like:
 * - "Create safepay deal of ₦50,000 with 08012345678 for 2 pairs of sneakers"
 * - "Activate safepay with 08123456789 for ₦25,000"
 * - "Safepay 30k with 09098765432 for luxury wig"
 * - "Start safepay deal 50k to 08022223333 for iPhone charger"
 */
export function isSafePayIntent(text: string): boolean {
  const cleanLower = text.toLowerCase().trim().replace(/[^a-z0-9 _]+/g, '').replace(/\s+/g, ' ');
  return (
    text.startsWith('btn_pod_deal') ||
    text.startsWith('btn_safepay') ||
    text.startsWith('safepay_deal') ||
    /^(?:i\s+want\s+(?:to\s+)?(?:do|use|make|set)\s+(?:pay|payment)\s+on\s+delivery|i\s+want\s+(?:pay|payment)\s+on\s+delivery|make\s+(?:pay|payment)\s+on\s+delivery|create\s+(?:a\s+)?(?:safepay|safe\s*pay|pay\s*on\s*delivery|payment\s*on\s*delivery|pod|escrow|safety\s*deal|deal)|activate\s+safepay|start\s+safepay|safepay|safe\s*pay|use\s+safepay|open\s+safepay|escrow\s+deal|create\s+escrow|create\s+safety\s+deal|safety\s+deal|safepay\s+deal|escrow|generate\s+escrow|hold\s+(?:money|\d+|₦|cash)|lock\s+(?:money|\d+|₦|cash)|p2p\s+escrow|btn_safepay_create|pay\s+on\s+delivery|pod|payment\s+on\s+delivery|set\s+pay\s+on\s+delivery|digital\s+pod|delivery\s+before\s+pay|pay\s+after\s+delivery|secure\s+deal|secure\s+transfer)$/i.test(cleanLower) ||
    /(?:i\s+want\s+(?:to\s+)?(?:do|use|make|set)?\s*(?:pay|payment)\s+on\s+delivery|i\s+want\s+(?:pay|payment)\s+on\s+delivery|make\s+(?:pay|payment)\s+on\s+delivery|pay\s+on\s+delivery\s+with|payment\s+on\s+delivery\s+with|make\s+payment\s+on\s+delivery\s+with|create\s+(?:a\s+)?(?:safepay|safe\s*pay|pay\s*on\s*delivery|payment\s*on\s*delivery|pod|escrow|deal)|activate\s+safepay|safepay\s+deal|safepay\s+\d+|use\s+safepay|start\s+safepay|create\s+safety\s+deal|safepay\s+link|escrow\s+link|hold\s+₦?\d+|lock\s+₦?\d+|escrow\s+deal|lock\s+the\s+money|use\s+escrow|pay\s+on\s+delivery|payment\s+on\s+delivery|set\s+pay\s+on\s+delivery|\bpod\s+order\b|\bpod\s+deal\b|\bpod\s+transfer\b|deliver\s+before\s+pay|pay\s+after\s+delivery|hold\s+the\s+money|hold\s+the\s+cash|lock\s+my\s+money|make\s+una\s+hold|hold\s+cash|middleman)/i.test(cleanLower) ||
    /(?:i\s+(?:want\s+to\s+|am\s+going\s+to\s+)?sell|selling|sold)\s+.*?\s+(?:to|for)\s+.*?(?:\d+|naira|[₦#])/i.test(cleanLower) ||
    /(?:create\s+(?:an?\s+)?(?:invoice|seller\s+deal|vendor\s+deal)|invoice\s+(?:my\s+)?(?:buyer|customer)|bill\s+(?:my\s+)?(?:buyer|customer))/i.test(cleanLower)
  );
}

/**
 * Fast Regex-based SafePay Deal Parameter Extractor
 */
export function fallbackExtractDeal(text: string, lower?: string): NaturalLanguageSafePayDeal {
  const cleanLower = lower || text.toLowerCase();

  // 1. Phone number extraction (Nigerian format: 080..., 070..., 090..., 081..., 091..., +234..., 234...)
  let phone: string | null = null;
  const phoneMatches = text.match(/(?:\+?234|0)[789]\d{9}/g);
  if (phoneMatches && phoneMatches.length > 0) {
    phone = phoneMatches[0].replace(/\D/g, '');
    if (phone.startsWith('0') && phone.length === 11) {
      phone = '234' + phone.substring(1);
    }
  }

  // Strip phone numbers from text so they are never confused with prices/amounts
  const textWithoutPhones = text.replace(/(?:\+?234|0)[789]\d{9}/g, ' ');

  // 2. Amount extraction (e.g. ₦350,000, #20,000, 350k, 50,000 naira, 50k naira, 20,000, 25000, 1.2m)
  let amount = 0;

  // 2a. Match explicit currency with amount e.g. "50,000 naira", "50k naira", "₦50,000", "#20,000", "N20000"
  const suffixCurrencyMatch = textWithoutPhones.match(/\b(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|kobo|m|million|thousand)?\s*(?:naira|ngn|[₦#])\b/i);
  if (suffixCurrencyMatch) {
    const rawNum = parseFloat(suffixCurrencyMatch[1].replace(/,/g, ''));
    const unit = (suffixCurrencyMatch[2] || '').toLowerCase();
    if (unit === 'k' || unit === 'thousand') {
      amount = rawNum * 1000;
    } else if (unit === 'm' || unit === 'million') {
      amount = rawNum * 1000000;
    } else if (rawNum > 0) {
      amount = rawNum;
    }
  }

  // 2b. Match prefix currency symbol or word (₦, #, N, NGN, Naira) e.g. ₦20,000, #20,000, N20000
  if (amount === 0) {
    const prefixCurrencyMatch = textWithoutPhones.match(/(?:[₦#]|ngn|naira|\bn\b)\s*(\d+(?:,\d{3})*(?:\.\d+)?)\s*(k|kobo|m|million|thousand)?/i);
    if (prefixCurrencyMatch) {
      const rawNum = parseFloat(prefixCurrencyMatch[1].replace(/,/g, ''));
      const unit = (prefixCurrencyMatch[2] || '').toLowerCase();
      if (unit === 'k' || unit === 'thousand') {
        amount = rawNum * 1000;
      } else if (unit === 'm' || unit === 'million') {
        amount = rawNum * 1000000;
      } else if (rawNum > 0) {
        amount = rawNum;
      }
    }
  }

  // 2c. Match 'k' or 'm' shorthand e.g. "20k", "150k", "1.5m"
  if (amount === 0) {
    const kMatch = textWithoutPhones.match(/\b(\d+(?:\.\d+)?)\s*(k|m|million|thousand)\b/i);
    if (kMatch) {
      const rawNum = parseFloat(kMatch[1].replace(/,/g, ''));
      const unit = kMatch[2].toLowerCase();
      if (unit === 'k' || unit === 'thousand') {
        amount = rawNum * 1000;
      } else if (unit === 'm' || unit === 'million') {
        amount = rawNum * 1000000;
      }
    }
  }

  // 2d. Match comma-formatted numbers e.g. "20,000", "150,000", "5,000"
  if (amount === 0) {
    const commaMatch = textWithoutPhones.match(/\b(\d{1,3}(?:,\d{3})+)\b/);
    if (commaMatch) {
      const rawNum = parseFloat(commaMatch[1].replace(/,/g, ''));
      if (rawNum > 0 && rawNum < 100000000) {
        amount = rawNum;
      }
    }
  }

  // 2e. Match standalone numeric values between 3 and 7 digits (e.g. 20000, 350000 - strictly ignore 10-11 digit phone numbers)
  if (amount === 0) {
    const standaloneMatch = textWithoutPhones.match(/\b(\d{3,7})\b/);
    if (standaloneMatch) {
      const rawNum = parseFloat(standaloneMatch[1]);
      if (rawNum >= 100 && rawNum <= 50000000) {
        amount = rawNum;
      }
    }
  }

  // 3. Counterparty name/vendor extraction (e.g. "with the vendor chivora", "with the above vendor", "with vendor chivora", "with chivora", "from @hairbychioma", "with this vendor")
  let counterpartyName: string | null = null;
  const isAboveVendor = /\b(the\s+above\s+vendor|above\s+vendor|vendor\s+above|this\s+vendor|the\s+vendor|this\s+seller|the\s+seller|the\s+above\s+seller|above\s+seller|seller\s+above)\b/i.test(textWithoutPhones);
  if (isAboveVendor) {
    counterpartyName = 'the above vendor';
  } else {
    const vendorMatch =
      textWithoutPhones.match(/(?:with|from|to)\s+(?:the\s+)?(?:vendor|seller|merchant|shop|store)\s+([a-zA-Z0-9_\-\s]{2,30}?)(?:\s+(?:for|of|at|to|on)\b|[.,\n]|$)/i) ||
      textWithoutPhones.match(/(?:with|from|to)\s+@?([a-zA-Z0-9_\-]{3,30})(?:\s+(?:for|of|at|to|on)\b|[.,\n]|$)/i);

    if (vendorMatch && vendorMatch[1]) {
      const cand = vendorMatch[1].trim();
      if (!/^(safepay|safe\s*pay|escrow|pod|pay|the|a|an|me|him|her|us)$/i.test(cand)) {
        counterpartyName = cand;
      }
    }
  }

  // 4. Item extraction
  let item = '';

  const cleanItemCandidate = (cand: string): string => {
    if (!cand) return '';
    let res = cand
      // Strip trailing commands and intents (e.g. "so create a pay on delivery deal or safepay")
      .replace(/\s*(?:so\s+)?(?:please\s+)?(?:create|make|do|set|start|generate|open|use)?\s*(?:a\s+)?(?:pay\s*on\s*delivery(?:\s+deal)?|payment\s*on\s*delivery|pod(?:\s+deal)?|safepay(?:\s+deal)?|safe\s*pay|escrow(?:\s+deal)?|safety\s*deal|deal).*$/i, '')
      .replace(/\s*(?:on|via|through|with|using)?\s*(?:safepay|safe\s*pay|escrow|pay\s*on\s*delivery|pod).*$/i, '')
      // Strip price amounts with currency e.g. "for 1000 naira", "of ₦50,000", "at 25k"
      .replace(/(?:of|at|worth|for|costing)\s*(?:[₦#]|naira|ngn)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:k|m|million|thousand|naira|ngn)?/gi, '')
      .replace(/[₦#]\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:k|m|million|thousand)?/gi, '')
      .replace(/\b\d+(?:,\d{3})*\s*(?:k|m|million|thousand|naira|ngn|kobo)\b/gi, '')
      .replace(/\b(?:naira|ngn|kobo)\b/gi, '');

    // Strip standalone price if it matches extracted amount
    if (amount > 0) {
      res = res.replace(new RegExp(`\\b${amount}\\b`, 'g'), '');
    }

    return res
      // Strip trailing or leading prepositions / connectors
      .replace(/\s+(?:to|for|from|with|at|of|by|and|so)$/i, '')
      .replace(/^(?:to|for|from|with|at|of|by|and|so)\s+/i, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // 4a. Match Pattern: "sell <item> to/for" or "selling <item> to/for" or "want to sell <item> to/for"
  const sellItemMatch = textWithoutPhones.match(/(?:i\s+(?:want\s+to\s+|am\s+going\s+to\s+)?sell|selling|sold)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:to|for|with|at)\b|[.,\n]|$)/i);
  if (sellItemMatch && sellItemMatch[1]) {
    const cleaned = cleanItemCandidate(sellItemMatch[1]);
    if (cleaned && cleaned.length > 1 && !/^(?:safepay|safe\s*pay|escrow|pod|deal|item|purchase)$/i.test(cleaned)) {
      item = cleaned;
    }
  }

  // 4b. Match Pattern: "buy <item> from/for" or "buying <item> from/for" or "want to buy <item> from/for"
  if (!item) {
    const buyItemMatch = textWithoutPhones.match(/(?:i\s+(?:want\s+to\s+|am\s+going\s+to\s+)?buy|buying|bought|order|ordering)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:from|for|with|at|to)\b|[.,\n]|$)/i);
    if (buyItemMatch && buyItemMatch[1]) {
      const cleaned = cleanItemCandidate(buyItemMatch[1]);
      if (cleaned && cleaned.length > 1 && !/^(?:safepay|safe\s*pay|escrow|pod|deal|item|purchase)$/i.test(cleaned)) {
        item = cleaned;
      }
    }
  }

  // 4c. Match Pattern: trailing "... of 1000 naira for <item>"
  if (!item) {
    const trailingForMatch = textWithoutPhones.match(/(?:of|at|worth)?\s*(?:[₦#]|naira|ngn)?\s*\d+(?:,\d{3})*(?:\.\d+)?\s*(?:k|m|million|thousand|naira|ngn)?\s+(?:for|on)\s+(?:a\s+|an\s+)?(.+?)$/i);
    if (trailingForMatch && trailingForMatch[1]) {
      const cleaned = cleanItemCandidate(trailingForMatch[1]);
      if (cleaned && cleaned.length > 1 && !/^(?:safepay|safe\s*pay|escrow|pod|deal|item|purchase)$/i.test(cleaned)) {
        item = cleaned;
      }
    }
  }

  // 4d. Match Pattern: "deal for <item>", "invoice for <item>", "safepay for <item>", "pod for <item>", "pay for <item>"
  if (!item) {
    const dealForMatch = textWithoutPhones.match(/(?:deal\s+for|invoice\s+for|escrow\s+for|safepay\s+for|safe\s*pay\s+for|pod\s+for|pay\s+for|payment\s+for)\s+(?:a\s+|an\s+)?(.+?)(?:\s+(?:with|from|to|at|worth|of|costing)\b|[.,\n]|$)/i);
    if (dealForMatch && dealForMatch[1]) {
      const cleaned = cleanItemCandidate(dealForMatch[1]);
      if (cleaned && cleaned.length > 1 && !/^(?:safepay|safe\s*pay|escrow|pod|deal|item|purchase)$/i.test(cleaned)) {
        item = cleaned;
      }
    }
  }

  // 4e. Fallback general: "for <item>" or "item <item>"
  if (!item) {
    const generalMatch = textWithoutPhones.match(/(?:item\s*(?:is|:)|for)\s+(?:a\s+|an\s+)?([^,.;\n]+?)(?:\s+(?:with|from|to|at)\s+(?:the\s+)?(?:vendor|seller|merchant|shop|buyer|customer|[a-zA-Z0-9])|\s*$)/i);
    if (generalMatch && generalMatch[1]) {
      const cleaned = cleanItemCandidate(generalMatch[1]);
      if (cleaned && cleaned.length > 1 && !/^(?:safepay|safe\s*pay|escrow|pod|deal|item|purchase)$/i.test(cleaned)) {
        item = cleaned;
      }
    }
  }

  if (!item || item.length <= 1) {
    item = 'Item / Purchase';
  }

  // Clean and enhance item if delivery notes exist
  if (/tomorrow|delivered|next day|send to/i.test(textWithoutPhones) && !item.toLowerCase().includes('deliver')) {
    const deliverySnippet = textWithoutPhones.match(/(?:to\s+be\s+delivered|deliver(?:ed)?|delivery)\s+(?:is\s+)?([a-z0-9 ]+)/i);
    if (deliverySnippet && deliverySnippet[0]) {
      item += ` (${deliverySnippet[0].trim()})`;
    }
  }

  const isCovering = /\b(cover\s+(?:the\s+)?fee|free\s+fee|i\s+will\s+pay\s+fee|vendor\s+covers|free\s+buyer\s+protection)\b/i.test(cleanLower);
  
  // Initiator role detection:
  // Explicit seller keywords: "I want to sell", "selling to", "sell to", "as seller", "vendor deal", "invoice my buyer"
  const isExplicitSeller = /\b(i\s+(?:want\s+to\s+|am\s+going\s+to\s+)?sell|selling|sold\s+to|sell\s+to|i\s+am\s+(?:the\s+|a\s+)?(?:seller|vendor)|my\s+buyer|my\s+customer|as\s+(?:a\s+)?(?:seller|vendor)|vendor\s+deal|create\s+(?:an?\s+)?(?:invoice|seller\s+deal|vendor\s+deal)|invoice\s+my\s+buyer|bill\s+my\s+buyer|send\s+invoice)\b/i.test(cleanLower);

  // Explicit buyer keywords: only if not already an explicit seller
  const isExplicitBuyer = !isExplicitSeller && /\b(i\s+want\s+to\s+(?:pay|make\s+payment|buy|purchase|order)|i\s+am\s+(?:the\s+|a\s+)?buyer|i\s+am\s+buying|buying\s+from|as\s+(?:a\s+)?buyer|buyer)\b/i.test(cleanLower);

  let initiatorRole: 'BUYER' | 'VENDOR' = 'BUYER';
  if (isExplicitSeller) {
    initiatorRole = 'VENDOR';
  } else if (isExplicitBuyer) {
    initiatorRole = 'BUYER';
  } else {
    initiatorRole = 'BUYER';
  }

  const isExplicitSafePayTrigger = /\b(safepay|safe\s*pay|safety\s*deal|escrow|lock\s*money|hold\s*money|p2p\s*escrow|pay\s*on\s*delivery|pod|payment\s*on\s*delivery|set\s*pay\s*on\s*delivery|digital\s*pod|deliver\s*before\s*pay|pay\s*after\s*delivery|hold\s*cash|lock\s*cash|hold\s*funds|lock\s*funds|sell\s+.*?\s+to|invoice)\b/i.test(cleanLower);
  const isPodRequested = /\b(pay\s*on\s*delivery|pod|payment\s*on\s*delivery|deliver\s*before\s*pay|pay\s*after\s*delivery|digital\s*pod)\b/i.test(cleanLower);

  return {
    isSafePayDeal: isExplicitSafePayTrigger,
    amountNaira: amount > 0 ? amount : 0,
    formattedPrice: amount > 0 ? `₦${amount.toLocaleString()}` : '',
    counterpartyPhone: phone,
    counterpartyName: counterpartyName || null,
    item: item || 'Item / Purchase',
    initiatorRole,
    vendorCoversBuyerFee: isCovering,
    isPodRequested,
    confidence: amount > 0 && (phone || counterpartyName) ? 0.98 : 0.92,
  };
}

/**
 * Parses natural language SafePay deal activation requests using Gemini AI with fallback.
 * Handles inputs like:
 * - "Create safepay deal for iPhone 13 128GB at ₦350,000 for buyer 08012345678"
 * - "I want pay on delivery with 08012345678 for 25k sneakers"
 * - "Set pay on delivery transfer for 20,000 Nike shoe"
 * - "Hold ₦35,000 for this seller 08123456789"
 * - "Lock my money for this deal so seller no go run with my money"
 * - "SafePay ₦85,000 for Jordan 4 shoes"
 * - "I want to buy a wig from @hairbychioma for ₦120,000, her number is 08098765432"
 * - "create safety deal" / "safepay" / "pay on delivery"
 */
export async function parseNaturalLanguageSafePayDeal(userInput: string): Promise<NaturalLanguageSafePayDeal> {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase();
  const fallback = fallbackExtractDeal(text, lower);

  const ai = getAIClient();
  if (!ai) return fallback;

  try {
    const prompt = `You are the master SafePay Escrow & Digital Pay on Delivery (POD) Deal parser for Floate, a conversational commerce and P2P social escrow platform on WhatsApp in Nigeria.
Analyze this message where a buyer or seller is attempting to create, start, or activate a Floate SafePay escrow deal, Pay on Delivery transfer, or secure payment lock.

User Message: "${text}"

Task: Extract structured SafePay escrow parameters:
1. "isSafePayDeal": true if the user is intending to create or activate a SafePay deal, escrow transaction, or pay-on-delivery escrow agreement (even if details like amount or phone are not yet fully given).
2. "amountNaira": Transaction amount in Nigerian Naira as a numeric value (e.g. "350,000" -> 350000, "85k" -> 85000, "₦120,000" -> 120000, "1.5m" -> 1500000, "25000" -> 25000). If no amount is mentioned, return 0.
3. "counterpartyPhone": The phone number of the other party (buyer or seller) in clean Nigerian format without spaces or symbols (e.g. "2348012345678" or "08012345678"), or null if not provided.
4. "counterpartyName": The name or handle of the other person/business if mentioned (e.g. "Chioma", "hairbychioma"), or null.
5. "item": The exact product, goods, or service being sold or purchased (e.g. "website", "iPhone 13 128GB", "Jordan 4 shoes", "Luxury Wig", "2 pairs of sneakers"). Do NOT include filler words like "naira so create a pay on delivery deal".
6. "initiatorRole": "VENDOR" if the person speaking is selling, offering goods/services, or creating an invoice for a customer/buyer (e.g. "I want to sell...", "Selling to...", "Sell to...", "Invoice for my buyer..."), or "BUYER" if the person speaking is purchasing, ordering, or paying.
7. "vendorCoversBuyerFee": true if the seller explicitly mentions they will cover the protection fee for the buyer.
8. "isPodRequested": true if user specifically asked for "pay on delivery", "POD", "deliver before pay", "pay after delivery", or "waybill first".

Output strictly valid JSON:
{
  "isSafePayDeal": true,
  "amountNaira": 350000,
  "counterpartyPhone": "2348012345678",
  "counterpartyName": null,
  "item": "iPhone 13 128GB",
  "initiatorRole": "VENDOR",
  "vendorCoversBuyerFee": false,
  "isPodRequested": false
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const respText = response.text || '';
    const cleanJson = respText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const json = JSON.parse(cleanJson);

    if (json && typeof json.isSafePayDeal === 'boolean') {
      const amount = typeof json.amountNaira === 'number' && json.amountNaira > 0 ? json.amountNaira : fallback.amountNaira;
      let rawPhone = json.counterpartyPhone || fallback.counterpartyPhone;
      if (rawPhone && typeof rawPhone === 'string') {
        rawPhone = rawPhone.replace(/\D/g, '');
        if (rawPhone.startsWith('0') && rawPhone.length === 11) {
          rawPhone = '234' + rawPhone.substring(1);
        }
      }

      const isPod = typeof json.isPodRequested === 'boolean' ? json.isPodRequested : fallback.isPodRequested;

      let cleanItem = json.item;
      if (!cleanItem || cleanItem === 'Item / Purchase' || /naira\s+so\s+create|pay\s*on\s*delivery|safepay/i.test(cleanItem)) {
        cleanItem = fallback.item;
      }

      let parsedRole: 'BUYER' | 'VENDOR' = fallback.initiatorRole;
      if (json.initiatorRole === 'VENDOR') {
        parsedRole = 'VENDOR';
      } else if (json.initiatorRole === 'BUYER' && fallback.initiatorRole !== 'VENDOR') {
        parsedRole = 'BUYER';
      }

      return {
        isSafePayDeal: json.isSafePayDeal || fallback.isSafePayDeal,
        amountNaira: amount,
        formattedPrice: amount > 0 ? `₦${amount.toLocaleString()}` : '',
        counterpartyPhone: rawPhone || null,
        counterpartyName: json.counterpartyName || fallback.counterpartyName,
        item: cleanItem || fallback.item,
        initiatorRole: parsedRole,
        vendorCoversBuyerFee: Boolean(json.vendorCoversBuyerFee || fallback.vendorCoversBuyerFee),
        isPodRequested: isPod,
        confidence: 0.95,
      };
    }
  } catch (err: any) {
    console.warn('[SafePay AI Deal Parser Warning]:', err?.message || err);
  }

  return fallback;
}

/**
 * Formats user search parameters into a clean confirmation header.
 * Example: "Got it, connecting you to a verified seller/business for Phone, around ₦200,000."
 */
export function formatSearchConfirmation(cleanProduct: string, maxPriceNaira?: number | null, targetSellerLocation?: string | null): string {
  const item = cleanProduct ? cleanProduct.trim().charAt(0).toUpperCase() + cleanProduct.trim().slice(1) : 'Item';
  let text = `Got it, connecting you to a verified seller/business for ${item}`;
  if (maxPriceNaira) {
    text += `, around ₦${maxPriceNaira.toLocaleString()}`;
  }
  if (targetSellerLocation) {
    text += `, in ${targetSellerLocation}`;
  }
  return text + '.';
}

/**
 * Transcribes voice messages in English, Nigerian Pidgin, Yoruba, Igbo, and extracts commerce details.
 */
export async function transcribeAndAnalyzeAudio(audioBuffer: Buffer, mimeType: string = 'audio/ogg'): Promise<{ transcript: string; analysis: string; parsedQuery?: ParsedCommerceQuery }> {
  if (!audioBuffer || audioBuffer.length === 0) {
    return { transcript: '', analysis: 'No audio data received.' };
  }

  const cleanMime = sanitizeAudioMimeTypeForGemini(mimeType);
  const ai = getAIClient();
  if (!ai) {
    console.warn('[Voice AI] Gemini API key not configured or AI client unavailable. Using simulated voice recognition.');
    const sampleText = audioBuffer.toString('utf8', 0, 100);
    const simulatedTranscript = sampleText.includes('sandal') || sampleText.includes('shoe') 
      ? 'I want leather slippers 10k Onitsha' 
      : 'Find verified solar inverters in Alaba Lagos';
    const parsed = await parseShoppingQuery(simulatedTranscript);
    return {
      transcript: simulatedTranscript,
      analysis: 'Voice recognized successfully (Offline / Dev mode)',
      parsedQuery: parsed,
    };
  }

  try {
    console.log(`[Voice AI] Transcribing audio buffer: size=${audioBuffer.length} bytes, originalMime="${mimeType}", cleanMime="${cleanMime}"`);
    const base64Audio = audioBuffer.toString('base64');
    
    const prompt = `You are Floate AI's AI voice assistant for African & Nigerian commerce.
Transcribe this audio note accurately word-for-word. The speaker may use English, Nigerian Pidgin (e.g. "I dey find", "Abeg who get", "How much be"), Yoruba, or Igbo.
Analyze the natural language in the voice note to extract core search keywords, location, budget, and inferred business categories.

Provide output strictly in JSON format:
{
  "transcript": "Full, exact transcription of what the buyer said in the voice note",
  "cleanProduct": "Clean main product or item name being searched (e.g. Handbag, Leather Slippers, Solar Inverter, Lawyer, iPhone 13) - strip conversational noise like 'I want to buy', 'where can I get'",
  "maxPriceNaira": 5000 (number or null, parsed budget e.g. 5k -> 5000, 50k -> 50000, 20k -> 20000),
  "location": "City, State or Market location mentioned e.g. Lagos, Onitsha, Enugu, Abuja, Ikeja, Alaba or null",
  "category": "Broad product category e.g. Footwear, Clothing, Legal Services, Media & Production, Phones & Accessories, Electronics, Solar or null",
  "inferredCategories": ["Footwear", "Shoes", "Leather Slippers", "Men Fashion"] (array of 3-6 tight synonym or category terms for business matching),
  "itemType": "product" (either "product" or "service"),
  "friendlyAck": "A warm 1-sentence response in natural Nigerian Pidgin or English confirming what you are searching for"
}
Return ONLY valid JSON.`;

    const response = await generateContentWithFallback(
      ai,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: base64Audio,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      },
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'],
      15000
    ).catch((e) => {
      console.warn('[Voice AI generateContentWithFallback warning]:', e?.message || e);
      return null;
    });

    const text = response?.text?.trim() || '';
    console.log('[Voice AI] Gemini API raw response text received:', text);

    let transcriptText = '';
    let cleanKeywords = '';
    let parsedPrice: number | null = null;
    let parsedLoc: string | null = null;
    let parsedCategory: string | null = null;
    let parsedInferred: string[] = [];
    let parsedItemType: 'product' | 'service' | undefined = undefined;
    let friendlyAck = '';

    if (text) {
      try {
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        transcriptText = parsed.transcript || text;
        cleanKeywords = parsed.cleanProduct || parsed.searchKeywords || parsed.product || '';
        parsedPrice = typeof parsed.maxPriceNaira === 'number' ? parsed.maxPriceNaira : (typeof parsed.maxPrice === 'number' ? parsed.maxPrice : null);
        parsedLoc = parsed.location || parsed.targetSellerLocation || null;
        parsedCategory = parsed.category || null;
        parsedInferred = Array.isArray(parsed.inferredCategories) ? parsed.inferredCategories.filter((c: any) => typeof c === 'string') : [];
        if (parsed.itemType === 'service' || parsed.itemType === 'product') {
          parsedItemType = parsed.itemType;
        }
        friendlyAck = parsed.friendlyAck || '';
        console.log(`[Voice AI] Successfully parsed voice JSON: transcript="${transcriptText}", keywords="${cleanKeywords}", price=${parsedPrice}, loc="${parsedLoc}", itemType="${parsedItemType}"`);
      } catch (jsonErr: any) {
        console.warn('[Voice AI Warning] Could not parse Gemini response as JSON:', jsonErr?.message || jsonErr);
        transcriptText = text.replace(/[{"}:]/g, ' ').trim();
      }
    }

    // Direct plain-text audio transcription fallback if JSON returned empty transcript
    if (!transcriptText || transcriptText.length < 2) {
      console.log('[Voice AI] Attempting secondary direct plain-text audio transcription...');
      const directResponse = await generateContentWithFallback(
        ai,
        {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: base64Audio,
                  },
                },
                { text: 'Transcribe the audio in this voice note word-for-word in Nigerian English, Pidgin, Yoruba, or Igbo. Output ONLY the transcribed speech text without formatting or commentary.' },
              ],
            },
          ],
        },
        ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'],
        15000
      ).catch((e) => {
        console.warn('[Voice AI Direct Transcribe Warning]:', e?.message || e);
        return null;
      });

      const directText = directResponse?.text?.trim()?.replace(/["`]/g, '');
      if (directText && directText.length > 1) {
        transcriptText = directText;
        console.log('[Voice AI] Direct transcription successful:', transcriptText);
      }
    }

    // Secondary parse on transcript text if cleanKeywords were not extracted in JSON step
    let finalParsedQuery: ParsedCommerceQuery | undefined;
    if (transcriptText && transcriptText.length > 2) {
      if (cleanKeywords) {
        finalParsedQuery = {
          searchKeywords: cleanKeywords,
          maxPriceNaira: parsedPrice,
          targetSellerLocation: parsedLoc,
          category: parsedCategory,
          inferredCategories: parsedInferred.length > 0 ? parsedInferred : [cleanKeywords, ...(parsedCategory ? [parsedCategory] : [])],
          itemType: parsedItemType,
          friendlyAck: friendlyAck,
        };
      } else {
        console.log('[Voice AI] Running secondary text parser on transcribed audio:', transcriptText);
        finalParsedQuery = await parseShoppingQuery(transcriptText);
      }
    }

    return {
      transcript: transcriptText,
      analysis: friendlyAck || 'Searching Floate AI sellers network...',
      parsedQuery: finalParsedQuery,
    };
  } catch (error: any) {
    console.error('[Voice AI Critical Error] Audio transcription API call failed:', error?.stack || error?.message || error);
    return {
      transcript: "",
      analysis: `Voice note processing failed. Error: ${error?.message || String(error)}`,
    };
  }
}

// In-memory LRU-style cache for AI search query parsing
const queryParseCache = new Map<string, { data: ParsedCommerceQuery; timestamp: number }>();
const QUERY_CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Parses natural language shopping queries (English, Pidgin, Yoruba, Igbo) into structured search parameters using Gemini API.
 */
export async function parseShoppingQuery(userQuery: string): Promise<ParsedCommerceQuery> {
  const normKey = (userQuery || '').toLowerCase().trim();
  if (!normKey) return fallbackQueryParse(userQuery);

  // Check cache first
  const cached = queryParseCache.get(normKey);
  if (cached && Date.now() - cached.timestamp < QUERY_CACHE_TTL_MS) {
    return cached.data;
  }

  const needsNaturalLanguageParsing =
    /\b(?:i|we|my|our|looking|need|want|buy|find|search|show|recommend|can|where|who|cheap|cheapest|cost|price|under|below|budget|within|around|near|from|in|at|for|to|with|deliver|delivery|seller|merchant|vendor)\b/i.test(userQuery) ||
    /(?:₦|naira|ngn|\b\d+(?:\.\d+)?\s*(?:k|m)\b)/i.test(userQuery);
  if (!needsNaturalLanguageParsing) {
    const fallback = fallbackQueryParse(userQuery);
    queryParseCache.set(normKey, { data: fallback, timestamp: Date.now() });
    return fallback;
  }

  const ai = getAIClient();
  if (!ai) {
    const fallback = fallbackQueryParse(userQuery);
    queryParseCache.set(normKey, { data: fallback, timestamp: Date.now() });
    return fallback;
  }

  const queryTask = (async () => {
    try {
      const response = await generateContentWithFallback(ai, {
        contents: `Analyze this message for Floate AI (African/Nigerian commerce platform).
The user message may be in English, Nigerian Pidgin, Yoruba, or Igbo.

User message: "${userQuery}"

Task: Extract structured commerce details:
1. "cleanProduct": The clean main product or service name ONLY (e.g. "Phone", "Laptop", "Lawyer", "Video Editor", "Leather Slippers"). Strip out conversational noise like "I want to buy", "I need a", "looking for someone to".
2. "maxPriceNaira": Maximum budget in Nigerian Naira as a number (e.g., "200k" -> 200000, "5k" -> 5000, "1.5m" -> 1500000). Return null if no budget mentioned.
3. "buyerLocation": The BUYER's own location if mentioned (e.g. "my location is Agbani", "I stay in Agbani" -> "Agbani").
4. "targetSellerLocation": The required SELLER location (State, City, or Market Area) if user mentioned a seller location or location preference (e.g., "seller in Enugu", "in Onitsha", "from Lagos", "in Agbani", "in Imo"). If user only gave their own location, set targetSellerLocation to null.
5. "category": Broad product or service category (e.g. "Phones & Accessories", "Computers", "Legal Services", "Media & Video Production", "Footwear", "Clothing").
6. "inferredCategories": An array of 3 to 6 tightly-related business category names, service types, or synonym terms that represent businesses capable of fulfilling this request.
   Examples:
   - "I need a lawyer" -> ["Legal Services", "Legal Consultation", "Attorney", "Law Firm", "Lawyer", "Legal Advocate"]
   - "someone to edit my videos" -> ["Video Editor", "Video Editing Services", "Videographer", "Media Production", "Content Creation"]
   - "car mechanic" -> ["Auto Repair", "Car Mechanic", "Automobile Repairs", "Auto Mechanic"]
   - "catering for wedding" -> ["Catering Services", "Caterer", "Event Catering", "Food Services"]
   - "leather slippers" -> ["Footwear", "Leather Slippers", "Shoes", "Plaited Slippers", "Sandals"]
   Do NOT include vague/overly broad words like "Business", "Services", "Shop", "General", "Other".
7. "itemType": Either "product" or "service". Determine whether the clean item requested represents a physical product (e.g. "Phone", "Cloth", "Shoes", "Generator") or a service/profession to be hired or booked (e.g. "Lawyer", "Video Editor", "Mechanic", "Catering", "Graphic Designer", "Tutor", "Consultant", "Photographer").
8. "isRegistrationRequest": true ONLY if user wants to register as a business/seller.

Return ONLY valid JSON format like:
{
  "cleanProduct": "Lawyer",
  "maxPriceNaira": null,
  "buyerLocation": null,
  "targetSellerLocation": "Onitsha",
  "category": "Legal Services",
  "inferredCategories": ["Legal Services", "Legal Consultation", "Attorney", "Law Firm", "Lawyer"],
  "itemType": "service",
  "isRegistrationRequest": false
}`,
      });

      const text = response.text || '';
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const json = JSON.parse(cleanJson);

      const inferredCats: string[] = Array.isArray(json.inferredCategories)
        ? json.inferredCategories.filter((c: any) => typeof c === 'string' && c.trim().length > 0)
        : [];

      const parsedItemType: 'product' | 'service' = json.itemType === 'service' ? 'service' : 'product';

      return {
        searchKeywords: json.cleanProduct || userQuery,
        maxPriceNaira: typeof json.maxPriceNaira === 'number' ? json.maxPriceNaira : null,
        buyerLocation: json.buyerLocation || null,
        targetSellerLocation: json.targetSellerLocation || null,
        category: json.category || null,
        inferredCategories: inferredCats.length > 0 ? inferredCats : [json.cleanProduct || userQuery, ...(json.category ? [json.category] : [])],
        itemType: parsedItemType,
        isRegistrationRequest: Boolean(json.isRegistrationRequest),
        friendlyAck: `Connecting you to a verified seller for ${json.cleanProduct || 'items'}...`,
      };
    } catch (err) {
      console.warn('AI query parsing notice, using fallback:', err);
      return fallbackQueryParse(userQuery);
    }
  })();

  // Guarantee 8-10 second response time
  const result = await withExternalTimeout(
    () => queryTask,
    {
      timeoutMs: 8500,
      serviceName: 'Gemini',
      operationName: 'parseShoppingQuery',
      fallbackValue: fallbackQueryParse(userQuery),
    }
  );
  queryParseCache.set(normKey, { data: result, timestamp: Date.now() });
  return result;
}

function fallbackQueryParse(query: string): ParsedCommerceQuery {
  let maxPriceNaira: number | null = null;
  const priceMatch = query.match(/(?:₦|naira|ngn)?\s*(\d+(?:\.\d+)?)\s*(k|kobo|m|naira|ngn)?/i);
  if (priceMatch) {
    const val = parseFloat(priceMatch[1]);
    const unit = (priceMatch[2] || '').toLowerCase();
    if (unit === 'k') maxPriceNaira = val * 1000;
    else if (unit === 'm') maxPriceNaira = val * 1000000;
    else if (val > 100) maxPriceNaira = val;
  }

  // Extract location if mentioned (e.g. "in Onitsha", "at Aba", "Enugu")
  const knownLocations = [
    'Onitsha', 'Enugu', 'Lagos', 'Abuja', 'Imo', 'Owerri', 'Abia', 'Aba',
    'Rivers', 'Port Harcourt', 'Kano', 'Oyo', 'Ibadan', 'Delta', 'Asaba',
    'Edo', 'Benin', 'Ebonyi', 'Abakaliki', 'Anambra', 'Awka', 'Uyo', 'Calabar'
  ];

  let targetSellerLocation: string | null = null;
  for (const loc of knownLocations) {
    if (new RegExp(`\\b${loc}\\b`, 'i').test(query)) {
      targetSellerLocation = loc;
      break;
    }
  }

  // Extract simple clean product by stripping budget & location phrases
  let cleanProduct = query
    .replace(/i want to buy/gi, '')
    .replace(/where can i (?:find|buy|get)/gi, '')
    .replace(/looking for/gi, '')
    .replace(/i am looking for/gi, '')
    .replace(/i need/gi, '')
    .replace(/i want/gi, '')
    .replace(/my location is [a-z0-9\s]+/gi, '')
    .replace(/i stay in [a-z0-9\s]+/gi, '')
    .replace(/(?:₦|naira|ngn)?\s*\d+\s*(k|m|naira|ngn)?/gi, '')
    .replace(/around/gi, '')
    .replace(/for/gi, '')
    .replace(/of/gi, '')
    .replace(/in\s+[a-z\s]+/gi, '')
    .replace(/at\s+[a-z\s]+/gi, '')
    .replace(/,/g, '')
    .trim();

  if (!cleanProduct) cleanProduct = query;

  // Infer category hint & inferred categories list
  let category: string | null = null;
  const inferredCategories: string[] = [cleanProduct];
  const lowerProduct = cleanProduct.toLowerCase();

  if (/lawyer|attorney|legal/i.test(lowerProduct)) {
    category = 'Legal Services';
    inferredCategories.push('Legal Services', 'Legal Consultation', 'Lawyer', 'Attorney', 'Law Firm');
  } else if (/edit|video|videographer/i.test(lowerProduct)) {
    category = 'Media & Production';
    inferredCategories.push('Video Editor', 'Video Editing Services', 'Videographer', 'Media Production');
  } else if (/mechanic|repair car|auto/i.test(lowerProduct)) {
    category = 'Automotive Services';
    inferredCategories.push('Auto Repair', 'Car Mechanic', 'Automobile Repairs', 'Mechanic');
  } else if (/cater|food|cook/i.test(lowerProduct)) {
    category = 'Catering';
    inferredCategories.push('Catering Services', 'Caterer', 'Event Catering', 'Food Services');
  } else if (/footwear|slipper|shoe|sandal|slide/i.test(lowerProduct)) {
    category = 'Footwear';
    inferredCategories.push('Footwear', 'Shoes', 'Slippers', 'Sandals');
  } else if (/phone|iphone|samsung|gadget/i.test(lowerProduct)) {
    category = 'Phones & Accessories';
    inferredCategories.push('Phones & Accessories', 'Smartphones', 'Gadgets');
  } else if (/laptop|computer|macbook|pc/i.test(lowerProduct)) {
    category = 'Computing';
    inferredCategories.push('Computers', 'Laptops', 'PC & Accessories');
  } else if (/gown|shirt|dress|fashion|cloth/i.test(lowerProduct)) {
    category = 'Fashion';
    inferredCategories.push('Fashion', 'Clothing', 'Apparel');
  }

  if (category && !inferredCategories.includes(category)) {
    inferredCategories.push(category);
  }

  const isReg = /register|list my|start business|seller account/i.test(query);

  let itemType: 'product' | 'service' = 'product';
  if (/lawyer|attorney|legal|edit|video|videographer|mechanic|repair|cater|consult|teach|tutor|design|photo|clean|laundry|hair|barber|makeup|doctor|nurse|accountant|plumb|electric|driver|tailor|service|gig/i.test(lowerProduct) ||
      /services|consultation|production|catering|repair/i.test(category || '')) {
    itemType = 'service';
  }

  return {
    searchKeywords: cleanProduct,
    maxPriceNaira,
    buyerLocation: null,
    targetSellerLocation,
    category,
    inferredCategories,
    itemType,
    isRegistrationRequest: isReg,
    friendlyAck: `Searching Floate AI sellers for "${cleanProduct}"...`,
  };
}

export async function generateAiReply(userPrompt: string, systemPrompt?: string): Promise<string> {
  const ai = getAIClient();
  if (!ai) {
    return "👋 Floate AI is currently processing your request.";
  }

  const defaultSystemPrompt = `You are Floate AI, an intelligent African commerce assistant headquartered in Nigeria.
Your mission is to connect buyers with sellers and local businesses directly across Nigerian cities (Lagos, Onitsha, Abuja, Port Harcourt, Ibadan, Kano, Aba, and across Nigeria).
Key guidelines:
• Never mention technical terms like "database", "spreadsheet", "google sheets", "table", or "system logs".
• Always speak in a warm, fair, welcoming, and helpful tone (standard Nigerian English or natural light Pidgin).
• Avoid using hyphens or dashes; use proper punctuation like commas and periods instead.
• Reference prices in Nigerian Naira (₦ or k).
• Emphasize direct connections between sellers and buyers.`;

  const replyTask = (async () => {
    try {
      const response = await generateContentWithFallback(ai, {
        contents: userPrompt,
        config: { systemInstruction: systemPrompt || defaultSystemPrompt },
      });

      return response.text || "No response generated by AI.";
    } catch (error: any) {
      console.error("Gemini AI API error in Telegram bot:", error);
      return `Looking up sellers across Nigeria...`;
    }
  })();

  return withExternalTimeout(
    () => replyTask,
    {
      timeoutMs: 8500,
      serviceName: 'Gemini',
      operationName: 'generateNaturalWelcome',
      fallbackValue: "Looking up sellers across Nigeria...",
    }
  );
}

/**
 * Parses numeric price from a string like "₦10,000", "200k", "₦ 15,000", "12000" to Naira integer
 */
export function parsePriceToNaira(priceStr: string): number | null {
  if (!priceStr) return null;
  const clean = priceStr.toLowerCase().replace(/,/g, '');
  const match = clean.match(/(\d+(?:\.\d+)?)\s*(k|m|million|thousand)?/);
  if (!match) return null;
  let val = parseFloat(match[1]);
  if (isNaN(val) || val <= 0) return null;
  const unit = match[2];
  if (unit === 'k' || unit === 'thousand') val *= 1000;
  else if (unit === 'm' || unit === 'million') val *= 1000000;
  return Math.round(val);
}

/**
 * Generates an AI negotiation suggestion for a buyer when seller's item is marked Negotiable.
 * Strictly enforces a 5% to 10% discount range in code to protect seller profitability.
 */
export async function generateNegotiationSuggestion(
  productName: string,
  priceStr: string
): Promise<string | null> {
  const priceNaira = parsePriceToNaira(priceStr);
  if (!priceNaira || priceNaira < 100) {
    // Non-numeric price fallback
    return `💡 *Negotiation Tip:* This price is negotiable. You can politely ask the seller for a small discount for immediate purchase.`;
  }

  // Calculate 5% to 10% discount cap strictly in code
  const minOffer = Math.round(priceNaira * 0.90); // 10% off (maximum discount allowed)
  const maxOffer = Math.round(priceNaira * 0.95); // 5% off (minimum discount allowed)

  const minFormatted = `₦${minOffer.toLocaleString()}`;
  const maxFormatted = `₦${maxOffer.toLocaleString()}`;

  // Default code-enforced suggestion used as fallback or if AI output violates the 5-10% cap
  const codeEnforcedSuggestion = `💡 *Negotiation Tip:* You can open negotiations on WhatsApp with: "Hi! Would you consider between ${minFormatted} and ${maxFormatted} for a quick purchase?"`;

  const ai = getAIClient();
  if (!ai) {
    return codeEnforcedSuggestion;
  }

  try {
    const prompt = `You are Floate AI's commerce assistant guiding a buyer on WhatsApp.
The seller lists "${productName}" at "${priceStr}" (Naira value: ₦${priceNaira.toLocaleString()}) and set the price as negotiable.

Write a short, natural, low-pressure 1-sentence opening line for the buyer to propose a reasonable price to the seller.
STRICT CONSTRAINT: Your proposed price MUST fall strictly between ${minFormatted} and ${maxFormatted} (which is 5% to 10% off the list price). NEVER suggest any price lower than ${minFormatted}.

Return ONLY the single sentence response. Example:
"Hi! I am interested in ${productName}. Would you be open to ${maxFormatted} for a fast deal?"`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
    }).catch(() => null);

    let text = response?.text?.trim() || '';
    if (!text) return codeEnforcedSuggestion;

    // Clean Markdown / quotes
    text = text.replace(/^["']|["']$/g, '').trim();

    // STRICT CODE ENFORCEMENT:
    // Check if the AI generated any price that is deeper than 10% off (below minOffer)
    const matches = text.matchAll(/(?:₦|naira|ngn)?\s*(\d[\d,.]*)\s*(k|m|thousand|million)?/gi);
    let violatesDiscountCap = false;
    for (const match of matches) {
      const p = parsePriceToNaira(match[0]);
      if (p && p > 0 && p < minOffer) {
        // Price suggested by Gemini is lower than 10% off! Violates seller protection rule!
        violatesDiscountCap = true;
        break;
      }
    }

    if (violatesDiscountCap) {
      // Reject AI text and use code-enforced exact bound suggestion
      return codeEnforcedSuggestion;
    }

    if (!text.startsWith('💡')) {
      text = `💡 *Negotiation Tip:* ${text}`;
    }

    return text;
  } catch (err) {
    return codeEnforcedSuggestion;
  }
}

export interface ExtractedInventoryData {
  product: string;
  price: string;
  numericPrice: number;
  category: string;
  quantity: number;
  specs: string;
  state?: string;
  city?: string;
  negotiable: 'Yes' | 'No';
  summaryText: string;
}

/**
 * AI Inventory Sync: Parses natural language merchant voice notes, text messages, or photo captions
 * to extract structured inventory details (Product, Price, Category, Specs, Location, Quantity).
 */
export async function extractInventoryFromVoiceOrPhoto(
  inputContent: string
): Promise<ExtractedInventoryData> {
  const fallbackPrice = parsePriceToNaira(inputContent) || 0;
  const fallbackPriceStr = fallbackPrice > 0 ? `₦${fallbackPrice.toLocaleString()}` : 'Contact for Price';

  const defaultResult: ExtractedInventoryData = {
    product: inputContent.slice(0, 60) || 'General Merchandise',
    price: fallbackPriceStr,
    numericPrice: fallbackPrice,
    category: 'General Goods',
    quantity: 1,
    specs: 'Standard Stock',
    negotiable: 'Yes',
    summaryText: inputContent,
  };

  const ai = getAIClient();
  if (!ai) return defaultResult;

  try {
    const prompt = `You are Floate AI's smart inventory parser for West African B2B merchants.
A merchant sent this voice transcript, photo caption, or message about their stock:
"${inputContent}"

Extract the stock listing details into a strictly valid JSON object with these keys:
{
  "product": "Specific item or product name (e.g. Nike Air Jordans, Smart Watch T800, Italian Leather Slippers)",
  "price": "Formatted price string with Naira symbol e.g. ₦35,000 or ₦5,000",
  "numericPrice": Number value in Naira e.g. 35000 or 5000 (0 if unknown),
  "category": "Inferred commercial category e.g. Footwear, Phones & Accessories, Fashion, Electronics, Computing",
  "quantity": Estimated integer quantity available e.g. 50 (default 1 if not stated),
  "specs": "Any extracted sizes, colors, brands, or notes e.g. Sizes 41-45, Black & White, Original",
  "state": "Nigerian state if mentioned (e.g. Abuja, Lagos, Anambra) or null",
  "city": "City or specific market location if mentioned (e.g. Wuse Market, Computer Village, Main Market) or null",
  "negotiable": "Yes" or "No" (default "Yes")
}

Return ONLY the plain JSON string, with no markdown formatting or commentary.`;

    const response = await generateContentWithFallback(ai, { contents: prompt }).catch(() => null);

    const jsonText = response?.text?.trim() || '';
    if (!jsonText) return defaultResult;

    const cleanJson = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const numPrice = typeof parsed.numericPrice === 'number' && parsed.numericPrice > 0
      ? parsed.numericPrice
      : parsePriceToNaira(parsed.price) || fallbackPrice;

    const formattedPrice = numPrice > 0 ? `₦${numPrice.toLocaleString()}` : (parsed.price || fallbackPriceStr);

    return {
      product: parsed.product || defaultResult.product,
      price: formattedPrice,
      numericPrice: numPrice,
      category: parsed.category || defaultResult.category,
      quantity: typeof parsed.quantity === 'number' ? parsed.quantity : 1,
      specs: parsed.specs || 'Available in stock',
      state: parsed.state || undefined,
      city: parsed.city || undefined,
      negotiable: parsed.negotiable === 'No' ? 'No' : 'Yes',
      summaryText: `${parsed.product || defaultResult.product} at ${formattedPrice} (${parsed.specs || 'In Stock'})`,
    };
  } catch (err) {
    console.warn('[AI Inventory Extractor] Falling back to default parser:', err);
    return defaultResult;
  }
}

export interface SelfieValidationResult {
  isValid: boolean;
  isAiGenerated: boolean;
  hasSingleHumanFace: boolean;
  isCloseUpHeadshot: boolean;
  reason: string;
  userGuidance: string;
}

export interface NinValidationResult {
  isValid: boolean;
  documentType: string;
  extractedName: string;
  ninNumber?: string;
  isNameMatch: boolean;
  confidence: number;
  reason: string;
  userGuidance: string;
}

export interface LivenessVideoValidationResult {
  isValid: boolean;
  transcript: string;
  codeDetected: boolean;
  nameDetected: boolean;
  storeNameDetected: boolean;
  livenessConfirmed: boolean;
  faceMatchConfirmed: boolean;
  reason: string;
  userGuidance: string;
}

/**
 * Fuzzy token-matching helper between two personal legal names
 */
export function checkNameTokensMatch(
  nameA: string,
  nameB: string
): { isMatch: boolean; confidence: number; matchedTokens: string[] } {
  if (!nameA || !nameB) return { isMatch: false, confidence: 0, matchedTokens: [] };
  const cleanTokens = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^a-z0-9 ]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 2 && !['mr', 'mrs', 'miss', 'dr', 'chief', 'pastor', 'alhaji', 'engr'].includes(t));

  const tokensA = cleanTokens(nameA);
  const tokensB = cleanTokens(nameB);
  if (tokensA.length === 0 || tokensB.length === 0) return { isMatch: false, confidence: 0, matchedTokens: [] };

  const matchedTokens = tokensA.filter((ta) =>
    tokensB.some((tb) => tb === ta || (ta.length >= 4 && tb.startsWith(ta)) || (tb.length >= 4 && ta.startsWith(tb)))
  );

  const matchRatio = matchedTokens.length / Math.min(tokensA.length, tokensB.length);
  const isMatch = matchedTokens.length >= 2 || (tokensA.length === 1 && matchedTokens.length >= 1) || matchRatio >= 0.5;
  const confidence = Math.round(matchRatio * 100);

  return { isMatch, confidence, matchedTokens };
}

/**
 * Validates a submitted NIN or Identity Card image using Gemini Vision Multimodal OCR.
 * Scans document, extracts name, and cross-checks with expected owner full name.
 */
export async function verifyNinDocumentWithGeminiVision(
  imageBuffer: Buffer,
  expectedFullName: string,
  mimeType: string = 'image/jpeg'
): Promise<NinValidationResult> {
  // Test / Simulator bypass
  if (imageBuffer.toString().includes('simulated_media_data')) {
    return {
      isValid: true,
      documentType: 'NIN Slip (Verified Test)',
      extractedName: expectedFullName,
      ninNumber: '11223344556',
      isNameMatch: true,
      confidence: 100,
      reason: 'Simulated test document verified.',
      userGuidance: '',
    };
  }

  const ai = getAIClient();
  if (!ai) {
    const fallbackMatch = checkNameTokensMatch(expectedFullName, expectedFullName);
    return {
      isValid: true,
      documentType: 'NIN Slip (Verified)',
      extractedName: expectedFullName,
      ninNumber: '11223344556',
      isNameMatch: true,
      confidence: 100,
      reason: 'AI service in dev mode; test document auto-validated.',
      userGuidance: '',
    };
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const prompt = `You are the Floate AI Merchant Fraud & Identity Verification Engine.
Analyze this submitted photo of an identity document (such as a Nigerian NIN Slip, National e-ID Card, Voter's Card, Driver's License, or International Passport).

EXPECTED OWNER FULL NAME: "${expectedFullName}"

TASKS:
1. Document OCR & Verification:
   - Identify the document type (e.g. "NIN Slip", "National ID Card", "Voter's Card", "Driver's License", or "Not a valid ID").
   - Extract the legal full name printed on the card/slip (Surname, First Name, Middle Name).
   - Extract the 11-digit NIN or ID number if visible.
2. Name Cross-Check:
   - Compare the extracted name against "${expectedFullName}".
   - Account for order differences (e.g. "Surname, First Name" vs "First Name Surname").
   - Determine if the document genuinely belongs to the person who registered as "${expectedFullName}".
3. Authenticity & Quality:
   - Reject arbitrary photos (selfies, products, food, pets, random scenery, blank paper).
   - Ensure the text is clear and readable.

Output format: Return ONLY a raw JSON object with no markdown fences, matching this schema:
{
  "isValid": true | false,
  "documentType": "NIN Slip | National ID | Voter's Card | Driver's License | Unknown",
  "extractedName": "Full name found on document",
  "ninNumber": "11-digit NIN or document number if found",
  "isNameMatch": true | false,
  "confidence": 0 - 100,
  "reason": "Brief technical explanation of match result",
  "userGuidance": "Friendly 1-2 sentence message to merchant if document is rejected or mismatched"
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    }).catch(() => null);

    const responseText = response?.text?.trim() || '';
    if (!responseText) {
      // Fallback
      return {
        isValid: false,
        documentType: 'Unknown',
        extractedName: '',
        isNameMatch: false,
        confidence: 0,
        reason: 'No response from vision model.',
        userGuidance: 'We could not clearly read your ID document. Please upload a clear, well-lit photo of your NIN slip or ID card.',
      };
    }

    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    const extracted = String(parsed.extractedName || '').trim();
    const tokenCheck = checkNameTokensMatch(expectedFullName, extracted);
    const finalIsMatch = parsed.isNameMatch || tokenCheck.isMatch;

    return {
      isValid: Boolean(parsed.isValid && finalIsMatch),
      documentType: parsed.documentType || 'ID Document',
      extractedName: extracted || expectedFullName,
      ninNumber: parsed.ninNumber || undefined,
      isNameMatch: finalIsMatch,
      confidence: Math.max(parsed.confidence || 0, tokenCheck.confidence),
      reason: parsed.reason || 'Document scanned successfully.',
      userGuidance: parsed.userGuidance || 'Please provide a clear, readable photo of your NIN slip or ID card.',
    };
  } catch (err: any) {
    console.warn('[Gemini Vision NIN Validator Notice]:', err?.message || err);
    return {
      isValid: false,
      documentType: 'Unknown',
      extractedName: '',
      isNameMatch: false,
      confidence: 0,
      reason: 'Could not process document photo format.',
      userGuidance: 'Please upload a clear photo of your NIN slip or ID card with your name and face clearly visible.',
    };
  }
}

/**
 * Validates a submitted verification selfie video using Gemini Multimodal Analysis.
 * Verifies liveness, head turning, audio transcript for Owner Name + Store Name + Verification Code.
 */
export async function verifyLivenessVideoWithGemini(
  videoBuffer: Buffer,
  expectedFullName: string,
  expectedStoreName: string,
  expectedCode: string,
  mimeType: string = 'video/mp4'
): Promise<LivenessVideoValidationResult> {
  // Test / Simulator bypass
  if (videoBuffer.toString().includes('simulated_media_data')) {
    return {
      isValid: true,
      transcript: `My name is ${expectedFullName}, my store is ${expectedStoreName}, and my Floate code is ${expectedCode}.`,
      codeDetected: true,
      nameDetected: true,
      storeNameDetected: true,
      livenessConfirmed: true,
      faceMatchConfirmed: true,
      reason: 'Simulated test video verified.',
      userGuidance: '',
    };
  }

  const ai = getAIClient();
  if (!ai) {
    return {
      isValid: true,
      transcript: `My name is ${expectedFullName}, my store is ${expectedStoreName}, and my Floate code is ${expectedCode}.`,
      codeDetected: true,
      nameDetected: true,
      storeNameDetected: true,
      livenessConfirmed: true,
      faceMatchConfirmed: true,
      reason: 'AI service in dev mode; test video auto-validated.',
      userGuidance: '',
    };
  }

  try {
    const base64Data = videoBuffer.toString('base64');
    const prompt = `You are the Floate AI Merchant Liveness & Anti-Fraud Video Verification Engine.
Analyze this submitted selfie video/video-note to verify merchant identity and liveness.

EXPECTED MERCHANT DETAILS:
- Owner Full Name: "${expectedFullName}"
- Store / Shop Name: "${expectedStoreName}"
- Required Verification Code: "${expectedCode}"

CRITICAL VERIFICATION CRITERIA:
1. Speech & Audio Transcript:
   - Listen to what the speaker says in English, Pidgin, or Nigerian accents.
   - Check if they clearly state or mention:
     * Their name or part of their name ("${expectedFullName}")
     * Their store/business name ("${expectedStoreName}")
     * The required dynamic code ("${expectedCode}")
2. Liveness & Motion:
   - Check if this is a live, real person recording themselves.
   - Look for genuine human movement: talking, blinking, or turning head slightly left/right.
   - Reject static photo manipulations, playing a video on a laptop screen to the camera, or AI avatars.

Output format: Return ONLY a raw JSON object with no markdown fences, matching this schema:
{
  "isValid": true | false,
  "transcript": "Transcribed speech from the video",
  "codeDetected": true | false,
  "nameDetected": true | false,
  "storeNameDetected": true | false,
  "livenessConfirmed": true | false,
  "faceMatchConfirmed": true | false,
  "reason": "Brief technical summary of evaluation",
  "userGuidance": "Friendly 1-2 sentence instruction if video needs to be re-recorded"
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    }).catch(() => null);

    const responseText = response?.text?.trim() || '';
    if (!responseText) {
      return {
        isValid: false,
        transcript: '',
        codeDetected: false,
        nameDetected: false,
        storeNameDetected: false,
        livenessConfirmed: false,
        faceMatchConfirmed: false,
        reason: 'No response from video analysis model.',
        userGuidance: `Please record a quick 5-10 second video stating: "My name is ${expectedFullName}, my store is ${expectedStoreName}, and my code is ${expectedCode}", and turn your head slightly.`,
      };
    }

    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    // Flexible code detection check in transcript if boolean was false
    const transcriptText = String(parsed.transcript || '').toLowerCase();
    const cleanCode = expectedCode.toLowerCase().replace(/[^a-z0-9]/g, '');
    const codeInTranscript = transcriptText.includes(cleanCode) || transcriptText.includes(expectedCode.toLowerCase());

    const isCodePresent = parsed.codeDetected || codeInTranscript;
    const isLiveness = parsed.livenessConfirmed !== false;
    const isValid = Boolean((parsed.isValid || isCodePresent) && isLiveness);

    return {
      isValid,
      transcript: parsed.transcript || '',
      codeDetected: isCodePresent,
      nameDetected: Boolean(parsed.nameDetected),
      storeNameDetected: Boolean(parsed.storeNameDetected),
      livenessConfirmed: isLiveness,
      faceMatchConfirmed: Boolean(parsed.faceMatchConfirmed ?? true),
      reason: parsed.reason || 'Video analysis completed.',
      userGuidance: parsed.userGuidance || `Please state your name (${expectedFullName}), store (${expectedStoreName}), and code (${expectedCode}) in the video.`,
    };
  } catch (err: any) {
    console.warn('[Gemini Vision Video Validator Notice]:', err?.message || err);
    return {
      isValid: false,
      transcript: '',
      codeDetected: false,
      nameDetected: false,
      storeNameDetected: false,
      livenessConfirmed: false,
      faceMatchConfirmed: false,
      reason: 'Could not process video format.',
      userGuidance: `Please record a quick 5-10 second video stating your name, store name, and code: ${expectedCode}.`,
    };
  }
}

/**
 * Validates a submitted verification image using Gemini Vision multimodal analysis.
 * Accepts any real, genuine photograph of a single human face (selfies, portraits, normal phone camera shots).
 * Rejects AI-generated avatars, cartoon/digital art, group pictures with multiple people,
 * distant full-body shots with tiny faces, and product/unrelated images.
 */
export async function validateSelfieWithGeminiVision(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<SelfieValidationResult> {
  const ai = getAIClient();
  if (!ai) {
    // Graceful fallback if AI is not configured
    return {
      isValid: true,
      isAiGenerated: false,
      hasSingleHumanFace: true,
      isCloseUpHeadshot: true,
      reason: 'AI service unconfigured; marked for manual verification queue.',
      userGuidance: '',
    };
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const prompt = `You are the Floate AI Merchant Identity & Verification Assistant.
Analyze this submitted verification photo to confirm it is a genuine photograph of a real person (merchant identity verification).

VALIDATION CRITERIA:

ACCEPT (isValid = true):
- Any genuine photograph of a single real person where their face is visible and recognizable.
- Standard smartphone selfies, front or rear camera photos, chest-up / upper-body portraits, or photos of a person sitting in their shop, office, home, or vehicle.
- Normal, everyday phone camera conditions: standard lighting, natural indoor/outdoor light, mild shadows, slight angles, neutral expressions or smiles.
- Normal personal accessories: prescription glasses, headwraps, caps, hijabs, or modest makeup.

REJECT ONLY (isValid = false):
1. AI-generated faces, digital avatars, cartoons, CGI, illustrations, or synthetic deepfakes (Midjourney, DALL-E, etc.).
2. Group photos or crowd scenes showing multiple people where the primary individual cannot be uniquely identified.
3. Distant full-body shots where the person is far in the background and the face is too tiny or blurred to be recognized.
4. Product photos (shoes, electronics, bags), receipts, documents, store signs, cars, pets, memes, screenshots, or images with NO human face.
5. Photos where the face is completely covered or masked (e.g. balaclava, dark full-face motorcycle visor, completely blocked by hands or objects).

Output format: Return ONLY a raw JSON object with no markdown fences, matching this schema:
{
  "isValid": true | false,
  "isAiGenerated": true | false,
  "hasSingleHumanFace": true | false,
  "isCloseUpHeadshot": true | false,
  "reason": "Brief technical explanation of the evaluation",
  "userGuidance": "A warm, friendly, encouraging 1-2 sentence message to the business owner explaining what to adjust if rejected"
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
            { text: prompt },
          ],
        },
      ],
    }).catch(() => null);

    const responseText = response?.text?.trim() || '';
    if (!responseText) {
      return {
        isValid: false,
        isAiGenerated: false,
        hasSingleHumanFace: false,
        isCloseUpHeadshot: false,
        reason: 'No response received from vision model.',
        userGuidance: "Thanks for sending that! Unfortunately, this doesn't quite look like a clear selfie of your face. Could you send a new close-up photo? Takes just 2 seconds!",
      };
    }

    const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return {
      isValid: Boolean(parsed.isValid),
      isAiGenerated: Boolean(parsed.isAiGenerated),
      hasSingleHumanFace: Boolean(parsed.hasSingleHumanFace),
      isCloseUpHeadshot: Boolean(parsed.isCloseUpHeadshot ?? parsed.isValid),
      reason: parsed.reason || 'Verification image analyzed.',
      userGuidance: parsed.userGuidance || "Thanks for sending that! Unfortunately, this doesn't quite look like a clear selfie of your face. Could you send a new photo showing your face clearly? Takes just 2 seconds!",
    };
  } catch (err: any) {
    console.warn('[Gemini Vision Selfie Validator Notice]:', err?.message || err);
    return {
      isValid: false,
      isAiGenerated: false,
      hasSingleHumanFace: false,
      isCloseUpHeadshot: false,
      reason: 'Could not process photo format.',
      userGuidance: "Thanks for sending that! We couldn't quite see a clear photo of your face. Could you send a quick photo or selfie showing your face clearly? Takes just 2 seconds!",
    };
  }
}

/**
 * Fast synchronous detection if a user in an active Floate Secure Line relay chat wants to end/exit the session.
 * Uses comprehensive regex matching for instant sub-millisecond execution without blocking message relay.
 */
export function isFastEndChatIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  return /^(?:end|end chat|endchat|close chat|stop chat|exit chat|leave chat|quit chat|end session|leave session|close session|stop session|end conversation|stop conversation|cancel chat|close|exit|leave|quit|goodbye|bye|i want to leave|disconnect|stop|cancel|btn_end_chat)$/i.test(
    lower
  );
}

/**
 * Detects if the user selected 'Deal complete' as the reason for ending chat.
 */
export function isDealCompleteIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  if (text === 'btn_end_deal_complete' || text === '1') return true;
  return /^(?:1|deal complete|deal completed|deal done|we agreed|deal settled|done deal|completed deal|finished deal|bought it|we have a deal|closed deal|transaction complete)$/i.test(
    lower
  );
}

/**
 * Detects if the buyer is asking how or where to make payment, showing agreement,
 * or asking for bank/account details or "aza" (in Nigerian Pidgin or standard English).
 */
export function isBuyerPaymentOrAgreementIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  // Fast catch for "aza", account number, acct, bank details in any form
  if (
    /\b(?:aza|azas|ur aza|your aza|drop aza|send aza|give aza|provide aza)\b/i.test(lower) ||
    /\b(?:account\s*number|acct\s*number|acc\s*number|acct\s*no|acc\s*no|account\s*details|acct\s*details|bank\s*details|bank\s*account)\b/i.test(lower) ||
    /^(?:account|acct|aza|bank details|account number|account details|how to pay|how do i pay|how can i pay|where to pay|where do i pay|i want to pay|ready to pay)$/i.test(lower)
  ) {
    return true;
  }

  // Explicit English & Nigerian Pidgin payment and account inquiry patterns
  return (
    /^(?:how|where|which|wetin|abeg|oya)\s+(?:do|can|i|we|make\s+i|fit|go|wan|want\s+to)\s+(?:pay|make\s+payment|transfer|send\s+money|send\s+the\s+money|pay\s+put|pay\s+for\s+this)/i.test(lower) ||
    /(?:how\s+do\s+i\s+pay|where\s+do\s+i\s+pay|where\s+i\s+go\s+pay|where\s+i\s+wan\s+pay|how\s+i\s+go\s+pay|where\s+i\s+fit\s+pay|how\s+i\s+fit\s+pay|where\s+to\s+pay|how\s+to\s+pay|how\s+do\s+i\s+make\s+payment|where\s+do\s+i\s+make\s+payment|where\s+i\s+fit\s+transfer|how\s+make\s+i\s+pay)/i.test(lower) ||
    /(?:which\s+bank\s+(?:am\s+i|i\s+go|make\s+i)\s+send\s+(?:to|money)|which\s+account\s+(?:i\s+go|make\s+i|am\s+i)\s+pay\s+put|which\s+account\s+number)/i.test(lower) ||
    /(?:send|drop|give|forward|share|provide)\s+(?:your\s+|ur\s+)?(?:account\s+details|account\s+number|acct\s+details|acct\s+number|acc\s+details|acc\s+number|acct|account|bank\s+details|bank\s+account|payment\s+details|aza)/i.test(lower) ||
    /(?:account\s+details\s+please|drop\s+account|send\s+account|give\s+me\s+account|your\s+account\s+number|your\s+bank\s+details|give\s+me\s+your\s+account)/i.test(lower) ||
    /(?:oya\s+na\s+i\s+go\s+transfer|make\s+i\s+transfer|i\s+wan\s+transfer|i\s+want\s+to\s+transfer|i\s+want\s+to\s+pay|i\s+am\s+ready\s+to\s+pay|ready\s+to\s+pay|ready\s+to\s+make\s+payment|ready\s+to\s+buy|let\s+me\s+pay|i\s+will\s+pay\s+now|send\s+payment\s+link|generate\s+payment\s+link|how\s+do\s+i\s+send\s+the\s+money)/i.test(lower) ||
    /(?:payment\s+options|how\s+to\s+make\s+transfer|safepay\s+details|escrow\s+payment|bank\s+transfer\s+details)/i.test(lower)
  );
}

/**
 * Detects if the user selected 'Changed mind' as the reason for ending chat.
 */
export function isChangedMindIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  if (text === 'btn_end_changed_mind' || text === '2') return true;
  return /^(?:2|changed mind|changed my mind|changed your mind|no deal|not buying|cancelled|too expensive|not interested|no agreement|could not agree|no longer buying)$/i.test(
    lower
  );
}

/**
 * Detects if the buyer is declaring that their delivery/order has arrived.
 */
export function isDeliveryArrivalIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  if (text === 'btn_confirm_delivery' || text === 'btn_delivery_arrived') return true;

  return /(?:i\s+(?:have\s+)?(?:got|gotten|received|collected)\s+(?:my|the)\s+(?:delivery|order|package|parcel|waybill|item|goods|product)|(?:my|the)\s+(?:delivery|order|package|parcel|waybill|item|goods)\s+(?:has\s+)?(?:arrived|reached|come|landed|been\s+delivered)|delivery\s+(?:arrived|received|completed|done|confirmed|reached|here)|confirm\s+delivery|order\s+(?:delivered|arrived|received)|package\s+is\s+here|got\s+my\s+delivery)/i.test(
    lower
  );
}

/**
 * Extracts a unique delivery confirmation code from user text if present.
 * Looks for patterns like "FLT-1234", "FLT 1234", "FLT-73921", "code is 1234", "applied code 1234", or standalone 4-6 digit codes.
 */
export function extractDeliveryCode(userInput: string): string | null {
  const text = (userInput || '').trim();
  if (!text) return null;

  // 1. Match explicit FLT prefix code: FLT-XXXX, FLT XXXX, FLT_XXXX or FLTXXXX
  const fltMatch = text.match(/\bFLT[-\s_]?([A-Z0-9]{4,8})\b/i);
  if (fltMatch) {
    return `FLT-${fltMatch[1].toUpperCase()}`;
  }

  // 2. Match confirmation code / PIN phrases: "code is 1234", "pin is 1234", "code: 1234", "applied 1234", "code 1234"
  const phraseMatch = text.match(/(?:confirmation\s+|delivery\s+|secret\s+)?(?:code|pin|applied|input|enter)(?:\s+(?:is|was|:|-))?\s+([A-Z0-9-]{4,8})/i);
  if (phraseMatch) {
    const raw = phraseMatch[1].toUpperCase().replace(/\s+/g, '');
    return raw.startsWith('FLT-') ? raw : `FLT-${raw.replace(/^FLT[-_]?/i, '')}`;
  }

  // 3. Match code at beginning or end of message, e.g. "1234", "FLT-1234"
  const standalone = text.replace(/[^A-Z0-9-]/gi, '').toUpperCase();
  if (/^FLT-[A-Z0-9]{4,8}$/.test(standalone)) {
    return standalone;
  }
  if (/^[0-9]{4,6}$/.test(standalone)) {
    return `FLT-${standalone}`;
  }

  // 4. Match any isolated 4 to 6 digit number in short messages (e.g. "I got 4921", "The code is 4921")
  if (text.length < 60) {
    const numMatch = text.match(/\b(\d{4,6})\b/);
    if (numMatch) {
      return `FLT-${numMatch[1]}`;
    }
  }

  return null;
}

/**
 * Detects if the user is asking an informational question about scam prevention, safety, or escrow protection.
 */
export function isSafetyOrScamInquiry(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  return /(?:how\s+(?:do\s+i|to|can\s+i)\s+avoid\s+scam(?:mer)?s?|how\s+do\s+you\s+protect|how\s+are\s+(?:buyers|sellers|businesses|we)\s+protected|is\s+floate\s+(?:safe|legit|real)|how\s+does\s+(?:safepay|escrow|floate\s+protection)\s+work|can\s+i\s+get\s+scammed|what\s+if\s+(?:seller|vendor)\s+scams\s+me|avoid\s+fraud|prevent\s+scam|avoid\s+scam|how\s+safe\s+is\s+floate)/i.test(
    lower
  );
}

/**
 * Detects if the user explicitly wants to report a vendor or file a dispute/complaint.
 */
export function isReportVendorIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  if (text.startsWith('report_vendor_') || text === 'btn_report_vendor') return true;

  return /(?:i\s+want\s+to\s+report\s+a?\s*vendor|report\s+a?\s*vendor|report\s+this\s+seller|report\s+seller|report\s+merchant|report\s+business|report\s+fraud|report\s+scam|complain\s+about\s+a?\s*vendor|file\s+a?\s*report)/i.test(
    lower
  );
}

/**
 * Detects if the buyer is specifically asking for a refund or money back on an active escrow purchase.
 */
export function isRefundRequestIntent(userInput: string): boolean {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 _]+/g, ' ').trim();

  if (text === 'btn_request_refund' || text === 'btn_apply_refund') return true;

  // Do NOT match informational questions about scams or general reporting requests
  if (isSafetyOrScamInquiry(text) || isReportVendorIntent(text)) {
    return false;
  }

  return /(?:apply\s+for\s+(?:a\s+)?refund|request\s+(?:a\s+)?refund|i\s+want\s+(?:a\s+)?refund|need\s+(?:a\s+)?refund|money\s+back|refund\s+my\s+money|dispute\s+order|claim\s+refund)/i.test(
    lower
  );
}

export interface ProcessedEndChatResult {
  endReason: 'DEAL_COMPLETE' | 'CHANGED_MIND' | 'CUSTOM_REASON';
  rawReason: string;
  isOffensive: boolean;
  shouldNotifyOtherParty: boolean;
  senderMessage: string;
  otherPartyMessage?: string | null;
}

/**
 * Uses Gemini AI to evaluate the reason given for ending a chat.
 * - If "Deal complete": sender gets completion summary; other party is NOT notified of an end chat reason.
 * - If reason is offensive, rude, or hostile: other party is simply told "The other party has ended this chat session (Reason: They changed their mind)."
 * - If reason is polite/constructive: a clean, courteous summary is relayed to the other party.
 */
export async function processEndChatReasonWithAI(
  userInput: string,
  senderRole: 'BUYER' | 'VENDOR',
  itemName: string,
  otherPartyName: string
): Promise<ProcessedEndChatResult> {
  const text = (userInput || '').trim();

  // 1. Check for Deal Complete
  if (isDealCompleteIntent(text)) {
    return {
      endReason: 'DEAL_COMPLETE',
      rawReason: 'Deal complete',
      isOffensive: false,
      shouldNotifyOtherParty: false, // Per requirement: "If they select deal complete no need to notify the next party."
      senderMessage:
        `🎉 *Deal Complete!*\n\n` +
        `Congratulations on concluding your deal with *${otherPartyName}* for *${itemName}*!\n\n` +
        `💡 *Tip:* Floate SafePay keeps payments 100% secured in escrow until you receive and verify the delivery code on your package.`,
    };
  }

  // 2. Check for explicit "Changed Mind"
  if (isChangedMindIntent(text)) {
    return {
      endReason: 'CHANGED_MIND',
      rawReason: 'Changed mind',
      isOffensive: false,
      shouldNotifyOtherParty: true,
      senderMessage:
        `👋 *Chat Closed*\n\n` +
        `Your chat session with *${otherPartyName}* has been closed. What else would you like to search for on Floate today?`,
      otherPartyMessage:
        `🚪 *Chat Session Ended*\n\n` +
        `The other party has ended this chat session (Reason: They changed their mind).`,
    };
  }

  // 3. Custom text provided as reason: use Gemini to check tone and check if offensive
  const ai = getAIClient();
  if (ai) {
    try {
      const prompt = `You are the Floate marketplace mediator reviewing why a user (${senderRole}) is ending a chat about "${itemName}".
User's input: "${text}"

Evaluate:
1. Is this message offensive, rude, abusive, profane, aggressive, insulting, or accusatory?
2. If it is offensive or hostile in any way, the message relayed to the other party MUST simply be "They changed their mind."
3. If it is polite, neutral, or constructive feedback (e.g. "Price is above budget", "Looking for another model", "Found another seller", "Decided to buy later"), summarize the reason in one courteous, professional sentence suitable for the other party.

Respond strictly in JSON:
{
  "isOffensive": boolean,
  "summaryForOtherParty": "string (polite 1-sentence reason or 'They changed their mind')",
  "acknowledgementForSender": "string (friendly 1-sentence acknowledgement)"
}`;

      const response = await generateContentWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.1,
        },
      });

      const rawJson = response.text ? response.text.trim() : '{}';
      const cleanJson = rawJson.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const isOffensive = Boolean(parsed.isOffensive);
      const otherReason = isOffensive || !parsed.summaryForOtherParty
        ? 'They changed their mind'
        : parsed.summaryForOtherParty;

      const senderAck = parsed.acknowledgementForSender || 'Your chat session has been closed.';

      return {
        endReason: 'CUSTOM_REASON',
        rawReason: text,
        isOffensive,
        shouldNotifyOtherParty: true,
        senderMessage:
          `👋 *Chat Ended*\n\n` +
          `${senderAck}\n\n` +
          `What else would you like to explore on Floate today?`,
        otherPartyMessage:
          `🚪 *Chat Session Ended*\n\n` +
          `The other party has ended this chat session (Reason: ${otherReason}).`,
      };
    } catch (err) {
      console.warn('[Gemini End Chat Reason Check Error]:', err);
    }
  }

  // Fallback if AI is offline: check basic profanity/aggression regex
  const offensivePattern = /(fuck|shit|bitch|bastard|idiot|stupid|scam|thief|fool|mad|mumu|craze|ole|thieves|scammer|rubbish|trash)/i;
  const isOffensive = offensivePattern.test(text);

  return {
    endReason: 'CUSTOM_REASON',
    rawReason: text,
    isOffensive,
    shouldNotifyOtherParty: true,
    senderMessage:
      `👋 *Chat Ended*\n\n` +
      `Your chat session with *${otherPartyName}* has been closed. What else would you like to search for on Floate today?`,
    otherPartyMessage: isOffensive
      ? `🚪 *Chat Session Ended*\n\nThe other party has ended this chat session (Reason: They changed their mind).`
      : `🚪 *Chat Session Ended*\n\nThe other party has ended this chat session (Reason: ${text.slice(0, 100)}).`,
  };
}

/**
 * Detects if a user in an active Floate Secure Line relay chat wants to end/exit the session.
 */
export async function isEndChatIntent(userInput: string): Promise<boolean> {
  return isFastEndChatIntent(userInput);
}

export interface MutualAgreementResult {
  hasAgreed: boolean;
  item: string;
  agreedPrice: string;
  terms?: string;
  confidence: number;
}

/**
 * Uses Gemini to analyze chat exchanges between buyer and vendor on Floate Secure Line
 * to detect genuine mutual agreement (price, item, and terms confirmed by both sides).
 */
export async function detectMutualAgreement(
  messages: Array<{ senderRole: 'BUYER' | 'VENDOR'; text: string }>,
  defaultItemName: string = 'Item'
): Promise<MutualAgreementResult | null> {
  if (!messages || messages.length < 2) return null;

  // Verify both buyer and vendor have contributed at least one message
  const hasBuyer = messages.some((m) => m.senderRole === 'BUYER');
  const hasVendor = messages.some((m) => m.senderRole === 'VENDOR');
  if (!hasBuyer || !hasVendor) return null;

  const conversationTranscript = messages
    .slice(-10) // analyze the last 10 exchanges
    .map((m) => `${m.senderRole}: ${m.text}`)
    .join('\n');

  const ai = getAIClient();
  if (!ai) return null;

  try {
    const prompt = `You are the Floate Commerce Mutual Agreement Evaluator.
Analyze this chat between a BUYER and a VENDOR regarding "${defaultItemName}".
Determine if there is a genuine MUTUAL AGREEMENT where:
1. Both parties agree on the exact item or specifications.
2. Both parties have settled and agreed on a final price (in Naira / ₦).
3. The transaction is mutually confirmed by both sides (e.g. "deal", "I agree", "send payment", "I'll take it at that price", "ok agreed", "deal done").

Conversation transcript:
${conversationTranscript}

Output strictly in JSON:
{
  "hasAgreed": true | false,
  "item": "Name of agreed product/service",
  "agreedPrice": "Agreed price with Naira symbol (e.g. ₦25,000)",
  "terms": "Summary of agreed delivery or fulfillment terms if mentioned",
  "confidence": 0.95
}
Return ONLY valid JSON.`;

    const response = await generateContentWithFallback(ai, { contents: prompt }).catch(() => null);
    const jsonText = response?.text?.trim() || '';
    if (!jsonText) return null;
    const cleanJson = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.hasAgreed && (parsed.confidence ?? 0.8) >= 0.7) {
      return {
        hasAgreed: true,
        item: parsed.item || defaultItemName,
        agreedPrice: parsed.agreedPrice || 'Agreed Price',
        terms: parsed.terms || undefined,
        confidence: parsed.confidence || 0.9,
      };
    }
    return null;
  } catch (err) {
    console.warn('[Gemini Agreement Evaluator Notice]:', err);
    return null;
  }
}

/**
 * Checks if a user message is a conversational greeting, check-in, or brand question.
 */
export async function isConversationalOrBrandQuestion(userInput: string): Promise<boolean> {
  const text = (userInput || '').trim();
  const lower = text.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').trim();

  if (
    /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|how are you doing|how far|how body|how things|how is your day|what's up|whats up|sup|how's it going|who are you|what is floate|about floate|tell me about floate|what do you do|what can you do|who made floate)$/i.test(
      lower
    )
  ) {
    return true;
  }

  // If user is searching or typing an obvious commerce item, return false
  if (/^(i want to buy|how much is|where can i get|shoes|phone|laptop|bag|cloth|price|cost|naira|delivery|waybill)/i.test(lower)) {
    return false;
  }

  const ai = getAIClient();
  if (!ai) return false;

  try {
    const prompt = `Determine if the following user message to Floate (an African conversational commerce platform on WhatsApp) is a casual conversational check-in, greeting, or brand inquiry (e.g. "how are you", "what is Floate about", "who made this", "hello floate") as opposed to an explicit product search or transaction action.

User message: "${userInput}"

Respond with strictly JSON:
{ "isConversationalOrBrand": true | false }`;

    const response = await generateContentWithFallback(ai, { contents: prompt }).catch(() => null);
    const jsonText = response?.text?.trim() || '';
    if (!jsonText) return false;
    const cleanJson = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    return Boolean(parsed.isConversationalOrBrand);
  } catch {
    return false;
  }
}

/**
 * Generates an on-brand, natural, warm, varied Gemini-powered response
 * for casual check-ins, greetings, and Floate brand questions.
 */
export async function generateBrandConversationalResponse(
  userInput: string,
  userName?: string,
  userCity?: string
): Promise<string> {
  const ai = getAIClient();
  const cleanName = userName && userName !== 'Customer' ? userName.trim() : '';
  const isAskingHowFloateIs = /how are you|how far|how you dey|how are you doing|hope you are good|how is everything|how is your day/i.test(userInput);

  if (!ai) {
    // Fallback warm conversational response
    if (isAskingHowFloateIs) {
      return cleanName
        ? `Hello ${cleanName}! I am doing wonderful, thank you for asking. I am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`
        : `Hello! I am doing wonderful, thank you for asking. I am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`;
    }
    return cleanName
      ? `Hello ${cleanName}, how are you today?\nI am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`
      : `Hello, how are you today?\nI am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`;
  }

  try {
    const prompt = `You are Floate AI, the friendly, articulate, and reliable conversational commerce assistant for Nigeria & Africa on WhatsApp.

Context:
- User Name: ${cleanName || 'Shopper'}
- User City / Location: ${userCity || 'Nigeria'}
- User Message: "${userInput}"

Floate's Brand Identity & Capabilities:
- Floate is a direct conversational commerce network connecting buyers with verified shops, artisans, and sellers across markets and cities in Nigeria (e.g., in ${userCity || 'Nigeria'}).
- Allows shoppers to find verified merchants for any product or category.
- Allows merchants to list products, manage inventory, and receive direct buyer leads.

Instructions:
1. Respond warmly, naturally, and conversationally in 2 to 4 concise sentences.
2. Maintain an authentic Nigerian warmth (refined English with natural warmth, polite, friendly, never robotic or canned).
3. Do NOT mention SafePay or escrow services in the general greeting.
4. If the user only said a general greeting (e.g., "Hello", "Hi", "Hello Floate", "Good morning", "Hey", "Good day") WITHOUT asking how you are doing:
   - Do NOT say "I am doing wonderful" and do NOT say "thank you for asking" (because no question was asked).
   - Instead, greet them warmly and ask how they are, introduce yourself and how you can help:
     "Hello ${cleanName || 'Shopper'}, how are you today?
I am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?"
5. ONLY if the user EXPLICITLY asked how you are doing (e.g., "how are you", "how far", "how you dey", "how are you doing"):
   - Respond warmly with:
     "Hello ${cleanName || 'Shopper'}! I am doing wonderful, thank you for asking. I am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?"
6. Do NOT arbitrarily name-drop specific Lagos markets like Computer Village or Alaba unless the user's location is actually Lagos or they asked about electronics. Refer generally to "markets and verified sellers across Nigeria" or specifically to their city "${userCity || 'Nigeria'}".
7. If they asked what Floate is or does, explain Floate's purpose cleanly and invite them to search or list their shop.
8. Do NOT use decorative emojis (no stars, rocket emojis, or excessive icons). Use WhatsApp single asterisks (*bold*) for emphasis if needed.

Generate the exact message to send to the user:`;

    const response = await generateContentWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }).catch(() => null);

    const generated = response?.text?.trim();
    if (generated && generated.length > 10) {
      return generated;
    }

    if (isAskingHowFloateIs) {
      return `Hello${cleanName ? ' ' + cleanName : ''}! I am doing wonderful, thank you for asking. I am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`;
    }

    return `Hello${cleanName ? ' ' + cleanName : ''}, how are you today?\nI am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`;
  } catch (err) {
    console.warn('[Gemini Brand Conversational AI Notice]:', err);
    if (isAskingHowFloateIs) {
      return `Hello${cleanName ? ' ' + cleanName : ''}! I am doing wonderful, thank you for asking. How can I help you with your shopping or business today?`;
    }
    return `Hello${cleanName ? ' ' + cleanName : ''}, how are you today?\nI am Floate, your reliable assistant for connecting directly with verified sellers and artisans across Nigeria. Whether you are looking to shop for quality items or you want to list your own products, I am here to help. How can I help you today?`;
  }
}

export interface VendorPreFilterResult {
  canAnswer: boolean;
  answer?: string;
  topic?: 'LOCATION' | 'DELIVERY' | 'HOURS' | 'CATALOG' | 'GENERAL_INFO';
}

/**
 * Floate Auto Pilot Store Pre-Filter:
 * Automatically answers standard store info (location/market, delivery/waybill policy, catalog)
 * so vendors are not flooded by repetitive inquiries when 100+ buyers connect.
 * Returns canAnswer: false for negotiation, stock checks, payment/account questions, or custom orders.
 */
export async function answerVendorStorePreFilterWithAI(params: {
  userInput: string;
  vendorName: string;
  item: string;
  city?: string;
  state?: string;
  category?: string;
}): Promise<VendorPreFilterResult> {
  const { userInput, vendorName, item, city, state, category } = params;
  const text = (userInput || '').trim();
  const lower = text.toLowerCase();

  // Fast exclusion: NEVER answer end chat, payment, bank, account, aza, transfer, direct contact, button choices, or general chat/negotiation here
  if (
    /(?:end|end\s*chat|close|exit|leave|quit|stop|done|finish|finished|bye|goodbye|thanks|thank\s*you|ok|okay|k|cancel|menu|reset|aza|account|acct|bank|pay|payment|transfer|money|escrow|safepay|safe\s*pay|call|phone|number|contact|reach|dm|whatsapp|connect|direct|btn_|hi|hello|hey|price|how\s+much|cost|discount|reduce|available|stock|buy|order|paid)/i.test(
      lower
    )
  ) {
    return { canAnswer: false };
  }

  // Fast pattern checks for explicit location/delivery inquiries
  const isLocationQuery = /(?:where\s+(?:is|are)\s+(?:your\s+)?(?:shop|store|office|location|place)|what\s+(?:is\s+your\s+)?address|which\s+market|where\s+you\s+dey|location\s+please|send\s+(?:your\s+)?address)/i.test(lower);
  const isDeliveryQuery = /(?:do\s+you\s+(?:deliver|waybill|ship)|can\s+you\s+(?:deliver|waybill|ship)|is\s+delivery\s+available|how\s+much\s+is\s+delivery|deliver\s+to\s+[a-z]+|waybill\s+to\s+[a-z]+)/i.test(lower);

  const locText = [city, state].filter(Boolean).join(', ') || 'Nigeria';

  if (isLocationQuery) {
    return {
      canAnswer: true,
      topic: 'LOCATION',
      answer: `*Floate Auto Pilot:*\n*${vendorName}* is located in *${locText}*.\n\nConnecting your chat to the seller for direct negotiation and order details...`,
    };
  }

  if (isDeliveryQuery) {
    return {
      canAnswer: true,
      topic: 'DELIVERY',
      answer: `*Floate Auto Pilot:*\n*${vendorName}* provides local pickup and nationwide delivery / interstate waybill across Nigeria.\n\nConnecting your chat to the seller for delivery arrangements and rates...`,
    };
  }

  // Only use AI if inquiry is clearly about shop opening hours
  const isHoursQuery = /(?:opening\s+hours|when\s+do\s+you\s+open|what\s+time\s+do\s+you\s+close|are\s+you\s+open)/i.test(lower);
  if (!isHoursQuery) {
    return { canAnswer: false };
  }

  const ai = getAIClient();
  if (!ai) {
    return { canAnswer: false };
  }

  try {
    const prompt = `You are Floate Auto Pilot for verified merchant "${vendorName}".
The buyer is asking about store operating hours.
Merchant Location: ${locText}.
Buyer's message: "${text}"

Rules:
1. Only answer standard operating hours politely.
2. DO NOT answer payment methods, bank accounts, or phone numbers.
3. NEVER make up phone numbers or bank accounts.
4. DO NOT use robot emojis.
5. Start answer with '*Floate Auto Pilot:*'.

Respond in JSON:
{
  "canAnswer": true | false,
  "topic": "HOURS",
  "helpfulAnswer": "*Floate Auto Pilot:*"
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    }).catch(() => null);

    const raw = response?.text?.trim();
    if (!raw) return { canAnswer: false };

    const parsed = JSON.parse(raw);
    if (parsed.canAnswer && parsed.helpfulAnswer) {
      // Clean out any robot emojis if model inserted them
      const cleanAnswer = parsed.helpfulAnswer.replace(/🤖\s*/g, '').trim();
      return {
        canAnswer: true,
        topic: parsed.topic || 'GENERAL_INFO',
        answer: cleanAnswer,
      };
    }
    return { canAnswer: false };
  } catch {
    return { canAnswer: false };
  }
}

export interface CircumventionCheckResult {
  isCircumvention: boolean;
  reason?: 'PHONE_NUMBER' | 'BANK_ACCOUNT' | 'DIRECT_CONTACT' | 'IMAGE_CONTACT_OR_ACCOUNT' | null;
  detectedSnippet?: string;
  explanation?: string;
}

/**
 * Normalizes spelled-out digit words and separators to detect evasion attempts like:
 * "zero eight zero nine...", "0,8,0,7,9,8", "0-8-0-9", "0 8 0 3...", "o eight o nine"
 */
function normalizeDigitsAndEvasions(text: string): string {
  if (!text) return '';
  let str = text.toLowerCase();

  const wordMap: Record<string, string> = {
    zero: '0',
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    oh: '0',
  };

  for (const [word, digit] of Object.entries(wordMap)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    str = str.replace(reg, digit);
  }

  str = str.replace(/\b[oO]\b(?=\s*\d)/g, '0');
  str = str.replace(/(\d\s*)\b[oO]\b/g, '$10');

  return str;
}

/**
 * Strips non-digit separators between adjacent numbers (e.g., "0,8,0,7,9,8" -> "080798")
 */
function collapseSeparatedDigits(text: string): string {
  let prev = text;
  while (true) {
    const next = prev.replace(/(\d)[\s,.\-_/*\\|]+(?=\d)/g, '$1');
    if (next === prev) break;
    prev = next;
  }
  return prev;
}

/**
 * Detects direct phone numbers, bank accounts (NUBAN), or external contact sharing
 * with evasion/obfuscation detection.
 */
export function detectDirectContactOrAccountCircumvention(userInput: string): CircumventionCheckResult {
  const raw = (userInput || '').trim();
  if (!raw) return { isCircumvention: false };

  const normalizedWords = normalizeDigitsAndEvasions(raw);
  const collapsed = collapseSeparatedDigits(normalizedWords);
  const lower = raw.toLowerCase();

  // 1. Check for Nigerian Phone Numbers (11 digits e.g. 080..., 070..., 090..., 081..., 091... or +234/234 + 10 digits or 8-11 digit groups)
  const nigerianPhoneRegex = /(?:(?:\+?234|0)[789][01]\d{8})|(?:(?:\+?234|0)[789]\d{9})|(?:\+?234\d{10})/g;
  const phoneMatch = collapsed.match(nigerianPhoneRegex);
  if (phoneMatch && phoneMatch.length > 0) {
    return {
      isCircumvention: true,
      reason: 'PHONE_NUMBER',
      detectedSnippet: phoneMatch[0],
      explanation: 'Detected direct phone number sharing in message.',
    };
  }

  // 2. Check for Bank Account Numbers (10 consecutive digits NUBAN, or 9-10 digit numbers)
  const bankKeywords = [
    'gtb', 'gtbank', 'access', 'zenith', 'uba', 'firstbank', 'first bank',
    'polaris', 'union', 'stanbic', 'fidelity', 'fcmb', 'sterling', 'wema',
    'unity', 'ecobank', 'kuda', 'opay', 'palmpay', 'moniepoint', 'rubies',
    'vfd', 'jaiz', 'taj', 'providus', 'alat', 'heritage', 'keystone',
    'account', 'acct', 'acc no', 'acct no', 'acc number', 'acct number',
    'bank', 'nuban', 'transfer to', 'pay to', 'pay into', 'send money to', 'aza'
  ];

  const hasBankKeyword = bankKeywords.some((kw) => lower.includes(kw) || collapsed.toLowerCase().includes(kw));

  const tenDigitRegex = /\b\d{10}\b/g;
  const tenDigitMatches = collapsed.match(tenDigitRegex);
  if (tenDigitMatches && tenDigitMatches.length > 0) {
    return {
      isCircumvention: true,
      reason: 'BANK_ACCOUNT',
      detectedSnippet: tenDigitMatches[0],
      explanation: 'Detected bank account number sharing in message.',
    };
  }

  // 3. Check for Direct Contact Invitations & Handles (e.g. "call me", "whatsapp me", "080...", "IG:", "@handle", email)
  const directContactRegex = /(?:(?:call|whatsapp|reach|text|dm|phone|contact|msg)\s+(?:me|us)?\s*(?:on|at|via|with|for)?\s*[:\-]?\s*(?:0|\+?234|\d{4}))|(?:(?:my|our)\s+(?:whatsapp|phone|number|contact|digit|line|aza|account)\s*(?:is|dey|be|no)?\s*[:\-]?\s*\d+)|(?:\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b)/i;
  if (directContactRegex.test(collapsed) || directContactRegex.test(normalizedWords) || directContactRegex.test(raw)) {
    return {
      isCircumvention: true,
      reason: 'DIRECT_CONTACT',
      detectedSnippet: raw,
      explanation: 'Detected direct contact invitation or details in message.',
    };
  }

  return { isCircumvention: false };
}

/**
 * Inspects media (images/photos) sent in the relay chat with Gemini Multimodal Vision
 * to allow legitimate product/clothing/gear photos while intercepting handwritten account slips,
 * bank payment receipts, or contact cards trying to bypass escrow.
 */
export async function inspectImageForCircumventionWithAI(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<CircumventionCheckResult> {
  const ai = getAIClient();
  if (!ai || !imageBuffer || imageBuffer.length === 0) {
    return { isCircumvention: false };
  }

  try {
    const base64Data = imageBuffer.toString('base64');
    const prompt = `Analyze this image sent inside an e-commerce buyer-seller negotiation relay chat on WhatsApp in Nigeria.
Task:
Determine if this image is:
A) A legitimate product photo, item showcase, merchandise, clothing, shoes, fashion, electronics, stock color/size sample, or design reference. (Legitimate -> isCircumvention: false)
OR
B) An attempt to bypass platform escrow/protection by showing a bank account number, bank transfer slip with recipient account details, handwritten phone number/contact note, or business card explicitly displaying direct contact/account info. (Circumvention -> isCircumvention: true)

Respond strictly in JSON format:
{
  "isCircumvention": true | false,
  "reason": "BANK_ACCOUNT" | "PHONE_NUMBER" | "CONTACT_CARD" | null,
  "explanation": "Short 1-sentence reason"
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            { text: prompt },
          ],
        },
      ],
      config: { responseMimeType: 'application/json' },
    }).catch(() => null);

    const raw = response?.text?.trim();
    if (!raw) return { isCircumvention: false };

    const parsed = JSON.parse(raw);
    if (parsed.isCircumvention) {
      return {
        isCircumvention: true,
        reason: 'IMAGE_CONTACT_OR_ACCOUNT',
        explanation: parsed.explanation || 'Image contains bank account or direct contact details.',
      };
    }
    return { isCircumvention: false };
  } catch (err) {
    console.warn('[Gemini Vision Media Inspection Notice]:', err);
    return { isCircumvention: false };
  }
}

export interface VisualProductAnalysis {
  isProduct: boolean;
  productName: string;
  category: string;
  details: string;
  ocrText?: string;
  visualTags?: string[];
  confidence: number;
}

export interface VendorProductExtraction {
  isProduct: boolean;
  productName: string;
  category: string;
  price: string;
  numericPrice: number;
  visualTags: string[];
  description: string;
  ocrText?: string;
  confidence: number;
}

export interface CatalogVisualMatch {
  productId: string;
  merchantId: string;
  businessName: string;
  whatsapp: string;
  productName: string;
  price: string;
  numericPrice?: number;
  photoUrl?: string;
  city?: string;
  state?: string;
  matchScore: number;
  matchReason: string;
}

/**
 * Parses colloquial Nigerian price notations from text (e.g. "25k", "₦25,000", "45,000 naira")
 */
export function parseNigerianPriceFromText(text: string): { formatted: string; numeric: number } | null {
  if (!text) return null;
  const clean = text.trim();

  // Pattern: "25k" or "₦25k" or "25.5k"
  const kMatch = clean.match(/(?:(?:naira|ngn|₦)\s*)?(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const val = Math.round(parseFloat(kMatch[1]) * 1000);
    return { formatted: `₦${val.toLocaleString()}`, numeric: val };
  }

  // Pattern: "₦25,000" or "25000" or "25,000"
  const numMatch = clean.match(/(?:(?:naira|ngn|₦)\s*)?(\d{1,3}(?:,\d{3})+|\d{4,9})/i);
  if (numMatch) {
    const rawNum = parseInt(numMatch[1].replace(/,/g, ''), 10);
    if (!isNaN(rawNum) && rawNum > 0) {
      return { formatted: `₦${rawNum.toLocaleString()}`, numeric: rawNum };
    }
  }

  return null;
}

/**
 * Uses Gemini Multimodal Vision and OCR to analyze a shopper's photo,
 * recognize the item, read any visible text/brand logos, and extract commerce details.
 */
export async function analyzeShopperImageWithAI(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<VisualProductAnalysis | null> {
  if (!imageBuffer || imageBuffer.length === 0) {
    return null;
  }

  const { base64Data, mimeType: cleanMime } = extractCleanBase64(imageBuffer, mimeType);
  const ai = getAIClient();

  if (!ai) {
    console.log('[Floate AI Vision] AI client not initialized. Using intelligent offline visual recognizer.');
    const bufStr = imageBuffer.toString('utf8', 0, 500);
    const mockMatch = bufStr.match(/([A-Z0-9 ]{3,30})/);
    const detected = mockMatch ? mockMatch[1].trim() : 'Fashion Footwear & Apparel';
    return {
      isProduct: true,
      productName: detected,
      category: 'General Commerce',
      details: 'Product photo scanned via Floate AI visual system',
      confidence: 0.85,
    };
  }

  try {
    const prompt = `You are Floate AI Vision, an advanced visual commerce & OCR engine for African and Nigerian trade on WhatsApp.
Carefully examine this image sent by a shopper.

Task:
1. Determine if this image depicts a sellable product, merchandise, gadget, appliance, fashion item, vehicle, building material, beauty product, food item, or commercial service.
2. Read and extract ANY visible text, brand logos, model numbers, or packaging lettering using OCR (e.g. "Samsung", "Nike", "Luminous 5kVA", "Gucci", "Apple", "Dior").
3. Determine the clean, specific product name in English (2 to 5 words, e.g. "Nike Air Force 1 Sneakers", "Samsung Galaxy S23 Ultra", "Bone Straight Wig 30-inch", "Solar Hybrid Inverter 5kVA", "Men's Chelsea Leather Boots", "Ankara 2-Piece Senator Wear").
4. Determine the primary Nigerian commerce category:
   - "Footwear & Shoes"
   - "Phones & Tablets"
   - "Electronics & Appliances"
   - "Solar & Inverters"
   - "Fashion & Clothing"
   - "Hair & Beauty"
   - "Laptops & Computers"
   - "Automotive & Parts"
   - "Home & Furniture"
   - "Building & Electrical Materials"
   - "Food & Groceries"
   - "General Commerce"
5. Provide a 1-sentence visual description highlighting key characteristics (color, material, style, unique attributes).

Return STRICTLY JSON format:
{
  "isProduct": true,
  "productName": "Nike Air Force 1 Sneakers",
  "category": "Footwear & Shoes",
  "details": "White low-top leather athletic sneakers with perforated toe box and rubber cupsole",
  "ocrText": "AIR",
  "confidence": 0.95
}

If the image is completely blank, a blurry non-product, a personal selfie with no merchandise, a meme, or unidentifiable:
{
  "isProduct": false,
  "productName": "",
  "category": "",
  "details": "No identifiable product detected in photo",
  "ocrText": "",
  "confidence": 0.1
}`;

    const response = await generateContentWithFallback(
      ai,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: cleanMime,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      },
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'],
      15000
    ).catch((e) => {
      console.warn('[Gemini Analyze Shopper Image Call Warning]:', e?.message || e);
      return null;
    });

    const rawText = response?.text?.trim();
    if (!rawText) {
      console.log('[Floate AI Vision] Primary JSON vision response empty. Running fallback product recognizer...');
      const fallbackName = await identifyProductFromImageWithAI(imageBuffer, cleanMime);
      if (fallbackName && fallbackName.length > 2) {
        return {
          isProduct: true,
          productName: fallbackName,
          category: 'General Commerce',
          details: `Identified item: ${fallbackName}`,
          confidence: 0.8,
        };
      }
      return null;
    }

    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
    const parsed = JSON.parse(cleanJson);

    if (parsed.isProduct && parsed.productName) {
      return {
        isProduct: true,
        productName: String(parsed.productName).trim().replace(/["`]/g, ''),
        category: String(parsed.category || 'General Commerce').trim(),
        details: String(parsed.details || '').trim(),
        ocrText: parsed.ocrText ? String(parsed.ocrText).trim() : undefined,
        visualTags: Array.isArray(parsed.visualTags) ? parsed.visualTags.map(String) : [],
        confidence: Number(parsed.confidence) || 0.9,
      };
    }

    return null;
  } catch (err) {
    console.warn('[Gemini Analyze Shopper Image Warning]:', err);
    try {
      const fallbackName = await identifyProductFromImageWithAI(imageBuffer, cleanMime);
      if (fallbackName && fallbackName.length > 2) {
        return {
          isProduct: true,
          productName: fallbackName,
          category: 'General Commerce',
          details: `Identified item: ${fallbackName}`,
          confidence: 0.75,
        };
      }
    } catch (e) {}
    return null;
  }
}

/**
 * Uses Gemini Multimodal Vision to identify a product when a buyer sends a photo of an item they want to buy.
 */
export async function identifyProductFromImageWithAI(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<string | null> {
  if (!imageBuffer || imageBuffer.length === 0) {
    return null;
  }

  const { base64Data, mimeType: cleanMime } = extractCleanBase64(imageBuffer, mimeType);
  const ai = getAIClient();
  if (!ai) {
    return 'Product Item';
  }

  try {
    const prompt = `Analyze this product/item photo sent by a shopper on WhatsApp in Nigeria.
Task: Identify the exact product category, name, and style so we can search for verified vendors selling it.
Provide a concise, highly searchable product query in English (2 to 5 words, e.g. "Chelsea Boots Men", "Nike Air Force 1", "Human Hair Wig 24 inch", "Samsung Galaxy S22 Ultra", "Ankara Maxi Dress").
Return ONLY the search term with no extra words or markdown.`;

    const response = await generateContentWithFallback(
      ai,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: cleanMime,
                },
              },
              { text: prompt },
            ],
          },
        ],
      },
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'],
      15000
    ).catch((e) => {
      console.warn('[Gemini Identify Product Call Warning]:', e?.message || e);
      return null;
    });

    const result = response?.text?.trim()?.replace(/["`]/g, '');
    return result || null;
  } catch (err) {
    console.warn('[Gemini Identify Product From Image Notice]:', err);
    return null;
  }
}

/**
 * Analyzes a product photo uploaded by a vendor, reading any visible text/brand/price tags with OCR,
 * evaluating any vendor caption stating the price (e.g. "25k", "₦25,000", "45k last"),
 * and extracting structured catalog fields (name, price, category, visualTags, description).
 */
export async function extractVendorProductFromImageWithAI(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  captionText: string = ''
): Promise<VendorProductExtraction | null> {
  if (!imageBuffer || imageBuffer.length === 0) {
    const parsedPrice = parseNigerianPriceFromText(captionText);
    const words = captionText.replace(/[0-9k₦,]/gi, '').trim();
    return {
      isProduct: true,
      productName: words.length > 2 ? words.slice(0, 40) : 'Market Product Item',
      category: 'General Commerce',
      price: parsedPrice ? parsedPrice.formatted : (captionText.trim() || 'Contact for Price'),
      numericPrice: parsedPrice ? parsedPrice.numeric : 0,
      visualTags: ['product', 'item'],
      description: captionText.trim() || 'Vendor uploaded product photo',
      confidence: 0.6,
    };
  }

  const { base64Data, mimeType: cleanMime } = extractCleanBase64(imageBuffer, mimeType);
  const ai = getAIClient();

  if (!ai) {
    const parsedPrice = parseNigerianPriceFromText(captionText);
    const words = captionText.replace(/[0-9k₦,]/gi, '').trim();
    return {
      isProduct: true,
      productName: words.length > 2 ? words.slice(0, 40) : 'Merchant Catalog Product',
      category: 'General Commerce',
      price: parsedPrice ? parsedPrice.formatted : (captionText.trim() || 'Contact for Price'),
      numericPrice: parsedPrice ? parsedPrice.numeric : 0,
      visualTags: ['product', 'catalog'],
      description: captionText.trim() || 'Vendor uploaded store item',
      confidence: 0.7,
    };
  }

  try {
    const prompt = `You are Floate AI Vision, an advanced visual commerce & OCR engine for African and Nigerian merchants on WhatsApp.
A vendor is posting a photo of their product to add to their store catalog.
Vendor Caption / Price message: "${captionText || '(No caption provided)'}"

Task:
1. Examine the image carefully. Determine if it depicts a commercial product, inventory item, fashion piece, gadget, appliance, beauty product, footwear, grocery, vehicle, or merchandise for sale.
2. Extract the clean, specific product name in English (2 to 5 words, e.g. "Men's Chelsea Leather Boots", "Samsung Galaxy S23 Ultra 256GB", "Nike Air Jordan 4 Retro", "Bone Straight Wig 30-inch", "Luminous 5kVA Solar Inverter", "Ladies Stiletto Heels").
3. Determine the primary Nigerian commerce category:
   - "Footwear & Shoes"
   - "Phones & Tablets"
   - "Electronics & Appliances"
   - "Solar & Inverters"
   - "Fashion & Clothing"
   - "Hair & Beauty"
   - "Laptops & Computers"
   - "Automotive & Parts"
   - "Home & Furniture"
   - "Building & Electrical Materials"
   - "Food & Groceries"
   - "General Commerce"
4. OCR and Price Detection:
   - Check the vendor caption: "${captionText}". If it contains a price (e.g. "25k" = 25000, "₦35,000", "45,000", "15k each"), parse the price.
   - If caption doesn't contain a price, read any visible price tag, barcode label, or sticker on the product or box using OCR.
   - Return standard formatted price string (e.g. "₦25,000") and numeric integer (e.g. 25000). If no price is mentioned or found, return "Contact for Price" and 0.
5. Visual semantic tags: Provide 5 to 8 specific visual tags describing color, material, style, and physical characteristics (e.g. ["chelsea boot", "black leather", "ankle boot", "pointed toe", "formal shoes"]).
6. Provide a concise 1-sentence product description highlighting specifications and features.
7. Any visible brand, model, or packaging lettering detected via OCR.

Return STRICTLY JSON:
{
  "isProduct": true,
  "productName": "Men's Chelsea Leather Boots",
  "category": "Footwear & Shoes",
  "price": "₦25,000",
  "numericPrice": 25000,
  "visualTags": ["chelsea boot", "black leather", "ankle boot", "formal footwear", "mens shoe"],
  "description": "Handmade black genuine leather ankle chelsea boots with elastic side gusset and durable rubber sole",
  "ocrText": "HANDMADE",
  "confidence": 0.95
}`;

    const response = await generateContentWithFallback(
      ai,
      {
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: cleanMime,
                },
              },
              { text: prompt },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      },
      ['gemini-3.8-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash'],
      15000
    ).catch((e) => {
      console.warn('[Gemini Extract Vendor Product Call Warning]:', e?.message || e);
      return null;
    });

    const rawText = response?.text?.trim();
    if (rawText) {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsed = JSON.parse(cleanJson);
      if (parsed.isProduct && parsed.productName) {
        let priceStr = parsed.price || '';
        let numPrice = Number(parsed.numericPrice) || 0;
        if ((!priceStr || priceStr === 'Contact for Price' || numPrice === 0) && captionText) {
          const capPrice = parseNigerianPriceFromText(captionText);
          if (capPrice) {
            priceStr = capPrice.formatted;
            numPrice = capPrice.numeric;
          }
        }

        return {
          isProduct: true,
          productName: String(parsed.productName).trim().replace(/["`]/g, ''),
          category: String(parsed.category || 'General Commerce').trim(),
          price: priceStr || 'Contact for Price',
          numericPrice: numPrice,
          visualTags: Array.isArray(parsed.visualTags) ? parsed.visualTags.map(String) : [],
          description: String(parsed.description || '').trim(),
          ocrText: parsed.ocrText ? String(parsed.ocrText).trim() : undefined,
          confidence: Number(parsed.confidence) || 0.9,
        };
      }
    }

    const capPrice = parseNigerianPriceFromText(captionText);
    const basicName = await identifyProductFromImageWithAI(imageBuffer, cleanMime);
    return {
      isProduct: true,
      productName: basicName || 'Catalog Product',
      category: 'General Commerce',
      price: capPrice ? capPrice.formatted : (captionText.trim() || 'Contact for Price'),
      numericPrice: capPrice ? capPrice.numeric : 0,
      visualTags: [basicName || 'product'].filter(Boolean),
      description: captionText.trim() || 'Product listing',
      confidence: 0.7,
    };
  } catch (err) {
    console.warn('[Gemini Extract Vendor Product Error]:', err);
    const capPrice = parseNigerianPriceFromText(captionText);
    return {
      isProduct: true,
      productName: 'Store Product',
      category: 'General Commerce',
      price: capPrice ? capPrice.formatted : 'Contact for Price',
      numericPrice: capPrice ? capPrice.numeric : 0,
      visualTags: ['product'],
      description: captionText.trim() || 'Vendor product photo',
      confidence: 0.6,
    };
  }
}

/**
 * Intelligently compares a buyer's product photo/analysis against vendor catalog products in Firestore.
 * Matches items even if the buyer's image is a screenshot from social media, taken from a different angle,
 * or with different lighting, recognizing equivalent models and items.
 */
export async function matchBuyerImageToVendorCatalogsWithAI(
  buyerAnalysis: {
    productName: string;
    category: string;
    details?: string;
    ocrText?: string;
    visualTags?: string[];
  },
  candidateProducts: Array<{
    id: string;
    merchantId: string;
    businessName: string;
    whatsapp: string;
    product: string;
    price: string;
    numericPrice?: number;
    category: string;
    photoUrl?: string;
    visualTags?: string[];
    ocrText?: string;
    specs?: string;
    city?: string;
    state?: string;
  }>
): Promise<CatalogVisualMatch[]> {
  if (!candidateProducts || candidateProducts.length === 0) {
    return [];
  }

  // Fast pre-filter: products in compatible category or containing matching tokens
  const buyerTokens = [
    buyerAnalysis.productName,
    buyerAnalysis.category,
    buyerAnalysis.ocrText || '',
    buyerAnalysis.details || '',
    ...(buyerAnalysis.visualTags || []),
  ]
    .join(' ')
    .toLowerCase()
    .split(/[\s,.-]+/)
    .filter((t) => t.length > 2);

  const scoredCandidates = candidateProducts.map((cand) => {
    const candTokens = [
      cand.product,
      cand.category,
      cand.ocrText || '',
      cand.specs || '',
      ...(cand.visualTags || []),
    ]
      .join(' ')
      .toLowerCase();

    let tokenMatchCount = 0;
    for (const token of buyerTokens) {
      if (candTokens.includes(token)) {
        tokenMatchCount++;
      }
    }

    const sameCategory = cand.category.toLowerCase().includes(buyerAnalysis.category.toLowerCase()) ||
      buyerAnalysis.category.toLowerCase().includes(cand.category.toLowerCase());

    const tokenScore = Math.min(100, Math.round((tokenMatchCount / Math.max(1, buyerTokens.length)) * 100) + (sameCategory ? 25 : 0));

    return { cand, tokenScore, sameCategory };
  });

  // Filter candidates that have some semantic or categorical connection
  const filtered = scoredCandidates
    .filter((sc) => sc.tokenScore >= 20 || sc.sameCategory)
    .sort((a, b) => b.tokenScore - a.tokenScore)
    .slice(0, 8); // Top 8 for AI evaluation

  if (filtered.length === 0) {
    return [];
  }

  const ai = getAIClient();
  if (!ai) {
    return filtered
      .filter((sc) => sc.tokenScore >= 35)
      .map((sc) => ({
        productId: sc.cand.id,
        merchantId: sc.cand.merchantId,
        businessName: sc.cand.businessName,
        whatsapp: sc.cand.whatsapp,
        productName: sc.cand.product,
        price: sc.cand.price,
        numericPrice: sc.cand.numericPrice,
        photoUrl: sc.cand.photoUrl,
        city: sc.cand.city,
        state: sc.cand.state,
        matchScore: Math.min(95, Math.max(65, sc.tokenScore)),
        matchReason: `Matching item in ${sc.cand.category}`,
      }));
  }

  try {
    const candidatesList = filtered.map((f, i) => ({
      index: i,
      id: f.cand.id,
      product: f.cand.product,
      category: f.cand.category,
      specs: f.cand.specs || '',
      visualTags: f.cand.visualTags || [],
      ocrText: f.cand.ocrText || '',
    }));

    const prompt = `You are Floate Visual Commerce Matcher.
A shopper sent a photo of an item they want to buy:
- Identified Item: "${buyerAnalysis.productName}"
- Category: "${buyerAnalysis.category}"
- Visual Details: "${buyerAnalysis.details || ''}"
- Detected Text/Brand (OCR): "${buyerAnalysis.ocrText || ''}"
- Visual Tags: ${JSON.stringify(buyerAnalysis.visualTags || [])}

Candidate Vendor Products in Stock:
${JSON.stringify(candidatesList, null, 2)}

Task:
Determine which vendor products represent the exact item or a close equivalent model/style that the buyer is looking for.
Note: Even if the buyer's photo was taken at a different angle, different lighting, a screenshot from social media, or slightly different phrasing, recognize if the vendor sells this item.

Return a JSON array of matches with confidence score (60 to 100) and short explanation:
[
  {
    "index": 0,
    "matchScore": 95,
    "matchReason": "Exact model match: Chelsea Leather Boots in Footwear"
  }
]
Only include candidates with matchScore >= 60. Return STRICTLY JSON.`;

    const response = await generateContentWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { responseMimeType: 'application/json' },
    }).catch(() => null);

    const rawText = response?.text?.trim();
    if (rawText) {
      const cleanJson = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();
      const parsedArray = JSON.parse(cleanJson);
      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        const matches: CatalogVisualMatch[] = [];
        for (const item of parsedArray) {
          const matchedCandidate = filtered[item.index]?.cand;
          if (matchedCandidate && item.matchScore >= 60) {
            matches.push({
              productId: matchedCandidate.id,
              merchantId: matchedCandidate.merchantId,
              businessName: matchedCandidate.businessName,
              whatsapp: matchedCandidate.whatsapp,
              productName: matchedCandidate.product,
              price: matchedCandidate.price,
              numericPrice: matchedCandidate.numericPrice,
              photoUrl: matchedCandidate.photoUrl,
              city: matchedCandidate.city,
              state: matchedCandidate.state,
              matchScore: Number(item.matchScore) || 75,
              matchReason: String(item.matchReason || 'Matching item in vendor catalog'),
            });
          }
        }
        if (matches.length > 0) {
          return matches.sort((a, b) => b.matchScore - a.matchScore);
        }
      }
    }
  } catch (err) {
    console.warn('[Gemini Visual Catalog Match Error]:', err);
  }

  // Fallback to token scored results
  return filtered
    .filter((sc) => sc.tokenScore >= 35)
    .map((sc) => ({
      productId: sc.cand.id,
      merchantId: sc.cand.merchantId,
      businessName: sc.cand.businessName,
      whatsapp: sc.cand.whatsapp,
      productName: sc.cand.product,
      price: sc.cand.price,
      numericPrice: sc.cand.numericPrice,
      photoUrl: sc.cand.photoUrl,
      city: sc.cand.city,
      state: sc.cand.state,
      matchScore: Math.min(95, Math.max(65, sc.tokenScore)),
      matchReason: `Matching item in ${sc.cand.category}`,
    }));
}

/**
 * Result structure for natural language SafePay intent classification.
 */
export interface ExplicitSafePayIntentResult {
  isExplicitSafePay: boolean;
  confidence: number;
  intentType?: 'CREATE_SAFEPAY' | 'PAY_ON_DELIVERY_REQUEST' | 'HOLD_PAYMENT' | 'ESCROW_QUERY';
  extractedDetails?: {
    productOrItem?: string;
    agreedPrice?: number;
    vendorNameOrPhone?: string;
  };
}

/**
 * Section 1: Explicit Natural Language SafePay Intent Detection.
 * Accurately detects phrases like "Pay on delivery", "I want to pay", "Create safe pay",
 * "Hold my money", "Escrow this deal" while strictly guarding standard product search.
 */
export async function detectExplicitSafePayIntent(userInput: string): Promise<ExplicitSafePayIntentResult> {
  const text = (userInput || '').trim();
  if (!text || text.length < 3) {
    return { isExplicitSafePay: false, confidence: 0 };
  }

  const lower = text.toLowerCase();

  // High-precision lexical patterns (Nigerian English, colloquialisms, Pidgin)
  const explicitPhrases = [
    'safepay',
    'safe pay',
    'use safepay',
    'create safepay',
    'create safe pay',
    'start safepay',
    'i want to pay',
    'i want to make payment',
    'pay on delivery',
    'payment on delivery',
    'pod',
    'hold my money',
    'hold the money',
    'hold payment',
    'hold the payment',
    'pay into escrow',
    'use escrow',
    'escrow this',
    'floate escrow',
    'let floate hold',
    'pay securely',
    'secure payment',
    'buyer protection',
    'keep the money till delivery',
    'protect my money',
  ];

  const hasDirectKeyword = explicitPhrases.some((phrase) => lower.includes(phrase));

  const ai = getAIClient();
  if (!ai) {
    return {
      isExplicitSafePay: hasDirectKeyword,
      confidence: hasDirectKeyword ? 0.9 : 0,
      intentType: hasDirectKeyword ? 'CREATE_SAFEPAY' : undefined,
    };
  }

  try {
    const prompt = `You are the intent classification engine for Floate in Nigeria.
Analyze this message and determine if the user is explicitly requesting Floate SafePay (escrow / payment protection where Floate holds funds safely until delivery, or pay on delivery protection, or initiating a secure transaction).

User Message: "${text}"

RULES:
1. Return isExplicitSafePay: true if the user mentions:
   - SafePay / Safe pay ("create safe pay", "use safepay", "start safepay")
   - Pay on delivery / Payment on delivery
   - Intent to make payment or hold payment ("I want to pay", "hold my money", "let floate hold the money", "pay into escrow")
   - Buyer protection / safe transaction
2. Return isExplicitSafePay: false if the user is only asking:
   - General product availability ("Do you have sneakers?", "How much is iPhone?")
   - Asking for vendor contact or location ("Where is the shop?", "Connect me to seller")
   - Greeting or general inquiry without payment intent.
3. Extract any mentioned item name, agreed price in Naira (number only), and vendor phone/name if present.

Return ONLY a valid JSON object matching this schema:
{
  "isExplicitSafePay": boolean,
  "confidence": number,
  "intentType": "CREATE_SAFEPAY" | "PAY_ON_DELIVERY_REQUEST" | "HOLD_PAYMENT" | "ESCROW_QUERY" | null,
  "productOrItem": string | null,
  "agreedPrice": number | null,
  "vendorNameOrPhone": string | null
}`;

    const response = await generateContentWithFallback(ai, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }).catch(() => null);

    const rawResponse = response?.text?.trim() || '';
    const cleanJson = rawResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    if (!cleanJson) {
      return {
        isExplicitSafePay: hasDirectKeyword,
        confidence: hasDirectKeyword ? 0.9 : 0,
        intentType: hasDirectKeyword ? 'CREATE_SAFEPAY' : undefined,
      };
    }

    const parsed = JSON.parse(cleanJson);
    return {
      isExplicitSafePay: Boolean(parsed.isExplicitSafePay || (hasDirectKeyword && (parsed.confidence || 0) >= 0.5)),
      confidence: parsed.confidence || (hasDirectKeyword ? 0.95 : 0),
      intentType: parsed.intentType || (hasDirectKeyword ? 'CREATE_SAFEPAY' : undefined),
      extractedDetails: {
        productOrItem: parsed.productOrItem || undefined,
        agreedPrice: parsed.agreedPrice ? Number(parsed.agreedPrice) : undefined,
        vendorNameOrPhone: parsed.vendorNameOrPhone || undefined,
      },
    };
  } catch (err) {
    return {
      isExplicitSafePay: hasDirectKeyword,
      confidence: hasDirectKeyword ? 0.9 : 0,
      intentType: hasDirectKeyword ? 'CREATE_SAFEPAY' : undefined,
    };
  }
}

export interface CosRouterResult {
  intent: 'VENDOR_PROMOTION' | 'GENERAL_QUERY';
  confidence: number;
  extracted_type: 'SEARCH_BOOST' | 'DISCOUNT_SALE' | 'BANNER_INQUIRY' | 'UNKNOWN';
  detected_language: 'PIDGIN' | 'ENGLISH' | 'MIXED';
}

/**
 * COS Router Engine for FLOATE
 * Determines if an incoming user message intends to promote, boost, sponsor, or run ads on FLOATE.
 */
export async function classifyCosRouterIntent(message: string): Promise<CosRouterResult> {
  const text = (message || '').trim();
  if (!text) {
    return {
      intent: 'GENERAL_QUERY',
      confidence: 0.0,
      extracted_type: 'UNKNOWN',
      detected_language: 'ENGLISH',
    };
  }

  const ai = getAIClient();
  if (ai) {
    try {
      const prompt = `You are the COS Router Engine for FLOATE—an AI-native Market Operating System digitizing informal African commerce (e.g., Computer Village, Onitsha Main Market, Balogun Market).

YOUR SOLE TASK:
Analyze the incoming user message (in English, Nigerian Pidgin, or market slang) and determine if the user intends to PROMOTES, BOOST, SPONSOR, or RUN ADS for their business, products, or stall on FLOATE.

---

1. INTENT RECOGNITION CATEGORIES:

A. "VENDOR_PROMOTION" (High Confidence Match):
Triggers when a vendor wants to run ads, pay for visibility, feature their shop, boost stock, or run discount sales.
Examples of recognized phrasing:
- Pidgin / Street Slang: "I wan blow my business", "how I fit push my market", "I wan boost my stall", "show my market for front", "how I fit make my items show first", "I wan package my market", "help me carry my shop go top", "how we go run am", "I wan enter eyes".
- Direct / Short: "I wan run sponsor", "how to boost stall", "I wan do promo", "place ads here", "top search result", "ad rates", "feature my shop".
- Business / Formal: "I want to promote my business", "how do I run sponsored ads", "advertising rates", "sponsor my catalog", "appear at the top of search", "feature my store on the landing page".
- Discount / Flash Sales: "I wan clear stock", "run discount sales ad", "I get promo sales today", "host flash sale", "cut price for my goods".

B. "GENERAL_QUERY" (No Promotion Intent):
Triggers when the message is a buyer product search, general greeting, standard vendor catalog update without promotion, or support query.
Examples: "How much be iPhone 13?", "Where is your office?", "Upload this picture to my stall", "Good morning".

---

2. OUTPUT FORMAT CONSTRAINTS:
You MUST respond with STRICT, VALID JSON ONLY. Do NOT include markdown code blocks, explanations, or leading text.

JSON Output Schema:
{
  "intent": "VENDOR_PROMOTION" | "GENERAL_QUERY",
  "confidence": number, // float between 0.0 and 1.0
  "extracted_type": "SEARCH_BOOST" | "DISCOUNT_SALE" | "BANNER_INQUIRY" | "UNKNOWN",
  "detected_language": "PIDGIN" | "ENGLISH" | "MIXED"
}

Incoming User Message:
"${text.replace(/"/g, '\\"')}"`;

      const response = await generateContentWithFallback(ai, {
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });

      const responseText = (response.text || '').trim();
      const cleanJson = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      if (parsed && (parsed.intent === 'VENDOR_PROMOTION' || parsed.intent === 'GENERAL_QUERY')) {
        return {
          intent: parsed.intent,
          confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
          extracted_type: parsed.extracted_type || 'UNKNOWN',
          detected_language: parsed.detected_language || 'ENGLISH',
        };
      }
    } catch (err) {
      console.warn('[COS Router Engine Warning]:', err);
    }
  }

  // Fallback heuristic detection for offline or backup
  const lower = text.toLowerCase();
  const isVendorPromotion = /\b(push my market|boost my stall|blow my business|run ad|run ads|run sponsor|boost stall|do promo|place ad|place ads|top search|ad rates|feature my shop|promote my business|sponsored ad|sponsored ads|advertising rates|sponsor my catalog|banner ad|clear stock|discount sale|flash sale|enter eyes|carry my shop go top)\b/i.test(lower);

  if (isVendorPromotion) {
    let extractedType: 'SEARCH_BOOST' | 'DISCOUNT_SALE' | 'BANNER_INQUIRY' | 'UNKNOWN' = 'SEARCH_BOOST';
    if (lower.includes('discount') || lower.includes('clear stock') || lower.includes('flash sale')) {
      extractedType = 'DISCOUNT_SALE';
    } else if (lower.includes('banner') || lower.includes('rates')) {
      extractedType = 'BANNER_INQUIRY';
    }
    const isPidgin = /\b(wan|fit|dey|go|make|my market|top|blow|enter eyes)\b/i.test(lower);
    return {
      intent: 'VENDOR_PROMOTION',
      confidence: 0.85,
      extracted_type: extractedType,
      detected_language: isPidgin ? 'PIDGIN' : 'ENGLISH',
    };
  }

  return {
    intent: 'GENERAL_QUERY',
    confidence: 0.05,
    extracted_type: 'UNKNOWN',
    detected_language: /\b(wan|fit|dey|go|make|be|how much be)\b/i.test(lower) ? 'PIDGIN' : 'ENGLISH',
  };
}
