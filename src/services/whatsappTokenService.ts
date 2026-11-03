/**
 * WhatsApp Deep-Link Token & Authentication Service
 * Implements cryptographically secure, single-use, order-bound and storefront-bound
 * deep-link tokens for seamless zero-login WhatsApp -> Web App authentication.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { firestoreDb } from '../bot/services/firestoreService.js';
import { getAppBaseUrl, getFrontendWebUrl } from '../bot/services/whatsappService.js';
import { getPublicSiteUrl } from '../config/siteUrls.js';

export interface WhatsAppTokenDoc {
  id: string;
  token_hash: string;
  type: 'storefront' | 'checkout';
  user_id?: string;
  vendor_id?: string;
  order_id?: string;
  expires_at: string;
  used_at?: string | null;
  ip?: string | null;
  ua?: string | null;
  created_at: string;
  meta?: Record<string, any>;
}

export interface GeneratedTokenResult {
  rawToken: string;
  tokenHash: string;
  url: string;
  expiresAt: string;
  type: 'storefront' | 'checkout';
  orderId?: string;
  vendorId?: string;
}

const JWT_SECRET = process.env.SESSION_SECRET || 'floate_whatsapp_secure_session_secret_2026_key';
const TOKEN_TTL_MINUTES = parseInt(process.env.WA_TOKEN_TTL_MIN || '10', 10);

/**
 * Hash raw token using SHA-256 for secure DB persistence.
 * Raw tokens are NEVER stored in DB or logs.
 */
export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generate cryptographically secure random token string (32 bytes base64url)
 */
