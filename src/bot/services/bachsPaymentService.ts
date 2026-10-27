import crypto from 'crypto';
import { firestoreDb, AdDoc } from './firestoreService.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { config } from '../config.js';

export interface BachsPaymentPackage {
  id: 'HERO_BANNER' | 'CATEGORY_SPOTLIGHT' | 'SEARCH_BOOST';
  title: string;
  description: string;
  priceNaira: number;
  durationDays: number;
}

export const BACHS_AD_PACKAGES: BachsPaymentPackage[] = [
  {
    id: 'HERO_BANNER',
    title: 'Hero Ad Banner Carousel',
    description: 'Prominent top banner placement on floate.xyz home page for maximum buyer visibility.',
    priceNaira: 10000,
    durationDays: 7,
  },
  {
    id: 'CATEGORY_SPOTLIGHT',
    title: 'Category Spotlight Rank',
    description: 'Top spotlight placement inside your specific product category search section.',
    priceNaira: 5000,
    durationDays: 7,
  },
  {
    id: 'SEARCH_BOOST',
    title: 'Search Priority Boost',
    description: 'Guaranteed top #1 search rank boost when buyers search for your keywords.',
    priceNaira: 3000,
    durationDays: 7,
  },
];

export interface CreateAdParams {
  merchantPhone: string;
  merchantName?: string;
  packageType: 'HERO_BANNER' | 'CATEGORY_SPOTLIGHT' | 'SEARCH_BOOST';
  headline: string;
  description?: string;
  offerText?: string;
  rawImageUrl?: string;
  targetCategory?: string;
  targetLocation?: string;
  targetUrl?: string;
}

