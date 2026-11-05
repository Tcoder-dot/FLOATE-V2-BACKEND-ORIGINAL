export interface WhatsAppVendorRegDraft {
  step:
    | 'AWAITING_DETAILS'
    | 'AWAITING_OWNER_NAME'
    | 'STEP_1_NAME'
    | 'STEP_2_BIZ'
    | 'STEP_3_LOCATION'
    | 'STEP_4_PRODUCTS'
    | 'STEP_5_PHOTO'
    | 'STEP_6_CONFIRM'
    | 'AWAITING_NIN_PHOTO'
    | 'AWAITING_VERIFICATION_VIDEO'
    | 'AWAITING_BANK'
    | 'AWAITING_LOCATION';
  ownerFullName?: string;
  businessName?: string;
  whatsapp?: string;
  location?: string;
  cacNumber?: string;
  marketHub?: string;
  shopAddress?: string;
  category?: string;
  productsDescription?: string;
  priceRange?: string;
  photoVerified?: boolean;
  photoMediaId?: string;
  verificationNinUrl?: string;
  verificationNinName?: string;
  verificationNinExtractedName?: string;
  verificationNinNumber?: string;
  verificationVideoCode?: string;
  verificationVideoUrl?: string;
  videoVerified?: boolean;
  ninVerified?: boolean;
  gpsVerified?: boolean;
  gpsLatitude?: number;
  gpsLongitude?: number;
  gpsAccuracy?: number;
  gpsVerificationToken?: string;
  marketHubId?: string;
  resolvedLocationDisplay?: string;
  city?: string;
  state?: string;
  settlementBankName?: string;
  settlementAccountNumber?: string;
  settlementAccountName?: string;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  resolvedAccountName?: string;
  isVerified?: boolean;
  referredBy?: string;
  updatedAt: string;
}

export interface WhatsAppClaimDraft {
  step: 'AWAITING_BIZ_NAME' | 'AWAITING_FULL_NAME' | 'AWAITING_OTP';
  listingId?: string;
  businessName?: string;
  ownerFullName?: string;
  registeredPhone?: string;
  otpCode?: string;
  otpExpiresAt?: number;
  updatedAt: string;
}

export interface WhatsAppReportDraft {
  step: 'AWAITING_DETAILS';
  vendorId?: string;
  vendorName?: string;
  vendorPhone?: string;
  updatedAt: string;
}

export interface WhatsAppVendorAddDraft {
  step: 'STEP_1_PHOTO' | 'STEP_2_NAME' | 'STEP_3_PRICE' | 'STEP_4_DESC' | 'STEP_5_DISCOUNT' | 'STEP_6_CONFIRM' | 'NAME' | 'PRICE' | 'DESC' | 'CONFIRM';
  photoUrl?: string;
  photoMediaId?: string;
  productName?: string;
  price?: string;
  numericPrice?: number;
  description?: string;
  discountPrice?: string;
  numericDiscountPrice?: number;
  category?: string;
  updatedAt: string;
}

export interface WhatsAppVendorEditDraft {
  step: 'SELECT' | 'ACTION' | 'VALUE' | 'VALUE_NAME' | 'VALUE_PRICE' | 'VALUE_BOTH';
  selectedProductId?: string;
  selectedProductName?: string;
  selectedProductPrice?: string;
  selectedProductCategory?: string;
  action?: 'PRICE' | 'NAME' | 'BOTH' | 'DELETE';
  updatedAt: string;
}

export interface WhatsAppVendorBankDraft {
  step: 'ACCOUNT_NUMBER' | 'BANK_NAME' | 'ACCOUNT_NAME' | 'CONFIRM';
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  bankCode?: string;
  pendingPayoutOrderId?: string;
  pendingPayoutAmount?: number;
  pendingPayoutItem?: string;
  pendingPayoutRef?: string;
  updatedAt: string;
}

export interface WhatsAppVendorKycDraft {
  step: 'MENU' | 'AWAITING_BVN' | 'AWAITING_NIN';
  targetTier?: 'TIER_2' | 'TIER_3';
  providedValue?: string;
  updatedAt: string;
}

export interface WhatsAppLeadQualificationDraft {
  step: 'AWAITING_DELIVERY_LOCATION' | 'AWAITING_WHEN_NEEDED';
  deliveryLocation?: string;
  whenNeeded?: string;
  vendorId?: string;
  updatedAt: string;
}

