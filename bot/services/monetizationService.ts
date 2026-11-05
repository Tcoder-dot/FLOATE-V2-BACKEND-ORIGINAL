/**
 * FLOATE Monetization & Flutterwave Tier Service
 * Handles:
 * 1. Launch Pricing (Valid until 20 Nov 2026) vs Standard Pricing:
 *    - Basic Verification: Free
 *    - Verified Plus: ₦5,000 / year (Standard: ₦7,500)
 *    - Product Boost (Single): ₦1,000 / wk (Standard: ₦1,500)
 *    - 5-Boost Bundle: ₦4,000 (Standard: ₦6,000)
 *    - Sponsored Spot: ₦10,000 / wk (Standard: ₦15,000)
 *    - Brand Spot: ₦75,000 / wk (Standard: ₦150,000)
 * 2. Flutterwave Checkout & Bank Transfer generation
 * 3. Verified Plus Certificate generation & WhatsApp celebration delivery
 * 4. Product Boost activation & search spotlighting
 * 5. Retention of 1-to-1 lead inquiry tracking
 */

import { flutterwaveService } from './flutterwaveService.js';
import { firestoreDb } from './firestoreService.js';
import { normalizePhone } from './sheetsService.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { config } from '../config.js';
import { getPublicSiteUrl, buildMerchantProfileUrl, buildCertificateDownloadUrl } from '../../config/siteUrls.js';

export const LAUNCH_DEADLINE_ISO = '2026-11-20T23:59:59.999Z';

export interface PricingTier {
  id: string;
  name: string;
  category: 'VERIFICATION' | 'BOOST' | 'SPONSORSHIP' | 'BRAND' | 'CREDITS';
  launchPriceNgn: number;
  standardPriceNgn: number;
  currentPriceNgn: number;
  billingCycle: 'ONE_TIME' | 'YEARLY' | 'MONTHLY' | 'WEEKLY' | 'PAYG';
  badgeTitle?: string;
  description: string;
  features: string[];
  isLaunchDiscountActive: boolean;
  savingsNgn: number;
  spotsLimit?: number;
}

export function isLaunchPricingActive(): boolean {
  return Date.now() <= new Date(LAUNCH_DEADLINE_ISO).getTime();
}

export const MONETIZATION_TIERS: Omit<PricingTier, 'currentPriceNgn' | 'isLaunchDiscountActive' | 'savingsNgn'>[] = [
  {
    id: 'BASIC_VERIFICATION',
    name: 'Basic Verification',
    category: 'VERIFICATION',
    launchPriceNgn: 0,
    standardPriceNgn: 0,
    billingCycle: 'ONE_TIME',
    badgeTitle: '✓ Verified Merchant',
    description: 'Trust is the hook. Free visual verification for every merchant.',
    features: [
      'Visual KYC badge on storefront',
      'Listed in public search directory',
      'Direct WhatsApp buyer inquiries',
      'Free store catalog',
    ],
  },
  {
    id: 'VERIFIED_PLUS',
    name: 'Verified Plus (Founding Merchant)',
    category: 'VERIFICATION',
    launchPriceNgn: 5000,
    standardPriceNgn: 7500,
    billingCycle: 'MONTHLY',
    badgeTitle: '⭐ Verified Plus',
    description: 'Founding Merchant price: ₦5,000 per month. Cancel anytime.',
    features: [
      'Official Certificate of Verification & Trust',
      'Shareable Verified Profile (floate.xyz/certificate)',
      'Search Match Priority (+25 ranking boost)',
      '3 Free Product Boosts included per month',
      'Gold Verified Plus trust badge on WhatsApp & Web',
      'Direct buyer lead analytics dashboard',
    ],
  },
  {
    id: 'PRODUCT_BOOST_SINGLE',
    name: 'Product Boost (1 Product / 1 Week)',
    category: 'BOOST',
    launchPriceNgn: 1000,
    standardPriceNgn: 1500,
    billingCycle: 'WEEKLY',
    badgeTitle: '🚀 Boosted',
    description: 'About the cost of airtime. Pin any product to top search results for 7 days.',
    features: [
      'Pins product to top of category search',
      'Spotlight badge on product card',
      '7 days high-intent buyer exposure',
      'Instant activation',
    ],
  },
  {
    id: 'PRODUCT_BOOST_BUNDLE_5',
    name: '5-Boost Bundle Pack',
    category: 'BOOST',
    launchPriceNgn: 4000,
    standardPriceNgn: 6000,
    billingCycle: 'ONE_TIME',
    badgeTitle: '⚡ 5 Boosts',
    description: 'Save ₦1,000 on launch pricing. 5 boosts to use across any product catalog items.',
    features: [
      '5 Product Boost credits (₦800 per boost)',
      'Use anytime on any catalog products',
      'Credits never expire',
      'Priority spotlight placement',
    ],
  },
  {
    id: 'SPONSORED_SPOT',
    name: 'Category Sponsored Spot',
    category: 'SPONSORSHIP',
    launchPriceNgn: 10000,
    standardPriceNgn: 15000,
    billingCycle: 'WEEKLY',
    badgeTitle: '👑 Featured Store',
    description: 'Per category, per city, per week. Only 1–2 slots each. 1 extra sale covers cost.',
    features: [
      'Exclusive: Maximum 2 slots per category/city',
      'Pinned to top header of category results',
      'Direct link to your WhatsApp storefront',
      '7 days guaranteed placement',
    ],
    spotsLimit: 2,
  },
  {
    id: 'BRAND_SPOT',
    name: 'Brand Spot (FMCG & Corporate)',
    category: 'BRAND',
    launchPriceNgn: 75000,
    standardPriceNgn: 150000,
    billingCycle: 'WEEKLY',
    badgeTitle: '🌟 Brand Sponsor',
    description: 'For distributors, FMCG brands and fintech partners (Moniepoint, PalmPay, EasyBuy).',
    features: [
      'High-visibility hero banner on floate.xyz',
      'Search console sponsor banner',
      'Full click and impression telemetry',
      'Direct corporate partner badge',
    ],
  },
];

