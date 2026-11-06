/**
 * FLOATE Natural Language Search & Intent Parser
 * Converts plain sentences (e.g. "I want to buy footwear 5000 naira or 5k")
 * into structured query tokens, price filters, and city boundaries.
 */

export interface ParsedSearchIntent {
  rawQuery: string;
  cleanQuery: string;
  maxPrice?: number;
  detectedCity?: string;
  detectedCategory?: string;
}

export function parseNaturalLanguageQuery(text: string): ParsedSearchIntent {
  if (!text || !text.trim()) {
    return { rawQuery: "", cleanQuery: "" };
  }

  const raw = text.trim();
  let clean = raw;

  // 1. Extract Price (e.g., "5000 naira", "5k", "under 50k", "250k", "₦5000")
  let maxPrice: number | undefined = undefined;

  // Match pattern with 'k' first (e.g. 5k, 50k, 250k)
  const kMatch = raw.match(/\b(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) {
    const num = parseFloat(kMatch[1]);
    maxPrice = Math.round(num * 1000);
  }

  // If no 'k' match, try standard number with naira/ngn/currency or budget context
  if (!maxPrice) {
    const contextMatch =
      raw.match(/(?:under|below|less than|max|for|around|budget of|within)?\s*(?:₦|ngn)?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*(?:naira|ngn)?/i);
    const nairaExplicitMatch = raw.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*(?:naira|ngn)/i);

    const matchToUse = nairaExplicitMatch || (raw.toLowerCase().includes("under") || raw.toLowerCase().includes("budget") ? contextMatch : null);
    if (matchToUse) {
      const cleanNum = matchToUse[1].replace(/,/g, '');
      const parsed = parseInt(cleanNum, 10);
      if (parsed > 0) {
        maxPrice = parsed;
      }
    }
  }

  // 2. Extract Nigerian Commercial Cities
  const CITIES = ["Lagos", "Onitsha", "Aba", "Abuja", "Port Harcourt", "Kano", "Ibadan", "Enugu", "Ikeja", "Awka", "Owerri", "Alaba"];
  let detectedCity: string | undefined = undefined;
  for (const city of CITIES) {
    const regex = new RegExp(`\\b${city}\\b`, "i");
    if (regex.test(raw)) {
      detectedCity = city === "Ikeja" || city === "Alaba" ? "Lagos" : city;
      break;
    }
  }

  // 3. Clean query by stripping intent boilerplate, price expressions, and city mentions
  clean = clean.replace(/\b(?:under|below|less than|max|at most|for|budget of)?\s*(?:₦|ngn)?\s*\d+(?:,\d+)?\s*(?:k|thousand|naira|ngn)?\b/gi, " ");
  clean = clean.replace(/\b(?:or)?\s*\d+\s*k\b/gi, " ");
  clean = clean.replace(/\b\d+\s*naira\b/gi, " ");

  // Remove common Nigerian intent boilerplate phrases
  const BOILERPLATE_REGEX = /\b(i want to buy|i want buy|i want|want to buy|i need|looking for|where can i get|where can i find|help me find|how much is|show me|find me|give me|buy|sell|order)\b/gi;
  clean = clean.replace(BOILERPLATE_REGEX, " ");

  // Remove filler intent words that aren't product specifics
  const FILLER_REGEX = /\b(good|cheap|affordable|original|legit|please|pls|abeg|sharp)\b/gi;
  clean = clean.replace(FILLER_REGEX, " ");

  // Remove detected city from search query text
  if (detectedCity) {
    clean = clean.replace(new RegExp(`\\b(in|at|around)?\\s*${detectedCity}\\b`, "gi"), " ");
  }

  // Normalize whitespace & punctuation
  clean = clean.replace(/[^\w\s-]/g, " ").replace(/\s+/g, " ").trim();

  // If clean query became empty, fallback to raw
  if (!clean) {
    clean = raw;
  }

  return {
    rawQuery: raw,
    cleanQuery: clean,
    maxPrice,
    detectedCity
  };
}