export interface WhatsAppDispatchProofDraft {
  escrowRef: string;
  orderId?: string;
  relayId?: string;
  photoUrl?: string;
  photoMediaId?: string;
  courierName?: string;
  trackingNumber?: string;
  driverPhone?: string;
  dispatchNotes?: string;
  updatedAt: string;
}

export interface RelayMessage {
  senderRole: 'BUYER' | 'VENDOR';
  senderPhone: string;
  text: string;
  timestamp: string;
}

export interface RelaySession {
  id: string;
  buyerPhone: string;
  buyerName: string;
  vendorPhone: string;
  vendorName: string;
  vendorId: string;
  item: string;
  price?: string;
  proposedPrice?: number;
  status:
    | 'ACTIVE'
    | 'AGREEMENT_PENDING'
    | 'AWAITING_BUYER_PRICE'
    | 'AWAITING_VENDOR_PRICE_CONFIRMATION'
    | 'AWAITING_VENDOR_COUNTER_PRICE'
    | 'AWAITING_BUYER_COUNTER_CONFIRMATION'
    | 'ENDED';
  endReason?: 'DEAL_COMPLETE' | 'CHANGED_MIND' | string;
  endedBy?: 'BUYER' | 'VENDOR';
  deliveryCode?: string;
  escrowStatus?:
    | 'NONE'
    | 'PENDING_PAYMENT'
    | 'AWAITING_PAYMENT_VERIFICATION'
    | 'FUNDS_HELD_IN_ESCROW'
    | 'DELIVERY_CONFIRMED'
    | 'FUNDS_RELEASED'
    | 'REFUND_REQUESTED';
  cryptoTxHash?: string;
  cryptoNetwork?: 'TRC20' | 'POLYGON' | 'SOLANA';
  cryptoAmountUsdt?: number;
  paymentMethod?: 'BANK_TRANSFER' | 'CRYPTO_USDT' | 'CARD_ONLINE';
  dispatchProofPhotoUrl?: string;
  dispatchProofMediaId?: string;
  courierName?: string;
  trackingNumber?: string;
  driverPhone?: string;
  dispatchNotes?: string;
  dispatchedAt?: string;
  messages: RelayMessage[];
  agreementDetails?: {
    item: string;
    agreedPrice: string;
    terms?: string;
    detectedAt: string;
  };
  paymentOptionChosen?: 'SAFEPAY' | 'DIRECT';
  vendorCoversBuyerFee?: boolean;
  paymentReference?: string;
  checkoutUrl?: string;
  virtualAccountNumber?: string;
  virtualBankName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppSearchState {
  lastQuery?: string;
  cleanProduct?: string;
  location?: string;
  category?: string;
  allMatchingListings?: any[];
  outOfAreaListings?: any[];
  isShowingOutOfArea?: boolean;
  pageIndex: number;
  updatedAt: string;
}

export interface WhatsAppSafePayDraft {
  step?: 'AWAITING_DETAILS' | 'AWAITING_CONFIRMATION';
  initiatorRole?: 'VENDOR' | 'BUYER';
  item?: string;
  amountNaira?: number;
  counterpartyPhone?: string;
  counterpartyName?: string;
  vendorCoversBuyerFee?: boolean;
}

export interface WhatsAppPausedSession {
  state: WhatsAppUserSessionState['state'];
  searchState?: WhatsAppSearchState;
  regDraft?: WhatsAppVendorRegDraft;
  claimDraft?: WhatsAppClaimDraft;
  reportDraft?: WhatsAppReportDraft;
  vendorAddDraft?: WhatsAppVendorAddDraft;
  vendorEditDraft?: WhatsAppVendorEditDraft;
  vendorBankDraft?: WhatsAppVendorBankDraft;
  vendorKycDraft?: WhatsAppVendorKycDraft;
  activeVendorId?: string;
  activeVendorName?: string;
  activeVendorPhone?: string;
  activeItem?: string;
  orderVolume?: 'Retail' | 'Wholesale';
  fulfillment?: 'Shop Visit' | 'Local City Delivery' | 'Interstate Waybill';
  buyerLocation?: string;
  pausedAt: string;
  description: string;
}

export interface WhatsAppSelectedVendorContext {
  id: string;
  name: string;
  phone: string;
  item: string;
  price?: string;
  location?: string;
  selectedAt: string;
}

export interface WhatsAppUserSessionState {
  state:
    | 'IDLE'
    | 'RELAY_CHAT'
    | 'AWAITING_END_CHAT_REASON'
    | 'AWAITING_DELIVERY_CODE'
    | 'AWAITING_REFUND_REASON'
    | 'AWAITING_ROLE_SELECTION'
    | 'AWAITING_PRIMARY_LOCATION'
    | 'AWAITING_LOCATION_CONFIRMATION'
    | 'AWAITING_LOCATION_CHANGE'
    | 'AWAITING_SAVE_CONTACT'
    | 'REG_STEP_1_FULL_NAME'
    | 'REG_STEP_1_BIZ_NAME'
    | 'REG_STEP_2_BIZ_NAME'
    | 'REG_STEP_2_CATEGORY'
    | 'REG_STEP_3_LOCATION'
    | 'REG_STEP_4_PRODUCT'
    | 'QUALIFYING_VOLUME'
    | 'QUALIFYING_FULFILLMENT'
    | 'QUALIFYING_LOCATION'
    | 'REG_ONBOARDING'
    | 'AWAITING_SINGLE_MSG_REGISTRATION'
    | 'CLAIM_PROCESS'
    | 'REPORT_PROCESS'
    | 'VENDOR_PORTAL'
    | 'VENDOR_ADD_PRODUCT'
    | 'VENDOR_ADD_PRODUCT_LINK_SENT'
    | 'VENDOR_ADD_PRODUCT_NAME'
    | 'VENDOR_ADD_PRODUCT_SINGLE_MSG'
    | 'VENDOR_ADD_PRODUCT_PHOTO'
    | 'VENDOR_ADD_PRODUCT_AWAITING_PRICE'
    | 'VENDOR_ADD_PRODUCT_AWAITING_DESC'
    | 'ADMIN_AWAITING_REGISTRATION_REJECTION_REASON'
    | 'VENDOR_EDIT_PRODUCTS'
    | 'VENDOR_SET_BANK'
    | 'VENDOR_KYC'
    | 'VENDOR_DELETE_CONFIRM'
    | 'VENDOR_TOPUP_CUSTOM'
    | 'AWAITING_VENDOR_FEE_DECISION'
    | 'AWAITING_DISPATCH_PROOF'
    | 'AWAITING_VISUAL_SEARCH_CONFIRMATION'
    | 'SAFEPAY_AWAITING_PAYMENT_METHOD'
    | 'SAFEPAY_CREATING'
    | 'QUALIFYING_BUDGET'
    | 'QUALIFYING_NEEDS'
    | 'AWAITING_QUALIFIED_REVEAL'
    | 'WA_VERIF_STEP_1_NAME'
    | 'WA_VERIF_STEP_1_BIZ'
    | 'WA_VERIF_STEP_2_NIN'
    | 'WA_VERIF_STEP_3_VIDEO'
    | 'WA_VERIF_STEP_4_BANK'
    | 'WA_VERIF_STEP_5_LOCATION'
    | 'WA_VERIF_STEP_6_PRODUCTS';
  activeRelayId?: string;
  activeVendorId?: string;
  activeVendorName?: string;
  activeVendorPhone?: string;
  activeBuyerPhone?: string;
  activeItem?: string;
  lastSelectedVendor?: WhatsAppSelectedVendorContext;
  pausedSession?: WhatsAppPausedSession;
  pendingSafePayRelayId?: string;
  pendingEndChatRelayId?: string;
  pendingEscrowOrderId?: string;
  pendingAdminReviewMerchantId?: string;
  orderVolume?: 'Retail' | 'Wholesale';
  fulfillment?: 'Shop Visit' | 'Local City Delivery' | 'Interstate Waybill';
  buyerLocation?: string;
  searchState?: WhatsAppSearchState;
  pendingVisualSearch?: {
    identifiedProduct: string;
    category: string;
    details?: string;
    ocrText?: string;
    visualTags?: string[];
    photoUrl?: string;
    timestamp: number;
  };
  pendingCatalogProduct?: {
    productName: string;
    category?: string;
    price?: string;
    numericPrice?: number;
    description?: string;
    visualTags?: string[];
    ocrText?: string;
    photoUrl?: string;
    mediaId?: string;
    timestamp?: number;
  };
  regDraft?: WhatsAppVendorRegDraft;
  claimDraft?: WhatsAppClaimDraft;
  reportDraft?: WhatsAppReportDraft;
  vendorAddDraft?: WhatsAppVendorAddDraft;
  vendorEditDraft?: WhatsAppVendorEditDraft;
  vendorBankDraft?: WhatsAppVendorBankDraft;
  vendorKycDraft?: WhatsAppVendorKycDraft;
  safepayDraft?: WhatsAppSafePayDraft;
  leadQualificationDraft?: WhatsAppLeadQualificationDraft;
  dispatchDraft?: WhatsAppDispatchProofDraft;
  pendingTopupRef?: string;
  pendingTopupAmount?: number;
  pendingTopupCredits?: number;
  hasReceivedContactCard?: boolean;
  hasSeenSaveTip?: boolean;
  referredBy?: string;
  referralCode?: string;
  pendingInitialText?: string;
  pendingLocationConfirmation?: {
    suggestedLocation: string;
    originalInput: string;
    pendingAction?: string;
  };
  pendingIntent?: {
    action: 'REGISTER_VENDOR' | 'CONNECT_VENDOR' | 'SEARCH' | 'GREETING';
    payload?: any;
  };
  updatedAt: string;
}

import { redisClient } from './redisService.js';

// In-memory active sessions store for ultra-fast conversational state routing
const waSessions = new Map<string, WhatsAppUserSessionState>();

// In-memory active relay sessions store
const activeRelaySessions = new Map<string, RelaySession>();
const phoneToRelayIdMap = new Map<string, string>();
// Maps vendor phone -> Set of active relay IDs (for multi-buyer handling)
const vendorActiveRelayIdsMap = new Map<string, Set<string>>();

export function getVendorActiveRelays(vendorPhone: string): RelaySession[] {
  const cleanVendor = vendorPhone.replace(/\D/g, '');
  const idSet = vendorActiveRelayIdsMap.get(cleanVendor);
  if (!idSet || idSet.size === 0) return [];
  const list: RelaySession[] = [];
  for (const id of idSet) {
    const session = activeRelaySessions.get(id);
    if (session && session.status !== 'ENDED') {
      list.push(session);
    } else {
      idSet.delete(id);
    }
  }
  return list;
}

export function getRelaySessionById(id: string): RelaySession | null {
  return activeRelaySessions.get(id) || null;
}

export function setActiveVendorThread(vendorPhone: string, relayId: string): boolean {
  const cleanVendor = vendorPhone.replace(/\D/g, '');
  const session = activeRelaySessions.get(relayId);
  if (!session || session.status === 'ENDED') return false;
  phoneToRelayIdMap.set(cleanVendor, relayId);
  return true;
}

export function getActiveRelaySession(phone: string): RelaySession | null {
  const clean = phone.replace(/\D/g, '');
  const relayId = phoneToRelayIdMap.get(clean);
  if (!relayId) {
    // If not found in direct map, check if this is a vendor with active relays
    const vendorRelays = getVendorActiveRelays(clean);
    if (vendorRelays.length > 0) {
      // Focus on the most recently updated active relay
      const latest = vendorRelays.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      phoneToRelayIdMap.set(clean, latest.id);
      return latest;
    }
    return null;
  }
  const session = activeRelaySessions.get(relayId);
  if (!session || session.status === 'ENDED') {
    phoneToRelayIdMap.delete(clean);
    const vendorRelays = getVendorActiveRelays(clean);
    if (vendorRelays.length > 0) {
      const latest = vendorRelays.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];
      phoneToRelayIdMap.set(clean, latest.id);
      return latest;
    }
    return null;
  }
  return session;
}

