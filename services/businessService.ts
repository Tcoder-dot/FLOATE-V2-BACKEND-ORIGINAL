import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { FLOATE_BACKEND_URL } from "./backendUrl";

export interface DatabaseBusiness {
  id: string;
  businessName: string;
  category: string;
  marketLocation: string;
  city: string;
  whatsapp: string;
  whatsappLink: string;
  avatarUrl?: string;
  hasImage: boolean;
  product: string;
  description: string;
  price: string;
  verified: boolean;
  initials: string;
}

// Strictly verify real merchant uploads (Excludes Unsplash and generic stock photos)
export function isRealMerchantImage(url?: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  if (!lower.startsWith('http')) return false;
  if (lower.includes('unsplash.com')) return false;
  if (lower.includes('placeholder')) return false;
  if (lower.includes('ui-avatars.com')) return false;
  if (lower.includes('images.pexels.com')) return false;
  if (lower.includes('dummyimage')) return false;
  return true;
}

// Generate authentic two-letter monogram logo initials
export function getMonogramInitials(name: string): string {
  if (!name) return 'FL';
  const norm = name.trim().toUpperCase();

  // Explicit real database anchor overrides
  if (norm.includes("CHIVORA")) return "CH";
  if (norm.includes("MAKKY")) return "ML";
  if (norm.includes("GOODY")) return "GC";
  if (norm.includes("MBAM")) return "MP";
  if (norm.includes("JULE")) return "JB";
  if (norm.includes("RICH BUILD")) return "RB";

  // General fallback for all other registered database merchants
  const words = norm
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => !['THE', 'AND', '&', 'OF', 'CO', 'LTD', 'INC', 'ENTERPRISE', 'GLOBAL', 'VENTURES', 'NIGERIA'].includes(w));

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]);
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2);
  }
  return norm.slice(0, 2) || 'FL';
}

// Real anchor businesses registered in the database (Prevents category hallucinations)
interface AnchorMetadata {
  category: string;
  product: string;
  location: string;
  phone: string;
  initials: string;
}

const ANCHOR_OVERRIDES: Record<string, AnchorMetadata> = {
  "CHIVORA": {
    category: "Footwear & Shoes",
    product: "Quality Leather Shoes, Slides & Slippers",
    location: "Main Market, Onitsha, Anambra",
    phone: "08139598835",
    initials: "CH"
  },
  "MAKKY'S LUXE": {
    category: "Jewelries & Perfumes",
    product: "Jewelries, Perfumes, Home & Event Decorations, Gift Packages",
    location: "Main Market, Onitsha, Anambra",
    phone: "07049113767",
    initials: "ML"
  },
  "GOODY'S COLLECTION": {
    category: "Footwear & Shoes",
    product: "Unisex Slippers, Leather Sandals & Slides",
    location: "Main Market, Onitsha, Anambra",
    phone: "08064292345",
    initials: "GC"
  },
  "MBAMS PHONES & GADGETS": {
    category: "Phones & Gadgets",
    product: "Smartphones, iPhones, UK Used Devices & Accessories",
    location: "Computer Village, Ikeja, Lagos",
    phone: "08101234567",
    initials: "MP"
  },
  "JULES BOUTIQUE & APPAREL": {
    category: "Fashion & Apparel",
    product: "Designer Handbags, Corporate & Casual Outfits, Dresses",
    location: "Balogun Market, Lagos Island, Lagos",
    phone: "08109876543",
    initials: "JB"
  },
  "RICH BUILD": {
    category: "Tech & Software Solutions",
    product: "Website Development, Custom Software & Tech Solutions",
    location: "Enugu Tech Hub, Independence Layout, Enugu",
    phone: "07065599116",
    initials: "RB"
  }
};

export function mapFirestoreBusiness(docId: string, data: any): DatabaseBusiness | null {
  if (docId === "test_ping" || docId === "chivora-cosmetics") return null;

  const rawName = (data.businessName || data.name || "").trim();
  if (!rawName || rawName.toLowerCase() === "undefined" || rawName.toLowerCase() === "chivora cosmetics") {
    return null;
  }
  const normName = rawName.toUpperCase();

  // Match anchor overrides if applicable
  let anchor: AnchorMetadata | null = null;
  for (const [key, meta] of Object.entries(ANCHOR_OVERRIDES)) {
    if (normName.includes(key) || docId.toLowerCase().includes(key.toLowerCase().replace(/[^a-z0-9]/g, "-"))) {
      anchor = meta;
      break;
    }
  }

  const name = anchor ? (normName.includes("CHIVORA") ? "CHIVORA" : anchor === ANCHOR_OVERRIDES["RICH BUILD"] ? "Rich Build" : rawName) : rawName;
  const category = anchor?.category || (data.category || data.primaryCategory || "General Merchandise").trim();
  const product = anchor?.product || data.product || data.bio || data.description || category;
  const city = (data.city || data.state || "Nigeria").trim();
  const location = anchor?.location || data.location || data.marketLocation || data.marketHub || `${city}`.replace(/^,\s*|,\s*$/g, "") || "Nigeria";
  const initials = anchor?.initials || getMonogramInitials(name);

  const phoneSource = anchor?.phone || data.whatsapp || data.whatsappNumber || data.phone || "08139598835";
  const rawPhone = String(phoneSource).replace(/[^0-9]/g, "");
  const intlPhone = rawPhone.startsWith("0")
    ? "234" + rawPhone.slice(1)
    : rawPhone.startsWith("234")
    ? rawPhone
    : rawPhone
    ? "234" + rawPhone
    : "2348139598835";

  const waLink = `https://wa.me/${intlPhone}?text=Hello%20${encodeURIComponent(name)},%20I%20saw%20your%20store%20on%20Floate`;

  const rawAvatar = data.avatarUrl || data.profilePhotoUrl || data.photoUrl || data.imageUrl || (Array.isArray(data.productImages) && data.productImages[0]) || "";
  const hasRealImage = isRealMerchantImage(rawAvatar);

  return {
    id: docId || data.id || data.slug,
    businessName: name,
    category,
    marketLocation: location,
    city,
    whatsapp: intlPhone,
    whatsappLink: waLink,
    avatarUrl: hasRealImage ? rawAvatar : undefined,
    hasImage: hasRealImage,
    product,
    description: data.description || data.bio || `${category} verified merchant in ${city}`,
    price: data.price || data.priceRange || "Contact for price",
    verified: data.verified === true || data.isVerified === true,
    initials
  };
}

