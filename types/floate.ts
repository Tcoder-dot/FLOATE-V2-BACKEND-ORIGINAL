export interface Vendor {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  category: string;
  verified: boolean;
  isVerified?: boolean;
  verificationStatus?: string;
  verificationReason?: string;
  fid?: string;
  badgeUrl?: string;
  certificateUrl?: string;
  badgeCardUrl?: string;
  masterSealUrl?: string;
  flyerUrl?: string;
  squareBoostUrl?: string;
  location?: string;
  stallAddress?: string;
  is_spotlight?: boolean;
  avatar_url: string;
  bio: string;
  whatsapp_number: string;
  rating?: number;
  completed_escrows?: number;
}

export interface StatusItem {
  id: string;
  vendor_slug: string;
  vendor_name: string;
  vendor_city: string;
  avatar_url: string;
  verified: boolean;
  preview_image: string;
  caption?: string;
  created_at: string;
  expires_at: string;
  whatsapp_number?: string;
  vendor_phone?: string;
}

export interface Product {
  id: string;
  title: string;
  price_naira: number;
  formatted_price: string;
  photo_url: string;
  photos?: string[];
  description: string;
  in_stock: boolean;
  is_sale?: boolean;
  boosted?: boolean;
  condition?: string;
  category?: string;
  product_url?: string;
  vendor: {
    slug: string;
    name: string;
    city: string;
    state?: string;
    verified: boolean;
    isVerified?: boolean;
    verificationStatus?: string;
    fid?: string;
    badgeUrl?: string;
    avatar_url?: string;
    whatsapp_number?: string;
    rating?: number;
  };
}

export interface SpotlightSlide {
  id: string;
  title: string;
  price_naira: number;
  formatted_price: string;
  photo_url: string;
  product_url?: string;
  category?: string;
  badge_text?: string;
  vendor: {
    slug: string;
    name: string;
    city: string;
    verified: boolean;
    avatar_url?: string;
  };
}

export interface SpotlightData {
  id?: string;
  title?: string;
  price_naira?: number;
  formatted_price?: string;
  photo_url?: string;
  category?: string;
  badge_text?: string;
  vendor?: {
    slug: string;
    name: string;
    city: string;
    verified: boolean;
  };
  slides?: SpotlightSlide[];
  reel?: SpotlightSlide[];
}

export interface HomeApiResponse {
  success: boolean;
  city: string;
  available_cities: string[];
  status_rings: StatusItem[];
  spotlight: SpotlightData | null;
  items: Product[];
  next_cursor: string | null;
}

export interface SearchApiResponse {
  success: boolean;
  query: string;
  city: string;
  total_found: number;
  items: Product[];
  hits?: Product[];
  spotlight?: SpotlightData;
  suggested_businesses?: Vendor[];
  suggested_vendors?: Vendor[];
  next_cursor: string | null;
  suggested_cities: string[];
}

export interface CartItem {
  id: string;
  product_id: string;
  title: string;
  price_naira: number;
  formatted_price: string;
  photo_url: string;
  quantity: number;
}

export interface CartData {
  cart_id: string;
  vendor: {
    slug: string;
    name: string;
    whatsapp_number: string;
    city: string;
    verified: boolean;
  } | null;
  items: CartItem[];
  total_naira: number;
  formatted_total: string;
  count: number;
}

export interface CartConflictPayload {
  code: "CART_VENDOR_CONFLICT";
  current_vendor: {
    slug: string;
    name: string;
  };
  new_vendor: {
    slug: string;
    name: string;
  };
  item: {
    id: string;
    title: string;
    price_naira: number;
    photo_url: string;
  };
}

export interface BuyHandoffResponse {
  success: boolean;
  lead_code: string;
  whatsapp_url: string;
  prefill: string;
  vendor: {
    name: string;
    slug: string;
    whatsapp_number: string;
    city: string;
  };
}

export interface SearchIntakeTextResponse {
  success: boolean;
  job?: string;
  item?: string;
  city?: string;
  price_max_naira?: number;
  reply?: string;
  keywords?: string[];
  items?: Product[];
  spotlight?: SpotlightData;
  total_found?: number;
  next_cursor?: string | null;
}

export interface BillingPackQuoteResponse {
  success: boolean;
  pack_code: string;
  price_naira: number;
  formatted_price: string;
  already?: boolean;
  mapped_pack_code?: string;
  message?: string;
}

export interface SavedShopItem {
  id: string;
  buyer_id: string;
  vendor_id: string;
  created_at: string;
  vendor: Vendor;
}