export function saveRelaySession(session: RelaySession): void {
  activeRelaySessions.set(session.id, session);
  const cleanBuyer = session.buyerPhone.replace(/\D/g, '');
  const cleanVendor = session.vendorPhone.replace(/\D/g, '');
  if (session.status !== 'ENDED') {
    phoneToRelayIdMap.set(cleanBuyer, session.id);
    phoneToRelayIdMap.set(cleanVendor, session.id);

    if (!vendorActiveRelayIdsMap.has(cleanVendor)) {
      vendorActiveRelayIdsMap.set(cleanVendor, new Set<string>());
    }
    vendorActiveRelayIdsMap.get(cleanVendor)!.add(session.id);

    // Background async cache in Redis if active
    if (redisClient.isAvailable()) {
      redisClient.set(`relay:${session.id}`, session, 86400).catch(() => {});
      redisClient.set(`phone_relay:${cleanBuyer}`, session.id, 86400).catch(() => {});
      redisClient.set(`phone_relay:${cleanVendor}`, session.id, 86400).catch(() => {});
    }
  } else {
    phoneToRelayIdMap.delete(cleanBuyer);
    if (phoneToRelayIdMap.get(cleanVendor) === session.id) {
      phoneToRelayIdMap.delete(cleanVendor);
    }
    const vSet = vendorActiveRelayIdsMap.get(cleanVendor);
    if (vSet) {
      vSet.delete(session.id);
      if (vSet.size === 0) {
        vendorActiveRelayIdsMap.delete(cleanVendor);
      } else {
        // Point vendor active map to next available active session
        const nextId = Array.from(vSet)[0];
        phoneToRelayIdMap.set(cleanVendor, nextId);
      }
    }
    if (redisClient.isAvailable()) {
      redisClient.del(`phone_relay:${cleanBuyer}`).catch(() => {});
      redisClient.del(`phone_relay:${cleanVendor}`).catch(() => {});
      redisClient.set(`relay:${session.id}`, session, 1800).catch(() => {});
    }
  }
}

