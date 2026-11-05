/**
 * FLOATE Category Intent Extraction Utility
 * Provides sub-millisecond regex & keyword-taxonomy intent mapping
 * to standard Nigerian commercial market categories.
 */

export type FloateCategory =
  | "Footwear & Shoes"
  | "Beauty, Perfumes & Jewelry"
  | "Solar & Power"
  | "Fashion & Apparel"
  | "Computers & Laptops"
  | "Phones & Tablets"
  | "Bags & Luggage"
  | "Food & Confectioneries"
  | "Auto & Truck Parts"
  | "Building & Industrial Supplies"
  | "Tech & Digital Services"
  | "Media & Graphic Design"
  | "Legal & Business Services";

/**
 * Keyword-to-Category Taxonomy Dictionary
 * Optimized with Nigerian market terminology (e.g. palms, tokunbo, bone straight, lutian, etc.)
 */
export const CATEGORY_TAXONOMY: Record<FloateCategory, RegExp[]> = {
  "Footwear & Shoes": [
    /\b(slippers?|slides?|palms?|sandals?|sneakers?|shoes?|crocs?|loafers?|boots?|heels?|footwear|birkenstocks?|half\s*shoes?)\b/i,
    /\b(yeezy|jordan\s*\d*|air\s*force|nike|adidas|puma|gucci\s*shoes?|leather\s*slippers?)\b/i
  ],
  "Phones & Tablets": [
    /\b(phones?|smartphones?|iphones?|ipads?|tablets?|androids?|samsung\s*galaxy|samsung|redmi|infinix|tecno|pixel|xiaomi|oppo|vivo)\b/i,
    /\b(tokunbo\s*iphones?|uk\s*used\s*iphones?|pro\s*max|promax|ultra)\b/i
  ],
  "Computers & Laptops": [
    /\b(laptops?|macbooks?|notebooks?|desktops?|monitors?|pc|computers?|macbook\s*(air|pro)|thinkpad|dell|hp|lenovo|asus|acer)\b/i
  ],
  "Beauty, Perfumes & Jewelry": [
    /\b(wigs?|human\s*hair|bone\s*straight|frontal|closure|vietnamese\s*hair|bundles?|raw\s*hair|braids?)\b/i,
    /\b(skincare|cosmetics?|creams?|lotions?|serums?|glow\s*oils?|perfumes?|fragrances?|makeup|soaps?|organic\s*soap|jewelry|gold|silver|earrings?|necklace)\b/i
  ],
  "Bags & Luggage": [
    /\b(handbags?|tote\s*bags?|clutches?|luxury\s*bags?|backpacks?|travel\s*bags?|suitcases?|briefcases?|luggage|school\s*bags?)\b/i
  ],
  "Fashion & Apparel": [
    /\b(fabrics?|materials?|ankara|lace|senator|gowns?|dresses?|suits?|shirts?|jeans?|trousers?|hoodies?|apparel|clothing|wears?|outfits?|jackets?)\b/i
  ],
  "Solar & Power": [
    /\b(generators?|inverters?|solar\s*panels?|batteries?|solar|lutian|firman|sumec|copper\s*wire\s*gen|tubular\s*battery|charge\s*controller)\b/i
  ],
  "Building & Industrial Supplies": [
    /\b(cement|iron\s*rods?|tiles?|paints?|plumbing|power\s*tools?|drills?|hardware|roofing|pipes?|electrical\s*wires?|steel|blocks?)\b/i
  ],
  "Food & Confectioneries": [
    /\b(rice|italian\s*rice|beans|garri|palm\s*oil|provisions?|groceries|commodities|bag\s*of\s*rice|frozen\s*foods?|cakes?|pastries?|drinks?)\b/i
  ],
  "Auto & Truck Parts": [
    /\b(car\s*parts?|auto\s*parts?|brake\s*pads?|engines?|motor\s*oil|car\s*battery|tyres?|tires?|headlights?|toyota\s*parts?|gearbox)\b/i
  ],
  "Tech & Digital Services": [
    /\b(web\s*development|website\s*development|app\s*development|software|developer|coding|web\s*design|repair|tech\s*service|installation)\b/i
  ],
  "Media & Graphic Design": [
    /\b(graphic\s*design|branding|logos?|flyers?|video\s*editing|photography|cinematography|prints?)\b/i
  ],
  "Legal & Business Services": [
    /\b(lawyers?|attorneys?|barristers?|solicitors?|advocates?|law\s*firms?|legal|legal\s*advice|legal\s*consult|legal\s*advisory|legal\s*services?|cac|cac\s*registration|business\s*name|tin|tax|trademark|accounting|bookkeeping|affidavit|notary|court|deed|documentation)\b/i
  ]
};