export async function fetchAllDatabaseBusinesses(): Promise<DatabaseBusiness[]> {
  const [merchantResult, businessResult] = await Promise.allSettled([
    fetchPublicMerchantRecords(),
    getDocs(collection(db, "businesses"))
  ]);
  if (merchantResult.status === "rejected") {
    console.warn("[businessService] Error fetching merchants from backend:", merchantResult.reason);
  }
  if (businessResult.status === "rejected") {
    console.warn("[businessService] Error fetching businesses from Firestore:", businessResult.reason);
  }

  return mapBusinessRecords([
    ...(merchantResult.status === "fulfilled" ? merchantResult.value : []),
    ...(businessResult.status === "fulfilled" ? businessResult.value.docs : [])
  ]);
}

function mapBusinessRecords(records: Array<{ id: string; data: () => any }>): DatabaseBusiness[] {
  const list: DatabaseBusiness[] = [];
  const seenNames = new Set<string>();
  const seenPhones = new Set<string>();

  for (const record of records) {
    const data = record.data();
    if (!data || (!data.businessName && !data.name)) continue;

    const mapped = mapFirestoreBusiness(record.id, data);
    if (!mapped) continue;

    const phone = mapped.whatsapp.replace(/\D/g, "");
    const name = mapped.businessName.toUpperCase();
    if ((phone && seenPhones.has(phone)) || seenNames.has(name)) continue;
    if (phone) seenPhones.add(phone);
    seenNames.add(name);
    list.push(mapped);
  }

  for (const [key, meta] of Object.entries(ANCHOR_OVERRIDES)) {
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    list.unshift({
      id: `anchor_${key.toLowerCase().replace(/[^a-z0-9]/g, "_")}`,
      businessName: meta.category === "Tech & Software Solutions" ? "Rich Build" : key,
      category: meta.category,
      marketLocation: meta.location,
      city: meta.location.split(",")[1]?.trim() || "Nigeria",
      whatsapp: "234" + meta.phone.replace(/^0+/, ""),
      whatsappLink: `https://wa.me/234${meta.phone.replace(/^0+/, "")}?text=Hello%20${encodeURIComponent(meta.category === "Tech & Software Solutions" ? "Rich Build" : key)},%20I%20saw%20your%20store%20on%20Floate`,
      hasImage: false,
      product: meta.product,
      description: `${meta.category} verified merchant in ${meta.location}`,
      price: "Contact for price",
      verified: true,
      initials: meta.initials
    });
  }

  return list;
}

async function fetchPublicMerchantRecords(): Promise<Array<{ id: string; data: () => any }>> {
  const response = await fetch(`${FLOATE_BACKEND_URL}/api/catalog/merchants`, {
    headers: { Accept: "application/json" }
  });
  if (!response.ok) throw new Error(`Merchant directory request failed (HTTP ${response.status}).`);

  const result = await response.json();
  if (!result.success || !Array.isArray(result.merchants)) {
    throw new Error("Merchant directory returned an invalid response.");
  }

  return result.merchants.map((merchant: any) => ({
    id: String(merchant.id || merchant.phone || ""),
    data: () => merchant
  }));
}

export function subscribeDatabaseBusinesses(callback: (businesses: DatabaseBusiness[]) => void): () => void {
  try {
    let merchants: Array<{ id: string; data: () => any }> = [];
    let businesses: Array<{ id: string; data: () => any }> | null = null;
    const emit = () => {
      if (businesses) callback(mapBusinessRecords([...merchants, ...businesses]));
    };

    const unsubscribeBusinesses = onSnapshot(collection(db, "businesses"), (snap) => {
      businesses = snap.docs;
      emit();
    }, (error) => console.warn("[businessService] Business listener warning:", error));
    const refreshMerchants = async () => {
      try {
        merchants = await fetchPublicMerchantRecords();
        emit();
      } catch (error) {
        console.warn("[businessService] Merchant directory refresh failed:", error);
      }
    };
    void refreshMerchants();
    const refreshInterval = setInterval(() => { void refreshMerchants(); }, 60_000);

    return () => {
      clearInterval(refreshInterval);
      unsubscribeBusinesses();
    };
  } catch (err) {
    console.warn("[businessService] onSnapshot init warning:", err);
    return () => {};
  }
}