export function endRelaySession(sessionId: string): RelaySession | null {
  const session = activeRelaySessions.get(sessionId);
  if (!session) return null;
  session.status = 'ENDED';
  session.updatedAt = new Date().toISOString();
  saveRelaySession(session);
  return session;
}

export function getWhatsAppSession(phone: string): WhatsAppUserSessionState {
  const clean = phone.replace(/\D/g, '');
  if (!waSessions.has(clean)) {
    waSessions.set(clean, {
      state: 'IDLE',
      hasSeenSaveTip: false,
      updatedAt: new Date().toISOString(),
    });
  }
  return waSessions.get(clean)!;
}

export function updateWhatsAppSession(
  phone: string,
  update: Partial<WhatsAppUserSessionState>
): WhatsAppUserSessionState {
  const clean = phone.replace(/\D/g, '');
  const current = getWhatsAppSession(clean);
  const updated: WhatsAppUserSessionState = {
    ...current,
    ...update,
    updatedAt: new Date().toISOString(),
  };
  waSessions.set(clean, updated);
  // Async cache in Redis if connected
  if (redisClient.isAvailable()) {
    redisClient.set(`wa_session:${clean}`, updated, 86400).catch(() => {});
  }
  return updated;
}

export function resetWhatsAppSession(phone: string): void {
  const clean = phone.replace(/\D/g, '');
  const prev = waSessions.get(clean);
  waSessions.set(clean, {
    state: 'IDLE',
    hasSeenSaveTip: prev?.hasSeenSaveTip ?? false,
    lastSelectedVendor: prev?.lastSelectedVendor,
    pausedSession: prev?.pausedSession,
    updatedAt: new Date().toISOString(),
  });
  if (redisClient.isAvailable()) {
    redisClient.set(`wa_session:${clean}`, waSessions.get(clean), 86400).catch(() => {});
  }
}

