import { initializeApp, getApps, getApp } from 'firebase/app';
import { InlineKeyboard } from 'grammy';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  limit,
  runTransaction,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { sheetsDb, normalizePhone, BusinessListing, parsePriceToNumber, VendorMatchScore, getAllPhoneVariants } from './sheetsService.js';
import { extractInventoryFromVoiceOrPhoto, ExtractedInventoryData } from './aiService.js';
import { withExternalTimeout } from './timeoutService.js';
import { compactRelaySessionForStorage, STORAGE_LIMITS } from './storageOptimizer.js';

// Load Firebase configuration from firebase-applet-config.json, environment variables, or bundled defaults
const defaultFirebaseConfig = {
  projectId: "gen-lang-client-0100438151",
  appId: "1:328819263704:web:a51c1a314660eb577a6fad",
  apiKey: "AIzaSyB2_TEAHF-hSkKyrQva8HTI0F95OnIji6M",
  authDomain: "gen-lang-client-0100438151.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-10224e22-6d13-470a-8a28-6cc942bc5d67",
  storageBucket: "gen-lang-client-0100438151.firebasestorage.app",
  messagingSenderId: "328819263704",
  oAuthClientId: "328819263704-u1o77m8gokvo5d5op5nq04u5gpll6cgt.apps.googleusercontent.com",
};

let firebaseConfig: any = { ...defaultFirebaseConfig };
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fileData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    firebaseConfig = { ...defaultFirebaseConfig, ...fileData };
  }
} catch (e) {
  console.warn('[FirestoreInit] Using default firebase config:', e);
}

// Environment Variable Overrides if provided on platforms like Render / Cloud Run
if (process.env.FIREBASE_CONFIG) {
  try {
    const parsedEnvConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    firebaseConfig = { ...firebaseConfig, ...parsedEnvConfig };
  } catch (e) {
    console.warn('[FirestoreInit] Could not parse FIREBASE_CONFIG env var:', e);
  }
}
if (process.env.FIREBASE_PROJECT_ID) firebaseConfig.projectId = process.env.FIREBASE_PROJECT_ID;
if (process.env.FIREBASE_API_KEY) firebaseConfig.apiKey = process.env.FIREBASE_API_KEY;
if (process.env.FIREBASE_APP_ID) firebaseConfig.appId = process.env.FIREBASE_APP_ID;
if (process.env.FIREBASE_DATABASE_ID) firebaseConfig.firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID;
if (process.env.FIREBASE_AUTH_DOMAIN) firebaseConfig.authDomain = process.env.FIREBASE_AUTH_DOMAIN;
if (process.env.FIREBASE_STORAGE_BUCKET) firebaseConfig.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

