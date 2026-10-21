export type UserRole = 'BUSINESS' | 'BUYER' | 'UNSET';

export type RegistrationStep =
  | 'AWAITING_NAME'
  | 'AWAITING_OWNER_NAME'
  | 'AWAITING_WHATSAPP'
  | 'AWAITING_STATE'
  | 'AWAITING_CITY'
  | 'AWAITING_TYPE'
  | 'AWAITING_CATEGORY'
  | 'AWAITING_PRODUCT'
  | 'AWAITING_PRICE'
  | 'AWAITING_NEGOTIABLE'
  | 'AWAITING_SELFIE_VERIFICATION'
  | 'AWAITING_VERIFICATION_NIN_PHOTO'
  | 'AWAITING_VERIFICATION_VIDEO'
  | 'AWAITING_VERIFICATION_BANK'
  | 'AWAITING_PRODUCT_IMAGES'
  | 'AWAITING_CONFIRMATION'
  | 'AWAITING_ADD_PRODUCT_NAME'
  | 'AWAITING_ADD_PRODUCT_TYPE'
  | 'AWAITING_ADD_PRODUCT_PRICE'
  | 'AWAITING_ADD_PRODUCT_NEGOTIABLE'
  | 'AWAITING_ADD_PRODUCT_IMAGES'
  | 'AWAITING_ADD_PRODUCT_CONFIRM'
  | 'AWAITING_EDIT_SELECT_ITEM'
  | 'AWAITING_EDIT_ACTION'
  | 'AWAITING_EDIT_NEW_VALUE'
  | 'AWAITING_UPDATE_WHATSAPP'
  | 'AWAITING_DELETE_BUSINESS_CONFIRM'
  | 'AWAITING_CLAIM_PHONE'
  | 'AWAITING_CLAIM_OWNER_NAME'
  | 'AWAITING_CLAIM_SELFIE'
  | 'AWAITING_EDIT_INVENTORY_DRAFT'
  | 'AWAITING_SUPPORT_REPORT'
  | 'AWAITING_DELIVERY_CONFIRMATION_CODE'
  | 'SAVING'
  | 'NONE';

export interface UserProfile {
  userId: number;
  username: string;
  role: UserRole;
  createdAt: string;
  lastActive: string;
  registrationStep?: RegistrationStep;
  businessName?: string;
  ownerFullName?: string; // Owner's First & Last Name (Protected, saved to DB & Sheet Column M)
  businessWhatsapp?: string;
  businessState?: string;
  businessCity?: string;
  listingType?: string;
  businessCategory?: string;
  firstProduct?: string;
  firstPrice?: string;
  firstNegotiable?: 'Yes' | 'No';
  profileImageUrl?: string;
  verificationMediaUrl?: string;
  identityVerified?: boolean;
  verificationNinUrl?: string;
  verificationNinNumber?: string;
  verificationNinExtractedName?: string;
  verificationVideoUrl?: string;
  verificationVideoCode?: string;
  verificationBankCode?: string;
  verificationBankName?: string;
  verificationAccountNumber?: string;
  verificationResolvedAccountName?: string;
  verificationStatus?: 'PENDING' | 'VERIFIED' | 'FAILED';
  productImages?: string[];
  tempProductImages?: string[];
  claimSelfieUrl?: string;
  tempProduct?: string;
  tempListingType?: string;
  tempPrice?: string;
  tempNegotiable?: 'Yes' | 'No';
  selectedListingId?: string;
  selectedEditAction?: 'NAME' | 'PRICE' | 'DELETE' | 'WHATSAPP';
  referredBy?: string;
  searchState?: {
    lastQuery: string;
    cleanProduct: string;
    location?: string;
    category?: string;
    allMatchingListings: any[];
    outOfAreaListings: any[];
    isShowingOutOfArea: boolean;
    pageIndex: number;
    updatedAt: string;
  };
  pendingTopupRef?: string;
  pendingTopupAmount?: number;
  pendingTopupCredits?: number;
}

class UserStore {
  private profiles: Map<number, UserProfile> = new Map();

  public getProfile(userId: number, defaultUsername: string = 'User'): UserProfile {
    let profile = this.profiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        username: defaultUsername,
        role: 'UNSET',
        createdAt: new Date().toISOString(),
        lastActive: new Date().toISOString(),
        registrationStep: 'NONE',
      };
      this.profiles.set(userId, profile);
      // Attempt asynchronous restoration from Redis cache if available
      this.restoreFromCache(userId);
    } else if (defaultUsername && defaultUsername !== 'User') {
      profile.username = defaultUsername;
    }
    profile.lastActive = new Date().toISOString();
    return profile;
  }

  private async restoreFromCache(userId: number) {
    try {
      const { redisService } = await import('./services/redisService.js');
      if (redisService.isAvailable()) {
        const cached = await redisService.get<UserProfile>(`user_flow:${userId}`);
        if (cached && this.profiles.has(userId)) {
          const current = this.profiles.get(userId)!;
          if (current.registrationStep === 'NONE' && cached.registrationStep && cached.registrationStep !== 'NONE') {
            Object.assign(current, cached);
          }
        }
      }
    } catch {
      // Ignore cache restore errors
    }
  }

  private async persistToCache(userId: number, profile: UserProfile) {
    try {
      const { redisService } = await import('./services/redisService.js');
      if (redisService.isAvailable()) {
        await redisService.set(`user_flow:${userId}`, profile, 86400); // 24hr TTL
      }
    } catch {
      // Ignore cache write errors
    }
  }

  public setFlowState(userId: number, step: RegistrationStep, extraUpdates?: Partial<UserProfile>): UserProfile {
    const profile = this.getProfile(userId);
    profile.registrationStep = step;
    if (extraUpdates) {
      Object.assign(profile, extraUpdates);
    }
    this.profiles.set(userId, profile);
    this.persistToCache(userId, profile);
    return profile;
  }

  public clearFlowState(userId: number): UserProfile {
    const profile = this.getProfile(userId);
    profile.registrationStep = 'NONE';
    profile.tempProduct = '';
    profile.tempListingType = undefined;
    profile.tempPrice = '';
    profile.tempNegotiable = undefined;
    profile.tempProductImages = undefined;
    profile.selectedListingId = undefined;
    profile.selectedEditAction = undefined;
    this.profiles.set(userId, profile);
    this.persistToCache(userId, profile);
    return profile;
  }

  public hasActiveFlow(userId: number): boolean {
    const profile = this.getProfile(userId);
    return Boolean(profile.registrationStep && profile.registrationStep !== 'NONE');
  }

  public setRole(userId: number, role: UserRole, username: string = 'User'): UserProfile {
    const profile = this.getProfile(userId, username);
    profile.role = role;
    if (role === 'BUYER') {
      profile.registrationStep = 'NONE';
      profile.tempProduct = '';
      profile.tempListingType = undefined;
      profile.tempPrice = '';
      profile.selectedListingId = undefined;
      profile.selectedEditAction = undefined;
    }
    this.profiles.set(userId, profile);
    this.persistToCache(userId, profile);
    return profile;
  }

  public updateRegistration(userId: number, updates: Partial<UserProfile>): UserProfile {
    const profile = this.getProfile(userId);
    Object.assign(profile, updates);
    this.profiles.set(userId, profile);
    this.persistToCache(userId, profile);
    return profile;
  }

  public getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }
}

export const userStore = new UserStore();