export function pauseCurrentWhatsAppSession(phone: string, description?: string): WhatsAppPausedSession | null {
  const clean = phone.replace(/\D/g, '');
  const current = getWhatsAppSession(clean);
  
  // If user is IDLE with no search results or ongoing flow, no need to pause
  const hasSubstantialState =
    current.state !== 'IDLE' ||
    (current.searchState && (current.searchState.allMatchingListings?.length || 0) > 0) ||
    current.regDraft ||
    current.claimDraft ||
    current.reportDraft ||
    current.vendorAddDraft ||
    current.vendorEditDraft ||
    current.vendorBankDraft;

  if (!hasSubstantialState) {
    return null;
  }

  let desc = description;
  if (!desc) {
    if (current.searchState?.cleanProduct || current.searchState?.lastQuery) {
      desc = `Search for "${current.searchState.cleanProduct || current.searchState.lastQuery}"`;
    } else if (current.state.startsWith('REG_') || current.regDraft) {
      desc = `Store Registration`;
    } else if (current.state === 'REPORT_PROCESS' || current.reportDraft) {
      desc = `Vendor Report`;
    } else if (current.state === 'CLAIM_PROCESS' || current.claimDraft) {
      desc = `Store Claim`;
    } else if (current.state.startsWith('VENDOR_') || current.vendorAddDraft) {
      desc = `Vendor Portal Action`;
    } else {
      desc = `Previous Session`;
    }
  }

  const paused: WhatsAppPausedSession = {
    state: current.state,
    searchState: current.searchState ? { ...current.searchState } : undefined,
    regDraft: current.regDraft ? { ...current.regDraft } : undefined,
    claimDraft: current.claimDraft ? { ...current.claimDraft } : undefined,
    reportDraft: current.reportDraft ? { ...current.reportDraft } : undefined,
    vendorAddDraft: current.vendorAddDraft ? { ...current.vendorAddDraft } : undefined,
    vendorEditDraft: current.vendorEditDraft ? { ...current.vendorEditDraft } : undefined,
    vendorBankDraft: current.vendorBankDraft ? { ...current.vendorBankDraft } : undefined,
    activeVendorId: current.activeVendorId,
    activeVendorName: current.activeVendorName,
    activeVendorPhone: current.activeVendorPhone,
    activeItem: current.activeItem,
    orderVolume: current.orderVolume,
    fulfillment: current.fulfillment,
    buyerLocation: current.buyerLocation,
    pausedAt: new Date().toISOString(),
    description: desc,
  };

  updateWhatsAppSession(clean, {
    pausedSession: paused,
  });

  return paused;
}