export interface ExtractedIntent {
  category: FloateCategory | null;
  confidence: number;
  matchedTokens: string[];
}

/**
 * Normalizes any category string or partial name to standard Floate category
 */
export function normalizeFloateCategory(input?: string): string | undefined {
  if (!input) return undefined;
  const lower = input.trim().toLowerCase();
  
  if (lower.includes("footwear") || lower.includes("shoe") || lower.includes("sneaker") || lower.includes("crocs") || lower.includes("slippers") || lower.includes("slides")) return "Footwear & Shoes";
  if (lower.includes("phone") || lower.includes("tablet") || lower.includes("iphone") || lower.includes("samsung") || lower.includes("smartphone")) return "Phones & Tablets";
  if (lower.includes("computer") || lower.includes("laptop") || lower.includes("macbook")) return "Computers & Laptops";
  if (lower.includes("beauty") || lower.includes("perfume") || lower.includes("cosmetic") || lower.includes("jewelry") || lower.includes("wig") || lower.includes("hair")) return "Beauty, Perfumes & Jewelry";
  if (lower.includes("bag") || lower.includes("luggage")) return "Bags & Luggage";
  if (lower.includes("fashion") || lower.includes("apparel") || lower.includes("fabric") || lower.includes("cloth") || lower.includes("boutique") || lower.includes("gown")) return "Fashion & Apparel";
  if (lower.includes("solar") || lower.includes("power") || lower.includes("generator") || lower.includes("inverter")) return "Solar & Power";
  if (lower.includes("building") || lower.includes("industrial") || lower.includes("hardware") || lower.includes("cement") || lower.includes("steel")) return "Building & Industrial Supplies";
  if (lower.includes("food") || lower.includes("confectioner") || lower.includes("provision") || lower.includes("rice")) return "Food & Confectioneries";
  if (lower.includes("auto") || lower.includes("truck") || lower.includes("motor") || lower.includes("car part")) return "Auto & Truck Parts";
  if (lower.includes("website") || lower.includes("tech") || lower.includes("digital") || lower.includes("software") || lower.includes("developer")) return "Tech & Digital Services";
  if (lower.includes("media") || lower.includes("graphic") || lower.includes("design") || lower.includes("branding")) return "Media & Graphic Design";
  if (lower.includes("legal") || lower.includes("lawyer") || lower.includes("attorney") || lower.includes("barrister") || lower.includes("solicitor") || lower.includes("business service") || lower.includes("cac")) return "Legal & Business Services";
  
  return input;
}

/**
 * Extracts category intent in sub-millisecond latency.
 */
export function extractCategoryIntent(query: string): ExtractedIntent {
  if (!query || typeof query !== "string") {
    return { category: null, confidence: 0, matchedTokens: [] };
  }

  const cleanQuery = query.trim().toLowerCase();

  for (const [category, patterns] of Object.entries(CATEGORY_TAXONOMY)) {
    for (const pattern of patterns) {
      const match = cleanQuery.match(pattern);
      if (match) {
        return {
          category: category as FloateCategory,
          confidence: 0.95,
          matchedTokens: [match[0]]
        };
      }
    }
  }

  return { category: null, confidence: 0, matchedTokens: [] };
}

