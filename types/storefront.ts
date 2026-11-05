export interface Merchant {
  id: string;
  slug: string;
  name: string;
  handle: string;
  avatarUrl: string;
  verified: boolean;
  verificationStatus?: 'REGISTERED' | 'EVIDENCE_SUBMITTED' | 'UNDER_REVIEW' | 'VERIFIED' | 'REJECTED' | string;
  marketLocation: string;
  marketShort: string;
  whatsappNumber: string;
  rating: number;
  completedEscrows: number;
  activeStatus: string;
  bio: string;
  safePayLevel: string;
  joinedDate: string;
  dispatchCity: string;
}

export interface StatusDrop {
  id: string;
  title: string;
  price: number;
  timestamp: string;
  imageUrl: string;
  condition: string;
  specs: string;
  viewsCount: number;
  caption?: string;
  productId?: string;
}

export type ProductCondition = 
  | 'GRADE A TOKUNBO'
  | 'BRAND NEW (SEALED)'
  | 'BRAND NEW IN BOX'
  | 'OPEN BOX US SPEC'
  | 'REFURBISHED GRADE A'
  | string;

export interface ProductItem {
  id: string;
  title: string;
  slug: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  additionalImages?: string[];
  condition: ProductCondition;
  category: 'iphones' | 'smartwatches' | 'macbooks' | 'audio' | 'accessories' | 'gadgets' | 'electronics' | string;
  specs: string[];
  batteryHealth?: string;
  storage?: string;
  isBoosted: boolean;
  boostScore?: number;
  stockCount: number;
  warranty: string;
  description: string;
  whatsappDirectLink: string;
}

export interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  fee: number;
  estimatedTime: string;
}

export interface MarketCluster {
  id: string;
  name: string;
  city: string;
  tagline: string;
  activeVendorsCount: number;
  queryParam: string;
}

export interface SpotlightMerchant extends Merchant {
  topStockImages: string[];
  spotlightBadge: string;
  primaryCategory: string;
}

export interface SearchResultItem {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  condition: string;
  formattedLocation?: string;
  location?: string;
  marketLocation: string;
  marketHub?: string;
  city?: string;
  state?: string;
  merchant: {
    id?: string;
    name: string;
    slug: string;
    avatarUrl: string;
    verified: boolean;
    activeTimeText?: string;
    whatsappNumber: string;
    rating?: number;
    completedEscrows?: number;
  };
  isBoosted?: boolean;
  specs?: string[];
  batteryHealth?: string;
  warranty?: string;
  whatsappDirectLink?: string;
}

export interface MatchingVendorItem {
  id: string;
  slug: string;
  name: string;
  handle?: string;
  avatarUrl: string;
  verified: boolean;
  formattedLocation?: string;
  location?: string;
  marketLocation: string;
  marketShort: string;
  marketHub?: string;
  city: string;
  state: string;
  whatsappNumber: string;
  rating: number;
  completedEscrows: number;
  primaryCategory: string;
  categories: string[];
  distanceKm?: number;
  distanceText?: string;
  sampleProducts?: { title: string; price: number; imageUrl?: string }[];
  bio?: string;
}

export interface ParsedSearchCriteria {
  rawQuery: string;
  keywords: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  targetPrice?: number;
  location?: string;
}

export interface SearchApiResponse {
  success: boolean;
  source: string;
  totalFound: number;
  criteria?: ParsedSearchCriteria;
  userLocation?: { city?: string; state?: string; lat?: number; lng?: number };
  results: SearchResultItem[];
  matchingVendors: MatchingVendorItem[];
  exactMatchesCount: number;
  hasPriceFilter: boolean;
  hasExactMatch: boolean;
}

export interface EscrowTickerItem {
  id: string;
  amount: number;
  itemTitle: string;
  location: string;
  timeAgo: string;
}

export interface SafePayOrder {
  orderId: string;
  product: ProductItem;
  buyerPhone: string;
  buyerName?: string;
  deliveryOption: DeliveryOption;
  deliveryAddress: string;
  itemPrice: number;
  deliveryFee: number;
  escrowFee: number;
  totalAmount: number;
  escrowReleaseCode: string;
  status: 'PENDING' | 'ESCROW_LOCKED' | 'DISPATCHED' | 'DELIVERED' | 'RELEASED';
  createdAt: string;
  merchantWhatsApp: string;
}