export function resumePausedWhatsAppSession(phone: string): WhatsAppUserSessionState | null {
  const clean = phone.replace(/\D/g, '');
  const current = getWhatsAppSession(clean);
  if (!current.pausedSession) return null;

  const paused = current.pausedSession;
  const restored = updateWhatsAppSession(clean, {
    state: paused.state,
    searchState: paused.searchState,
    regDraft: paused.regDraft,
    claimDraft: paused.claimDraft,
    reportDraft: paused.reportDraft,
    vendorAddDraft: paused.vendorAddDraft,
    vendorEditDraft: paused.vendorEditDraft,
    vendorBankDraft: paused.vendorBankDraft,
    activeVendorId: paused.activeVendorId,
    activeVendorName: paused.activeVendorName,
    activeVendorPhone: paused.activeVendorPhone,
    activeItem: paused.activeItem,
    orderVolume: paused.orderVolume,
    fulfillment: paused.fulfillment,
    buyerLocation: paused.buyerLocation,
    pausedSession: undefined,
  });

  return restored;
}

export function clearPausedSession(phone: string): void {
  const clean = phone.replace(/\D/g, '');
  updateWhatsAppSession(clean, {
    pausedSession: undefined,
  });
}

/**
 * Storage & Memory Quota Optimizer: Prunes stale inactive sessions from RAM
 * Supports 20,000+ users comfortably within standard container limits.
 */
export function pruneStaleSessions(): { prunedUserSessions: number; prunedRelays: number } {
  const now = Date.now();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  const THIRTY_MIN_MS = 30 * 60 * 1000;

  let prunedUserSessions = 0;
  let prunedRelays = 0;

  // 1. Prune idle user sessions older than 24 hours
  for (const [phone, sess] of waSessions.entries()) {
    if (sess.state === 'IDLE' && sess.updatedAt) {
      const age = now - new Date(sess.updatedAt).getTime();
      if (age > ONE_DAY_MS) {
        waSessions.delete(phone);
        prunedUserSessions++;
      }
    }
  }

  // 2. Prune ended relay sessions older than 30 minutes
  for (const [id, relay] of activeRelaySessions.entries()) {
    if (relay.status === 'ENDED' && relay.updatedAt) {
      const age = now - new Date(relay.updatedAt).getTime();
      if (age > THIRTY_MIN_MS) {
        activeRelaySessions.delete(id);
        const cleanBuyer = relay.buyerPhone.replace(/\D/g, '');
        const cleanVendor = relay.vendorPhone.replace(/\D/g, '');
        phoneToRelayIdMap.delete(cleanBuyer);
        phoneToRelayIdMap.delete(cleanVendor);
        prunedRelays++;
      }
    }
  }

  if (prunedUserSessions > 0 || prunedRelays > 0) {
    console.log(`[StorageOptimizer] Pruned ${prunedUserSessions} stale sessions and ${prunedRelays} ended relays.`);
  }

  return { prunedUserSessions, prunedRelays };
}