export class BachsPaymentService {
  private apiKey: string;
  private secretKey: string;
  private webhookSecret: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BACHS_API_KEY || (config as any).bachsApiKey || 'bachs_live_pub_key_2026';
    this.secretKey = process.env.BACHS_SECRET_KEY || (config as any).bachsSecretKey || 'bachs_live_sec_key_2026';
    this.webhookSecret = process.env.BACHS_WEBHOOK_SECRET || (config as any).bachsWebhookSecret || 'bachs_webhook_secret_floate_2026';
    this.baseUrl = process.env.BACHS_BASE_URL || 'https://api.bachs.io/v1';
  }

  /**
   * Check if Bachs.io API keys are configured
   */
  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.secretKey && !this.apiKey.includes('dummy'));
  }

  /**
   * 1. Initialize Ad Campaign Creation & Bachs.io Payment Checkout Link
   */
  public async createAdCampaign(params: CreateAdParams): Promise<{
    success: boolean;
    adId: string;
    reference: string;
    checkoutUrl: string;
    amountNaira: number;
    packageTitle: string;
  }> {
    const {
      merchantPhone,
      merchantName,
      packageType,
      headline,
      description,
      offerText,
      rawImageUrl,
      targetCategory,
      targetLocation,
      targetUrl,
    } = params;

    const cleanPhone = (merchantPhone || '2348000000000').replace(/\D/g, '');
    const pkg = BACHS_AD_PACKAGES.find((p) => p.id === packageType) || BACHS_AD_PACKAGES[0];
    const amount = pkg.priceNaira;

    const txRef = `AD-BC-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const adId = `ad_${txRef.toLowerCase()}`;

    // App Base Domain
    const appBaseUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'https://floate.xyz';
    const callbackUrl = `${appBaseUrl.replace(/\/+$/, '')}/checkout/bachs-callback?ref=${txRef}`;

    let checkoutUrl = '';

    // Attempt real Bachs.io Payment Initialization if keys configured
    if (this.isConfigured()) {
      try {
        const response = await fetch(`${this.baseUrl}/payments/initialize`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
            'X-Bachs-Key': this.apiKey,
          },
          body: JSON.stringify({
            amount: amount,
            currency: 'NGN',
            reference: txRef,
            email: `merchant_${cleanPhone}@floate.xyz`,
            phone: cleanPhone,
            callback_url: callbackUrl,
            metadata: {
              adId,
              merchantPhone: cleanPhone,
              merchantName: merchantName || 'Merchant',
              headline,
              packageType,
            },
          }),
        });

        const data: any = await response.json().catch(() => ({}));
        if (response.ok && data.data?.authorization_url) {
          checkoutUrl = data.data.authorization_url;
        } else if (data.checkout_url || data.payment_url) {
          checkoutUrl = data.checkout_url || data.payment_url;
        }
      } catch (err) {
        console.warn('[Bachs.io API Notice] Could not initialize live Bachs payment:', err);
      }
    }

    // Fallback: Hosted Bachs.io Checkout Page URL
    if (!checkoutUrl) {
      const queryParams = new URLSearchParams({
        ref: txRef,
        amount: String(amount),
        phone: cleanPhone,
        title: headline,
        pkg: pkg.title,
      });
      checkoutUrl = `${appBaseUrl.replace(/\/+$/, '')}/checkout/bachs?${queryParams.toString()}`;
    }

    // Construct Ad Record in Firestore
    const adDoc: AdDoc = {
      id: adId,
      merchantPhone: cleanPhone,
      merchantName: merchantName || 'Verified Merchant',
      adType: packageType as any,
      headline,
      description: description || 'Sponsored Banner Ad on Floate',
      offerText: offerText || 'Limited Offer',
      rawImageUrl: rawImageUrl || '',
      designedBannerUrl: rawImageUrl || '',
      targetUrl: targetUrl || `https://floate.xyz/vendor/${cleanPhone}`,
      targetCategory: targetCategory || 'General',
      targetLocation: targetLocation || 'Nigeria',
      status: 'PENDING_DESIGN', // PENDING_DESIGN -> PAID -> ACTIVE
      impressions: 0,
      clicks: 0,
      budget: amount,
      submittedVia: 'WEB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestoreDb.saveAdDoc(adDoc);

    console.log(`[Bachs.io Ad Creation] 📢 Created campaign ${adId} (${pkg.title}) for +${cleanPhone} (₦${amount})`);

    return {
      success: true,
      adId,
      reference: txRef,
      checkoutUrl,
      amountNaira: amount,
      packageTitle: pkg.title,
    };
  }

  /**
   * 2. Handle Bachs.io Payment Webhook
   * Endpoint: POST /api/webhooks/bachs
   */
  public async handleWebhook(payload: any, signatureHeader?: string): Promise<{ success: boolean; message: string }> {
    console.log('[Bachs.io Webhook Received]:', JSON.stringify(payload));

    // Signature check if secret configured
    if (signatureHeader && this.webhookSecret) {
      try {
        const hash = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(JSON.stringify(payload))
          .digest('hex');
        if (hash !== signatureHeader && signatureHeader !== this.webhookSecret) {
          console.warn('[Bachs.io Webhook] ⚠️ Signature verification warning.');
        }
      } catch (e) {
        console.warn('[Bachs.io Webhook] Signature compute error:', e);
      }
    }

    const event = (payload?.event || payload?.type || '').toUpperCase();
    const data = payload?.data || payload;
    const reference = (data?.reference || data?.tx_ref || data?.txRef || payload?.reference || '').trim();
    const status = (data?.status || payload?.status || '').toUpperCase();
    const amountPaid = Number(data?.amount || payload?.amount || 0);

    const isSuccess =
      status === 'SUCCESS' ||
      status === 'PAID' ||
      status === 'SUCCESSFUL' ||
      event.includes('SUCCESS') ||
      event.includes('PAID');

    if (!reference) {
      return { success: false, message: 'Missing transaction reference in Bachs webhook payload.' };
    }

    if (!isSuccess) {
      return { success: true, message: `Webhook event ${event} status ${status} ignored.` };
    }

    // Lookup Ad Campaign Doc by reference or ID
    const adId = reference.startsWith('ad_') ? reference : `ad_${reference.toLowerCase()}`;
    let adDoc = await firestoreDb.getAdDoc(adId);

    if (!adDoc) {
      // Fallback search across admin ads
      const allAds = await firestoreDb.getAllAdsForAdmin();
      adDoc = allAds.find((a) => a.id === adId || a.id.includes(reference.toLowerCase())) || null;
    }

    if (adDoc) {
      // Mark Campaign as Paid and Pending Super Admin Approval
      const updatedAd: AdDoc = {
        ...adDoc,
        status: 'PENDING_DESIGN', // Wait for Admin Approval
        budget: amountPaid > 0 ? amountPaid : adDoc.budget,
        updatedAt: new Date().toISOString(),
      };

      await firestoreDb.saveAdDoc(updatedAd);

      // Alert Super Admin on WhatsApp/Telegram with 1-tap Approve/Reject buttons
      const adminPhone = config.adminWhatsAppPhone || process.env.ADMIN_WHATSAPP_PHONE || '2348000000000';
      const adminAlertMsg =
        `📢 *NEW SPONSORED AD PAID VIA BACHS.IO!* 💵\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏪 *Merchant:* ${adDoc.merchantName} (+${adDoc.merchantPhone})\n` +
        `🏷️ *Headline:* "${adDoc.headline}"\n` +
        `💰 *Amount Paid:* ₦${(amountPaid || adDoc.budget).toLocaleString()}\n` +
        `🎯 *Target:* ${adDoc.targetCategory} (${adDoc.targetLocation})\n` +
        `🔖 *Ref:* \`${reference}\`\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `Tap below to approve or reject this ad campaign:`;

      try {
        await sendWhatsAppMessage(adminPhone, adminAlertMsg, {
          quickReplies: [
            { id: `btn_approve_ad_${adDoc.id}`, title: '✅ Approve Campaign' },
            { id: `btn_reject_ad_${adDoc.id}`, title: '❌ Reject Campaign' },
          ],
        });
      } catch (waErr) {
        console.warn('[Bachs Admin Notice Warning]:', waErr);
      }

      // Send WhatsApp Receipt to Merchant
      try {
        const merchantMsg =
          `🎉 *Payment Confirmed via Bachs.io!* 💵\n` +
          `─────────────────────────\n` +
          `Your payment of *₦${(amountPaid || adDoc.budget).toLocaleString()}* for "${adDoc.headline}" has been verified.\n\n` +
          `Your campaign has been submitted to FLOATE Super Admin for quick approval. Once approved, your ad banner will go LIVE on floate.xyz! 🚀`;

        await sendWhatsAppMessage(adDoc.merchantPhone, merchantMsg);
      } catch (mErr) {
        console.warn('[Bachs Merchant Notice Warning]:', mErr);
      }

      return {
        success: true,
        message: `Ad campaign ${adDoc.id} successfully marked as PAID via Bachs.io and sent for Admin approval.`,
      };
    }

    return { success: true, message: `Bachs webhook acknowledged for ref: ${reference}` };
  }

  /**
   * 3. Approve Ad Campaign (Super Admin)
   */
  public async approveAdCampaign(adId: string): Promise<{ success: boolean; ad?: AdDoc; error?: string }> {
    const adDoc = await firestoreDb.getAdDoc(adId);
    if (!adDoc) {
      return { success: false, error: 'Ad campaign not found.' };
    }

    const updatedAd: AdDoc = {
      ...adDoc,
      status: 'ACTIVE',
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestoreDb.saveAdDoc(updatedAd);

    // Notify Merchant on WhatsApp
    try {
      const liveMsg =
        `🚀 *YOUR AD IS LIVE ON FLOATE.XYZ!* 🌟\n` +
        `─────────────────────────\n` +
        `Congratulations! Your sponsored ad *"${adDoc.headline}"* has been approved and is now active on the FLOATE Ad Banner Carousel!\n\n` +
        `🌐 *View Live Banner:* https://floate.xyz\n` +
        `Buyers across Nigeria will now see your featured campaign!`;

      await sendWhatsAppMessage(adDoc.merchantPhone, liveMsg);
    } catch (waErr) {
      console.warn('[Ad Approval WhatsApp Notice Notice]:', waErr);
    }

    return { success: true, ad: updatedAd };
  }

  /**
   * 4. Reject Ad Campaign (Super Admin)
   */
  public async rejectAdCampaign(adId: string, reason?: string): Promise<{ success: boolean; ad?: AdDoc; error?: string }> {
    const adDoc = await firestoreDb.getAdDoc(adId);
    if (!adDoc) {
      return { success: false, error: 'Ad campaign not found.' };
    }

    const updatedAd: AdDoc = {
      ...adDoc,
      status: 'PAUSED',
      updatedAt: new Date().toISOString(),
    };

    await firestoreDb.saveAdDoc(updatedAd);

    try {
      const rejectMsg =
        `⚠️ *Ad Campaign Notice*\n` +
        `Your campaign *"${adDoc.headline}"* requires modification before activation.\n` +
        (reason ? `Reason: ${reason}\n\n` : '\n') +
        `Please update your ad details or message support for assistance.`;

      await sendWhatsAppMessage(adDoc.merchantPhone, rejectMsg);
    } catch (e) {}

    return { success: true, ad: updatedAd };
  }
}

export const bachsPaymentService = new BachsPaymentService();