export class MonetizationService {
  /**
   * Get all active pricing tiers with dynamic launch discounts calculated
   */
  public getPricingTiers(): {
    isLaunchPeriod: boolean;
    launchDeadline: string;
    tiers: PricingTier[];
    growthGoal: {
      targetGmvNgn: number;
      targetUsd: number;
      deadline: string;
      verifiedPlusTarget: number;
      boostsTarget: number;
      sponsoredTarget: number;
      brandTarget: number;
    };
  } {
    const launchActive = isLaunchPricingActive();

    const tiers: PricingTier[] = MONETIZATION_TIERS.map((tier) => {
      const currentPriceNgn = launchActive ? tier.launchPriceNgn : tier.standardPriceNgn;
      const savingsNgn = tier.standardPriceNgn - currentPriceNgn;
      return {
        ...tier,
        currentPriceNgn,
        isLaunchDiscountActive: launchActive && savingsNgn > 0,
        savingsNgn: Math.max(0, savingsNgn),
      };
    });

    return {
      isLaunchPeriod: launchActive,
      launchDeadline: LAUNCH_DEADLINE_ISO,
      tiers,
      growthGoal: {
        targetGmvNgn: 1425000,
        targetUsd: 1048,
        deadline: '2026-11-20',
        verifiedPlusTarget: 160,
        boostsTarget: 200,
        sponsoredTarget: 20,
        brandTarget: 3,
      },
    };
  }

  /**
   * Get specific tier by ID
   */
  public getTierById(tierId: string): PricingTier | null {
    const all = this.getPricingTiers();
    return all.tiers.find((t) => t.id === tierId) || null;
  }