export function generateRawToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export class WhatsAppTokenService {
  /**
   * 1. Generate Single-Use WhatsApp Storefront Link (VENDOR)
   * Link: https://{FRONTEND_URL}/store/{vendorId}?wa_token={TOKEN}&redirect=/dashboard
   */
  public async generateStorefrontLink(params: {
    vendorId: string;
    userId?: string;
    redirectUrl?: string;
    ip?: string;
    ua?: string;
    ttlMinutes?: number;
    meta?: Record<string, any>;
  }): Promise<GeneratedTokenResult> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const ttlMin = params.ttlMinutes || TOKEN_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();
    const tokenId = `wat_sf_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    const tokenDoc: WhatsAppTokenDoc = {
      id: tokenId,
      token_hash: tokenHash,
      type: 'storefront',
      user_id: params.userId || params.vendorId,
      vendor_id: params.vendorId,
      expires_at: expiresAt,
      used_at: null,
      ip: params.ip || null,
      ua: params.ua || null,
      created_at: createdAt,
      meta: {
        redirectUrl: params.redirectUrl || '/dashboard',
        ...params.meta,
      },
    };

    await firestoreDb.saveWhatsAppAuthToken(tokenDoc);

    const frontendBase = getPublicSiteUrl();
    const redirectParam = params.redirectUrl ? `&redirect=${encodeURIComponent(params.redirectUrl)}` : '&redirect=/dashboard';
    const url = `${frontendBase}/vendor/${encodeURIComponent(params.vendorId)}?wa_token=${rawToken}${redirectParam}`;

    console.log(`[WhatsAppTokenService] 🔑 Issued Storefront Token for Vendor ${params.vendorId} (Expires: ${expiresAt})`);

    return {
      rawToken,
      tokenHash,
      url,
      expiresAt,
      type: 'storefront',
      vendorId: params.vendorId,
    };
  }

  /**
   * 2. Generate Single-Use WhatsApp Payment Link (ORDER-BOUND)
   * Link: https://{FRONTEND_URL}/checkout?order_id={ORDER_ID}&wa_token={TOKEN}&vendor_id={VENDOR_ID}
   */
  public async generatePaymentLink(params: {
    orderId: string;
    vendorId: string;
    userId?: string;
    ip?: string;
    ua?: string;
    ttlMinutes?: number;
    meta?: Record<string, any>;
  }): Promise<GeneratedTokenResult> {
    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);
    const ttlMin = params.ttlMinutes || TOKEN_TTL_MINUTES;
    const expiresAt = new Date(Date.now() + ttlMin * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();
    const tokenId = `wat_chk_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    const tokenDoc: WhatsAppTokenDoc = {
      id: tokenId,
      token_hash: tokenHash,
      type: 'checkout',
      user_id: params.userId,
      vendor_id: params.vendorId,
      order_id: params.orderId,
      expires_at: expiresAt,
      used_at: null,
      ip: params.ip || null,
      ua: params.ua || null,
      created_at: createdAt,
      meta: {
        ...params.meta,
      },
    };

    await firestoreDb.saveWhatsAppAuthToken(tokenDoc);

    const frontendBase = getFrontendWebUrl();
    const url = `${frontendBase}/checkout?order_id=${encodeURIComponent(params.orderId)}&wa_token=${rawToken}&vendor_id=${encodeURIComponent(params.vendorId)}`;

    console.log(`[WhatsAppTokenService] 🔒 Issued Order-Bound Payment Token for Order ${params.orderId} (Expires: ${expiresAt})`);

    return {
      rawToken,
      tokenHash,
      url,
      expiresAt,
      type: 'checkout',
      orderId: params.orderId,
      vendorId: params.vendorId,
    };
  }

  /**
   * 3. Exchange WhatsApp Deep Link Token for Session
   * Atomically validates token:
   * - Hashes incoming token
   * - Verifies exists in DB
   * - Verifies not expired
   * - Verifies used_at is NULL (prevents replay)
   * - Immediately marks used_at = NOW()
   * - Issues JWT session cookie payload
   */
  public async exchangeToken(
    rawToken: string,
    clientIp?: string,
    userAgent?: string
  ): Promise<{
    success: boolean;
    sessionToken?: string;
    tokenDoc?: WhatsAppTokenDoc;
    user?: {
      id: string;
      role: string;
      vendorId?: string;
      phone?: string;
      businessName?: string;
    };
    redirectUrl?: string;
    orderId?: string;
    error?: string;
  }> {
    if (!rawToken || typeof rawToken !== 'string') {
      return { success: false, error: 'Token parameter is required' };
    }

    const tokenHash = hashToken(rawToken);
    const tokenDoc = await firestoreDb.getWhatsAppAuthTokenByHash(tokenHash);

    if (!tokenDoc) {
      console.warn(`[WhatsAppTokenService] ⚠️ Exchange failed: Token not found`);
      return { success: false, error: 'Invalid or expired authentication link' };
    }

    // Single-use check: reject if already used
    if (tokenDoc.used_at) {
      console.warn(`[WhatsAppTokenService] ⛔ Replay attack blocked: Token ${tokenDoc.id} was already used at ${tokenDoc.used_at}`);
      return { success: false, error: 'Link has already been used. Please request a new link.' };
    }

    // Expiry check
    if (new Date(tokenDoc.expires_at).getTime() < Date.now()) {
      console.warn(`[WhatsAppTokenService] ⏰ Token ${tokenDoc.id} expired at ${tokenDoc.expires_at}`);
      return { success: false, error: 'Authentication link has expired. Please request a new link on WhatsApp.' };
    }

    // Atomically mark token as used immediately to prevent TOCTOU replay
    const nowIso = new Date().toISOString();
    await firestoreDb.markWhatsAppAuthTokenUsed(tokenDoc.id, {
      usedAt: nowIso,
      ip: clientIp || null,
      ua: userAgent || null,
    });

    // Resolve user / vendor context
    const userId = tokenDoc.user_id || tokenDoc.vendor_id || 'wa_user_anon';
    const vendorId = tokenDoc.vendor_id;
    const role = tokenDoc.type === 'storefront' ? 'vendor' : 'customer';

    // Fetch merchant or user record
    let phone = userId;
    let businessName = 'Verified Merchant';

    if (vendorId) {
      const merchant = await firestoreDb.getMerchant(vendorId);
      if (merchant) {
        businessName = merchant.businessName || businessName;
        phone = merchant.whatsapp || vendorId;
      }
    }

    const userPayload = {
      id: userId,
      role,
      vendorId,
      phone,
      businessName,
      authMethod: 'whatsapp_deeplink',
      tokenType: tokenDoc.type,
      orderId: tokenDoc.order_id,
    };

    // Issue JWT session token (valid 24h)
    const sessionToken = jwt.sign(
      {
        sub: userId,
        ...userPayload,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 24 * 3600, // 24 hours
      },
      JWT_SECRET
    );

    const redirectUrl = tokenDoc.meta?.redirectUrl || (tokenDoc.type === 'checkout' ? `/checkout?order_id=${tokenDoc.order_id}` : '/dashboard');

    console.log(`[WhatsAppTokenService] ✅ Successfully exchanged token ${tokenDoc.id} for user ${userId} (${tokenDoc.type})`);

    return {
      success: true,
      sessionToken,
      tokenDoc,
      user: userPayload,
      redirectUrl,
      orderId: tokenDoc.order_id,
    };
  }

  /**
   * Verify JWT session token string
   */
  public verifySessionToken(tokenString: string): any {
    try {
      return jwt.verify(tokenString, JWT_SECRET);
    } catch (e) {
      return null;
    }
  }

  /**
   * Invalidate all tokens associated with an order once paid or cancelled
   */
  public async invalidateOrderTokens(orderId: string): Promise<void> {
    try {
      await firestoreDb.invalidateWhatsAppAuthTokensByOrderId(orderId);
      console.log(`[WhatsAppTokenService] 🧹 Invalidated auth tokens for Order ${orderId}`);
    } catch (e) {
      console.warn('[WhatsAppTokenService] Token invalidation notice:', e);
    }
  }
}

export const whatsappTokenService = new WhatsAppTokenService();