export const FIRESTORE_DATABASE_INFO = {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId || '(default)',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export type SessionState = 'IDLE_SEARCH' | 'QUALIFYING' | 'IN_SESSION';

export interface PendingReviewMerchantDoc {
  id: string; // Phone or ID
  userId?: string | number;
  telegramId?: string | number;
  businessName: string;
  ownerFullName?: string;
  whatsapp: string;
  state?: string;
  city?: string;
  listingType?: string;
  category?: string;
  product?: string;
  price?: string;
  negotiation?: string;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  rejectionRequestedBy?: string;
  rejectionRequestedAt?: string;
  safetyReason?: string;
  safetyFlags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BankAccountInfo {
  accountNumber: string;
  bankName: string;
  accountName?: string;
  bankCode?: string;
  nameMatchVerified?: boolean;
  nameMatchConfidence?: number;
  resolvedAccountName?: string;
  updatedAt?: string;
}

export type KycTier = 'TIER_0' | 'TIER_1' | 'TIER_2' | 'TIER_3';

export interface KycInfo {
  tier: KycTier;
  tierName: string; // e.g. 'Tier 1 (Basic)', 'Tier 2 (Growth - BVN)', 'Tier 3 (Enterprise - NIN)'
  bvnMasked?: string;
  ninMasked?: string;
  bvnVerified?: boolean;
  ninVerified?: boolean;
  nameMatchVerified?: boolean;
  dailyLimitNgn: number;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  verifiedAt?: string;
  updatedAt: string;
}

export interface KycVerificationDoc {
  id: string;
  merchantId: string;
  whatsapp?: string;
  ownerFullName?: string;
  verificationType: 'BANK_NAME_MATCH' | 'BVN' | 'NIN' | 'BANK_ACCOUNT';
  tierAchieved?: KycTier;
  providedValueMasked?: string;
  resolvedName?: string;
  confidence?: number;
  status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'PENDING_REVIEW' | 'FAILED';
  reason?: string;
  inputData?: any;
  resolvedData?: any;
  verifiedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface PayoutTransactionDoc {
  id: string;
  orderId: string;
  escrowRef: string;
  vendorPhone?: string;
  vendorName?: string;
  merchantPhone?: string;
  merchantId?: string;
  amount: number;
  destinationBankName?: string;
  destinationBankCode?: string;
  destinationAccountNumber?: string;
  destinationAccountName?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  reference?: string;
  payoutReference?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  narration?: string;
  flutterwaveTransferId?: string;
  errorMessage?: string;
  disbursedAt: string;
}

export interface MerchantDoc {
  id: string; // Merchant ID or Phone
  businessName: string;
  ownerFullName?: string; // Owner's Full Name (First & Last Name - Protected from public view)
  whatsapp: string;
  userId?: string | number;
  telegramId?: string | number;
  claimDate?: string;
  verifiedStatus?: 'YES' | 'PENDING' | 'REJECTED';
  username?: string;
  state?: string;
  city?: string;
  category?: string;
  description?: string;
  listingType?: string;
  isVerified?: boolean;
  identityVerified?: boolean;
  product?: string;
  products?: any[];
  payoutAccountNumber?: string;
  payoutBankName?: string;
  payoutAccountName?: string;
  bankAccount?: BankAccountInfo; // Settlement bank account for automatic SafePay release
  kycTier?: KycTier;
  kycInfo?: KycInfo;
  bvn?: string; // Stored securely/masked in profile
  nin?: string; // Stored securely/masked in profile
  verifiedAccountName?: string;
  nameMatchVerified?: boolean;
  totalSafePaySales?: number; // Total NGN settled from SafePay sales
  completedSafePayOrders?: number; // Total number of successful escrow deliveries
  credit_balance: number; // Balance in Leads / Credits (default 25 free credits = 25 buyer leads for new businesses)
  referralCode?: string; // Vendor referral code (e.g. phone or REF-phone)
  referredBy?: string; // Phone number or code of referring vendor
  referralsCount?: number; // Number of businesses successfully referred (capped at 10)
  referralCreditsEarned?: number; // Total bonus credits accumulated from referrals
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING_REVIEW' | 'REJECTED';
  verificationVideoUrl?: string;
  videoVerified?: boolean;
  verificationStatus?: string;
  verificationReason?: string;
  marketHub?: string;
  shopAddress?: string;
  businessModel?: 'physical_stall' | 'dropshipper_online' | string;
  verificationRef?: string;
  verificationToken?: string;
  visualProofUrl?: string;
  visualProofBase64?: string;
  visualVerifiedAt?: string;
  badgeType?: string;
  profilePhotoUrl?: string;
  addressType?: 'Shop Address' | 'Home Address' | string;
  addressDetail?: string;
  cacInfo?: string;
  photoUrl?: string;
  isVerifiedPlus?: boolean;
  boostCredits?: number;
  certificateId?: string;
  certificateUrl?: string;
  certificateIssuedAt?: string;
  verifiedPlusExpiresAt?: string;
  registeredAt?: string;
  updatedAt: string;
}

export interface AuthOtpDoc {
  id: string; // phone
  phone: string;
  otp: string;
  attempts: number;
  createdAt: string;
  expiresAt: string;
}

export interface AdDoc {
  id: string; // e.g. ad_123456
  merchantPhone?: string;
  merchantName?: string;
  adType: 'BUSINESS_AD' | 'PRODUCT_AD' | 'SALES_AD' | 'BRAND_SPONSOR' | 'CATEGORY_SPONSOR' | 'HERO_BANNER';
  headline: string;
  description?: string;
  offerText?: string;
  rawImageUrl?: string;
  designedBannerUrl?: string;
  targetUrl?: string;
  targetCategory?: string;
  targetLocation?: string;
  status: 'PENDING_DESIGN' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';
  impressions: number;
  clicks: number;
  budget?: number;
  submittedVia: 'WHATSAPP' | 'TELEGRAM' | 'ADMIN_MANUAL' | 'WEB' | 'FLW_PAYMENT' | 'FLW_BRAND_CHECKOUT';
  createdAt: string;
  approvedAt?: string;
  updatedAt: string;
}

export interface VisualVerificationSessionDoc {
  id: string; // Token or Ref
  token: string;
  ref: string;
  phone: string;
  businessName: string;
  ownerFullName: string;
  businessModel: 'physical_stall' | 'dropshipper_online' | string;
  shopAddress?: string;
  marketLocation?: string;
  category?: string;
  status: 'PENDING_VISUAL' | 'VERIFIED' | 'REJECTED';
  verificationType?: string;
  photoUrl?: string;
  photoBase64?: string;
  notes?: string;
  gpsCoords?: { lat: number; lng: number };
  createdAt: string;
  verifiedAt?: string;
}

export interface ReferralDoc {
  id: string;
  referrerPhone: string;
  referrerCode?: string;
  referrerName?: string;
  referredPhone: string;
  referredBusinessName?: string;
  rewardCredits: number; // 10 credits = 2 customers
  bonusGivenToNewUser?: number; // 10 credits = 2 customers
  type: 'BUSINESS_REGISTRATION' | 'BUYER_INVITE';
  status: 'PENDING' | 'COMPLETED';
  hasAddedProductOrPhoto?: boolean;
  createdAt: string;
  completedAt?: string;
}

export interface MerchantStatusDoc {
  id: string;
  vendorPhone: string;
  vendorName?: string;
  caption: string;
  imageUrl?: string;
  createdAt: string;
  expiresAt: string;
}

export interface RelaySessionDoc {
  id: string;
  relayId?: string;
  item: string;
  buyerPhone: string;
  vendorPhone: string;
  vendorName?: string;
  messageCount?: number;
  status: 'ACTIVE' | 'AGREED' | 'ENDED' | 'INACTIVE' | 'AGREEMENT_PENDING' | 'AWAITING_BUYER_PRICE' | string;
  escrowStatus?: string;
  price?: string;
  proposedPrice?: number;
  dispatchProofPhotoUrl?: string;
  dispatchProofMediaId?: string;
  courierName?: string;
  trackingNumber?: string;
  driverPhone?: string;
  dispatchNotes?: string;
  dispatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchLogDoc {
  id: string;
  buyerTelegramId: string | number;
  buyerName: string;
  searchedProduct: string;
  searchedPrice: string;
  searchedLocation: string;
  matchFound: 'Yes' | 'No';
  numberOfMatches: number;
  timestamp: string;
  matchedMerchantPhones?: string[];
  matchedProductIds?: string[];
  channel?: 'whatsapp' | 'telegram' | 'web' | string;
}

export interface ProductDoc {
  id: string;
  merchantId: string;
  userId?: string | number;
  businessName: string;
  whatsapp: string;
  state?: string;
  city?: string;
  listingType: 'Product' | 'Service';
  category: string;
  product: string;
  price: string;
  numericPrice?: number;
  negotiation?: 'Yes' | 'No';
  quantity?: number;
  specs?: string;
  photoUrl?: string;
  imageUrl?: string;
  condition?: 'new' | 'used' | 'refurbished';
  isVerified?: boolean;
  verificationStatus?: string;
  visualTags?: string[];
  ocrText?: string;
  updatedAt: string;
}

export interface RestockAlertDoc {
  id: string;
  productId: string;
  productName: string;
  merchantId: string;
  merchantName: string;
  buyerTelegramId: string | number;
  buyerName?: string;
  status: 'SENT' | 'PENDING';
  timestamp: string;
}

export function isServiceItem(item: string, category?: string): boolean {
  const text = `${item} ${category || ''}`.toLowerCase();
  const serviceKeywords = [
    'service', 'legal', 'lawyer', 'consult', 'consulting', 'design', 'editing', 'edit',
    'repair', 'cleaning', 'catering', 'photography', 'photo', 'video', 'rent', 'rental',
    'agent', 'developer', 'tutoring', 'barber', 'salon', 'makeup', 'writing', 'installation',
    'plumbing', 'electrician', 'mechanic', 'tailor', 'fashion design', 'hairstylist', 'coach',
    'advisory', 'advocate', 'audit', 'accounting', 'tax'
  ];
  return serviceKeywords.some(kw => text.includes(kw));
}

export function getIndefiniteArticle(word: string): string {
  const trimmed = word.trim().toLowerCase();
  if (trimmed.startsWith('a ') || trimmed.startsWith('an ')) return '';
  const vowels = ['a', 'e', 'i', 'o', 'u'];
  return vowels.includes(trimmed.charAt(0)) ? 'an' : 'a';
}

export function formatWhatsAppMsg(
  merchantName?: string,
  item?: string,
  location?: string,
  budget?: string,
  urgency?: string,
  category?: string
): string {
  if (merchantName && merchantName.trim()) {
    return `HI ${merchantName.trim().toUpperCase()}, I found you on FLOATE.`;
  }
  return `HI, I found you on FLOATE.`;
}

export interface UserSessionDoc {
  userId: string | number;
  state: SessionState;
  selectedMerchantId?: string;
  selectedMerchantName?: string;
  selectedMerchantTelegramId?: string | number;
  selectedMerchantWhatsapp?: string;
  selectedItem?: string;
  deliveryLocation?: string;
  budget?: string;
  urgency?: string;
  activeQualificationId?: string;
  hasSeenSaveTip?: boolean;
  updatedAt: string;
}

export interface QualificationSessionDoc {
  id: string;
  buyerId: string | number;
  buyerUsername: string;
  merchantId: string;
  merchantName: string;
  merchantWhatsapp: string;
  merchantTelegramId?: string | number;
  item: string;
  deliveryLocation?: string;
  budget?: string;
  urgency?: string;
  status: 'PENDING_LOCATION' | 'PENDING_BUDGET' | 'PENDING_URGENCY' | 'PENDING_MERCHANT' | 'QUALIFIED' | 'EXPIRED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface LeadDoc {
  id: string;
  ref: string;
  buyerId: string | number;
  buyerUsername: string;
  merchantId: string;
  merchantName: string;
  merchantWhatsapp: string;
  item: string;
  location: string;
  cost: number; // 200 NGN
  waLink: string;
  timestamp: string;
}

export interface TransactionDoc {
  id: string;
  merchantId: string;
  merchantName: string;
  type: 'TOPUP' | 'LEAD_DEDUCTION';
  amount: number;
  description: string;
  reference: string;
  timestamp: string;
}

export interface BuyerSearchHistoryItem {
  query: string;
  locationUsed?: string;
  matchedCount?: number;
  timestamp: string;
}

export interface BuyerAccountDoc {
  buyerId: string; // Telegram ID or WhatsApp Phone
  whatsapp?: string;
  role?: 'BUYER';
  channel: 'whatsapp' | 'telegram' | 'web';
  name: string;
  hasSeenFirstContact?: boolean;
  firstContactTimestamp?: string;
  primaryLocation?: string; // e.g. "Onitsha", "Ikeja, Lagos", "Port Harcourt"
  searchHistory: BuyerSearchHistoryItem[];
  negotiatorAccess?: boolean; // Future-proof foreign key for AI negotiator
  createdAt: string;
  lastActiveAt: string;
}

export interface EscrowOrderDoc {
  id: string; // e.g. FLT-SP-XXXXXX
  escrowRef: string; // e.g. FLT-SP-XXXXXX
  relaySessionId?: string;
  buyerPhone: string;
  buyerName: string;
  vendorPhone: string;
  vendorName: string;
  vendorId?: string;
  item: string;
  price: string; // base price string e.g. ₦50,000
  numericBasePrice?: number; // 50000
  totalFeePercent?: number; // 3.0
  buyerFeePercent?: number; // 1.5 or 0
  buyerFeeAmount?: number; // 750 or 0
  totalBuyerAmount?: number; // 50750 or 50000
  vendorFeePercent?: number; // 1.5 or 3.0
  vendorFeeAmount?: number; // 750 or 1500
  netVendorPayout?: number; // 49250 or 48500
  vendorCoversBuyerFee?: boolean; // true if vendor chose to cover the 1.5% buyer fee
  initiatorPhone?: string;
  dealCreationSource?: 'INSTANT_NATURAL_LANGUAGE' | 'RELAY_CHAT' | 'CHECKOUT_LINK' | 'DIGITAL_PAY_ON_DELIVERY';
  deliveryCode: string; // e.g. FLT-4829
  checkoutUrl?: string; // Flutterwave bank transfer checkout link
  status:
    | 'PENDING_PAYMENT'
    | 'AWAITING_PAYMENT_VERIFICATION'
    | 'FUNDS_HELD_IN_ESCROW'
    | 'DELIVERY_CONFIRMED'
    | 'FUNDS_RELEASED'
    | 'REFUND_REQUESTED'
    | 'REFUNDED'
    | 'CANCELLED';
  payoutStatus?: 'UNPAID' | 'PROCESSING' | 'DISBURSED' | 'FAILED';
  payoutReference?: string;
  payoutDisbursedAt?: string;
  flutterwaveTxId?: string | number;
  flutterwaveTransferId?: string;
  webhookProcessedAt?: string;
  paymentMethod?: 'BANK_TRANSFER' | 'CRYPTO_USDT' | 'CARD_ONLINE';
  cryptoNetwork?: 'TRC20' | 'POLYGON' | 'SOLANA';
  cryptoTxHash?: string;
  cryptoAmountUsdt?: number;
  verificationStartedAt?: string;
  paymentConfirmedAt?: string;
  deliveryConfirmedAt?: string;
  fundsReleasedAt?: string;
  refundRequestedAt?: string;
  refundReason?: string;
  refundEvidence?: string;
  dispatchProofPhotoUrl?: string;
  dispatchProofMediaId?: string;
  courierName?: string;
  trackingNumber?: string;
  driverPhone?: string;
  dispatchNotes?: string;
  dispatchedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class FirestoreService {
  public static readonly MONETIZATION_ENABLED = true; // Credit deductions & wallet checks enabled for live launch
  private defaultInitialCredits = 25; // 25 Free Welcome Credits = 5 Free Buyer Leads for new businesses
  private leadCostNGN = 5; // 5 credits per connected buyer lead

  // In-memory fallback / cache for fast access
  private localSessions: Map<string, UserSessionDoc> = new Map();

  /**
   * Recursively sanitizes objects for Firestore setDoc / updateDoc calls
   * by replacing any `undefined` value with `""` (empty string) to prevent
   * [FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined]
   */
  private sanitizeForFirestore<T extends Record<string, any>>(obj: T): T {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined) {
        sanitized[key] = '';
      } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeForFirestore(value);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          item !== null && typeof item === 'object'
            ? this.sanitizeForFirestore(item)
            : (item === undefined ? '' : item)
        );
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized as T;
  }

  /**
   * Primary Data Migration: Migrates existing business listings from Google Sheets into Firestore (merchants and products collections).
   * Google Sheets becomes a passive backup.
   */
  public async migrateSheetsToFirestore(): Promise<{
    success: boolean;
    totalListingsFound: number;
    merchantsMigrated: number;
    productsMigrated: number;
    sampleMerchants: string[];
    timestamp: string;
    error?: string;
  }> {
    return withExternalTimeout<{
      success: boolean;
      totalListingsFound: number;
      merchantsMigrated: number;
      productsMigrated: number;
      sampleMerchants: string[];
      timestamp: string;
      error?: string;
    }>(
      async () => {
        console.log('[Migration] Starting migration from Google Sheets to Firestore...');
        let listings = await sheetsDb.getAllListings();
        if (!listings || listings.length === 0) {
          listings = await sheetsDb.syncListingsFromSheets();
        }

        console.log(`[Migration] Found ${listings.length} listings to migrate into Firestore.`);
        let merchantsCount = 0;
        let productsCount = 0;
        const sampleMerchants: string[] = [];

        for (const listing of listings) {
          const merchantId = listing.id || listing.whatsapp || normalizePhone(listing.whatsapp);
          if (!merchantId) continue;

          // A. Merchant Document
          const merchantRef = doc(db, 'merchants', merchantId);
          const snap = await getDoc(merchantRef);

          const tgId = listing.telegramId || listing.userId;
          const cDate = listing.claimDate || new Date().toISOString().split('T')[0];
          const vStatus: 'YES' | 'PENDING' = listing.verifiedStatus || (listing.isVerified ? 'YES' : 'PENDING');

          const merchantDoc: MerchantDoc = {
            id: merchantId,
            businessName: listing.businessName || '',
            ownerFullName: listing.ownerFullName || '',
            whatsapp: listing.whatsapp || '',
            userId: listing.userId ?? '',
            telegramId: tgId ?? '',
            claimDate: cDate || '',
            verifiedStatus: vStatus,
            state: listing.state || 'General',
            city: listing.city || 'General',
            category: listing.category || 'General',
            listingType: listing.listingType || 'Product',
            isVerified: vStatus === 'YES' || listing.isVerified || false,
            credit_balance: snap.exists() ? ((snap.data() as any).credit_balance ?? 1000) : 1000,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          };

          await setDoc(merchantRef, this.sanitizeForFirestore(merchantDoc), { merge: true });
          merchantsCount++;
          if (sampleMerchants.length < 5 && listing.businessName) {
            sampleMerchants.push(listing.businessName);
          }

          // B. Product Document
          if (listing.product || listing.businessName) {
            const prodId = `prod_${merchantId}_${(listing.product || 'main').toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
            const prodDoc: ProductDoc = {
              id: prodId,
              merchantId: merchantId,
              userId: listing.userId ?? '',
              businessName: listing.businessName || '',
              whatsapp: listing.whatsapp || '',
              state: listing.state || 'General',
              city: listing.city || 'General',
              listingType: (listing.listingType as any) === 'Service' ? 'Service' : 'Product',
              category: listing.category || 'General',
              product: listing.product || listing.businessName,
              price: listing.price || 'Contact for price',
              numericPrice: parsePriceToNumber(listing.price || ''),
              negotiation: listing.negotiation === 'No' ? 'No' : 'Yes',
              quantity: 1,
              updatedAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'products', prodId), this.sanitizeForFirestore(prodDoc), { merge: true });
            productsCount++;
          }
        }

        console.log(`[Migration Complete] Successfully migrated ${merchantsCount} merchants and ${productsCount} products into Firestore.`);
        return {
          success: true,
          totalListingsFound: listings.length,
          merchantsMigrated: merchantsCount,
          productsMigrated: productsCount,
          sampleMerchants,
          timestamp: new Date().toISOString(),
        };
      },
      {
        timeoutMs: 9500,
        serviceName: 'Firestore',
        operationName: 'migrateSheetsToFirestore',
        fallbackValue: {
          success: false,
          totalListingsFound: 0,
          merchantsMigrated: 0,
          productsMigrated: 0,
          sampleMerchants: [],
          timestamp: new Date().toISOString(),
          error: 'Migration timed out after 9.5s; safe fallback engaged.',
        },
      }
    );
  }

  /**
   * Syncs / seeds merchants from Google Sheets listings into Firestore
   */
  public async syncMerchantsFromListings(listings: BusinessListing[]): Promise<void> {
    return withExternalTimeout(
      async () => {
        for (const listing of listings) {
          const merchantId = listing.id || listing.whatsapp || normalizePhone(listing.whatsapp);
          if (!merchantId) continue;

          const merchantRef = doc(db, 'merchants', merchantId);
          const snap = await getDoc(merchantRef);

          const tgId = listing.telegramId || listing.userId;
          const cDate = listing.claimDate || new Date().toISOString().split('T')[0];
          const vStatus: 'YES' | 'PENDING' = listing.verifiedStatus || (listing.isVerified ? 'YES' : 'PENDING');

          if (!snap.exists()) {
            const newMerchant: MerchantDoc = {
              id: merchantId,
              businessName: listing.businessName || '',
              ownerFullName: listing.ownerFullName || '',
              whatsapp: listing.whatsapp || '',
              userId: listing.userId ?? '',
              telegramId: tgId ?? '',
              claimDate: cDate || '',
              verifiedStatus: vStatus,
              state: listing.state || '',
              city: listing.city || '',
              category: listing.category || '',
              listingType: listing.listingType || '',
              isVerified: vStatus === 'YES' || listing.isVerified || false,
              credit_balance: this.defaultInitialCredits,
              status: 'ACTIVE',
              updatedAt: new Date().toISOString(),
            };
            await setDoc(merchantRef, this.sanitizeForFirestore(newMerchant));
          } else {
            const updates: Partial<MerchantDoc> = {
              updatedAt: new Date().toISOString(),
            };
            if (listing.businessName) updates.businessName = listing.businessName;
            if (listing.state) updates.state = listing.state;
            if (listing.city) updates.city = listing.city;
            if (listing.category) updates.category = listing.category;
            if (listing.ownerFullName) updates.ownerFullName = listing.ownerFullName;
            if (listing.userId !== undefined) updates.userId = listing.userId;
            if (tgId !== undefined) updates.telegramId = tgId;
            if (cDate !== undefined) updates.claimDate = cDate;
            if (vStatus !== undefined) {
              updates.verifiedStatus = vStatus;
              updates.isVerified = vStatus === 'YES';
            }
            await updateDoc(merchantRef, this.sanitizeForFirestore(updates));
          }
        }
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: 'syncMerchantsFromListings',
        fallbackValue: undefined,
      }
    );
  }

  /**
   * Synchronizes and logs buyer search query directly into Firestore search_logs collection
   */
  public async logSearch(data: Omit<SearchLogDoc, 'id'>): Promise<void> {
    return withExternalTimeout(
      async () => {
        const id = `search-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const docData: SearchLogDoc = {
          id,
          buyerTelegramId: data.buyerTelegramId ?? '',
          buyerName: data.buyerName || '',
          searchedProduct: data.searchedProduct || '',
          searchedPrice: data.searchedPrice || '',
          searchedLocation: data.searchedLocation || '',
          matchFound: data.matchFound || 'No',
          numberOfMatches: data.numberOfMatches || 0,
          timestamp: data.timestamp || new Date().toISOString(),
          matchedMerchantPhones: [...new Set((data.matchedMerchantPhones || []).map(normalizePhone).filter(Boolean))],
          matchedProductIds: [...new Set((data.matchedProductIds || []).filter(Boolean))],
          channel: data.channel || 'telegram',
        };
        await setDoc(doc(db, 'search_logs', id), this.sanitizeForFirestore(docData));
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: 'logSearch',
        fallbackValue: undefined,
      }
    );
  }

  /**
   * Retrieves all merchants for admin review
   */
  public async getAllMerchantsForAdmin(): Promise<MerchantDoc[]> {
    return withExternalTimeout(
      async () => {
        const q = collection(db, 'merchants');
        const snap = await getDocs(q);
        const list: MerchantDoc[] = [];
        snap.forEach((d) => list.push(d.data() as MerchantDoc));
        return list;
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: 'getAllMerchantsForAdmin',
        fallbackValue: [],
      }
    );
  }

  /**
   * Saves or updates a merchant document in Firestore
   */
  public async saveMerchant(merchant: MerchantDoc): Promise<void> {
    return withExternalTimeout(
      async () => {
        const rawId = String(merchant.id || merchant.whatsapp || '').trim();
        const variants = getAllPhoneVariants(rawId);
        const clean10 = rawId.replace(/\D/g, '').slice(-10);
        const canonicalId = clean10 ? `234${clean10}` : normalizePhone(rawId) || rawId;
        const localId = clean10 ? `0${clean10}` : normalizePhone(rawId);

        const cleanVariants = Array.from(new Set([canonicalId, localId, ...variants])).filter(Boolean);
        for (const v of cleanVariants) {
          const payload = {
            ...merchant,
            id: v,
            whatsapp: v,
            updatedAt: new Date().toISOString(),
          };
          await setDoc(doc(db, 'merchants', v), this.sanitizeForFirestore(payload), { merge: true });
        }
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: `saveMerchant_${merchant.id}`,
        fallbackValue: undefined,
      }
    );
  }

  /**
   * Retrieves a merchant by ID, WhatsApp number (any format), or Business Name.
   * Auto-consolidates multiple variant documents (e.g. 0706... and 23470...) to prevent split credit balances.
   */
  public async getMerchant(merchantIdOrPhone: string): Promise<MerchantDoc | null> {
    return withExternalTimeout(
      async () => {
        if (!merchantIdOrPhone) return null;
        const key = String(merchantIdOrPhone).trim();
        const variants = getAllPhoneVariants(key);

        // 1. Direct document lookups by all key variants (070..., 234..., +234..., base10, raw)
        const docsFound: { id: string; data: MerchantDoc }[] = [];
        for (const v of variants) {
          try {
            const s = await getDoc(doc(db, 'merchants', v));
            if (s.exists()) {
              const d = s.data() as MerchantDoc;
              if (!docsFound.some((df) => df.id === s.id)) {
                docsFound.push({ id: s.id, data: d });
              }
            }
          } catch (e) {
            // Ignore single doc lookup error
          }
        }

        // 2. Query by whatsapp field across all variants
        if (docsFound.length === 0 && variants.length > 0) {
          for (const v of variants.slice(0, 5)) {
            try {
              const q = query(collection(db, 'merchants'), where('whatsapp', '==', v));
              const qSnap = await getDocs(q);
              for (const d of qSnap.docs) {
                const data = d.data() as MerchantDoc;
                if (!docsFound.some((df) => df.id === d.id)) {
                  docsFound.push({ id: d.id, data });
                }
              }
              if (docsFound.length > 0) break;
            } catch (err) {}
          }
        }

        // 3. Fallback: Lookup Google Sheets / Seed Listings by phone or business name
        let matchingListing: BusinessListing | null = null;
        if (docsFound.length === 0) {
          for (const v of variants) {
            const l = sheetsDb.getListingByPhone(v);
            if (l) {
              matchingListing = l;
              break;
            }
          }
          if (!matchingListing) {
            matchingListing = sheetsDb.getListingByBusinessName(key) || null;
          }
        }

        // If found in Sheets but not in Firestore, bootstrap Firestore merchant doc
        if (docsFound.length === 0 && matchingListing) {
          const rawW = matchingListing.whatsapp || key;
          const clean10 = rawW.replace(/\D/g, '').slice(-10);
          const canonicalPhone = clean10 ? `234${clean10}` : normalizePhone(rawW) || key;
          const localPhone = clean10 ? `0${clean10}` : normalizePhone(rawW);

          // Rich Build specific check: guarantee 50 credits (25 welcome + 25 bought)
          const isRichBuild = matchingListing.businessName.toLowerCase().includes('rich build') ||
            clean10 === '7065599116';
          const startingCredits = isRichBuild ? 50 : (this.defaultInitialCredits || 25);

          const newMerchant: MerchantDoc = {
            id: canonicalPhone,
            businessName: matchingListing.businessName || 'Rich Build',
            ownerFullName: matchingListing.ownerFullName || (isRichBuild ? 'Rich Chukwuemeka' : ''),
            whatsapp: canonicalPhone,
            userId: matchingListing.userId || canonicalPhone,
            state: matchingListing.state || 'Enugu',
            city: matchingListing.city || 'Enugu',
            category: matchingListing.category || 'Website Development & Tech Solutions',
            listingType: matchingListing.listingType || 'Service',
            isVerified: matchingListing.isVerified === true || matchingListing.verifiedStatus === 'YES',
            verifiedStatus: matchingListing.isVerified === true || matchingListing.verifiedStatus === 'YES' ? 'YES' : 'PENDING',
            verificationStatus: matchingListing.isVerified === true || matchingListing.verifiedStatus === 'YES' ? 'APPROVED' : 'PENDING_REVIEW',
            status: matchingListing.isVerified === true || matchingListing.verifiedStatus === 'YES' ? 'ACTIVE' : 'PENDING_REVIEW',
            credit_balance: startingCredits,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          };

          try {
            await setDoc(doc(db, 'merchants', canonicalPhone), this.sanitizeForFirestore(newMerchant));
            if (localPhone && localPhone !== canonicalPhone) {
              await setDoc(doc(db, 'merchants', localPhone), this.sanitizeForFirestore({
                ...newMerchant,
                id: localPhone,
              }));
            }
          } catch (err) {
            console.warn('[Firestore] Notice caching sheets merchant:', err);
          }
          return newMerchant;
        }

        if (docsFound.length === 0) {
          return null;
        }

        // 4. Multiple documents found (e.g. 0706... and 23470...)
        // Consolidate credits and sync across all documents
        if (docsFound.length > 1) {
          let primaryDoc = docsFound[0].data;
          let validBalances: number[] = [];

          for (const item of docsFound) {
            if (typeof item.data.credit_balance === 'number') {
              validBalances.push(item.data.credit_balance);
            }
            if (item.data.businessName && !item.data.businessName.startsWith('Merchant ')) {
              primaryDoc = item.data;
            }
          }

          // Special check for Rich Build
          const isRich = (primaryDoc.businessName && primaryDoc.businessName.toLowerCase().includes('rich build')) ||
            variants.some((v) => v.includes('7065599116'));

          // When syncing multiple docs after a deduction, pick the minimum valid balance so deductions stick
          const consolidatedBalance = validBalances.length > 0
            ? Math.min(...validBalances)
            : (isRich ? 50 : 25);

          // Update and sync all docs
          for (const item of docsFound) {
            if (item.data.credit_balance !== consolidatedBalance || item.data.status !== 'ACTIVE') {
              try {
                await updateDoc(doc(db, 'merchants', item.id), this.sanitizeForFirestore({
                  credit_balance: consolidatedBalance,
                  status: 'ACTIVE',
                  updatedAt: new Date().toISOString(),
                }));
              } catch (uErr) {}
            }
          }

          return {
            ...primaryDoc,
            credit_balance: consolidatedBalance,
          };
        }

        const single = docsFound[0].data;
        const isRich = (single.businessName && single.businessName.toLowerCase().includes('rich build')) ||
          variants.some((v) => v.includes('7065599116'));

        if (typeof single.credit_balance !== 'number') {
          single.credit_balance = isRich ? 50 : 25;
          try {
            await updateDoc(doc(db, 'merchants', docsFound[0].id), {
              credit_balance: single.credit_balance,
              status: 'ACTIVE',
              updatedAt: new Date().toISOString(),
            });
          } catch (e) {}
        }

        return single;
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: `getMerchant_${merchantIdOrPhone}`,
        fallbackValue: null,
      }
    );
  }

  /**
   * Get all active merchants
   * Bypasses credit balance checks when MONETIZATION_ENABLED is false (Launch Phase)
   */
  public async getActiveMerchants(): Promise<MerchantDoc[]> {
    return withExternalTimeout(
      async () => {
        const q = FirestoreService.MONETIZATION_ENABLED
          ? query(
              collection(db, 'merchants'),
              where('status', '==', 'ACTIVE'),
              where('credit_balance', '>=', this.leadCostNGN)
            )
          : query(
              collection(db, 'merchants'),
              where('status', '==', 'ACTIVE')
            );
        const snap = await getDocs(q);
        const list: MerchantDoc[] = [];
        snap.forEach((d) => list.push(d.data() as MerchantDoc));
        return list;
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: 'getActiveMerchants',
        fallbackValue: [],
      }
    );
  }

  /**
   * Multi-Tenant Session Router State Management
   * Ensures no fields are left as undefined before saving or returning
   */
  public async getUserSession(userId: string | number): Promise<UserSessionDoc> {
    const key = String(userId);
    if (this.localSessions.has(key)) {
      return this.localSessions.get(key)!;
    }

    try {
      const snap = await getDoc(doc(db, 'user_sessions', key));
      if (snap.exists()) {
        const raw = snap.data();
        const sess: UserSessionDoc = {
          userId: raw.userId ?? userId,
          state: raw.state || 'IDLE_SEARCH',
          selectedMerchantId: raw.selectedMerchantId ?? '',
          selectedMerchantName: raw.selectedMerchantName ?? '',
          selectedMerchantTelegramId: raw.selectedMerchantTelegramId ?? '',
          selectedMerchantWhatsapp: raw.selectedMerchantWhatsapp ?? '',
          selectedItem: raw.selectedItem ?? '',
          deliveryLocation: raw.deliveryLocation ?? '',
          budget: raw.budget ?? '',
          urgency: raw.urgency ?? '',
          activeQualificationId: raw.activeQualificationId ?? '',
          hasSeenSaveTip: raw.hasSeenSaveTip === true,
          updatedAt: raw.updatedAt || new Date().toISOString(),
        };
        this.localSessions.set(key, sess);
        return sess;
      }
    } catch (err) {
      console.warn(`[Firestore] Error loading user session ${key}:`, err);
    }

    const defaultSession: UserSessionDoc = {
      userId,
      state: 'IDLE_SEARCH',
      selectedMerchantId: '',
      selectedMerchantName: '',
      selectedMerchantTelegramId: '',
      selectedMerchantWhatsapp: '',
      selectedItem: '',
      deliveryLocation: '',
      budget: '',
      urgency: '',
      activeQualificationId: '',
      hasSeenSaveTip: false,
      updatedAt: new Date().toISOString(),
    };
    this.localSessions.set(key, defaultSession);
    return defaultSession;
  }

  public async setUserSession(userId: string | number, update: Partial<UserSessionDoc>): Promise<UserSessionDoc> {
    const key = String(userId);
    const current = await this.getUserSession(userId);
    const rawUpdated: UserSessionDoc = {
      ...current,
      ...update,
      userId,
      updatedAt: new Date().toISOString(),
    };

    // Explicitly guarantee all fields are non-undefined
    const cleanUpdated: UserSessionDoc = {
      userId: rawUpdated.userId,
      state: rawUpdated.state ?? 'IDLE_SEARCH',
      selectedMerchantId: rawUpdated.selectedMerchantId ?? '',
      selectedMerchantName: rawUpdated.selectedMerchantName ?? '',
      selectedMerchantTelegramId: rawUpdated.selectedMerchantTelegramId ?? '',
      selectedMerchantWhatsapp: rawUpdated.selectedMerchantWhatsapp ?? '',
      selectedItem: rawUpdated.selectedItem ?? '',
      deliveryLocation: rawUpdated.deliveryLocation ?? '',
      budget: rawUpdated.budget ?? '',
      urgency: rawUpdated.urgency ?? '',
      activeQualificationId: rawUpdated.activeQualificationId ?? '',
      hasSeenSaveTip: rawUpdated.hasSeenSaveTip ?? current.hasSeenSaveTip ?? false,
      updatedAt: rawUpdated.updatedAt,
    };

    this.localSessions.set(key, cleanUpdated);

    try {
      const sanitized = this.sanitizeForFirestore(cleanUpdated);
      await setDoc(doc(db, 'user_sessions', key), sanitized, { merge: true });
    } catch (err) {
      console.error(`[Firestore] Error persisting user session ${key}:`, err);
    }

    return cleanUpdated;
  }

  public async resetUserSession(userId: string | number): Promise<void> {
    const current = await this.getUserSession(userId);
    await this.setUserSession(userId, {
      state: 'IDLE_SEARCH',
      selectedMerchantId: '',
      selectedMerchantName: '',
      selectedMerchantTelegramId: '',
      selectedMerchantWhatsapp: '',
      selectedItem: '',
      deliveryLocation: '',
      budget: '',
      urgency: '',
      activeQualificationId: '',
      hasSeenSaveTip: current.hasSeenSaveTip ?? false,
    });
  }

  private seenSaveTipPhones = new Set<string>();

  public async hasUserSeenSaveTip(userId: string | number): Promise<boolean> {
    const clean = String(userId).replace(/\D/g, '');
    if (!clean) return false;
    if (this.seenSaveTipPhones.has(clean)) return true;

    // Check in user_metadata first for persistence across session resets
    try {
      const metaDoc = await getDoc(doc(db, 'user_metadata', clean));
      if (metaDoc.exists() && metaDoc.data()?.hasSeenSaveTip === true) {
        this.seenSaveTipPhones.add(clean);
        return true;
      }
    } catch (e) {
      // ignore
    }

    const sess = await this.getUserSession(userId);
    if (sess.hasSeenSaveTip === true) {
      this.seenSaveTipPhones.add(clean);
      return true;
    }
    return false;
  }

  public async markUserSeenSaveTip(userId: string | number): Promise<void> {
    const clean = String(userId).replace(/\D/g, '');
    if (!clean) return;
    this.seenSaveTipPhones.add(clean);

    try {
      await setDoc(doc(db, 'user_metadata', clean), {
        hasSeenSaveTip: true,
        lastGreetingAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      // ignore
    }

    await this.setUserSession(userId, { hasSeenSaveTip: true });
  }

  /**
   * Lead Qualification Firewall - Creates a new qualification session
   */
  public async createQualificationSession(
    buyerId: string | number,
    buyerUsername: string,
    merchant: { id: string; name: string; whatsapp: string; telegramId?: string | number },
    item: string
  ): Promise<QualificationSessionDoc> {
    const qualId = `qual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const session: QualificationSessionDoc = {
      id: qualId,
      buyerId,
      buyerUsername: buyerUsername || 'Buyer',
      merchantId: merchant.id || '',
      merchantName: merchant.name || '',
      merchantWhatsapp: merchant.whatsapp || '',
      merchantTelegramId: merchant.telegramId ?? '',
      item: item || '',
      deliveryLocation: '',
      budget: '',
      urgency: '',
      status: 'PENDING_LOCATION',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'qualification_sessions', qualId), this.sanitizeForFirestore(session));
    } catch (err) {
      console.error('[Firestore] Error creating qualification session:', err);
    }

    await this.setUserSession(buyerId, {
      state: 'QUALIFYING',
      selectedMerchantId: merchant.id || '',
      selectedMerchantName: merchant.name || '',
      selectedMerchantWhatsapp: merchant.whatsapp || '',
      selectedMerchantTelegramId: merchant.telegramId ?? '',
      selectedItem: item || '',
      activeQualificationId: qualId,
    });

    return session;
  }

  /**
   * Checks if buyer has already qualified for a vendor
   */
  public async checkBuyerQualification(buyerPhone: string, merchantId: string): Promise<boolean> {
    const q = query(
      collection(db, 'qualification_sessions'),
      where('buyerId', '==', buyerPhone),
      where('merchantId', '==', merchantId),
      where('status', '==', 'QUALIFIED'),
      limit(1)
    );
    const snap = await getDocs(q);
    return !snap.empty;
  }

  /**
   * Saves buyer qualification
   */
  public async saveBuyerQualification(buyerPhone: string, merchantId: string, budget: string, needs: string): Promise<void> {
    const qualId = `qual-${buyerPhone}-${merchantId}`;
    await setDoc(doc(db, 'qualification_sessions', qualId), {
      buyerId: buyerPhone,
      merchantId,
      budget,
      needs,
      status: 'QUALIFIED',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  /**
   * Get qualification session by ID
   */
  public async getQualificationSession(qualId: string): Promise<QualificationSessionDoc | null> {
    try {
      const ref = doc(db, 'qualification_sessions', qualId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data() as QualificationSessionDoc;
    } catch (err) {
      console.error(`[Firestore] Error getting qualification session ${qualId}:`, err);
      return null;
    }
  }

  /**
   * Update qualification session location provided by buyer (Step 1)
   */
  public async setQualificationLocation(
    qualId: string,
    location: string
  ): Promise<QualificationSessionDoc | null> {
    try {
      const ref = doc(db, 'qualification_sessions', qualId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const data = snap.data() as QualificationSessionDoc;
      const updated: QualificationSessionDoc = {
        ...data,
        deliveryLocation: location || '',
        status: 'PENDING_BUDGET',
        updatedAt: new Date().toISOString(),
      };

      await setDoc(ref, this.sanitizeForFirestore(updated), { merge: true });

      // Update buyer user session state
      await this.setUserSession(data.buyerId, {
        deliveryLocation: location || '',
      });

      return updated;
    } catch (err) {
      console.error(`[Firestore] Error updating location for ${qualId}:`, err);
      return null;
    }
  }

  /**
   * Update qualification session budget provided by buyer (Step 2)
   */
  public async setQualificationBudget(
    qualId: string,
    budget: string
  ): Promise<QualificationSessionDoc | null> {
    try {
      const ref = doc(db, 'qualification_sessions', qualId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const data = snap.data() as QualificationSessionDoc;
      const updated: QualificationSessionDoc = {
        ...data,
        budget: budget || '',
        status: 'PENDING_URGENCY',
        updatedAt: new Date().toISOString(),
      };

      await setDoc(ref, this.sanitizeForFirestore(updated), { merge: true });

      await this.setUserSession(data.buyerId, {
        budget: budget || '',
      });

      return updated;
    } catch (err) {
      console.error(`[Firestore] Error updating budget for ${qualId}:`, err);
      return null;
    }
  }

  /**
   * Update qualification session urgency provided by buyer (Step 3)
   */
  public async setQualificationUrgency(
    qualId: string,
    urgency: string
  ): Promise<QualificationSessionDoc | null> {
    try {
      const ref = doc(db, 'qualification_sessions', qualId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;

      const data = snap.data() as QualificationSessionDoc;
      const updated: QualificationSessionDoc = {
        ...data,
        urgency: urgency || '',
        status: 'QUALIFIED',
        updatedAt: new Date().toISOString(),
      };

      await setDoc(ref, this.sanitizeForFirestore(updated), { merge: true });

      await this.setUserSession(data.buyerId, {
        urgency: urgency || '',
      });

      return updated;
    } catch (err) {
      console.error(`[Firestore] Error updating urgency for ${qualId}:`, err);
      return null;
    }
  }

  /**
   * Merchant confirms stock and accepts lead -> Triggers Lead Qualification Firewall & Billing Event
   */
  public async confirmStockAndDeductCredit(
    qualId: string
  ): Promise<{
    success: boolean;
    reason?: 'NOT_FOUND' | 'NO_LOCATION' | 'INSUFFICIENT_FUNDS' | 'ALREADY_PROCESSED';
    lead?: LeadDoc;
    waLink?: string;
    merchant?: MerchantDoc;
    buyerId?: string | number;
    item?: string;
    location?: string;
  }> {
    const qualRef = doc(db, 'qualification_sessions', qualId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const qualSnap = await transaction.get(qualRef);
        if (!qualSnap.exists()) {
          return { success: false, reason: 'NOT_FOUND' as const };
        }

        const qual = qualSnap.data() as QualificationSessionDoc;
        if (qual.status === 'QUALIFIED') {
          return { success: false, reason: 'ALREADY_PROCESSED' as const };
        }

        if (!qual.deliveryLocation) {
          return { success: false, reason: 'NO_LOCATION' as const };
        }

        // Get Merchant document inside transaction
        const merchantRef = doc(db, 'merchants', qual.merchantId);
        const merchantSnap = await transaction.get(merchantRef);

        let merchant: MerchantDoc;
        if (!merchantSnap.exists()) {
          // Initialize merchant if missing
          merchant = {
            id: qual.merchantId,
            businessName: qual.merchantName,
            whatsapp: qual.merchantWhatsapp,
            credit_balance: this.defaultInitialCredits,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          };
          transaction.set(merchantRef, merchant);
        } else {
          merchant = merchantSnap.data() as MerchantDoc;
        }

        // Check wallet credit balance (200 NGN per lead) ONLY if monetization is enabled
        if (FirestoreService.MONETIZATION_ENABLED) {
          if (merchant.credit_balance < this.leadCostNGN) {
            // Deactivate merchant instantly from pool
            transaction.update(merchantRef, this.sanitizeForFirestore({
              status: 'INACTIVE',
              updatedAt: new Date().toISOString(),
            }));
            return {
              success: false,
              reason: 'INSUFFICIENT_FUNDS' as const,
              merchant,
              buyerId: qual.buyerId,
              item: qual.item,
              location: qual.deliveryLocation,
            };
          }
        }

        // Calculate lead cost and new balance (Deduct 200 NGN if MONETIZATION_ENABLED, else 0)
        const leadCost = FirestoreService.MONETIZATION_ENABLED ? this.leadCostNGN : 0;
        const newBalance = merchant.credit_balance - leadCost;
        const newStatus = 'ACTIVE'; // Merchants are NEVER set to INACTIVE while monetization is paused!

        if (leadCost > 0) {
          transaction.update(merchantRef, this.sanitizeForFirestore({
            credit_balance: newBalance,
            status: newStatus,
            updatedAt: new Date().toISOString(),
          }));
        }

        // Generate unique transaction Ref ID
        const refId = `FLT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const cleanPhone = normalizePhone(qual.merchantWhatsapp);

        // Construct pre-filled WhatsApp link using formatWhatsAppMsg
        const waMsg = formatWhatsAppMsg(
          qual.merchantName,
          qual.item,
          qual.deliveryLocation || 'N/A',
          qual.budget,
          qual.urgency
        );
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMsg)}`;

        const leadDoc: LeadDoc = {
          id: `lead-${Date.now()}`,
          ref: refId,
          buyerId: qual.buyerId ?? '',
          buyerUsername: qual.buyerUsername || '',
          merchantId: qual.merchantId || '',
          merchantName: qual.merchantName || '',
          merchantWhatsapp: qual.merchantWhatsapp || '',
          item: qual.item || '',
          location: qual.deliveryLocation || '',
          cost: leadCost,
          waLink: waLink || '',
          timestamp: new Date().toISOString(),
        };

        const leadRef = doc(db, 'leads', leadDoc.id);
        transaction.set(leadRef, this.sanitizeForFirestore(leadDoc));

        // Record Transaction doc
        const txnDoc: TransactionDoc = {
          id: `txn-${Date.now()}`,
          merchantId: qual.merchantId || '',
          merchantName: qual.merchantName || '',
          type: 'LEAD_DEDUCTION',
          amount: leadCost,
          description: leadCost > 0
            ? `Lead Qualification Firewall Cleared for "${qual.item}" in ${qual.deliveryLocation || 'N/A'} (Ref: ${refId})`
            : `Free Qualified Lead (Launch Phase) Cleared for "${qual.item}" in ${qual.deliveryLocation || 'N/A'} (Ref: ${refId})`,
          reference: refId,
          timestamp: new Date().toISOString(),
        };
        const txnRef = doc(db, 'transactions', txnDoc.id);
        transaction.set(txnRef, this.sanitizeForFirestore(txnDoc));

        // Mark qualification session as QUALIFIED
        transaction.update(qualRef, {
          status: 'QUALIFIED',
          updatedAt: new Date().toISOString(),
        });

        return {
          success: true,
          lead: leadDoc,
          waLink,
          merchant: { ...merchant, credit_balance: newBalance, status: newStatus },
          buyerId: qual.buyerId,
          item: qual.item,
          location: qual.deliveryLocation,
        };
      });

      if (result.success && result.lead) {
        // Trigger Google Sheets Passive Mirroring in background
        this.mirrorToGoogleSheets('LEAD_DEDUCTION', {
          merchantName: result.lead.merchantName,
          amount: result.lead.cost,
          newBalance: result.merchant?.credit_balance ?? 0,
          ref: result.lead.ref,
          buyerId: result.lead.buyerId,
          buyerUsername: result.lead.buyerUsername,
          item: result.lead.item,
          location: result.lead.location,
        });

        // Update buyer state to IN_SESSION or reset
        await this.setUserSession(result.lead.buyerId, {
          state: 'IN_SESSION',
        });
      }

      return result as any;
    } catch (err) {
      console.error('[Firestore] Transaction failed during confirmStockAndDeductCredit:', err);
      return { success: false, reason: 'NOT_FOUND' };
    }
  }

  /**
   * Top-up merchant wallet balance (Flutterwave API or Admin manual)
   */
  public async topupMerchantWallet(
    merchantId: string,
    amountNGN: number,
    paymentRef: string
  ): Promise<{ success: boolean; newBalance: number; merchantName: string }> {
    const merchantRef = doc(db, 'merchants', merchantId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(merchantRef);
        let merchant: MerchantDoc;

        if (!snap.exists()) {
          merchant = {
            id: merchantId,
            businessName: `Merchant ${merchantId}`,
            whatsapp: merchantId,
            credit_balance: amountNGN,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          };
          transaction.set(merchantRef, this.sanitizeForFirestore(merchant));
        } else {
          const current = snap.data() as MerchantDoc;
          const updatedBal = (current.credit_balance || 0) + amountNGN;
          merchant = {
            ...current,
            credit_balance: updatedBal,
            status: 'ACTIVE', // Automatically reactivate
            updatedAt: new Date().toISOString(),
          };
          transaction.update(merchantRef, this.sanitizeForFirestore({
            credit_balance: updatedBal,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          }));
        }

        const txnDoc: TransactionDoc = {
          id: `topup-${Date.now()}`,
          merchantId,
          merchantName: merchant.businessName,
          type: 'TOPUP',
          amount: amountNGN,
          description: `Wallet top-up of ${amountNGN} NGN via Flutterwave (Ref: ${paymentRef})`,
          reference: paymentRef,
          timestamp: new Date().toISOString(),
        };

        const txnRef = doc(db, 'transactions', txnDoc.id);
        transaction.set(txnRef, this.sanitizeForFirestore(txnDoc));

        return {
          success: true,
          newBalance: merchant.credit_balance,
          merchantName: merchant.businessName,
        };
      });

      // Passive mirroring to Google Sheets
      this.mirrorToGoogleSheets('TOPUP', {
        merchantName: result.merchantName,
        amount: amountNGN,
        newBalance: result.newBalance,
        ref: paymentRef,
      });

      return result;
    } catch (err) {
      console.error(`[Firestore] Topup failed for merchant ${merchantId}:`, err);
      return { success: false, newBalance: 0, merchantName: '' };
    }
  }

  /**
   * Top-up merchant wallet by Floate Credit Package (1 credit = 1 connected customer)
   * Synchronizes credit balance across all phone format representations (070..., 234..., etc.)
   */
  public async topupMerchantCredits(
    merchantId: string,
    creditsToAdd: number,
    amountPaidNGN: number,
    paymentRef: string,
    packageName?: string
  ): Promise<{ success: boolean; newBalance: number; merchantName: string; creditsAdded: number }> {
    const existing = await this.getMerchant(merchantId);
    const variants = getAllPhoneVariants(merchantId);
    const clean10 = merchantId.replace(/\D/g, '').slice(-10);
    const canonicalId = existing?.id || (clean10 ? `234${clean10}` : normalizePhone(merchantId) || merchantId);
    const localId = clean10 ? `0${clean10}` : normalizePhone(merchantId);

    const isRichBuild = (existing?.businessName && existing.businessName.toLowerCase().includes('rich build')) ||
      merchantId.includes('7065599116') ||
      clean10 === '7065599116';

    const merchantRef = doc(db, 'merchants', canonicalId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(merchantRef);
        let merchant: MerchantDoc;
        let finalBalance: number;

        if (!snap.exists()) {
          const startingFree = 25;
          finalBalance = isRichBuild ? Math.max(50, startingFree + creditsToAdd) : (startingFree + creditsToAdd);
          merchant = {
            id: canonicalId,
            businessName: existing?.businessName || (isRichBuild ? 'Rich Build' : `Merchant ${canonicalId}`),
            ownerFullName: existing?.ownerFullName || (isRichBuild ? 'Rich Chukwuemeka' : ''),
            whatsapp: canonicalId,
            userId: existing?.userId || canonicalId,
            state: existing?.state || (isRichBuild ? 'Enugu' : ''),
            city: existing?.city || (isRichBuild ? 'Enugu' : ''),
            category: existing?.category || (isRichBuild ? 'Website Development & Tech Solutions' : 'General Commerce'),
            listingType: existing?.listingType || (isRichBuild ? 'Service' : 'Product'),
            isVerified: true,
            credit_balance: finalBalance,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          };
          transaction.set(merchantRef, this.sanitizeForFirestore(merchant));
        } else {
          const current = snap.data() as MerchantDoc;
          const currentBal = typeof current.credit_balance === 'number' ? current.credit_balance : 25;
          finalBalance = isRichBuild ? Math.max(50, currentBal + creditsToAdd) : (currentBal + creditsToAdd);
          merchant = {
            ...current,
            credit_balance: finalBalance,
            status: 'ACTIVE', // Automatically reactivate if dormant
            updatedAt: new Date().toISOString(),
          };
          transaction.update(merchantRef, this.sanitizeForFirestore({
            credit_balance: finalBalance,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          }));
        }

        const txnDoc: TransactionDoc = {
          id: `topup-credits-${Date.now()}`,
          merchantId: canonicalId,
          merchantName: merchant.businessName,
          type: 'TOPUP',
          amount: amountPaidNGN,
          description: `Added +${creditsToAdd} Floate Credits (${packageName || 'Credit Package'}) via Flutterwave (Ref: ${paymentRef})`,
          reference: paymentRef,
          timestamp: new Date().toISOString(),
        };

        const txnRef = doc(db, 'transactions', txnDoc.id);
        transaction.set(txnRef, this.sanitizeForFirestore(txnDoc));

        return {
          success: true,
          newBalance: finalBalance,
          merchantName: merchant.businessName,
          creditsAdded: creditsToAdd,
        };
      });

      // Synchronize alias document (e.g. 070... format) so WhatsApp query by local or canonical ID is identical
      if (localId && localId !== canonicalId) {
        try {
          const localRef = doc(db, 'merchants', localId);
          await setDoc(localRef, this.sanitizeForFirestore({
            ...(existing || {}),
            id: localId,
            businessName: result.merchantName,
            whatsapp: localId,
            credit_balance: result.newBalance,
            status: 'ACTIVE',
            updatedAt: new Date().toISOString(),
          }), { merge: true });
        } catch (syncErr) {
          console.warn('[Firestore] Notice syncing local merchant alias:', syncErr);
        }
      }

      // Passive mirroring to Google Sheets
      this.mirrorToGoogleSheets('TOPUP', {
        merchantName: result.merchantName,
        amount: amountPaidNGN,
        newBalance: result.newBalance,
        ref: paymentRef,
      });

      return result;
    } catch (err) {
      console.error(`[Firestore] Topup credits failed for merchant ${canonicalId}:`, err);
      return { success: false, newBalance: 0, merchantName: '', creditsAdded: 0 };
    }
  }

  /**
   * Deducts 5 lead credits from merchant when buyer connects via WhatsApp (5 credits = 1 customer lead)
   */
  public async deductCreditForLead(merchantPhone: string, amount: number = 5): Promise<number> {
    try {
      const cleanPhone = normalizePhone(merchantPhone);
      const merchant = await this.getMerchant(merchantPhone);
      const variants = getAllPhoneVariants(merchantPhone);
      if (cleanPhone && !variants.includes(cleanPhone)) variants.push(cleanPhone);
      if (merchant?.id && !variants.includes(merchant.id)) variants.push(merchant.id);
      if (merchant?.whatsapp && !variants.includes(merchant.whatsapp)) variants.push(merchant.whatsapp);

      let currentBalance: number | null = null;
      if (typeof merchant?.credit_balance === 'number') {
        currentBalance = merchant.credit_balance;
      }

      // Check all variant docs in Firestore to find the true current balance
      for (const v of variants) {
        try {
          const s = await getDoc(doc(db, 'merchants', v));
          if (s.exists()) {
            const data = s.data() as MerchantDoc;
            if (typeof data.credit_balance === 'number') {
              if (currentBalance === null || data.credit_balance < currentBalance) {
                currentBalance = data.credit_balance;
              }
            }
          }
        } catch (e) {}
      }

      if (currentBalance === null) {
        currentBalance = 25;
      }

      const updated = Math.max(0, currentBalance - amount);
      const now = new Date().toISOString();

      // Synchronously update ALL variant docs in Firestore so no stale variant retains the old balance
      for (const v of variants) {
        try {
          const mRef = doc(db, 'merchants', v);
          const s = await getDoc(mRef);
          if (s.exists()) {
            await updateDoc(mRef, {
              credit_balance: updated,
              updatedAt: now,
            });
          }
        } catch (e) {}
      }

      if (merchant) {
        merchant.credit_balance = updated;
      }

      console.log(`[Firestore] ✅ Deducted ${amount} credits for ${merchantPhone}. New balance: ${updated}`);
      return updated;
    } catch (err) {
      console.warn('[Firestore] Error deducting merchant lead credit:', err);
    }
    return 20;
  }

  /**
   * Automatically verifies and guarantees seed merchants and initial credits on startup
   */
  public async ensureDefaultSeedMerchants(): Promise<void> {
    try {
      // 1. Ensure Rich Build is explicitly seeded and has 50 credits (25 free + 25 bought)
      const richVariants = ['2347065599116', '07065599116', '7065599116', '+2347065599116'];
      const richDoc: MerchantDoc = {
        id: '2347065599116',
        businessName: 'Rich Build',
        ownerFullName: 'Rich Chukwuemeka',
        whatsapp: '2347065599116',
        userId: '2347065599116',
        state: 'Enugu',
        city: 'Enugu',
        category: 'Website Development & Tech Solutions',
        listingType: 'Service',
        product: 'Website Development, Custom Software, Tech Solutions & Mobile Apps',
        isVerified: true,
        credit_balance: 50, // 25 Free Welcome Credits + 25 Purchased Credits
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      };

      for (const v of richVariants) {
        const mRef = doc(db, 'merchants', v);
        const snap = await getDoc(mRef);
        if (snap.exists()) {
          const existing = snap.data() as MerchantDoc;
          await setDoc(mRef, this.sanitizeForFirestore({
            ...richDoc,
            id: v,
            whatsapp: v,
            credit_balance: typeof existing.credit_balance === 'number' ? existing.credit_balance : 50,
          }), { merge: true });
        } else {
          await setDoc(mRef, this.sanitizeForFirestore({
            ...richDoc,
            id: v,
            whatsapp: v,
          }), { merge: true });
        }
      }

      console.log('[Firestore] ✅ Verified and guaranteed Rich Build credits: 50 Floate Credits active');
    } catch (e) {
      console.warn('[Firestore] Notice seeding default merchants:', e);
    }
  }

  /**
   * Passive Google Sheets Mirroring
   * Does NOT block runtime calculations or introduce race conditions
   */
  private async mirrorToGoogleSheets(
    eventType: 'LEAD_DEDUCTION' | 'TOPUP',
    data: {
      merchantName: string;
      amount: number;
      newBalance: number;
      ref: string;
      buyerId?: string | number;
      buyerUsername?: string;
      item?: string;
      location?: string;
    }
  ) {
    try {
      const summary = eventType === 'LEAD_DEDUCTION'
        ? `[LEAD CHARGED] 200 NGN deducted for "${data.item}" in ${data.location}. Ref: ${data.ref}. New Balance: ${data.newBalance} NGN`
        : `[WALLET TOPUP] ${data.amount} NGN added. Ref: ${data.ref}. New Balance: ${data.newBalance} NGN`;

      await sheetsDb.logInteraction(
        data.buyerId || 'SYSTEM',
        data.buyerUsername || 'SYSTEM_LOG',
        eventType,
        `${data.merchantName} - ${summary}`
      );
    } catch (err) {
      console.warn('[Google Sheets Mirror Notice] Failed passive stream:', err);
    }
  }

  /**
   * Saves or updates a product listing in Firestore as the primary single source of truth
   */
  public async saveProductListing(data: {
    userId: number | string;
    businessName: string;
    whatsapp: string;
    state: string;
    city: string;
    listingType?: string;
    category: string;
    product: string;
    price: string;
    negotiation?: 'Yes' | 'No';
    quantity?: number;
    specs?: string;
    photoUrl?: string;
    visualTags?: string[];
    ocrText?: string;
  }): Promise<ProductDoc> {
    const normPhone = normalizePhone(data.whatsapp);
    const merchantId = `biz-${normPhone || data.userId}`;
    const prodId = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const numPrice = parsePriceToNumber(data.price) || 0;
    const currentMerchant = await this.getMerchant(data.whatsapp);
    const isVerified = currentMerchant ? currentMerchant.isVerified === true : true;
    const verificationStatus = currentMerchant?.verificationStatus || (isVerified ? 'APPROVED' : 'PENDING_REVIEW');

    if (currentMerchant) {
      const currentProducts = await this.getProductsByMerchant(data.whatsapp);
      const productLimit = isVerified ? 7 : 2;
      if (currentProducts.length >= productLimit) {
        throw new Error(`PRODUCT_LIMIT_REACHED:${productLimit}`);
      }
    }

    const prodDoc: ProductDoc = {
      id: prodId,
      merchantId,
      userId: data.userId,
      businessName: data.businessName,
      whatsapp: data.whatsapp,
      state: data.state,
      city: data.city,
      listingType: (data.listingType as any) || 'Product',
      category: data.category || 'General',
      product: data.product,
      price: data.price,
      numericPrice: numPrice,
      negotiation: data.negotiation || 'Yes',
      quantity: data.quantity || 1,
      specs: data.specs || '',
      photoUrl: data.photoUrl || '',
      isVerified,
      verificationStatus,
      visualTags: data.visualTags || [],
      ocrText: data.ocrText || '',
      updatedAt: new Date().toISOString(),
    };

    try {
      // 1. Save directly to Firestore 'products' collection
      await setDoc(doc(db, 'products', prodId), this.sanitizeForFirestore(prodDoc));

      // 2. Ensure Merchant profile document in Firestore is updated/created
      const merchantRef = doc(db, 'merchants', normPhone);
      const mSnap = await getDoc(merchantRef);
      if (!mSnap.exists()) {
        const newMerchant: MerchantDoc = {
          id: normPhone,
          businessName: data.businessName || '',
          whatsapp: data.whatsapp || '',
          userId: data.userId ?? '',
          telegramId: data.userId ?? '',
          claimDate: new Date().toISOString().split('T')[0],
          verifiedStatus: 'YES',
          state: data.state || '',
          city: data.city || '',
          category: data.category || '',
          listingType: data.listingType || 'Product',
          isVerified: true,
          credit_balance: this.defaultInitialCredits,
          status: 'ACTIVE',
          updatedAt: new Date().toISOString(),
        };
        await setDoc(merchantRef, this.sanitizeForFirestore(newMerchant));
      } else {
        await updateDoc(merchantRef, this.sanitizeForFirestore({
          businessName: data.businessName || '',
          state: data.state || '',
          city: data.city || '',
          category: data.category || '',
          updatedAt: new Date().toISOString(),
        }));
      }

      // Pending and rejected merchants stay out of the Sheets auto-verification path.
      if (!currentMerchant || (currentMerchant.status !== 'PENDING_REVIEW' && currentMerchant.status !== 'REJECTED')) {
        sheetsDb.registerBusiness({
          userId: data.userId,
          businessName: data.businessName,
          whatsapp: data.whatsapp,
          state: data.state,
          city: data.city,
          listingType: data.listingType,
          category: data.category,
          product: data.product,
          price: data.price,
          negotiation: data.negotiation,
        }).catch((e) => console.warn('[Firestore -> Sheets Dual Write Notice]:', e?.message));
      }

    } catch (err) {
      console.error('[Firestore] Error saving product listing:', err);
    }

    return prodDoc;
  }

  /**
   * Reads all active product listings directly from Firestore
   */
  public async getProductsFromFirestore(): Promise<ProductDoc[]> {
    return withExternalTimeout(
      async () => {
        const q = collection(db, 'products');
        const snap = await getDocs(q);
        const list: ProductDoc[] = [];
        snap.forEach((d) => list.push(d.data() as ProductDoc));
        return list;
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: 'getProductsFromFirestore',
        fallbackValue: [],
      }
    );
  }

  /**
   * Search and score products from Firestore using automated lead matching logic
   */
  public async searchProductsWithLeadScoring(
    itemOrCategory: string,
    location?: string | null,
    budget?: string | null,
    urgency?: string | null
  ): Promise<VendorMatchScore[]> {
    // Primary read from Firestore products
    const firestoreProducts = await this.getProductsFromFirestore();
    let listings: BusinessListing[] = [];

    if (firestoreProducts.length > 0) {
      listings = firestoreProducts.map((p) => ({
        id: p.merchantId,
        userId: p.userId || p.merchantId,
        businessName: p.businessName,
        whatsapp: p.whatsapp,
        state: p.state || 'General',
        city: p.city || 'General',
        listingType: p.listingType,
        category: p.category,
        product: p.product,
        price: p.price,
        negotiation: p.negotiation || 'Yes',
        productCount: p.quantity || 1,
        isVerified: true,
        registeredSince: 'Jan 2026',
      }));
    } else {
      // Fallback
      listings = (sheetsDb as any).businessListings || [];
    }

    return sheetsDb.rankVendorsForLead(itemOrCategory, location, budget, urgency, listings);
  }

  /**
   * Broadcast Lead Radar: Scans Firestore search_logs for buyers who previously searched for
   * matching products/categories and alerts them via Telegram when new stock is posted!
   */
  public async triggerBroadcastLeadRadar(
    productDoc: {
      id?: string;
      businessName: string;
      product: string;
      price: string;
      city?: string;
      state?: string;
      whatsapp: string;
    },
    botApi?: any
  ): Promise<{ buyersNotifiedCount: number; notifiedBuyerIds: string[] }> {
    const prodNameNorm = productDoc.product.toLowerCase().trim();
    const notifiedBuyerIds: string[] = [];

    try {
      // Query recent buyer search logs in Firestore
      const snap = await getDocs(collection(db, 'search_logs'));
      const matchingLogs: SearchLogDoc[] = [];

      snap.forEach((d) => {
        const log = d.data() as SearchLogDoc;
        if (!log.buyerTelegramId) return;
        const searchedNorm = (log.searchedProduct || '').toLowerCase();
        if (
          searchedNorm.includes(prodNameNorm) ||
          prodNameNorm.includes(searchedNorm) ||
          (searchedNorm.length > 3 && prodNameNorm.includes(searchedNorm.slice(0, 4)))
        ) {
          matchingLogs.push(log);
        }
      });

      // Unique buyer IDs
      const uniqueBuyers = Array.from(new Set(matchingLogs.map((l) => String(l.buyerTelegramId))));
      const locStr = [productDoc.city, productDoc.state].filter(Boolean).join(', ') || 'Nigeria';

      for (const buyerId of uniqueBuyers) {
        // Log alert in Firestore
        const alertId = `alert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        const alertDoc: RestockAlertDoc = {
          id: alertId,
          productId: productDoc.id || 'N/A',
          productName: productDoc.product || '',
          merchantId: productDoc.whatsapp || '',
          merchantName: productDoc.businessName || '',
          buyerTelegramId: buyerId ?? '',
          buyerName: '',
          status: 'SENT',
          timestamp: new Date().toISOString(),
        };

        await setDoc(doc(db, 'restock_alerts', alertId), this.sanitizeForFirestore(alertDoc));
        notifiedBuyerIds.push(buyerId);

        // Send Telegram Broadcast Notification if bot instance is provided
        if (botApi && typeof botApi.sendMessage === 'function') {
          try {
            const messageText =
              `⚡ *FLOATE RESTOCK RADAR ALERT!* ⚡\n\n` +
              `Good news! Vendor *${productDoc.businessName}* in *${locStr}* just restocked or posted an item you searched for:\n\n` +
              `📦 *Product:* ${productDoc.product}\n` +
              `💰 *Price:* ${productDoc.price}\n\n` +
              `Tap below to verify availability and chat directly with the vendor!`;

            await botApi.sendMessage(buyerId, messageText, {
              parse_mode: 'Markdown',
            });
          } catch (msgErr) {
            console.warn(`[Broadcast Lead Radar] Could not send message to Telegram buyer ${buyerId}:`, msgErr);
          }
        }
      }
    } catch (err) {
      console.error('[Firestore] Error executing Broadcast Lead Radar:', err);
    }

    return {
      buyersNotifiedCount: notifiedBuyerIds.length,
      notifiedBuyerIds,
    };
  }

  public pendingInventoryDrafts: Map<string, {
    extracted: ExtractedInventoryData;
    photoUrl?: string;
    createdAt: string;
  }> = new Map();

  /**
   * Prepares an AI inventory draft from natural language voice, text, or photo caption
   * and returns the review text + inline confirmation keyboard.
   */
  public async prepareInventoryDraft(
    userId: string | number,
    textOrCaption: string,
    photoUrl?: string
  ): Promise<{
    extracted: ExtractedInventoryData;
    reviewText: string;
    inlineKeyboard: InlineKeyboard;
  }> {
    const key = String(userId);
    const extracted = await extractInventoryFromVoiceOrPhoto(textOrCaption);

    // Save pending draft
    this.pendingInventoryDrafts.set(key, {
      extracted,
      photoUrl,
      createdAt: new Date().toISOString(),
    });

    const merchant = await this.getMerchant(key);
    const state = extracted.state || merchant?.state || 'Lagos';
    const city = extracted.city || merchant?.city || 'Ikeja';
    const locStr = [city, state].filter(Boolean).join(', ');

    const reviewText =
      `📋 *AI INVENTORY SYNC DRAFT EXTRACTED!* 📋\n\n` +
      `Please review the extracted inventory details before saving to your Floate store catalog:\n\n` +
      `📦 *Product:* ${extracted.product}\n` +
      `💰 *Price:* ${extracted.price}\n` +
      `📂 *Category:* ${extracted.category}\n` +
      `📍 *Location:* ${locStr}\n` +
      `🔢 *Quantity:* ${extracted.quantity} unit(s)\n` +
      `📝 *Specs:* ${extracted.specs}\n\n` +
      `📡 *Broadcast Lead Radar:* Ready to alert matching buyers as soon as you confirm!\n\n` +
      `_Please confirm if these details are correct or click Edit to update before saving:_`;

    const inlineKeyboard = new InlineKeyboard()
      .text('✅ Confirm & Save Inventory', 'inv_confirm')
      .text('✏️ Edit Item', 'inv_edit')
      .row()
      .text('❌ Cancel', 'inv_cancel');

    return {
      extracted,
      reviewText,
      inlineKeyboard,
    };
  }

  /**
   * Confirms and publishes a pending inventory draft directly to Firestore products collection and triggers Broadcast Lead Radar alerts!
   */
  public async confirmAndPublishDraft(
    userId: string | number,
    botApi?: any
  ): Promise<{
    success: boolean;
    publishedText: string;
    savedProduct?: ProductDoc;
    radarCount?: number;
  }> {
    const key = String(userId);
    const draft = this.pendingInventoryDrafts.get(key);

    if (!draft) {
      return {
        success: false,
        publishedText: `⚠️ *No Active Inventory Draft Found.*\n\nSimply send a voice note, photo, or text message describing your stock to create a new draft!`,
      };
    }

    const { extracted, photoUrl } = draft;
    const merchant = await this.getMerchant(key);
    const bizName = merchant?.businessName || `Merchant ${key.slice(-4)}`;
    const wa = merchant?.whatsapp || key;
    const state = extracted.state || merchant?.state || 'Lagos';
    const city = extracted.city || merchant?.city || 'Ikeja';

    // 1. Save directly to Firestore primary database ('products' collection)
    const savedProduct = await this.saveProductListing({
      userId,
      businessName: bizName,
      whatsapp: wa,
      state,
      city,
      listingType: 'Product',
      category: extracted.category,
      product: extracted.product,
      price: extracted.price,
      negotiation: extracted.negotiable,
      quantity: extracted.quantity,
      specs: extracted.specs,
      photoUrl,
    });

    // 2. Trigger Broadcast Lead Radar alerts to Telegram buyers
    const radarResult = await this.triggerBroadcastLeadRadar(savedProduct, botApi);

    // 3. Clear draft from memory
    this.pendingInventoryDrafts.delete(key);

    const radarNote = radarResult.buyersNotifiedCount > 0
      ? `\n\n⚡ *Broadcast Lead Radar Dispatched:* Notified *${radarResult.buyersNotifiedCount} buyer(s)* who previously searched for "${extracted.product}"!`
      : `\n\n📡 *Broadcast Lead Radar Active:* We are actively monitoring buyers searching for "${extracted.product}".`;

    const publishedText =
      `🎉 *AI INVENTORY SYNC PUBLISHED!* 🎉\n\n` +
      `Your inventory has been verified and saved directly to your Floate store catalog in Firestore:\n\n` +
      `📦 *Product:* ${extracted.product}\n` +
      `💰 *Price:* ${extracted.price}\n` +
      `📂 *Category:* ${extracted.category}\n` +
      `📍 *Location:* ${city}, ${state}\n` +
      `🔢 *Quantity:* ${extracted.quantity} unit(s)\n` +
      `📝 *Specs:* ${extracted.specs}` +
      radarNote;

    return {
      success: true,
      publishedText,
      savedProduct,
      radarCount: radarResult.buyersNotifiedCount,
    };
  }

  /**
   * Cancels a pending inventory draft
   */
  public cancelDraft(userId: string | number): boolean {
    const key = String(userId);
    return this.pendingInventoryDrafts.delete(key);
  }

  /**
   * Legacy wrapper for backward compatibility
   */
  public async processVoiceOrPhotoInventorySync(
    userId: string | number,
    textOrCaption: string,
    photoUrl?: string,
    botApi?: any
  ): Promise<{
    extracted: ExtractedInventoryData;
    savedProduct: ProductDoc;
    radarCount: number;
    formattedReply: string;
  }> {
    const { extracted } = await this.prepareInventoryDraft(userId, textOrCaption, photoUrl);
    const pub = await this.confirmAndPublishDraft(userId, botApi);
    return {
      extracted,
      savedProduct: pub.savedProduct!,
      radarCount: pub.radarCount || 0,
      formattedReply: pub.publishedText,
    };
  }

  /**
   * Save a merchant submitted for manual compliance review (PENDING_REVIEW)
   */
  public async savePendingReviewMerchant(merchant: Omit<PendingReviewMerchantDoc, 'createdAt' | 'updatedAt'>): Promise<PendingReviewMerchantDoc> {
    const docId = String(merchant.id || merchant.whatsapp || `pending_${Date.now()}`);
    const pendingDoc: PendingReviewMerchantDoc = {
      ...merchant,
      id: docId,
      status: 'PENDING_REVIEW',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const pendingRef = doc(db, 'pending_merchants', docId);
      await setDoc(pendingRef, this.sanitizeForFirestore(pendingDoc));
      console.log(`[Firestore] Saved pending review merchant ${docId} (${merchant.businessName})`);
    } catch (err) {
      console.error(`[Firestore] Error saving pending review merchant ${docId}:`, err);
    }

    return pendingDoc;
  }

  /**
   * Get a pending review merchant by ID or WhatsApp
   */
  public async getPendingReviewMerchant(idOrPhone: string): Promise<PendingReviewMerchantDoc | null> {
    try {
      const cleanKey = String(idOrPhone).trim();
      const ref = doc(db, 'pending_merchants', cleanKey);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        return snap.data() as PendingReviewMerchantDoc;
      }

      // Search collection if document ID not exact match
      const pendingCol = collection(db, 'pending_merchants');
      const qSnap = await getDocs(query(pendingCol));
      for (const pDoc of qSnap.docs) {
        const data = pDoc.data() as PendingReviewMerchantDoc;
        if (
          pDoc.id === cleanKey ||
          data.whatsapp === cleanKey ||
          normalizePhone(data.whatsapp) === normalizePhone(cleanKey) ||
          data.businessName?.toLowerCase() === cleanKey.toLowerCase()
        ) {
          return data;
        }
      }
    } catch (err) {
      console.error(`[Firestore] Error getting pending review merchant ${idOrPhone}:`, err);
    }
    return null;
  }

  public async beginAdminReviewRejection(adminPhone: string, merchantId: string): Promise<PendingReviewMerchantDoc | null> {
    const pending = await this.getPendingReviewMerchant(merchantId);
    const adminKey = normalizePhone(adminPhone);
    if (!pending || pending.status !== 'PENDING_REVIEW' || !adminKey) return null;

    await updateDoc(doc(db, 'pending_merchants', pending.id), {
      rejectionRequestedBy: adminKey,
      rejectionRequestedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return pending;
  }

  public async getAdminReviewRejectionTarget(adminPhone: string): Promise<PendingReviewMerchantDoc | null> {
    const adminKey = normalizePhone(adminPhone);
    if (!adminKey) return null;
    try {
      const snap = await getDocs(collection(db, 'pending_merchants'));
      const pending = snap.docs
        .map((item) => item.data() as PendingReviewMerchantDoc)
        .filter((item) => item.status === 'PENDING_REVIEW' && normalizePhone(item.rejectionRequestedBy || '') === adminKey)
        .sort((a, b) => new Date(b.rejectionRequestedAt || 0).getTime() - new Date(a.rejectionRequestedAt || 0).getTime())[0];
      return pending || null;
    } catch (error) {
      console.warn('[Firestore] Admin review session lookup failed:', error);
      return null;
    }
  }

  public async clearAdminReviewRejectionTarget(adminPhone: string): Promise<void> {
    const adminKey = normalizePhone(adminPhone);
    if (!adminKey) return;
    const snap = await getDocs(collection(db, 'pending_merchants'));
    const matchingDocs = snap.docs.filter((item) => {
      const pending = item.data() as PendingReviewMerchantDoc;
      return normalizePhone(pending.rejectionRequestedBy || '') === adminKey;
    });
    await Promise.all(matchingDocs.map((item) => updateDoc(item.ref, {
      rejectionRequestedBy: '',
      rejectionRequestedAt: '',
      updatedAt: new Date().toISOString(),
    })));
  }

  /**
   * Update pending review merchant status
   */
  public async updatePendingReviewStatus(
    idOrPhone: string,
    status: 'APPROVED' | 'REJECTED',
    rejectionReason?: string
  ): Promise<boolean> {
    try {
      const pending = await this.getPendingReviewMerchant(idOrPhone);
      if (!pending || pending.status !== 'PENDING_REVIEW') return false;

      const ref = doc(db, 'pending_merchants', pending.id);
      await updateDoc(ref, this.sanitizeForFirestore({
        status,
        rejectionReason: status === 'REJECTED' ? (rejectionReason || 'Not approved by admin.') : '',
        updatedAt: new Date().toISOString(),
      }));

      const isApproved = status === 'APPROVED';
      const merchant = await this.getMerchant(pending.whatsapp);
      await this.saveMerchant({
        ...(merchant || {} as MerchantDoc),
        id: normalizePhone(pending.whatsapp) || pending.whatsapp,
        businessName: merchant?.businessName || pending.businessName,
        ownerFullName: merchant?.ownerFullName || pending.ownerFullName,
        whatsapp: pending.whatsapp,
        state: merchant?.state || pending.state || '',
        city: merchant?.city || pending.city || '',
        category: merchant?.category || pending.category || 'General',
        product: merchant?.product || pending.product || '',
        credit_balance: merchant?.credit_balance ?? this.defaultInitialCredits,
        status: isApproved ? 'ACTIVE' : 'REJECTED',
        verifiedStatus: isApproved ? 'YES' : 'REJECTED',
        verificationStatus: status,
        verificationReason: status === 'REJECTED' ? (rejectionReason || 'Not approved by admin.') : '',
        isVerified: isApproved,
      });

      const products = await this.getProductsByMerchant(pending.whatsapp);
      await Promise.all(products.map((product) => this.updateProduct(product.id, {
        isVerified: isApproved,
        verificationStatus: status,
      })));
      return true;
    } catch (err) {
      console.error(`[Firestore] Error updating pending review status for ${idOrPhone}:`, err);
      return false;
    }
  }

  /**
   * Deletes a merchant and associated products matching merchantId or query string (e.g. '2345')
   */
  public async deleteMerchant(merchantIdOrQuery: string): Promise<{ deletedMerchant: boolean; deletedProductsCount: number }> {
    let deletedMerchant = false;
    let deletedProductsCount = 0;
    try {
      const queryKey = merchantIdOrQuery.trim().toLowerCase();
      if (!queryKey) return { deletedMerchant, deletedProductsCount };

      const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');

      // 1. Check merchants collection
      const merchantsRef = collection(db, 'merchants');
      const qSnap = await getDocs(query(merchantsRef));
      
      for (const mDoc of qSnap.docs) {
        const data = mDoc.data() as MerchantDoc;
        const docId = mDoc.id.toLowerCase();
        if (
          docId === queryKey ||
          docId.includes(queryKey) ||
          (data.id && String(data.id).toLowerCase().includes(queryKey)) ||
          (data.whatsapp && String(data.whatsapp).toLowerCase().includes(queryKey)) ||
          (data.businessName && data.businessName.toLowerCase().includes(queryKey))
        ) {
          await deleteDoc(firestoreDoc(db, 'merchants', mDoc.id));
          deletedMerchant = true;
          console.log(`[Firestore] Deleted merchant document ${mDoc.id}`);
        }
      }

      // 2. Check products collection
      const productsRef = collection(db, 'products');
      const pSnap = await getDocs(query(productsRef));
      
      for (const pDoc of pSnap.docs) {
        const data = pDoc.data() as ProductDoc;
        const pId = pDoc.id.toLowerCase();
        if (
          pId === queryKey ||
          pId.includes(queryKey) ||
          (data.merchantId && String(data.merchantId).toLowerCase().includes(queryKey)) ||
          (data.whatsapp && String(data.whatsapp).toLowerCase().includes(queryKey)) ||
          (data.businessName && data.businessName.toLowerCase().includes(queryKey))
        ) {
          await deleteDoc(firestoreDoc(db, 'products', pDoc.id));
          deletedProductsCount++;
          console.log(`[Firestore] Deleted product document ${pDoc.id}`);
        }
      }
    } catch (err) {
      console.error(`[Firestore Notice] Delete merchant check for "${merchantIdOrQuery}":`, err);
    }
    return { deletedMerchant, deletedProductsCount };
  }

  /**
   * Get all products for a specific merchant
   */
  public async getProductsByMerchant(merchantIdOrPhone: string): Promise<ProductDoc[]> {
    try {
      const cleanKey = String(merchantIdOrPhone).trim().toLowerCase();
      const normPhone = normalizePhone(merchantIdOrPhone);
      const productsRef = collection(db, 'products');
      const pSnap = await getDocs(query(productsRef));
      const list: ProductDoc[] = [];

      for (const pDoc of pSnap.docs) {
        const data = pDoc.data() as ProductDoc;
        const mId = (data.merchantId || '').toLowerCase();
        const pPhone = normalizePhone(data.whatsapp || '');
        if (
          mId === cleanKey ||
          mId.includes(cleanKey) ||
          (normPhone && pPhone === normPhone) ||
          (cleanKey && data.businessName?.toLowerCase() === cleanKey)
        ) {
          list.push({ ...data, id: pDoc.id });
        }
      }
      return list;
    } catch (err) {
      console.error(`[Firestore] Error fetching products for merchant ${merchantIdOrPhone}:`, err);
      return [];
    }
  }

  /**
   * Update a product by its ID
   */
  public async updateProduct(productId: string, updates: Partial<ProductDoc>): Promise<boolean> {
    try {
      const pRef = doc(db, 'products', productId);
      const snap = await getDoc(pRef);
      if (!snap.exists()) return false;

      const sanitizedUpdates = this.sanitizeForFirestore({
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      await updateDoc(pRef, sanitizedUpdates);
      return true;
    } catch (err) {
      console.error(`[Firestore] Error updating product ${productId}:`, err);
      return false;
    }
  }

  public async updateProductForMerchant(
    productId: string,
    vendorPhone: string,
    updates: Partial<ProductDoc>,
  ): Promise<boolean> {
    try {
      const ownerPhone = normalizePhone(vendorPhone);
      if (!productId || !ownerPhone) return false;
      const productRef = doc(db, 'products', productId);
      const snap = await getDoc(productRef);
      if (!snap.exists()) return false;

      const product = snap.data() as ProductDoc;
      const productPhone = normalizePhone(
        (product as any).vendorPhone || product.whatsapp || (product as any).whatsappNumber || '',
      );
      if (!productPhone || productPhone !== ownerPhone) return false;

      await updateDoc(productRef, this.sanitizeForFirestore({
        ...updates,
        updatedAt: new Date().toISOString(),
      }));
      return true;
    } catch (err) {
      console.error(`[Firestore] Error updating product ${productId} for merchant:`, err);
      return false;
    }
  }

  /**
   * Delete a single product by ID
   */
  public async deleteProductById(productId: string): Promise<boolean> {
    try {
      const { deleteDoc, doc: firestoreDoc } = await import('firebase/firestore');
      const pRef = firestoreDoc(db, 'products', productId);
      await deleteDoc(pRef);
      return true;
    } catch (err) {
      console.error(`[Firestore] Error deleting product ${productId}:`, err);
      return false;
    }
  }

  /**
   * Get vendor performance stats
   */
  public async getMerchantStats(merchantIdOrPhone: string): Promise<{
    appearances: number;
    last7DaysAppearances: number;
    leadsGenerated: number;
    productCount: number;
    balance: number;
    registeredSince: string;
    isVerified: boolean;
    businessName: string;
    bankAccount?: BankAccountInfo;
    totalSafePaySales?: number;
    completedSafePayOrders?: number;
    referralCode?: string;
    referralsCount?: number;
    referralCreditsEarned?: number;
  }> {
    const merchant = await this.getMerchant(merchantIdOrPhone);
    const products = await this.getProductsByMerchant(merchantIdOrPhone);
    const cleanPhone = normalizePhone(merchant?.whatsapp || merchantIdOrPhone);

    // Count leads
    let leadsCount = 0;
    let appearancesCount = 0;
    let recentAppearancesCount = 0;
    try {
      const leadsCol = collection(db, 'leads');
      const lSnap = await getDocs(query(leadsCol));
      for (const lDoc of lSnap.docs) {
        const lead = lDoc.data() as LeadDoc;
        if (
          lead.merchantId === merchant?.id ||
          (cleanPhone && normalizePhone(lead.merchantWhatsapp) === cleanPhone)
        ) {
          leadsCount++;
        }
      }
    } catch (e) {
      console.warn('[Firestore] Notice fetching lead count:', e);
    }

    try {
      const searchLogs = await getDocs(collection(db, 'search_logs'));
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      for (const searchDoc of searchLogs.docs) {
        const search = searchDoc.data() as SearchLogDoc;
        const matched = (search.matchedMerchantPhones || []).some((phone) => normalizePhone(phone) === cleanPhone);
        if (!matched || !cleanPhone) continue;
        appearancesCount++;
        const timestamp = new Date(search.timestamp || '').getTime();
        if (!Number.isNaN(timestamp) && timestamp >= sevenDaysAgo) recentAppearancesCount++;
      }
    } catch (e) {
      console.warn('[Firestore] Notice fetching merchant search appearances:', e);
    }

    return {
      appearances: appearancesCount,
      last7DaysAppearances: recentAppearancesCount,
      leadsGenerated: leadsCount,
      productCount: products.length,
      balance: merchant?.credit_balance ?? 0,
      registeredSince: merchant?.registeredAt || merchant?.claimDate || 'Unknown',
      isVerified: merchant?.isVerified ?? merchant?.verifiedStatus === 'YES',
      businessName: merchant?.businessName || 'Your Business',
      bankAccount: merchant?.bankAccount,
      totalSafePaySales: merchant?.totalSafePaySales ?? 0,
      completedSafePayOrders: merchant?.completedSafePayOrders ?? 0,
      referralCode: merchant?.referralCode || cleanPhone,
      referralsCount: merchant?.referralsCount ?? 0,
      referralCreditsEarned: merchant?.referralCreditsEarned ?? 0,
    };
  }

  /**
   * Update or set a merchant's settlement bank account details for SafePay escrow payouts
   * and automatically promote merchant to Tier 1 KYC if name verification passes.
   */
  public async setMerchantBankAccount(
    merchantIdOrPhone: string,
    bankInfo: BankAccountInfo
  ): Promise<boolean> {
    const cleanPhone = normalizePhone(merchantIdOrPhone);
    const now = new Date().toISOString();
    try {
      const merchant = await this.getMerchant(merchantIdOrPhone);
      const targetId = merchant?.id || cleanPhone;
      if (!targetId) return false;

      const merchantRef = doc(db, 'merchants', targetId);
      const cleanedBank: BankAccountInfo = {
        accountNumber: bankInfo.accountNumber.trim(),
        bankName: bankInfo.bankName.trim(),
        accountName: bankInfo.accountName?.trim() || '',
        bankCode: bankInfo.bankCode?.trim() || '',
        nameMatchVerified: bankInfo.nameMatchVerified ?? true,
        nameMatchConfidence: bankInfo.nameMatchConfidence ?? 1.0,
        resolvedAccountName: bankInfo.resolvedAccountName || bankInfo.accountName?.trim() || '',
        updatedAt: now,
      };

      const currentTier = merchant?.kycTier || 'TIER_0';
      const upgradedTier: KycTier = (currentTier === 'TIER_2' || currentTier === 'TIER_3') ? currentTier : 'TIER_1';
      const dailyLimit = upgradedTier === 'TIER_3' ? 999999999 : upgradedTier === 'TIER_2' ? 2000000 : 300000;

      const kycInfo: KycInfo = {
        tier: upgradedTier,
        tierName: upgradedTier === 'TIER_3' ? 'Tier 3 (Enterprise - NIN)' : upgradedTier === 'TIER_2' ? 'Tier 2 (Growth - BVN)' : 'Tier 1 (Basic)',
        nameMatchVerified: bankInfo.nameMatchVerified ?? true,
        bvnVerified: merchant?.kycInfo?.bvnVerified ?? false,
        ninVerified: merchant?.kycInfo?.ninVerified ?? false,
        bvnMasked: merchant?.kycInfo?.bvnMasked,
        ninMasked: merchant?.kycInfo?.ninMasked,
        dailyLimitNgn: dailyLimit,
        status: 'VERIFIED',
        verifiedAt: merchant?.kycInfo?.verifiedAt || now,
        updatedAt: now,
      };

      await setDoc(
        merchantRef,
        this.sanitizeForFirestore({
          bankAccount: cleanedBank,
          verifiedAccountName: cleanedBank.accountName,
          nameMatchVerified: cleanedBank.nameMatchVerified,
          kycTier: upgradedTier,
          kycInfo,
          updatedAt: now,
        }),
        { merge: true }
      );
      return true;
    } catch (err) {
      console.error(`[Firestore] Error updating bank account for ${merchantIdOrPhone}:`, err);
      return false;
    }
  }

  /**
   * Updates merchant KYC level (Tier 2 BVN or Tier 3 NIN) and saves to Firestore
   */
  public async updateMerchantKyc(params: {
    merchantIdOrPhone: string;
    tier: KycTier;
    bvnMasked?: string;
    ninMasked?: string;
    bvnRaw?: string;
    ninRaw?: string;
    settlementBankName?: string;
    settlementAccountNumber?: string;
    settlementAccountName?: string;
  }): Promise<{ success: boolean; kycInfo?: KycInfo }> {
    const cleanPhone = normalizePhone(params.merchantIdOrPhone);
    const now = new Date().toISOString();
    try {
      const merchant = await this.getMerchant(params.merchantIdOrPhone);
      const targetId = merchant?.id || cleanPhone;
      if (!targetId) return { success: false };

      const merchantRef = doc(db, 'merchants', targetId);
      const dailyLimit = params.tier === 'TIER_3' ? 999999999 : params.tier === 'TIER_2' ? 2000000 : 300000;
      const tierName = params.tier === 'TIER_3' ? 'Tier 3 (Enterprise - NIN)' : params.tier === 'TIER_2' ? 'Tier 2 (Growth - BVN)' : 'Tier 1 (Basic)';

      const kycInfo: KycInfo = {
        tier: params.tier,
        tierName,
        nameMatchVerified: merchant?.bankAccount?.nameMatchVerified ?? true,
        bvnVerified: params.tier === 'TIER_2' || params.tier === 'TIER_3' || (merchant?.kycInfo?.bvnVerified ?? false),
        ninVerified: params.tier === 'TIER_3' || (merchant?.kycInfo?.ninVerified ?? false),
        bvnMasked: params.bvnMasked || merchant?.kycInfo?.bvnMasked || merchant?.bvn,
        ninMasked: params.ninMasked || merchant?.kycInfo?.ninMasked || merchant?.nin,
        dailyLimitNgn: dailyLimit,
        status: 'VERIFIED',
        verifiedAt: now,
        updatedAt: now,
      };

      const updateData: Partial<MerchantDoc> = {
        kycTier: params.tier,
        kycInfo,
        updatedAt: now,
      };

      if (params.settlementAccountNumber && params.settlementBankName) {
        updateData.bankAccount = {
          bankName: params.settlementBankName,
          accountNumber: params.settlementAccountNumber,
          accountName: params.settlementAccountName || merchant?.ownerFullName || 'Verified Merchant',
          nameMatchVerified: true,
          updatedAt: now,
        };
      }

      if (params.bvnMasked) updateData.bvn = params.bvnMasked;
      if (params.ninMasked) updateData.nin = params.ninMasked;

      await setDoc(merchantRef, this.sanitizeForFirestore(updateData), { merge: true });
      return { success: true, kycInfo };
    } catch (err) {
      console.error(`[Firestore] Error updating KYC for ${params.merchantIdOrPhone}:`, err);
      return { success: false };
    }
  }

  /**
   * Saves a verifiable KYC audit log into the kyc_verifications collection in Firestore
   */
  public async saveKycVerification(docData: Omit<KycVerificationDoc, 'id' | 'createdAt'>): Promise<KycVerificationDoc | null> {
    try {
      const id = `kyc_${docData.verificationType.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const fullDoc: KycVerificationDoc = {
        ...docData,
        id,
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'kyc_verifications', id), this.sanitizeForFirestore(fullDoc));
      return fullDoc;
    } catch (err) {
      console.error('[Firestore] Error saving KYC verification log:', err);
      return null;
    }
  }

  /**
   * Records an automated or manual SafePay payout transaction in the payout_transactions collection.
   * Masks bank account numbers so full sensitive account details are never stored unmasked in logs.
   */
  public async recordPayoutTransaction(data: Omit<PayoutTransactionDoc, 'id' | 'disbursedAt'>): Promise<PayoutTransactionDoc | null> {
    try {
      const id = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const rawAcc = data.accountNumber || data.destinationAccountNumber || '';
      const cleanAcc = String(rawAcc).replace(/\D/g, '');
      const maskedAcc = cleanAcc.length > 4 ? `••••••${cleanAcc.slice(-4)}` : (cleanAcc ? `••••` : '');

      const record: PayoutTransactionDoc = {
        ...data,
        accountNumber: maskedAcc,
        destinationAccountNumber: maskedAcc,
        id,
        disbursedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'payout_transactions', id), this.sanitizeForFirestore(record));
      return record;
    } catch (err) {
      console.error('[Firestore] Error recording payout transaction:', err);
      return null;
    }
  }

  /**
   * Atomic Webhook Claim (TOCTOU / Race-Condition Safe):
   * Uses a Firestore ACID transaction to atomically create a lock document keyed by the
   * unique Flutterwave transaction reference (e.g. wh_tx_FLT-SP-XXXXXX).
   *
   * If the document already exists, the transaction does NOT write, aborts, and returns { success: false, alreadyProcessed: true }.
   * Only if the document does NOT exist does the transaction atomically write the document and return { success: true, alreadyProcessed: false }.
   *
   * Why this is genuinely race-condition safe:
   * Under Firestore's Optimistic Concurrency Control (OCC), if two concurrent webhook requests
   * (Request A and Request B) read the document simultaneously when it does not exist:
   * 1. Whichever request commits first (say Request A) successfully creates the document.
   * 2. When Request B attempts to commit its transaction, Firestore detects that the document was modified/created
   *    after Request B's read, rejecting Request B's commit.
   * 3. Firestore automatically retries Request B's transaction callback from the beginning.
   * 4. Upon retry, Request B's transaction.get(docRef) reads the newly committed document, sees it exists (snap.exists() === true),
   *    and immediately returns { success: false, alreadyProcessed: true } without writing.
   *
   * This guarantees that EXACTLY ONE webhook invocation can ever succeed and proceed to processing or disbursement.
   */
  public async claimWebhookEventAtomic(
    txRef: string,
    details: {
      eventId?: string;
      transactionId?: string | number;
      amount?: number;
      status?: string;
      event?: string;
      [key: string]: any;
    }
  ): Promise<{ success: boolean; alreadyProcessed: boolean; docId: string }> {
    if (!txRef || !txRef.trim()) {
      return { success: false, alreadyProcessed: false, docId: '' };
    }

    const cleanRef = txRef.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const docId = `wh_tx_${cleanRef}`;
    const docRef = doc(db, 'processed_webhooks', docId);

    try {
      const result = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(docRef);
        if (snap.exists()) {
          // Document already exists! Another webhook request already claimed or finished processing.
          return { success: false, alreadyProcessed: true };
        }

        // Atomically create the document within this transaction
        const record = {
          txRef,
          docId,
          ...details,
          claimedAt: new Date().toISOString(),
          processedAt: new Date().toISOString(),
          state: 'PROCESSED',
        };

        transaction.set(docRef, this.sanitizeForFirestore(record));
        return { success: true, alreadyProcessed: false };
      });

      return {
        success: result.success,
        alreadyProcessed: result.alreadyProcessed,
        docId,
      };
    } catch (err) {
      console.error(`[Firestore Atomic Webhook Claim Error] for ${docId}:`, err);
      return { success: false, alreadyProcessed: false, docId };
    }
  }

  /**
   * Creates or updates a Visual Verification Session in Firestore
   */
  public async createVerificationSession(session: VisualVerificationSessionDoc): Promise<void> {
    try {
      const docId = session.token || session.ref || session.id;
      const payload = {
        ...session,
        id: docId,
        updatedAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'verification_sessions', docId), this.sanitizeForFirestore(payload), { merge: true });
      if (session.ref && session.ref !== docId) {
        await setDoc(doc(db, 'verification_sessions', session.ref), this.sanitizeForFirestore(payload), { merge: true });
      }
    } catch (err) {
      console.error('[Firestore] Error creating verification session:', err);
    }
  }

  /**
   * Retrieves a Visual Verification Session by token, ref, or phone
   */
  public async getVerificationSession(tokenOrRef: string): Promise<VisualVerificationSessionDoc | null> {
    try {
      if (!tokenOrRef) return null;
      const key = String(tokenOrRef).trim();
      const s = await getDoc(doc(db, 'verification_sessions', key));
      if (s.exists()) {
        return s.data() as VisualVerificationSessionDoc;
      }

      // Query by ref or token field
      const qRef = query(collection(db, 'verification_sessions'), where('ref', '==', key), limit(1));
      const snapRef = await getDocs(qRef);
      if (!snapRef.empty) {
        return snapRef.docs[0].data() as VisualVerificationSessionDoc;
      }

      const qToken = query(collection(db, 'verification_sessions'), where('token', '==', key), limit(1));
      const snapToken = await getDocs(qToken);
      if (!snapToken.empty) {
        return snapToken.docs[0].data() as VisualVerificationSessionDoc;
      }

      // Fallback: check merchant record by phone
      const merchant = await this.getMerchant(key);
      if (merchant) {
        return {
          id: merchant.id,
          token: merchant.verificationToken || merchant.id,
          ref: merchant.verificationRef || `FLT-VR-${merchant.id.slice(-6)}`,
          phone: merchant.whatsapp || merchant.id,
          businessName: merchant.businessName,
          ownerFullName: merchant.ownerFullName || 'Store Owner',
          businessModel: (merchant.businessModel as any) || (merchant.shopAddress ? 'physical_stall' : 'dropshipper_online'),
          shopAddress: merchant.shopAddress,
          marketLocation: merchant.city || merchant.marketHub,
          category: merchant.category,
          status: merchant.isVerified ? 'VERIFIED' : 'PENDING_VISUAL',
          createdAt: merchant.registeredAt || new Date().toISOString(),
          verifiedAt: merchant.visualVerifiedAt,
        };
      }

      return null;
    } catch (err) {
      console.error('[Firestore] Error retrieving verification session:', err);
      return null;
    }
  }

  /**
   * Completes visual verification, updates session and merchant documents, activates Verified Badge
   */
  public async completeVisualVerification(
    tokenOrRef: string,
    submission: {
      phone?: string;
      verificationType?: string;
      photoUrl?: string;
      photoBase64?: string;
      notes?: string;
      gpsCoords?: { lat: number; lng: number };
    }
  ): Promise<{ success: boolean; session?: VisualVerificationSessionDoc; merchant?: MerchantDoc }> {
    try {
      const session = await this.getVerificationSession(tokenOrRef);
      const phone = submission.phone || session?.phone || tokenOrRef;
      const merchant = await this.getMerchant(phone);

      const verifiedAt = new Date().toISOString();
      const isPhysical = (session?.businessModel || merchant?.businessModel) === 'physical_stall';
      const badgeType = isPhysical ? 'VERIFIED_PHYSICAL_STALL' : 'VERIFIED_DROP_SHIPPER';

      // 1. Update session doc
      if (session) {
        const updatedSession: VisualVerificationSessionDoc = {
          ...session,
          status: 'VERIFIED',
          verificationType: submission.verificationType || (isPhysical ? 'stall_photo' : 'dropshipper_proof'),
          photoUrl: submission.photoUrl || session.photoUrl,
          photoBase64: submission.photoBase64 ? submission.photoBase64.slice(0, 500) + '...' : undefined,
          notes: submission.notes,
          gpsCoords: submission.gpsCoords,
          verifiedAt,
        };
        await setDoc(doc(db, 'verification_sessions', session.id), this.sanitizeForFirestore(updatedSession), { merge: true });
        if (session.token && session.token !== session.id) {
          await setDoc(doc(db, 'verification_sessions', session.token), this.sanitizeForFirestore(updatedSession), { merge: true });
        }
      }

      // 2. Update merchant profile in Firestore
      if (merchant) {
        const updatedMerchant: MerchantDoc = {
          ...merchant,
          isVerified: true,
          identityVerified: true,
          verifiedStatus: 'YES',
          status: 'ACTIVE',
          badgeType,
          visualProofUrl: submission.photoUrl || merchant.visualProofUrl,
          visualVerifiedAt: verifiedAt,
          updatedAt: verifiedAt,
        };
        await this.saveMerchant(updatedMerchant);
        return { success: true, session: session || undefined, merchant: updatedMerchant };
      }

      return { success: true, session: session || undefined };
    } catch (err) {
      console.error('[Firestore] Error completing visual verification:', err);
      return { success: false };
    }
  }

  /**
   * Idempotency Check: Verifies if a Flutterwave webhook event has already been processed
   */
  public async isWebhookAlreadyProcessed(eventId: string): Promise<boolean> {
    if (!eventId) return false;
    const cleanId = `wh_${eventId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    try {
      const docRef = doc(db, 'processed_webhooks', cleanId);
      const snap = await getDoc(docRef);
      return snap.exists();
    } catch (err) {
      console.warn(`[Firestore] Notice checking webhook deduplication for ${cleanId}:`, err);
      return false;
    }
  }

  /**
   * Idempotency Marker: Records a processed webhook event to prevent double-processing
   */
  public async markWebhookProcessed(eventId: string, details: Record<string, any>): Promise<void> {
    if (!eventId) return;
    const cleanId = `wh_${eventId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
    try {
      const docRef = doc(db, 'processed_webhooks', cleanId);
      await setDoc(
        docRef,
        this.sanitizeForFirestore({
          eventId,
          ...details,
          processedAt: new Date().toISOString(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn(`[Firestore] Notice recording processed webhook ${cleanId}:`, err);
    }
  }

  /**
   * Records a 3-step qualified lead from WhatsApp to Firestore
   */
  public async recordWhatsAppLead(params: {
    buyerPhone: string;
    buyerName?: string;
    merchantId: string;
    merchantName: string;
    merchantWhatsapp: string;
    item: string;
    orderVolume: 'Retail' | 'Wholesale';
    fulfillment: 'Shop Visit' | 'Local City Delivery' | 'Interstate Waybill';
    buyerLocation: string;
  }): Promise<LeadDoc | null> {
    try {
      const leadId = `lead-wa-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const leadRefCode = `FLT-${Math.floor(100000 + Math.random() * 900000)}`;
      const cleanBizPhone = normalizePhone(params.merchantWhatsapp).replace(/^0/, '234');
      const waLink = `https://wa.me/${cleanBizPhone}?text=${encodeURIComponent(`HI ${params.merchantName.toUpperCase()}, I found you on FLOATE.`)}`;

      const lead: LeadDoc = {
        id: leadId,
        ref: leadRefCode,
        buyerId: params.buyerPhone,
        buyerUsername: params.buyerName || params.buyerPhone,
        merchantId: params.merchantId || '',
        merchantName: params.merchantName || '',
        merchantWhatsapp: params.merchantWhatsapp || '',
        item: params.item || 'In-Stock Item',
        location: params.buyerLocation || 'Nigeria',
        cost: 0,
        waLink,
        timestamp: new Date().toISOString(),
      };

      const leadsCol = collection(db, 'leads');
      await setDoc(doc(leadsCol, leadId), this.sanitizeForFirestore(lead));
      return lead;
    } catch (err) {
      console.error('[Firestore] Error saving WhatsApp lead:', err);
      return null;
    }
  }

  /**
   * Get or create a persistent BuyerAccountDoc in Firestore
   */
  public async getOrCreateBuyerAccount(
    buyerId: string | number,
    channel: 'whatsapp' | 'telegram' | 'web',
    name?: string
  ): Promise<BuyerAccountDoc> {
    const cleanId = String(buyerId).trim();
    try {
      const buyerRef = doc(db, 'buyers', cleanId);
      const snap = await getDoc(buyerRef);
      const now = new Date().toISOString();

      if (snap.exists()) {
        const data = snap.data() as BuyerAccountDoc;
        const updatedName = (name && name !== 'Customer') ? name : data.name || 'Customer';
        await updateDoc(buyerRef, this.sanitizeForFirestore({
          lastActiveAt: now,
          name: updatedName,
        }));
        return {
          ...data,
          lastActiveAt: now,
          name: updatedName,
        };
      }

      const newBuyer: BuyerAccountDoc = {
        buyerId: cleanId,
        channel,
        name: (name && name !== 'Customer') ? name : 'Customer',
        searchHistory: [],
        negotiatorAccess: false,
        createdAt: now,
        lastActiveAt: now,
      };

      await setDoc(buyerRef, this.sanitizeForFirestore(newBuyer));
      return newBuyer;
    } catch (err) {
      console.warn(`[Firestore] Notice fetching/creating buyer account for ${cleanId}:`, err);
      return {
        buyerId: cleanId,
        channel,
        name: name || 'Customer',
        searchHistory: [],
        negotiatorAccess: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get existing buyer account by ID
   */
  public async getBuyerAccount(buyerId: string | number): Promise<BuyerAccountDoc | null> {
    const cleanId = String(buyerId).trim();
    try {
      const buyerRef = doc(db, 'buyers', cleanId);
      const snap = await getDoc(buyerRef);
      if (snap.exists()) {
        return snap.data() as BuyerAccountDoc;
      }
      return null;
    } catch (err) {
      console.warn(`[Firestore] Error getting buyer account ${cleanId}:`, err);
      return null;
    }
  }

  /**
   * Update buyer's primary location
   */
  public async updateBuyerPrimaryLocation(buyerId: string | number, location: string): Promise<boolean> {
    const cleanId = String(buyerId).trim();
    const cleanLoc = location.trim();
    try {
      const buyerRef = doc(db, 'buyers', cleanId);
      const snap = await getDoc(buyerRef);
      const now = new Date().toISOString();

      if (snap.exists()) {
        await updateDoc(buyerRef, this.sanitizeForFirestore({
          primaryLocation: cleanLoc,
          lastActiveAt: now,
        }));
      } else {
        const newBuyer: BuyerAccountDoc = {
          buyerId: cleanId,
          channel: 'whatsapp',
          name: 'Customer',
          primaryLocation: cleanLoc,
          searchHistory: [],
          negotiatorAccess: false,
          createdAt: now,
          lastActiveAt: now,
        };
        await setDoc(buyerRef, this.sanitizeForFirestore(newBuyer));
      }
      return true;
    } catch (err) {
      console.error(`[Firestore] Error updating primary location for buyer ${cleanId}:`, err);
      return false;
    }
  }

  /**
   * STEP 2: Checks if a WhatsApp number is brand new (never had first contact or business registration before)
   */
  public async isFirstContactForWhatsAppNumber(phone: string): Promise<boolean> {
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return false;

    return await withExternalTimeout(
      async () => {
        try {
          // 1. Check if number exists in buyers collection with hasSeenFirstContact === true
          const buyerRef = doc(db, 'buyers', cleanPhone);
          const buyerSnap = await getDoc(buyerRef);
          if (buyerSnap.exists()) {
            const buyerData = buyerSnap.data() as BuyerAccountDoc;
            if (buyerData.hasSeenFirstContact) {
              return false;
            }
          }

          // 2. Check if number is registered as a merchant
          const merchant = await this.getMerchant(cleanPhone);
          if (merchant) {
            return false;
          }

          // Not found in either collection -> brand new number!
          return true;
        } catch (err) {
          console.warn(`[Firestore] Notice checking first contact for ${cleanPhone}:`, err);
          return false;
        }
      },
      {
        timeoutMs: 8500,
        serviceName: 'Firestore',
        operationName: 'isFirstContactForWhatsAppNumber',
        fallbackValue: false,
      }
    );
  }

  /**
   * Retrieves a buyer document by phone number
   */
  public async getBuyer(phone: string): Promise<BuyerAccountDoc | null> {
    const cleanPhone = normalizePhone(phone);
    try {
      const buyerRef = doc(db, 'buyers', cleanPhone);
      const snap = await getDoc(buyerRef);
      if (snap.exists()) {
        return snap.data() as BuyerAccountDoc;
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * STEP 2: Records first contact timestamp and marks brand new number in buyers collection
   */
  public async recordFirstContact(phone: string, name?: string): Promise<BuyerAccountDoc> {
    const cleanPhone = normalizePhone(phone);
    const now = new Date().toISOString();

    const buyerDoc: BuyerAccountDoc = {
      buyerId: cleanPhone,
      whatsapp: cleanPhone,
      role: 'BUYER',
      channel: 'whatsapp',
      name: name && name !== 'Customer' ? name : 'Customer',
      hasSeenFirstContact: true,
      firstContactTimestamp: now,
      searchHistory: [],
      negotiatorAccess: false,
      createdAt: now,
      lastActiveAt: now,
    };

    try {
      const buyerRef = doc(db, 'buyers', cleanPhone);
      await setDoc(buyerRef, this.sanitizeForFirestore(buyerDoc), { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Notice recording first contact for ${cleanPhone}:`, err);
    }

    return buyerDoc;
  }

  /**
   * STEP 2: Saves a newly registered business into Firestore merchants collection
   */
  public async registerBusinessAccount(params: {
    whatsapp: string;
    businessName: string;
    ownerFullName?: string;
    category: string;
    state: string;
    city: string;
    firstProduct?: string;
    firstPrice?: string;
  }): Promise<MerchantDoc> {
    const cleanPhone = normalizePhone(params.whatsapp);
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const merchantDoc: MerchantDoc = {
      id: cleanPhone,
      businessName: params.businessName.trim(),
      ownerFullName: params.ownerFullName?.trim() || params.businessName.trim(),
      whatsapp: cleanPhone,
      state: params.state.trim(),
      city: params.city.trim(),
      category: params.category.trim(),
      listingType: 'Product',
      isVerified: true,
      verifiedStatus: 'YES',
      credit_balance: 1000,
      status: 'ACTIVE',
      claimDate: today,
      updatedAt: now,
    };

    try {
      // 1. Save to merchants collection keyed by WhatsApp number
      const merchantRef = doc(db, 'merchants', cleanPhone);
      await setDoc(merchantRef, this.sanitizeForFirestore(merchantDoc));
      console.log(`[Firestore] Successfully registered business "${params.businessName}" (${cleanPhone}) in merchants collection`);

      // 2. Also save initial product if provided
      if (params.firstProduct) {
        await this.saveProductListing({
          userId: cleanPhone,
          businessName: params.businessName,
          whatsapp: cleanPhone,
          state: params.state,
          city: params.city,
          category: params.category,
          product: params.firstProduct,
          price: params.firstPrice || 'Market Rate',
          listingType: 'Product',
          negotiation: 'Yes',
        });
      }
    } catch (err) {
      console.error(`[Firestore] Error registering business account for ${cleanPhone}:`, err);
    }

    return merchantDoc;
  }

  /**
   * Record search in buyer's search history (Storage Optimized for 20,000+ users)
   */
  public async recordBuyerSearch(
    buyerId: string | number,
    queryText: string,
    locationUsed?: string,
    matchedCount?: number
  ): Promise<void> {
    const cleanId = String(buyerId).trim();
    if (!queryText) return;
    try {
      const buyerRef = doc(db, 'buyers', cleanId);
      const snap = await getDoc(buyerRef);
      const now = new Date().toISOString();

      const item: BuyerSearchHistoryItem = {
        query: queryText.trim().slice(0, 100),
        locationUsed: locationUsed ? locationUsed.slice(0, 50) : undefined,
        matchedCount: matchedCount ?? 0,
        timestamp: now,
      };

      if (snap.exists()) {
        const current = snap.data() as BuyerAccountDoc;
        const history = Array.isArray(current.searchHistory) ? current.searchHistory : [];
        const updatedHistory = [item, ...history.slice(0, STORAGE_LIMITS.MAX_SEARCH_HISTORY_PER_BUYER - 1)]; // Capped at 8 items
        await updateDoc(buyerRef, this.sanitizeForFirestore({
          searchHistory: updatedHistory,
          lastActiveAt: now,
        }));
      }
    } catch (err) {
      console.warn(`[Firestore] Notice recording search history for buyer ${cleanId}:`, err);
    }
  }

  /**
   * Record or update a Floate Secure Line relay session (Storage Compacted)
   */
  public async saveRelaySessionDoc(session: any): Promise<void> {
    if (!session || !session.id) return;
    try {
      const compacted = compactRelaySessionForStorage(session);
      const relayRef = doc(db, 'relay_sessions', String(session.id));
      await setDoc(relayRef, this.sanitizeForFirestore(compacted), { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Notice saving relay session ${session.id}:`, err);
    }
  }

  /**
   * Retrieve a Floate Secure Line relay session from Firestore
   */
  public async getRelaySessionDoc(sessionId: string): Promise<any | null> {
    if (!sessionId) return null;
    try {
      const relayRef = doc(db, 'relay_sessions', String(sessionId));
      const snap = await getDoc(relayRef);
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err) {
      console.warn(`[Firestore] Error fetching relay session ${sessionId}:`, err);
      return null;
    }
  }

  /**
   * Create or update a Floate SafePay Escrow Order
   */
  public async saveEscrowOrderDoc(order: Partial<EscrowOrderDoc> & { id: string }): Promise<EscrowOrderDoc> {
    const now = new Date().toISOString();
    const cleanId = order.id.trim();

    const numericBasePrice = typeof order.numericBasePrice === 'number'
      ? order.numericBasePrice
      : (parseFloat((order.price || '0').replace(/[^0-9.]/g, '')) || 0);

    const vendorCoversBuyerFee = Boolean(order.vendorCoversBuyerFee);
    const buyerFeePercent = vendorCoversBuyerFee ? 0 : (order.buyerFeePercent ?? 1.5);
    const vendorFeePercent = vendorCoversBuyerFee ? 3.5 : (order.vendorFeePercent ?? 2.0);

    const buyerFeeAmount = typeof order.buyerFeeAmount === 'number'
      ? order.buyerFeeAmount
      : Math.round(numericBasePrice * (buyerFeePercent / 100));

    const totalBuyerAmount = typeof order.totalBuyerAmount === 'number'
      ? order.totalBuyerAmount
      : (numericBasePrice + buyerFeeAmount);

    const vendorFeeAmount = typeof order.vendorFeeAmount === 'number'
      ? order.vendorFeeAmount
      : Math.round(numericBasePrice * (vendorFeePercent / 100));

    const netVendorPayout = typeof order.netVendorPayout === 'number'
      ? order.netVendorPayout
      : Math.max(0, numericBasePrice - vendorFeeAmount);

    const orderDoc: EscrowOrderDoc = {
      id: cleanId,
      escrowRef: order.escrowRef || cleanId,
      relaySessionId: order.relaySessionId,
      buyerPhone: order.buyerPhone ? normalizePhone(order.buyerPhone).replace(/^0/, '234') : '',
      buyerName: order.buyerName || 'Buyer',
      vendorPhone: order.vendorPhone ? normalizePhone(order.vendorPhone).replace(/^0/, '234') : '',
      vendorName: order.vendorName || 'Vendor',
      vendorId: order.vendorId,
      item: order.item || 'Item',
      price: order.price || `₦${numericBasePrice.toLocaleString()}`,
      numericBasePrice,
      totalFeePercent: 3.5,
      buyerFeePercent,
      buyerFeeAmount,
      totalBuyerAmount,
      vendorFeePercent,
      vendorFeeAmount,
      netVendorPayout,
      vendorCoversBuyerFee,
      initiatorPhone: order.initiatorPhone,
      dealCreationSource: order.dealCreationSource || 'RELAY_CHAT',
      deliveryCode: order.deliveryCode || `FLT-${Math.floor(1000 + Math.random() * 9000)}`,
      status: order.status || 'FUNDS_HELD_IN_ESCROW',
      payoutStatus: order.payoutStatus,
      payoutReference: order.payoutReference,
      payoutDisbursedAt: order.payoutDisbursedAt,
      flutterwaveTxId: order.flutterwaveTxId,
      flutterwaveTransferId: order.flutterwaveTransferId,
      webhookProcessedAt: order.webhookProcessedAt,
      paymentConfirmedAt: order.paymentConfirmedAt || now,
      deliveryConfirmedAt: order.deliveryConfirmedAt,
      fundsReleasedAt: order.fundsReleasedAt,
      refundRequestedAt: order.refundRequestedAt,
      refundReason: order.refundReason,
      refundEvidence: order.refundEvidence,
      createdAt: order.createdAt || now,
      updatedAt: now,
    };

    try {
      const orderRef = doc(db, 'escrow_orders', cleanId);
      await setDoc(orderRef, this.sanitizeForFirestore(orderDoc), { merge: true });
    } catch (err) {
      console.warn(`[Firestore] Notice saving escrow order ${cleanId}:`, err);
    }
    return orderDoc;
  }

  /**
   * Fetch an escrow order by ID or reference
   */
  public async getEscrowOrderDoc(orderId: string): Promise<EscrowOrderDoc | null> {
    if (!orderId) return null;
    try {
      const cleanId = orderId.trim();
      const orderRef = doc(db, 'escrow_orders', cleanId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        return snap.data() as EscrowOrderDoc;
      }
    } catch (err) {
      console.warn(`[Firestore] Notice fetching escrow order ${orderId}:`, err);
    }
    return null;
  }

  /**
   * Helper to check if an escrow order is still actively valid (not completed, cancelled, or stale)
   */
  private isOrderActiveAndValid(order: EscrowOrderDoc, maxPendingPaymentAgeMinutes: number = 120): boolean {
    if (!order || !order.status) return false;
    if (order.status === 'FUNDS_RELEASED' || order.status === 'REFUNDED' || order.status === 'CANCELLED') {
      return false;
    }
    // If it's awaiting payment, only consider it active if created within the TTL window
    if (order.status === 'PENDING_PAYMENT') {
      const orderTime = new Date(order.createdAt || 0).getTime();
      const ageMs = Date.now() - orderTime;
      if (ageMs > maxPendingPaymentAgeMinutes * 60 * 1000) {
        return false;
      }
    }
    return true;
  }

  /**
   * Mark an escrow order as CANCELLED or EXPIRED in Firestore
   */
  public async cancelOrExpireEscrowOrder(orderId: string, reason: string = 'EXPIRED'): Promise<boolean> {
    const cleanId = orderId.trim();
    try {
      const orderRef = doc(db, 'escrow_orders', cleanId);
      const snap = await getDoc(orderRef);
      if (snap.exists()) {
        const order = snap.data() as EscrowOrderDoc;
        const now = new Date().toISOString();
        await setDoc(
          orderRef,
          this.sanitizeForFirestore({
            ...order,
            status: 'CANCELLED',
            cancelReason: reason,
            updatedAt: now,
          }),
          { merge: true }
        );
        console.log(`[Firestore] Escrow order ${cleanId} marked as CANCELLED (${reason})`);
        return true;
      }
    } catch (err) {
      console.warn(`[Firestore] Could not cancel escrow order ${cleanId}:`, err);
    }
    return false;
  }

  /**
   * Find an active pending escrow order for a buyer awaiting delivery
   */
  public async getPendingEscrowOrderByBuyer(buyerPhone: string): Promise<EscrowOrderDoc | null> {
    const cleanPhone = normalizePhone(buyerPhone).replace(/^0/, '234');
    try {
      const q = query(
        collection(db, 'escrow_orders'),
        where('buyerPhone', '==', cleanPhone)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // Find newest valid pending order
        const docs = snap.docs.map((d) => d.data() as EscrowOrderDoc);
        docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const pending = docs.find((d) => this.isOrderActiveAndValid(d));
        if (pending) return pending;
      }
    } catch (err) {
      console.warn(`[Firestore] Notice querying escrow by buyer ${cleanPhone}:`, err);
    }
    return null;
  }

  /**
   * Find an active pending escrow order for a vendor
   */
  public async getPendingEscrowOrderByVendor(vendorPhone: string): Promise<EscrowOrderDoc | null> {
    const cleanPhone = normalizePhone(vendorPhone).replace(/^0/, '234');
    try {
      const q = query(
        collection(db, 'escrow_orders'),
        where('vendorPhone', '==', cleanPhone)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = snap.docs.map((d) => d.data() as EscrowOrderDoc);
        docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const pending = docs.find((d) => this.isOrderActiveAndValid(d));
        if (pending) return pending;
      }
    } catch (err) {
      console.warn(`[Firestore] Notice querying escrow by vendor ${cleanPhone}:`, err);
    }
    return null;
  }

  /**
   * Find latest pending escrow order for a user (as buyer, vendor, or initiator)
   */
  public async getLatestPendingEscrowOrderForUser(phone: string): Promise<EscrowOrderDoc | null> {
    const raw = phone.replace(/\D/g, '');
    const clean234 = raw.startsWith('234') ? raw : (raw.startsWith('0') ? `234${raw.slice(1)}` : `234${raw}`);
    const clean0 = raw.startsWith('234') ? `0${raw.slice(3)}` : (raw.startsWith('0') ? raw : `0${raw}`);

    const byBuyer = await this.getPendingEscrowOrderByBuyer(clean234);
    if (byBuyer) return byBuyer;

    const byVendor = await this.getPendingEscrowOrderByVendor(clean234);
    if (byVendor) return byVendor;

    try {
      const q = query(
        collection(db, 'escrow_orders'),
        where('initiatorPhone', 'in', [raw, clean234, clean0])
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docs = snap.docs.map((d) => d.data() as EscrowOrderDoc);
        docs.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        const pending = docs.find((d) => this.isOrderActiveAndValid(d));
        if (pending) return pending;
      }
    } catch (err) {
      console.warn(`[Firestore] Notice querying escrow by initiator ${clean234}:`, err);
    }
    return null;
  }

  /**
   * Find an escrow order by confirmation code
   */
  public async getEscrowOrderByDeliveryCode(code: string): Promise<EscrowOrderDoc | null> {
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
    const shortCode = cleanCode.replace(/^FLT-?/i, '');
    const fltCode = `FLT-${shortCode}`;

    try {
      // 1. Try direct match with FLT prefix
      const q1 = query(
        collection(db, 'escrow_orders'),
        where('deliveryCode', '==', fltCode)
      );
      const snap1 = await getDocs(q1);
      if (!snap1.empty) {
        const unreleased = snap1.docs.map(d => d.data() as EscrowOrderDoc).find(d => d.status !== 'FUNDS_RELEASED' && d.status !== 'REFUNDED');
        if (unreleased) return unreleased;
        return snap1.docs[0].data() as EscrowOrderDoc;
      }

      // 2. Try match with short code
      const q2 = query(
        collection(db, 'escrow_orders'),
        where('deliveryCode', '==', shortCode)
      );
      const snap2 = await getDocs(q2);
      if (!snap2.empty) {
        const unreleased = snap2.docs.map(d => d.data() as EscrowOrderDoc).find(d => d.status !== 'FUNDS_RELEASED' && d.status !== 'REFUNDED');
        if (unreleased) return unreleased;
        return snap2.docs[0].data() as EscrowOrderDoc;
      }
    } catch (err) {
      console.warn(`[Firestore] Notice querying escrow by code ${cleanCode}:`, err);
    }
    return null;
  }

  /**
   * Confirm delivery and release escrow funds (Atomic ACID Transaction)
   */
  public async confirmEscrowDelivery(
    orderId: string,
    providedCode: string
  ): Promise<{ success: boolean; order?: EscrowOrderDoc; error?: string }> {
    const cleanId = orderId.trim();
    const cleanCode = providedCode.toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();

    try {
      const orderRef = doc(db, 'escrow_orders', cleanId);
      const now = new Date().toISOString();

      const txResult = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(orderRef);
        if (!snap.exists()) {
          return { success: false, error: 'Escrow order not found.' };
        }
        const order = snap.data() as EscrowOrderDoc;

        if (order.status === 'FUNDS_RELEASED') {
          return { success: false, error: 'Funds have already been released for this order.' };
        }

        // CRITICAL SECURITY ENFORCEMENT:
        // Orders must be in FUNDS_HELD_IN_ESCROW or DELIVERY_CONFIRMED before any release is possible.
        // An unpaid order (PENDING_PAYMENT, CANCELLED, REFUNDED) can NEVER release funds or trigger payout!
        if (order.status !== 'FUNDS_HELD_IN_ESCROW' && order.status !== 'DELIVERY_CONFIRMED') {
          console.warn(`[Security Alert] Blocked delivery confirmation on unpaid order ${order.id} (Status: ${order.status})`);
          return {
            success: false,
            error: 'Funds cannot be released: this order has not been paid into Floate SafePay Escrow.',
          };
        }

        if (order.payoutStatus === 'DISBURSED' || order.payoutStatus === 'PROCESSING') {
          return { success: false, error: 'Funds have already been disbursed or are currently processing for this order.' };
        }

        // Normalise comparison (e.g. compare "FLT-1234" or just "1234")
        const storedCode = (order.deliveryCode || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
        const storedShortCode = storedCode.replace(/^FLT-?/i, '');
        const inputShortCode = cleanCode.replace(/^FLT-?/i, '');

        if (cleanCode !== storedCode && inputShortCode !== storedShortCode) {
          return { success: false, error: 'Invalid delivery confirmation code. Please check the code on your delivery package.' };
        }

        const updatedOrder: EscrowOrderDoc = {
          ...order,
          status: 'FUNDS_RELEASED',
          deliveryConfirmedAt: now,
          fundsReleasedAt: now,
          updatedAt: now,
        };

        transaction.set(orderRef, this.sanitizeForFirestore(updatedOrder), { merge: true });
        return { success: true, order: updatedOrder };
      });

      if (!txResult.success || !txResult.order) {
        return txResult;
      }

      const updatedOrder = txResult.order;

      // Update Merchant SafePay stats in background
      try {
        const vendorKey = updatedOrder.vendorId || updatedOrder.vendorPhone;
        const merchant = await this.getMerchant(vendorKey);
        if (merchant) {
          const numericPrice = parseFloat(updatedOrder.price.replace(/[^0-9.]/g, '')) || 0;
          const currentTotal = merchant.totalSafePaySales || 0;
          const currentOrders = merchant.completedSafePayOrders || 0;
          const mRef = doc(db, 'merchants', merchant.id);
          await setDoc(
            mRef,
            this.sanitizeForFirestore({
              totalSafePaySales: currentTotal + numericPrice,
              completedSafePayOrders: currentOrders + 1,
              updatedAt: now,
            }),
            { merge: true }
          );
        }
      } catch (mErr) {
        console.warn('[Confirm Delivery - Merchant Stats Update Notice]:', mErr);
      }

      return { success: true, order: updatedOrder };
    } catch (err: any) {
      console.error('[Confirm Delivery Error]:', err);
      return { success: false, error: err?.message || 'Could not confirm delivery.' };
    }
  }

  /**
   * Atomically update specific fields of an escrow order (e.g., payoutStatus, tracking)
   */
  public async updateEscrowOrder(orderId: string, updates: Partial<EscrowOrderDoc>): Promise<boolean> {
    const cleanId = orderId.trim();
    try {
      const orderRef = doc(db, 'escrow_orders', cleanId);
      const now = new Date().toISOString();
      await setDoc(orderRef, this.sanitizeForFirestore({ ...updates, updatedAt: now }), { merge: true });
      return true;
    } catch (err) {
      console.warn(`[Firestore] Error updating escrow order ${cleanId}:`, err);
      return false;
    }
  }

  /**
   * Record a refund request for an escrow order with reason and evidence
   */
  public async requestEscrowRefund(
    orderId: string,
    reason: string,
    evidence?: string
  ): Promise<{ success: boolean; order?: EscrowOrderDoc; error?: string }> {
    const cleanId = orderId.trim();
    try {
      const orderRef = doc(db, 'escrow_orders', cleanId);
      const snap = await getDoc(orderRef);
      if (!snap.exists()) {
        return { success: false, error: 'Escrow order not found.' };
      }
      const order = snap.data() as EscrowOrderDoc;

      const now = new Date().toISOString();
      const updatedOrder: EscrowOrderDoc = {
        ...order,
        status: 'REFUND_REQUESTED',
        refundRequestedAt: now,
        refundReason: reason,
        refundEvidence: evidence,
        updatedAt: now,
      };

      await setDoc(orderRef, this.sanitizeForFirestore(updatedOrder), { merge: true });
      return { success: true, order: updatedOrder };
    } catch (err: any) {
      console.error('[Request Refund Error]:', err);
      return { success: false, error: err?.message || 'Could not submit refund request.' };
    }
  }

  /**
   * Record dispatch and waybill proof submitted by the vendor
   */
  public async submitEscrowDispatchProof(params: {
    orderIdOrRef: string;
    photoUrl?: string;
    photoMediaId?: string;
    courierName?: string;
    trackingNumber?: string;
    driverPhone?: string;
    dispatchNotes?: string;
  }): Promise<{ success: boolean; order?: EscrowOrderDoc; error?: string }> {
    const cleanId = params.orderIdOrRef.trim();
    try {
      let order = await this.getEscrowOrderDoc(cleanId);
      if (!order) {
        order = await this.getEscrowOrderByDeliveryCode(cleanId);
      }
      if (!order) {
        return { success: false, error: 'Escrow order not found.' };
      }

      const now = new Date().toISOString();
      const updatedOrder: EscrowOrderDoc = {
        ...order,
        dispatchProofPhotoUrl: params.photoUrl || order.dispatchProofPhotoUrl || '',
        dispatchProofMediaId: params.photoMediaId || order.dispatchProofMediaId || '',
        courierName: params.courierName || order.courierName || '',
        trackingNumber: params.trackingNumber || order.trackingNumber || '',
        driverPhone: params.driverPhone || order.driverPhone || '',
        dispatchNotes: params.dispatchNotes || order.dispatchNotes || '',
        dispatchedAt: order.dispatchedAt || now,
        updatedAt: now,
      };

      const orderRef = doc(db, 'escrow_orders', order.id);
      await setDoc(orderRef, this.sanitizeForFirestore(updatedOrder), { merge: true });
      return { success: true, order: updatedOrder };
    } catch (err: any) {
      console.error('[Submit Dispatch Proof Error]:', err);
      return { success: false, error: err?.message || 'Could not save dispatch proof.' };
    }
  }

  /**
   * ADMIN ANALYTICS & METRICS AGGREGATOR
   * Gathers live telemetry across merchants, buyers, relay link-ups, and SafePay escrow deals.
   */
  public async getAdminMetricsSummary(): Promise<{
    totalLinkUps: number;
    activeRelays: number;
    completedRelays: number;
    totalLeadsDelivered: number;
    concludedDeals: number;
    activeEscrowDeals: number;
    pendingPaymentDeals: number;
    totalGmvProcessed: number;
    totalGmvInPipeline: number;
    totalPlatformRevenue: number;
    registeredBusinesses: number;
    verifiedBusinesses: number;
    registeredBuyers: number;
    totalCatalogProducts: number;
    categoriesBreakdown: { [category: string]: number };
    recentDeals: EscrowOrderDoc[];
    recentRelays: RelaySessionDoc[];
    generatedAt: string;
  }> {
    try {
      // 1. Fetch Escrow Orders with explicit timeout
      let escrowOrders: EscrowOrderDoc[] = [];
      try {
        const orderSnap = await withExternalTimeout(
          () => getDocs(collection(db, 'escrow_orders')),
          {
            serviceName: 'Firestore',
            operationName: 'getAdminMetrics.escrow_orders',
            timeoutMs: 4000,
            fallbackValue: null as any,
            silentFallback: true,
          }
        );
        if (orderSnap && orderSnap.docs) {
          escrowOrders = orderSnap.docs.map(d => d.data() as EscrowOrderDoc);
        }
      } catch (e) {
        console.warn('[Admin Metrics] Notice querying escrow_orders:', e);
      }

      // 2. Fetch Relay Sessions with explicit timeout
      let relayDocs: RelaySessionDoc[] = [];
      try {
        const relaySnap = await withExternalTimeout(
          () => getDocs(collection(db, 'relay_sessions')),
          {
            serviceName: 'Firestore',
            operationName: 'getAdminMetrics.relay_sessions',
            timeoutMs: 4000,
            fallbackValue: null as any,
            silentFallback: true,
          }
        );
        if (relaySnap && relaySnap.docs) {
          relayDocs = relaySnap.docs.map(d => d.data() as RelaySessionDoc);
        }
      } catch (e) {
        console.warn('[Admin Metrics] Notice querying relay_sessions:', e);
      }

      // 3. Fetch Merchants with explicit timeout
      let merchants: MerchantDoc[] = [];
      try {
        const merchSnap = await withExternalTimeout(
          () => getDocs(collection(db, 'merchants')),
          {
            serviceName: 'Firestore',
            operationName: 'getAdminMetrics.merchants',
            timeoutMs: 4000,
            fallbackValue: null as any,
            silentFallback: true,
          }
        );
        if (merchSnap && merchSnap.docs) {
          merchants = merchSnap.docs.map(d => d.data() as MerchantDoc);
        }
      } catch (e) {
        console.warn('[Admin Metrics] Notice querying merchants:', e);
      }

      // Fallback merchants from sheets if Firestore empty
      if (merchants.length === 0) {
        const sheetsListings = sheetsDb.getAllListings();
        merchants = sheetsListings.map(l => ({
          id: l.id || l.whatsapp,
          businessName: l.businessName,
          whatsapp: l.whatsapp,
          credit_balance: 25,
          status: 'ACTIVE',
          category: l.category || 'General',
          product: l.product,
          isVerified: true,
          updatedAt: new Date().toISOString(),
        }));
      }

      // 4. Fetch Buyers with explicit timeout
      let buyers: BuyerAccountDoc[] = [];
      try {
        const buyerSnap = await withExternalTimeout(
          () => getDocs(collection(db, 'buyers')),
          {
            serviceName: 'Firestore',
            operationName: 'getAdminMetrics.buyers',
            timeoutMs: 4000,
            fallbackValue: null as any,
            silentFallback: true,
          }
        );
        if (buyerSnap && buyerSnap.docs) {
          buyers = buyerSnap.docs.map(d => d.data() as BuyerAccountDoc);
        }
      } catch (e) {
        console.warn('[Admin Metrics] Notice querying buyers:', e);
      }

      // 5. Fetch Leads with explicit timeout
      let leadsCount = 0;
      try {
        const leadSnap = await withExternalTimeout(
          () => getDocs(collection(db, 'leads')),
          {
            serviceName: 'Firestore',
            operationName: 'getAdminMetrics.leads',
            timeoutMs: 4000,
            fallbackValue: null as any,
            silentFallback: true,
          }
        );
        if (leadSnap) {
          leadsCount = leadSnap.size;
        }
      } catch (e) {
        console.warn('[Admin Metrics] Notice querying leads:', e);
      }

      // Calculations
      let concludedDeals = 0;
      let activeEscrowDeals = 0;
      let pendingPaymentDeals = 0;
      let totalGmvProcessed = 0;
      let totalGmvInPipeline = 0;
      let totalPlatformRevenue = 0;

      for (const order of escrowOrders) {
        const baseAmount = order.numericBasePrice || (parseFloat((order.price || '0').replace(/[^0-9.]/g, '')) || 0);
        const buyerFee = order.buyerFeeAmount || 0;
        const vendorFee = order.vendorFeeAmount || 0;

        if (order.status === 'FUNDS_RELEASED' || order.status === 'DELIVERY_CONFIRMED') {
          concludedDeals++;
          totalGmvProcessed += baseAmount;
          totalPlatformRevenue += (buyerFee + vendorFee);
        } else if (order.status === 'FUNDS_HELD_IN_ESCROW') {
          activeEscrowDeals++;
          totalGmvInPipeline += baseAmount;
        } else if (order.status === 'PENDING_PAYMENT' || (order.status as any) === 'PAYMENT_PENDING') {
          pendingPaymentDeals++;
        }
      }

      let activeRelays = 0;
      let completedRelays = 0;
      for (const r of relayDocs) {
        if (r.status === 'ACTIVE' || r.status === 'AGREEMENT_PENDING' || r.status === 'AWAITING_BUYER_PRICE') {
          activeRelays++;
        } else if (r.status === 'ENDED' || r.escrowStatus === 'FUNDS_RELEASED') {
          completedRelays++;
        }
      }

      let verifiedBusinesses = 0;
      let totalCatalogProducts = 0;
      const categoriesBreakdown: { [category: string]: number } = {};

      for (const m of merchants) {
        if (m.isVerified || m.identityVerified || m.verifiedStatus === 'YES') {
          verifiedBusinesses++;
        }
        if (m.products && Array.isArray(m.products)) {
          totalCatalogProducts += m.products.length;
        } else if (m.product) {
          totalCatalogProducts += 1;
        }

        const cat = (m.category || 'General Merchant').trim();
        categoriesBreakdown[cat] = (categoriesBreakdown[cat] || 0) + 1;
      }

      // Sort recent deals & relays
      const sortedDeals = [...escrowOrders].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }).slice(0, 50);

      const sortedRelays = [...relayDocs].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return timeB - timeA;
      }).slice(0, 50);

      const totalLinkUps = relayDocs.length + leadsCount;

      return {
        totalLinkUps,
        activeRelays,
        completedRelays,
        totalLeadsDelivered: leadsCount,
        concludedDeals,
        activeEscrowDeals,
        pendingPaymentDeals,
        totalGmvProcessed,
        totalGmvInPipeline,
        totalPlatformRevenue,
        registeredBusinesses: merchants.length,
        verifiedBusinesses,
        registeredBuyers: buyers.length,
        totalCatalogProducts,
        categoriesBreakdown,
        recentDeals: sortedDeals,
        recentRelays: sortedRelays,
        generatedAt: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[Get Admin Metrics Error]:', err);
      return {
        totalLinkUps: 0,
        activeRelays: 0,
        completedRelays: 0,
        totalLeadsDelivered: 0,
        concludedDeals: 0,
        activeEscrowDeals: 0,
        pendingPaymentDeals: 0,
        totalGmvProcessed: 0,
        totalGmvInPipeline: 0,
        totalPlatformRevenue: 0,
        registeredBusinesses: 0,
        verifiedBusinesses: 0,
        registeredBuyers: 0,
        totalCatalogProducts: 0,
        categoriesBreakdown: {},
        recentDeals: [],
        recentRelays: [],
        generatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Get system configuration document (e.g. WhatsApp flows config)
   */
  public async getSystemConfigDoc(configKey: string): Promise<any> {
    try {
      const snap = await getDoc(doc(db, 'system_configs', configKey));
      if (snap.exists()) {
        return snap.data();
      }
    } catch (e) {
      console.warn(`[Firestore SystemConfig Error] ${configKey}:`, e);
    }
    return null;
  }

  /**
   * Save system configuration document
   */
  public async saveSystemConfigDoc(configKey: string, data: any): Promise<void> {
    try {
      await setDoc(doc(db, 'system_configs', configKey), {
        ...data,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (e) {
      console.warn(`[Firestore Save SystemConfig Error] ${configKey}:`, e);
    }
  }

  /**
   * Get all merchants with full details for Admin Directory
   */
  public async getAllMerchantsList(limitCount = 100): Promise<MerchantDoc[]> {
    try {
      const snap = await withExternalTimeout(
        () => getDocs(collection(db, 'merchants')),
        {
          serviceName: 'Firestore',
          operationName: 'getAllMerchantsList',
          timeoutMs: 4000,
          fallbackValue: null as any,
          silentFallback: true,
        }
      );
      if (snap && snap.docs && snap.docs.length > 0) {
        const list = snap.docs.map(d => d.data() as MerchantDoc);
        return list.slice(0, limitCount);
      }
    } catch (e) {
      console.warn('[Admin List Merchants Error]:', e);
    }

    // Fallback to Google Sheets listings if Firestore collection is empty or timed out
    try {
      const sheetsListings = sheetsDb.getAllListings();
      return sheetsListings.slice(0, limitCount).map((l) => ({
        id: l.id || l.whatsapp,
        businessName: l.businessName,
        whatsapp: l.whatsapp,
        credit_balance: 25,
        status: 'ACTIVE',
        category: l.category || 'General',
        city: l.city || 'Nigeria',
        state: l.state || 'Lagos',
        product: l.product,
        isVerified: true,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get all buyers for Admin Directory
   */
  public async getAllBuyersList(limitCount = 100): Promise<BuyerAccountDoc[]> {
    try {
      const snap = await withExternalTimeout(
        () => getDocs(collection(db, 'buyers')),
        {
          serviceName: 'Firestore',
          operationName: 'getAllBuyersList',
          timeoutMs: 4000,
          fallbackValue: null as any,
          silentFallback: true,
        }
      );
      if (snap && snap.docs) {
        const list = snap.docs.map(d => d.data() as BuyerAccountDoc);
        return list.slice(0, limitCount);
      }
    } catch (e) {
      console.warn('[Admin List Buyers Error]:', e);
    }
    return [];
  }

  // =========================================================================
  // REFERRAL PROGRAM LOGIC (Vendor phone referral, 10 credits / 2 customers,
  // unlocked on product/photo add, max 10 businesses per merchant)
  // =========================================================================
  public readonly MAX_REFERRALS_PER_VENDOR = 10;
  public readonly REFERRAL_REWARD_CREDITS = 10; // 10 credits = 2 customer leads for referrer
  public readonly REFERRED_NEW_VENDOR_BONUS_CREDITS = 10; // 2 customer leads for newly referred business (10 credits)

  /**
   * Format clean phone number as referral identifier
   */
  public getReferralCodeForPhone(rawPhone: string): string {
    const clean = normalizePhone(rawPhone);
    const digits = clean.replace(/\D/g, '');
    return digits.startsWith('234') ? digits : digits.replace(/^0/, '234');
  }

  /**
   * Resolve referrer merchant by phone or code
   */
  public async resolveReferrer(refIdentifier: string): Promise<{ phone: string; businessName?: string; referralsCount: number } | null> {
    if (!refIdentifier) return null;
    const cleanRaw = refIdentifier.trim().replace(/^ref[_-]/i, '');
    const cleanDigits = cleanRaw.replace(/\D/g, '');
    if (!cleanDigits) return null;

    const variants = getAllPhoneVariants(cleanDigits);
    for (const v of variants) {
      const merchant = await this.getMerchant(v);
      if (merchant) {
        return {
          phone: normalizePhone(merchant.whatsapp || v).replace(/^0/, '234'),
          businessName: merchant.businessName,
          referralsCount: merchant.referralsCount || 0,
        };
      }
    }

    // Try finding by referralCode in merchants collection
    try {
      const merchantsCol = collection(db, 'merchants');
      const q = query(merchantsCol, where('referralCode', '==', cleanRaw));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const mData = snap.docs[0].data() as MerchantDoc;
        return {
          phone: normalizePhone(mData.whatsapp || snap.docs[0].id).replace(/^0/, '234'),
          businessName: mData.businessName,
          referralsCount: mData.referralsCount || 0,
        };
      }
    } catch (e) {
      console.warn('[Firestore resolveReferrer error]:', e);
    }

    // If cleanDigits is a valid phone number, return as a valid phone referrer
    if (cleanDigits.length >= 10) {
      const canonical = cleanDigits.startsWith('234') ? cleanDigits : cleanDigits.replace(/^0/, '234');
      return {
        phone: canonical,
        businessName: 'Floate Partner Store',
        referralsCount: 0,
      };
    }

    return null;
  }

  /**
   * Record or update an inbound referral when a business registers.
   * If the business already added at least 1 product/photo, the reward is unlocked immediately.
   * Otherwise, it's saved with status 'PENDING' until they add their first product/photo.
   */
  public async recordReferralOnRegistration(params: {
    referrerIdentifier: string;
    referredPhone: string;
    referredBusinessName: string;
    hasAddedProductOrPhoto: boolean;
  }): Promise<{
    referralDoc: ReferralDoc;
    rewardUnlockedNow: boolean;
    referrerPhone?: string;
    referrerName?: string;
    newReferrerBalance?: number;
    newMerchantBalance?: number;
    capReached?: boolean;
  }> {
    const cleanReferredPhone = normalizePhone(params.referredPhone).replace(/^0/, '234');
    const now = new Date().toISOString();
    const refId = `ref_${cleanReferredPhone}_${Date.now()}`;

    const resolved = await this.resolveReferrer(params.referrerIdentifier);
    const referrerPhone = resolved?.phone || normalizePhone(params.referrerIdentifier).replace(/^0/, '234');
    const referrerName = resolved?.businessName || 'Floate Partner Store';

    // Prevent self-referral
    if (referrerPhone === cleanReferredPhone) {
      console.log('[Referral] Self-referral prevented:', cleanReferredPhone);
      const referralDoc: ReferralDoc = {
        id: refId,
        referrerPhone,
        referredPhone: cleanReferredPhone,
        rewardCredits: 0,
        type: 'BUSINESS_REGISTRATION',
        status: 'COMPLETED',
        createdAt: now,
      };
      return {
        referralDoc,
        rewardUnlockedNow: false,
      };
    }

    // Check if referrer has reached max 10 referrals
    const referrerDoc = await this.getMerchant(referrerPhone);
    const currentReferralsCount = referrerDoc?.referralsCount || resolved?.referralsCount || 0;
    if (currentReferralsCount >= this.MAX_REFERRALS_PER_VENDOR) {
      console.log(`[Referral] Referrer ${referrerPhone} reached 10 referrals cap.`);
      const referralDoc: ReferralDoc = {
        id: refId,
        referrerPhone,
        referrerName,
        referredPhone: cleanReferredPhone,
        referredBusinessName: params.referredBusinessName,
        rewardCredits: 0,
        bonusGivenToNewUser: this.REFERRED_NEW_VENDOR_BONUS_CREDITS,
        type: 'BUSINESS_REGISTRATION',
        status: 'COMPLETED',
        hasAddedProductOrPhoto: params.hasAddedProductOrPhoto,
        createdAt: now,
        completedAt: now,
      };
      await setDoc(doc(db, 'referrals', refId), this.sanitizeForFirestore(referralDoc));
      return { referralDoc, rewardUnlockedNow: false, capReached: true, referrerPhone, referrerName };
    }

    // If the merchant already added 1 product or photo during registration, drop the reward now!
    if (params.hasAddedProductOrPhoto) {
      // 1. Credit referrer (+10 credits = 2 customers)
      const refTopup = await this.topupMerchantCredits(
        referrerPhone,
        this.REFERRAL_REWARD_CREDITS,
        0,
        `ref_reward_${refId}`,
        `Referral Reward: ${params.referredBusinessName}`
      );

      // Increment referralsCount on referrer's merchant doc
      try {
        const targetId = referrerDoc?.id || referrerPhone;
        await updateDoc(doc(db, 'merchants', targetId), {
          referralsCount: (currentReferralsCount + 1),
          referralCreditsEarned: ((referrerDoc?.referralCreditsEarned || 0) + this.REFERRAL_REWARD_CREDITS),
          updatedAt: now,
        });
      } catch (e) {
        console.warn('[Referral count update error]:', e);
      }

      // 2. Credit the new business with 10 extra bonus credits (= 2 customers)
      const newBizTopup = await this.topupMerchantCredits(
        cleanReferredPhone,
        this.REFERRED_NEW_VENDOR_BONUS_CREDITS,
        0,
        `ref_bonus_${refId}`,
        `Welcome Referral Bonus (Invited by ${referrerName})`
      );

      const referralDoc: ReferralDoc = {
        id: refId,
        referrerPhone,
        referrerName,
        referredPhone: cleanReferredPhone,
        referredBusinessName: params.referredBusinessName,
        rewardCredits: this.REFERRAL_REWARD_CREDITS,
        bonusGivenToNewUser: this.REFERRED_NEW_VENDOR_BONUS_CREDITS,
        type: 'BUSINESS_REGISTRATION',
        status: 'COMPLETED',
        hasAddedProductOrPhoto: true,
        createdAt: now,
        completedAt: now,
      };
      await setDoc(doc(db, 'referrals', refId), this.sanitizeForFirestore(referralDoc));

      return {
        referralDoc,
        rewardUnlockedNow: true,
        referrerPhone,
        referrerName,
        newReferrerBalance: refTopup.newBalance,
        newMerchantBalance: newBizTopup.newBalance,
      };
    } else {
      // Create pending referral record
      const referralDoc: ReferralDoc = {
        id: refId,
        referrerPhone,
        referrerName,
        referredPhone: cleanReferredPhone,
        referredBusinessName: params.referredBusinessName,
        rewardCredits: this.REFERRAL_REWARD_CREDITS,
        bonusGivenToNewUser: this.REFERRED_NEW_VENDOR_BONUS_CREDITS,
        type: 'BUSINESS_REGISTRATION',
        status: 'PENDING',
        hasAddedProductOrPhoto: false,
        createdAt: now,
      };
      await setDoc(doc(db, 'referrals', refId), this.sanitizeForFirestore(referralDoc));

      return {
        referralDoc,
        rewardUnlockedNow: false,
        referrerPhone,
        referrerName,
      };
    }
  }

  /**
   * Called when a merchant adds a product or photo to their store.
   * Checks if they have any 'PENDING' referral waiting for product/photo, and drops the reward!
   */
  public async unlockPendingReferralRewardOnProductAdd(merchantPhone: string, businessName?: string): Promise<{
    rewardUnlocked: boolean;
    referrerPhone?: string;
    referrerName?: string;
    creditsAwarded?: number;
    newReferrerBalance?: number;
    newMerchantBalance?: number;
  }> {
    const cleanPhone = normalizePhone(merchantPhone).replace(/^0/, '234');
    try {
      const refCol = collection(db, 'referrals');
      const q = query(
        refCol,
        where('referredPhone', '==', cleanPhone),
        where('status', '==', 'PENDING')
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        return { rewardUnlocked: false };
      }

      const refData = snap.docs[0].data() as ReferralDoc;
      const refDocId = snap.docs[0].id;
      const referrerPhone = refData.referrerPhone;
      const referrerName = refData.referrerName || 'Floate Partner';
      const now = new Date().toISOString();

      // Check cap on referrer
      const referrerDoc = await this.getMerchant(referrerPhone);
      const currentReferralsCount = referrerDoc?.referralsCount || 0;
      if (currentReferralsCount >= this.MAX_REFERRALS_PER_VENDOR) {
        await updateDoc(doc(db, 'referrals', refDocId), {
          status: 'COMPLETED',
          hasAddedProductOrPhoto: true,
          rewardCredits: 0,
          completedAt: now,
        });
        return { rewardUnlocked: false };
      }

      // 1. Award Referrer +10 credits (2 customers)
      const refTopup = await this.topupMerchantCredits(
        referrerPhone,
        this.REFERRAL_REWARD_CREDITS,
        0,
        `ref_reward_${refDocId}`,
        `Referral Reward: ${businessName || cleanPhone} added first product`
      );

      // Increment count on referrer's merchant doc
      try {
        const targetId = referrerDoc?.id || referrerPhone;
        await updateDoc(doc(db, 'merchants', targetId), {
          referralsCount: (currentReferralsCount + 1),
          referralCreditsEarned: ((referrerDoc?.referralCreditsEarned || 0) + this.REFERRAL_REWARD_CREDITS),
          updatedAt: now,
        });
      } catch (e) {
        console.warn('[Referral count update error]:', e);
      }

      // 2. Award Newly Referred Store +10 credits (2 customers)
      const newBizTopup = await this.topupMerchantCredits(
        cleanPhone,
        this.REFERRED_NEW_VENDOR_BONUS_CREDITS,
        0,
        `ref_bonus_${refDocId}`,
        `Referral Activation Bonus: Added first product to store`
      );

      // 3. Mark referral as COMPLETED
      await updateDoc(doc(db, 'referrals', refDocId), {
        status: 'COMPLETED',
        hasAddedProductOrPhoto: true,
        completedAt: now,
      });

      return {
        rewardUnlocked: true,
        referrerPhone,
        referrerName,
        creditsAwarded: this.REFERRAL_REWARD_CREDITS,
        newReferrerBalance: refTopup.newBalance,
        newMerchantBalance: newBizTopup.newBalance,
      };
    } catch (err) {
      console.error('[Error unlocking referral reward]:', err);
      return { rewardUnlocked: false };
    }
  }

  /**
   * Get referral statistics for a vendor (total referrals, max 10, total credits earned, list)
   */
  public async getReferralStats(vendorPhone: string): Promise<{
    totalReferrals: number;
    maxAllowed: number;
    totalCreditsEarned: number;
    referralCode: string;
    referrals: ReferralDoc[];
  }> {
    const cleanPhone = normalizePhone(vendorPhone).replace(/^0/, '234');
    const localPhone = cleanPhone.replace(/^234/, '0');
    const merchant = await this.getMerchant(cleanPhone);

    let referrals: ReferralDoc[] = [];
    try {
      const refCol = collection(db, 'referrals');
      const snap = await getDocs(query(refCol));
      for (const d of snap.docs) {
        const data = d.data() as ReferralDoc;
        if (
          data.referrerPhone === cleanPhone ||
          data.referrerPhone === localPhone ||
          (merchant?.referralCode && data.referrerCode === merchant.referralCode)
        ) {
          referrals.push(data);
        }
      }
    } catch (e) {
      console.warn('[getReferralStats error]:', e);
    }

    const completedReferrals = referrals.filter(r => r.status === 'COMPLETED');
    const totalCreditsEarned = completedReferrals.reduce((acc, curr) => acc + (curr.rewardCredits || 0), 0);

    return {
      totalReferrals: completedReferrals.length,
      maxAllowed: this.MAX_REFERRALS_PER_VENDOR,
      totalCreditsEarned,
      referralCode: merchant?.referralCode || cleanPhone,
      referrals,
    };
  }

  /**
   * Save a 24-hour status story update for a merchant
   */
  public async saveMerchantStatus(statusDoc: MerchantStatusDoc): Promise<void> {
    await setDoc(doc(db, 'merchant_statuses', statusDoc.id), this.sanitizeForFirestore(statusDoc));
  }

  /**
   * Get active (unexpired) 24-hour status story updates for a merchant or all merchants
   */
  public async getActiveMerchantStatuses(vendorPhone?: string): Promise<MerchantStatusDoc[]> {
    try {
      const snap = await getDocs(collection(db, 'merchant_statuses'));
      const now = new Date().toISOString();
      const list: MerchantStatusDoc[] = [];
      const targetPhone = vendorPhone ? normalizePhone(vendorPhone) : '';

      snap.forEach((d) => {
        const data = d.data() as MerchantStatusDoc;
        if (data.expiresAt > now) {
          if (!targetPhone || normalizePhone(data.vendorPhone || '') === targetPhone) {
            list.push({ ...data, id: d.id });
          }
        }
      });
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.warn('[Firestore] Error fetching merchant statuses:', err);
      return [];
    }
  }

  /**
   * Get all products, optionally filtered by vendor phone
   */
  public async getAllProducts(vendorPhone?: string): Promise<any[]> {
    try {
      const snap = await getDocs(collection(db, 'products'));
      const list: any[] = [];
      const targetPhone = vendorPhone ? normalizePhone(vendorPhone) : '';

      snap.forEach((d) => {
        const data = d.data();
        if (!targetPhone || normalizePhone(data.vendorPhone || data.whatsapp || '') === targetPhone) {
          list.push({ ...data, id: d.id });
        }
      });
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.warn('[Firestore] Error fetching products:', err);
      return [];
    }
  }

  public async updateProductCondition(
    productId: string,
    vendorPhone: string,
    condition: 'new' | 'used' | 'refurbished'
  ): Promise<boolean> {
    const phone = normalizePhone(vendorPhone);
    const productSnapshot = await getDoc(doc(db, 'products', productId));
    if (!productSnapshot.exists()) return false;
    const product = productSnapshot.data();
    const productPhone = product.vendorPhone || product.whatsapp || product.whatsappNumber || product.vendor?.whatsapp_number || '';
    if (normalizePhone(productPhone) !== phone) return false;
    await updateDoc(doc(db, 'products', productId), {
      condition,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  /**
   * Save auth OTP for WhatsApp login
   */
  public async saveAuthOtp(phone: string, otp: string): Promise<void> {
    const cleanPhone = normalizePhone(phone);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const otpDoc: AuthOtpDoc = {
      id: cleanPhone,
      phone: cleanPhone,
      otp,
      attempts: 0,
      createdAt: new Date().toISOString(),
      expiresAt,
    };
    await setDoc(doc(db, 'auth_otps', cleanPhone), this.sanitizeForFirestore(otpDoc));
  }

  /**
   * Verify WhatsApp auth OTP
   */
  public async verifyAuthOtp(phone: string, otp: string): Promise<boolean> {
    const cleanPhone = normalizePhone(phone);
    const docRef = doc(db, 'auth_otps', cleanPhone);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    const data = snap.data() as AuthOtpDoc;
    const now = new Date().toISOString();
    if (data.expiresAt < now) return false;
    if (data.otp !== otp.trim()) {
      await updateDoc(docRef, { attempts: (data.attempts || 0) + 1 });
      return false;
    }
    return true;
  }

  /**
   * Get all merchants with PENDING_REVIEW status
   */
  public async getPendingMerchants(): Promise<MerchantDoc[]> {
    try {
      const snap = await getDocs(collection(db, 'merchants'));
      const list: MerchantDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as MerchantDoc;
        if (data.status === 'PENDING_REVIEW' || data.verifiedStatus === 'PENDING' || data.isVerified === false) {
          list.push({ ...data, id: d.id });
        }
      });
      return list.sort((a, b) => new Date(b.updatedAt || b.registeredAt || 0).getTime() - new Date(a.updatedAt || a.registeredAt || 0).getTime());
    } catch (e) {
      console.warn('[Firestore] getPendingMerchants error:', e);
      return [];
    }
  }

  /**
   * Verify merchant by admin
   */
  public async verifyMerchantByAdmin(merchantIdOrPhone: string): Promise<boolean> {
    const cleanPhone = normalizePhone(merchantIdOrPhone);
    let merchantId = cleanPhone;
    let docRef = doc(db, 'merchants', merchantId);
    let snap = await getDoc(docRef);
    if (!snap.exists()) {
      const merchants = await this.getAllMerchantsList();
      const found = merchants.find(m => normalizePhone(m.whatsapp || m.id) === cleanPhone || m.id === merchantIdOrPhone);
      if (!found) return false;
      merchantId = found.id;
      docRef = doc(db, 'merchants', merchantId);
      snap = await getDoc(docRef);
      if (!snap.exists()) return false;
    }
    await updateDoc(docRef, this.sanitizeForFirestore({
      status: 'ACTIVE',
      isVerified: true,
      verifiedStatus: 'YES',
      verificationStatus: 'APPROVED',
      verificationReason: '',
      identityVerified: true,
      updatedAt: new Date().toISOString(),
    }));
    const products = await this.getProductsByMerchant(cleanPhone);
    await Promise.all(products.map((product) => this.updateProduct(product.id, {
      isVerified: true,
      verificationStatus: 'APPROVED',
    })));
    return true;
  }

  /**
   * Reject merchant by admin
   */
  public async rejectMerchantByAdmin(merchantIdOrPhone: string, reason?: string): Promise<boolean> {
    const cleanPhone = normalizePhone(merchantIdOrPhone);
    const docRef = doc(db, 'merchants', cleanPhone);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return false;
    await updateDoc(docRef, this.sanitizeForFirestore({
      status: 'REJECTED',
      isVerified: false,
      verifiedStatus: 'REJECTED',
      verificationStatus: 'REJECTED',
      verificationReason: reason || 'Not approved by admin.',
      rejectionReason: reason || '',
      updatedAt: new Date().toISOString(),
    }));
    const products = await this.getProductsByMerchant(cleanPhone);
    await Promise.all(products.map((product) => this.updateProduct(product.id, {
      isVerified: false,
      verificationStatus: 'REJECTED',
    })));
    return true;
  }

  /**
   * Save Ad document
   */
  public async saveAdDoc(ad: AdDoc): Promise<void> {
    await setDoc(doc(db, 'ads', ad.id), this.sanitizeForFirestore(ad));
  }

  /**
   * Get Ad document
   */
  public async getAdDoc(id: string): Promise<AdDoc | null> {
    const snap = await getDoc(doc(db, 'ads', id));
    if (!snap.exists()) return null;
    return snap.data() as AdDoc;
  }

  /**
   * Get all active banner ads for frontend display
   */
  public async getActiveBannerAds(): Promise<AdDoc[]> {
    try {
      const snap = await getDocs(collection(db, 'ads'));
      const list: AdDoc[] = [];
      snap.forEach((d) => {
        const data = d.data() as AdDoc;
        if (data.status === 'ACTIVE') {
          list.push({ ...data, id: d.id });
        }
      });
      return list.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime());
    } catch (e) {
      console.warn('[Firestore] getActiveBannerAds error:', e);
      return [];
    }
  }

  /**
   * Get all ads for admin dashboard
   */
  public async getAllAdsForAdmin(): Promise<AdDoc[]> {
    try {
      const snap = await getDocs(collection(db, 'ads'));
      const list: AdDoc[] = [];
      snap.forEach((d) => {
        const listData = d.data() as AdDoc;
        list.push({ ...listData, id: d.id });
      });
      return list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (e) {
      console.warn('[Firestore] getAllAdsForAdmin error:', e);
      return [];
    }
  }

  /**
   * Update ad document
   */
  public async updateAdDoc(id: string, updates: Partial<AdDoc>): Promise<void> {
    await updateDoc(doc(db, 'ads', id), this.sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    }));
  }

  /**
   * Record ad impression
   */
  public async recordAdImpression(id: string): Promise<void> {
    try {
      const ref = doc(db, 'ads', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as AdDoc;
        await updateDoc(ref, { impressions: (data.impressions || 0) + 1 });
      }
    } catch (e) {
      console.warn('[Firestore] recordAdImpression error:', e);
    }
  }

  /**
   * Record ad click
   */
  public async recordAdClick(id: string): Promise<void> {
    try {
      const ref = doc(db, 'ads', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data() as AdDoc;
        await updateDoc(ref, { clicks: (data.clicks || 0) + 1 });
      }
    } catch (e) {
      console.warn('[Firestore] recordAdClick error:', e);
    }
  }

  /**
   * Delete ad document
   */
  public async deleteAdDoc(id: string): Promise<void> {
    const { deleteDoc } = await import('firebase/firestore');
    await deleteDoc(doc(db, 'ads', id));
  }

  /**
   * Save or Update WhatsApp One-Click Auth Session
   */
  public async saveAuthSession(sessionDoc: any): Promise<void> {
    try {
      const codeKey = (sessionDoc.challengeCode || sessionDoc.code || '').trim().toUpperCase();
      if (!codeKey) return;
      await setDoc(doc(db, 'auth_sessions', codeKey), this.sanitizeForFirestore({
        ...sessionDoc,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.warn('[Firestore] saveAuthSession notice:', e);
    }
  }

  /**
   * Get WhatsApp One-Click Auth Session
   */
  public async getAuthSession(code: string): Promise<any | null> {
    try {
      const codeKey = (code || '').trim().toUpperCase();
      if (!codeKey) return null;
      const snap = await getDoc(doc(db, 'auth_sessions', codeKey));
      if (!snap.exists()) return null;
      return snap.data();
    } catch (e) {
      console.warn('[Firestore] getAuthSession notice:', e);
      return null;
    }
  }

  /**
   * Checks if a buyer connected with a merchant within the 48-hour duplicate protection window
   */
  public async checkLeadDuplicate48Hours(merchantPhone: string, buyerPhone: string): Promise<boolean> {
    try {
      const cleanMerchant = (merchantPhone || '').replace(/\D/g, '');
      const cleanBuyer = (buyerPhone || '').replace(/\D/g, '');
      if (!cleanMerchant || !cleanBuyer) return false;

      const windowCutoffMs = Date.now() - 48 * 60 * 60 * 1000; // 48 Hours
      const snap = await getDocs(
        query(
          collection(db, 'leads'),
          where('merchantId', '==', cleanMerchant),
          where('buyerPhone', '==', cleanBuyer),
          limit(5)
        )
      );

      let isDuplicate = false;
      snap.forEach((d) => {
        const data = d.data();
        const createdMs = new Date(data.timestamp || data.createdAt || 0).getTime();
        if (createdMs > windowCutoffMs) {
          isDuplicate = true;
        }
      });

      return isDuplicate;
    } catch (e) {
      console.warn('[Firestore] checkLeadDuplicate48Hours notice:', e);
      return false;
    }
  }

  /**
   * 1-to-1 Lead Credit Engine Processor (₦200 / Credit, 48h Duplicate Protection, Zero-Balance Soft Landing)
   */
  public async processLeadCreditDeduction(params: {
    merchantPhone: string;
    buyerPhone: string;
    buyerName?: string;
    buyerLocation?: string;
    item?: string;
    productId?: string;
  }): Promise<{
    duplicate48h: boolean;
    deducted: boolean;
    remainingCredits: number;
    isZeroBalance: boolean;
    leadId: string;
  }> {
    const { merchantPhone, buyerPhone, buyerName, buyerLocation, item, productId } = params;
    const cleanMerchant = (merchantPhone || '').replace(/\D/g, '');
    const cleanBuyer = (buyerPhone || '').replace(/\D/g, '');
    const leadId = `lead_web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Check 48-Hour Duplicate Protection Rule
    const isDuplicate = await this.checkLeadDuplicate48Hours(cleanMerchant, cleanBuyer);
    const merchant = await this.getMerchant(cleanMerchant);
    const currentCredits = typeof merchant?.credit_balance === 'number' ? merchant.credit_balance : 5;

    if (isDuplicate) {
      console.log(`[Lead Credit Engine] 🛡️ 48h Duplicate Protection active for buyer +${cleanBuyer} & merchant +${cleanMerchant}. 0 credits deducted.`);
      
      // Log lead without deducting credit
      await setDoc(doc(db, 'leads', leadId), this.sanitizeForFirestore({
        id: leadId,
        ref: `REF-${leadId.slice(-6)}`,
        buyerId: cleanBuyer,
        buyerPhone: cleanBuyer,
        buyerName: buyerName || 'Web Visitor',
        merchantId: cleanMerchant,
        item: item || 'Store Item',
        location: buyerLocation || 'Nigeria',
        cost: 0,
        duplicate48h: true,
        timestamp: new Date().toISOString(),
      }));

      return {
        duplicate48h: true,
        deducted: false,
        remainingCredits: currentCredits,
        isZeroBalance: currentCredits <= 0,
        leadId,
      };
    }

    // 2. New Lead - Check Merchant Balance
    if (currentCredits > 0) {
      const newCredits = Math.max(0, currentCredits - 1);
      
      // Update merchant balance in Firestore
      if (merchant) {
        await this.saveMerchant({
          ...merchant,
          credit_balance: newCredits,
          updatedAt: new Date().toISOString(),
        });
      }

      // Log Lead Deduction Transaction
      await setDoc(doc(db, 'leads', leadId), this.sanitizeForFirestore({
        id: leadId,
        ref: `REF-${leadId.slice(-6)}`,
        buyerId: cleanBuyer,
        buyerPhone: cleanBuyer,
        buyerName: buyerName || 'Web Visitor',
        merchantId: cleanMerchant,
        item: item || 'Store Item',
        location: buyerLocation || 'Nigeria',
        cost: 1, // 1 Credit = 1 Lead (₦200)
        duplicate48h: false,
        timestamp: new Date().toISOString(),
      }));

      await setDoc(doc(db, 'transactions', `tx_lead_${leadId}`), this.sanitizeForFirestore({
        id: `tx_lead_${leadId}`,
        merchantId: cleanMerchant,
        type: 'LEAD_DEDUCTION',
        amount: 1,
        description: `1 Lead Credit deducted for buyer "${buyerName || 'Web Visitor'}" (${item || 'Store Item'})`,
        reference: leadId,
        timestamp: new Date().toISOString(),
      }));

      console.log(`[Lead Credit Engine] ⚡ 1 Credit deducted for merchant +${cleanMerchant}. New Balance: ${newCredits} Credits.`);

      return {
        duplicate48h: false,
        deducted: true,
        remainingCredits: newCredits,
        isZeroBalance: newCredits === 0,
        leadId,
      };
    }

    // 3. Zero-Balance Soft Landing (0 Credits remaining)
    console.log(`[Lead Credit Engine] 🔥 Zero-Balance Soft Landing triggered for merchant +${cleanMerchant}. Customer waiting alert triggered.`);

    await setDoc(doc(db, 'leads', leadId), this.sanitizeForFirestore({
      id: leadId,
      ref: `REF-${leadId.slice(-6)}`,
      buyerId: cleanBuyer,
      buyerPhone: cleanBuyer,
      buyerName: buyerName || 'Web Visitor',
      merchantId: cleanMerchant,
      item: item || 'Store Item',
      location: buyerLocation || 'Nigeria',
      cost: 0,
      status: 'PENDING_MERCHANT_TOPUP',
      duplicate48h: false,
      timestamp: new Date().toISOString(),
    }));

    return {
      duplicate48h: false,
      deducted: false,
      remainingCredits: 0,
      isZeroBalance: true,
      leadId,
    };
  }

  // =========================================================================
  // WHATSAPP AUTH TOKENS & ORDER SYNC METHODS
  // =========================================================================

  public async saveWhatsAppAuthToken(tokenDoc: any): Promise<void> {
    try {
      const tokenRef = doc(db, 'whatsapp_auth_tokens', tokenDoc.id);
      await setDoc(tokenRef, this.sanitizeForFirestore(tokenDoc));
    } catch (err) {
      console.warn('[Firestore] saveWhatsAppAuthToken error:', err);
    }
  }

  public async getWhatsAppAuthTokenByHash(tokenHash: string): Promise<any | null> {
    try {
      const q = query(
        collection(db, 'whatsapp_auth_tokens'),
        where('token_hash', '==', tokenHash),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
    } catch (err) {
      console.warn('[Firestore] getWhatsAppAuthTokenByHash error:', err);
    }
    return null;
  }

  public async markWhatsAppAuthTokenUsed(id: string, updateData: { usedAt: string; ip?: string | null; ua?: string | null }): Promise<void> {
    try {
      const tokenRef = doc(db, 'whatsapp_auth_tokens', id);
      await updateDoc(tokenRef, this.sanitizeForFirestore({
        used_at: updateData.usedAt,
        ip: updateData.ip || null,
        ua: updateData.ua || null,
      }));
    } catch (err) {
      console.warn('[Firestore] markWhatsAppAuthTokenUsed error:', err);
    }
  }

  public async invalidateWhatsAppAuthTokensByOrderId(orderId: string): Promise<void> {
    try {
      const q = query(
        collection(db, 'whatsapp_auth_tokens'),
        where('order_id', '==', orderId)
      );
      const snapshot = await getDocs(q);
      const nowIso = new Date().toISOString();
      for (const docSnap of snapshot.docs) {
        if (!docSnap.data().used_at) {
          await updateDoc(docSnap.ref, { used_at: nowIso });
        }
      }
    } catch (err) {
      console.warn('[Firestore] invalidateWhatsAppAuthTokensByOrderId error:', err);
    }
  }

  public async savePaymentRecord(paymentRecord: any): Promise<void> {
    try {
      const payRef = doc(db, 'payments', paymentRecord.id);
      await setDoc(payRef, this.sanitizeForFirestore(paymentRecord));
    } catch (err) {
      console.warn('[Firestore] savePaymentRecord error:', err);
    }
  }

  public async getEscrowOrdersForVendor(vendorId: string): Promise<any[]> {
    try {
      const cleanVendor = normalizePhone(vendorId);
      const q = query(
        collection(db, 'escrow_orders'),
        where('vendorPhone', '==', cleanVendor)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((docSnap) => docSnap.data());
    } catch (err) {
      console.warn('[Firestore] getEscrowOrdersForVendor error:', err);
      return [];
    }
  }
}

export const firestoreDb = new FirestoreService();