  /**
   * Initiates a Flutterwave checkout for any monetization tier
   */
  public async initiateTierCheckout(params: {
    merchantPhone: string;
    packageId: string;
    customerName?: string;
    customerEmail?: string;
    productId?: string;
    productTitle?: string;
    category?: string;
    city?: string;
    redirectUrl?: string;
  }): Promise<{
    success: boolean;
    checkoutUrl: string;
    txRef: string;
    amount: number;
    packageName: string;
    error?: string;
  }> {
    const cleanPhone = normalizePhone(params.merchantPhone);
    const digitsOnly = cleanPhone.replace(/\D/g, '');
    const canonicalPhone = digitsOnly.startsWith('234') ? digitsOnly : `234${digitsOnly.replace(/^0/, '')}`;

    if (params.packageId === 'LEAD_CREDITS_10' || params.packageId?.startsWith('LEAD_CREDITS')) {
      throw new Error('LEAD_CREDITS_10 package is deprecated. Inquiries on Floate are now 100% unmetered and free for registered vendors.');
    }

    const tier = this.getTierById(params.packageId);
    if (!tier) {
      throw new Error(`Invalid package ID: ${params.packageId}`);
    }

    if (tier.currentPriceNgn === 0) {
      // Free basic verification
      await firestoreDb.updateMerchantKyc({
        merchantIdOrPhone: canonicalPhone,
        tier: 'TIER_1',
      });
      return {
        success: true,
        checkoutUrl: `${buildMerchantProfileUrl(canonicalPhone)}?verified=free`,
        txRef: `free_verif_${canonicalPhone}`,
        amount: 0,
        packageName: tier.name,
      };
    }

    const txRef = `FLW_${tier.id.substring(0, 4)}_${canonicalPhone}_${Date.now()}`;
    const amount = tier.currentPriceNgn;
    const merchant = await firestoreDb.getMerchant(canonicalPhone);
    const customerName = params.customerName || merchant?.ownerFullName || merchant?.businessName || 'Floate Merchant';
    const customerEmail = params.customerEmail || `merchant_${canonicalPhone}@floate.xyz`;

    // Generate Flutterwave Hosted Checkout Link
    const paymentRes = await flutterwaveService.createPaymentLink({
      txRef,
      amount,
      customerPhone: canonicalPhone,
      customerName,
      customerEmail,
      title: `Floate • ${tier.name}`,
      description: `${tier.name} for ${merchant?.businessName || canonicalPhone}`,
      redirectUrl: params.redirectUrl || `${getPublicSiteUrl()}/checkout/callback?ref=${txRef}`,
      meta: {
        packageId: tier.id,
        merchantPhone: canonicalPhone,
        productId: params.productId || '',
        productTitle: params.productTitle || '',
        category: params.category || merchant?.category || '',
        city: params.city || merchant?.city || 'Nigeria',
      },
    });

    return {
      success: true,
      checkoutUrl: paymentRes.paymentLink,
      txRef,
      amount,
      packageName: tier.name,
    };
  }

  /**
   * Fulfills paid monetization packages upon verified Flutterwave webhook
   */
  public async handleSuccessfulPaymentFulfillment(params: {
    txRef: string;
    amountPaid: number;
    merchantPhone: string;
    packageId?: string;
    meta?: Record<string, any>;
  }): Promise<{ success: boolean; packageActivated: string; message: string }> {
    const { txRef, amountPaid, meta } = params;
    const cleanPhone = normalizePhone(params.merchantPhone).replace(/\D/g, '');
    const canonicalPhone = cleanPhone.startsWith('234') ? cleanPhone : `234${cleanPhone.replace(/^0/, '')}`;

    // Determine package ID from meta or txRef
    let packageId = params.packageId || meta?.packageId;
    if (!packageId) {
      if (txRef.includes('_VERI_') || txRef.includes('_VERIFIED')) packageId = 'VERIFIED_PLUS';
      else if (txRef.includes('_PROD_') || txRef.includes('_BOOS')) packageId = 'PRODUCT_BOOST_SINGLE';
      else if (txRef.includes('_5-BO') || txRef.includes('_BUND')) packageId = 'PRODUCT_BOOST_BUNDLE_5';
      else if (txRef.includes('_SPON_')) packageId = 'SPONSORED_SPOT';
      else if (txRef.includes('_BRAN_')) packageId = 'BRAND_SPOT';
      else if (amountPaid >= 5000 && amountPaid < 10000) packageId = 'VERIFIED_PLUS';
      else if (amountPaid === 1000) packageId = 'PRODUCT_BOOST_SINGLE';
      else if (amountPaid === 4000) packageId = 'PRODUCT_BOOST_BUNDLE_5';
      else if (amountPaid === 10000) packageId = 'SPONSORED_SPOT';
      else if (amountPaid >= 75000) packageId = 'BRAND_SPOT';
      else packageId = 'VERIFIED_PLUS';
    }

    const merchant = await firestoreDb.getMerchant(canonicalPhone);
    const bizName = merchant?.businessName || 'Verified Merchant';
    const now = new Date();
    const nowIso = now.toISOString();

    console.log(`[Monetization Fulfillment] 💰 Fulfilling ${packageId} for ${canonicalPhone} (₦${amountPaid.toLocaleString()})`);

    // 1. VERIFIED PLUS FULFILLMENT
    if (packageId === 'VERIFIED_PLUS') {
      const oneMonthLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const currentBoosts = typeof merchant?.boostCredits === 'number' ? merchant.boostCredits : 0;
      const certificateId = `CERT-FLT-${canonicalPhone.slice(-6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      const certificateUrl = buildCertificateDownloadUrl(canonicalPhone);

      if (merchant) {
        await firestoreDb.saveMerchant({
          ...merchant,
          isVerified: true,
          isVerifiedPlus: true,
          kycTier: 'VERIFIED_PLUS' as any,
          verifiedStatus: 'YES',
          verifiedPlusExpiresAt: oneMonthLater,
          boostCredits: currentBoosts + 3, // 3 Free Boosts included
          certificateId,
          certificateUrl,
          certificateIssuedAt: nowIso,
          updatedAt: nowIso,
        });
      }

      // Send celebratory WhatsApp confirmation with digital certificate and one-tap download assets
      const badgeDownloadUrl = `/api/credentials/${certificateId}/download/badge`;
      const certDownloadUrl = `/api/credentials/${certificateId}/download/certificate`;
      const flyerDownloadUrl = `/api/credentials/${certificateId}/download/flyer`;

      // 1. Send Badge Card Image directly into chat
      await sendWhatsAppMessage(canonicalPhone, '', {
        image: {
          url: badgeDownloadUrl,
          caption: `🛡️ Floate Verified Plus Badge Card (${certificateId})\n${bizName}`,
        },
      }).catch((e) => console.warn('[Verified Plus Badge Notice]:', e));

      // 2. Send Master Certificate as Document (crisp uncompressed file)
      await sendWhatsAppMessage(canonicalPhone, '', {
        document: {
          url: certDownloadUrl,
          filename: `Floate-Certificate-${certificateId}.png`,
          caption: `📜 Official Verified Plus Certificate (${certificateId})`,
        },
      }).catch((e) => console.warn('[Verified Plus Cert Notice]:', e));

      const certMsg =
        `🎉 *CONGRATULATIONS FROM FLOATE!* 🛡️\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Payment of *₦${amountPaid.toLocaleString()}* confirmed.\n\n` +
        `Your store *${bizName}* is now officially upgraded to:\n` +
        `⭐ *FLOATE VERIFIED PLUS (FOUNDING MERCHANT)*\n\n` +
        `🎁 *Your Unlocked Founding Privileges:*\n` +
        `• 🏆 Official Certificate & Badge Card Sent Above\n` +
        `• ⚡ Match Priority: +25 ranking boost on buyer searches\n` +
        `• 🚀 3 Free Product Boosts added to your wallet (Current: ${currentBoosts + 3} boosts)\n` +
        `• 🔗 Shareable Verified Profile Link:\n${certificateUrl}\n\n` +
        `📲 *Download High-Res Assets (Tap to Save):*\n` +
        `• 🛡️ Badge Card: ${badgeDownloadUrl}\n` +
        `• 📜 Certificate: ${certDownloadUrl}\n` +
        `• 🏷️ A5 Flyer: ${flyerDownloadUrl}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Display your certificate on your WhatsApp Status with pride!`;

      await sendWhatsAppMessage(canonicalPhone, certMsg, {
        quickReplies: [
          { id: 'btn_download_badge', title: '📥 Get My Badge' },
          { id: 'btn_my_store', title: '🏪 My Web Store' },
          { id: 'btn_boost_product', title: '🚀 Use Free Boost' },
        ],
      }).catch((e) => console.warn('[Monetization WhatsApp Notice]:', e));

      return {
        success: true,
        packageActivated: 'VERIFIED_PLUS',
        message: `Verified Plus membership activated for ${canonicalPhone} until ${oneMonthLater.split('T')[0]}`,
      };
    }

    // 2. PRODUCT BOOST SINGLE FULFILLMENT
    if (packageId === 'PRODUCT_BOOST_SINGLE') {
      const productId = meta?.productId;
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

      if (productId) {
        await firestoreDb.updateProduct(productId, {
          isBoosted: true,
          boostedUntil: oneWeekLater,
        } as any);
      } else if (merchant) {
        const curBoosts = typeof merchant.boostCredits === 'number' ? merchant.boostCredits : 0;
        await firestoreDb.saveMerchant({
          ...merchant,
          boostCredits: curBoosts + 1,
          updatedAt: nowIso,
        });
      }

      const boostMsg =
        `🚀 *PRODUCT BOOST ACTIVATED!* ⚡\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Payment of *₦${amountPaid.toLocaleString()}* confirmed.\n\n` +
        (meta?.productTitle ? `Product: *${meta.productTitle}*\n` : '') +
        `Your item is now pinned to the top of category search results for the next 7 days!\n\n` +
        `Watch your WhatsApp for new customer inquiries.`;

      await sendWhatsAppMessage(canonicalPhone, boostMsg).catch(() => {});

      return {
        success: true,
        packageActivated: 'PRODUCT_BOOST_SINGLE',
        message: `Product boost activated for 7 days`,
      };
    }

    // 3. 5-BOOST BUNDLE FULFILLMENT
    if (packageId === 'PRODUCT_BOOST_BUNDLE_5') {
      const curBoosts = typeof merchant?.boostCredits === 'number' ? merchant.boostCredits : 0;
      const newBoosts = curBoosts + 5;

      if (merchant) {
        await firestoreDb.saveMerchant({
          ...merchant,
          boostCredits: newBoosts,
          updatedAt: nowIso,
        });
      }

      const bundleMsg =
        `⚡ *5-BOOST BUNDLE ACTIVATED!* 📦\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Payment of *₦${amountPaid.toLocaleString()}* confirmed.\n\n` +
        `Added *+5 Product Boosts* to your store wallet.\n` +
        `Total Available Boosts: *${newBoosts} Boosts*\n\n` +
        `You can boost any item in your catalog anytime directly from your dashboard!`;

      await sendWhatsAppMessage(canonicalPhone, bundleMsg).catch(() => {});

      return {
        success: true,
        packageActivated: 'PRODUCT_BOOST_BUNDLE_5',
        message: `Added 5 boost credits to merchant ${canonicalPhone}`,
      };
    }

    // 4. SPONSORED SPOT FULFILLMENT
    if (packageId === 'SPONSORED_SPOT') {
      const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const targetCategory = meta?.category || merchant?.category || 'General';
      const targetCity = meta?.city || merchant?.city || 'Nigeria';

      // Save to sponsored spots
      const spotId = `spot_${Date.now().toString(36)}`;
      await firestoreDb.saveAdDoc({
        id: spotId,
        merchantPhone: canonicalPhone,
        merchantName: bizName,
        adType: 'CATEGORY_SPONSOR',
        headline: `⭐ Top Featured ${targetCategory} Store in ${targetCity}`,
        description: `Verified merchant in ${targetCity}. Nationwide delivery & instant WhatsApp response.`,
        targetUrl: buildMerchantProfileUrl(canonicalPhone),
        targetCategory,
        targetLocation: targetCity,
        status: 'ACTIVE',
        impressions: 0,
        clicks: 0,
        budget: amountPaid,
        submittedVia: 'FLW_PAYMENT',
        createdAt: nowIso,
        updatedAt: nowIso,
        approvedAt: nowIso,
      });

      return {
        success: true,
        packageActivated: 'SPONSORED_SPOT',
        message: `Sponsored spot activated for ${bizName} in ${targetCategory} (${targetCity})`,
      };
    }

    // 5. BRAND SPOT FULFILLMENT
    if (packageId === 'BRAND_SPOT') {
      const brandSpotId = `brand_${Date.now().toString(36)}`;
      await firestoreDb.saveAdDoc({
        id: brandSpotId,
        merchantPhone: canonicalPhone,
        merchantName: bizName,
        adType: 'HERO_BANNER',
        headline: meta?.headline || `Official Partner: ${bizName}`,
        description: meta?.description || `High-impact brand placement on FLOATE Africa OS`,
        targetUrl: meta?.targetUrl || buildMerchantProfileUrl(canonicalPhone),
        status: 'ACTIVE',
        impressions: 0,
        clicks: 0,
        budget: amountPaid,
        submittedVia: 'FLW_BRAND_CHECKOUT',
        createdAt: nowIso,
        updatedAt: nowIso,
        approvedAt: nowIso,
      });

      return {
        success: true,
        packageActivated: 'BRAND_SPOT',
        message: `Brand banner spot activated on floate.xyz for ${bizName}`,
      };
    }

    return {
      success: true,
      packageActivated: packageId,
      message: `Processed tier payment for ${canonicalPhone}`,
    };
  }

  /**
   * Generates Digital Certificate data for a Verified Plus Merchant
   */
  public async getMerchantCertificate(merchantPhone: string): Promise<{
    found: boolean;
    certificate?: {
      certificateId: string;
      merchantName: string;
      ownerFullName: string;
      phone: string;
      category: string;
      city: string;
      state: string;
      tier: string;
      badge: string;
      issuedAt: string;
      expiresAt: string;
      isValid: boolean;
      verificationUrl: string;
      qrCodeUrl: string;
    };
    error?: string;
  }> {
    const cleanPhone = normalizePhone(merchantPhone).replace(/\D/g, '');
    const canonical = cleanPhone.startsWith('234') ? cleanPhone : `234${cleanPhone.replace(/^0/, '')}`;
    const merchant = await firestoreDb.getMerchant(canonical);

    if (!merchant) {
      return { found: false, error: 'Merchant not found' };
    }

    const isVerifiedPlus = Boolean(merchant.isVerifiedPlus || merchant.kycTier === ('VERIFIED_PLUS' as any));
    const certId = merchant.certificateId || `CERT-FLT-${canonical.slice(-6).toUpperCase()}`;
    const issuedAt = merchant.certificateIssuedAt || merchant.registeredAt || new Date().toISOString();
    const expiresAt = merchant.verifiedPlusExpiresAt || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const verificationUrl = buildCertificateDownloadUrl(canonical);
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(verificationUrl)}`;

    return {
      found: true,
      certificate: {
        certificateId: certId,
        merchantName: merchant.businessName,
        ownerFullName: merchant.ownerFullName || merchant.businessName,
        phone: merchant.whatsapp || canonical,
        category: merchant.category || 'General Commerce',
        city: merchant.city || 'Nigeria',
        state: merchant.state || 'Lagos',
        tier: isVerifiedPlus ? 'VERIFIED_PLUS_FOUNDING' : 'BASIC_VERIFIED',
        badge: isVerifiedPlus ? '⭐ Verified Plus Merchant' : '✓ Verified Merchant',
        issuedAt,
        expiresAt,
        isValid: true,
        verificationUrl,
        qrCodeUrl,
      },
    };
  }

  /**
   * Boost a specific product from a merchant's available boost credits
   */
  public async boostProductWithCredit(params: {
    merchantPhone: string;
    productId: string;
  }): Promise<{ success: boolean; remainingBoosts: number; message: string }> {
    const cleanPhone = normalizePhone(params.merchantPhone).replace(/\D/g, '');
    const canonical = cleanPhone.startsWith('234') ? cleanPhone : `234${cleanPhone.replace(/^0/, '')}`;
    const merchant = await firestoreDb.getMerchant(canonical);

    if (!merchant) {
      throw new Error('Merchant account not found.');
    }

    const availableBoosts = typeof merchant.boostCredits === 'number' ? merchant.boostCredits : 0;
    if (availableBoosts <= 0) {
      throw new Error('You have 0 boost credits remaining. Please purchase a Product Boost or 5-Boost Bundle.');
    }

    const oneWeekLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await firestoreDb.updateProduct(params.productId, {
      isBoosted: true,
      boostedUntil: oneWeekLater,
    } as any);

    const remaining = availableBoosts - 1;
    await firestoreDb.saveMerchant({
      ...merchant,
      boostCredits: remaining,
      updatedAt: new Date().toISOString(),
    });

    return {
      success: true,
      remainingBoosts: remaining,
      message: `Product boosted successfully for 7 days! You have ${remaining} boost credit(s) remaining.`,
    };
  }
}

export const monetizationService = new MonetizationService();
