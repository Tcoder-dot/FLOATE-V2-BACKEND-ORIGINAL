import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { firestoreDb } from './firestoreService.js';
import { redisService } from './redisService.js';
import { normalizePhone } from './sheetsService.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { config } from '../config.js';
import { getPublicSiteUrl, buildMerchantProfileUrl, buildRegisterUrl } from '../../config/siteUrls.js';

export interface WhatsAppDeepLinkToken {
  id: string;
  tokenHash: string;
  type: 'STOREFRONT' | 'CHECKOUT';
  phone: string;
  canonicalPhone: string;
  vendorId?: string;
  orderId?: string;
  status: 'PENDING' | 'USED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

const inMemoryAuthTokens = new Map<string, WhatsAppDeepLinkToken>();

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export interface AuthSession {
  challengeCode: string;
  phone: string; // E.164 format, e.g. "+2348031234567"
  canonicalPhone: string; // e.g. "2348031234567"
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED' | 'REQUIRES_REGISTRATION';
  jwt: string | null;
  refreshToken: string | null;
  vendor: any | null;
  ip: string;
  createdAt: string;
  expiresAt: string;
  verifiedAt?: string | null;
  verifiedPhone?: string | null;
}

// In-memory Session Cache for high-performance sub-millisecond status polling
const inMemorySessions = new Map<string, AuthSession>();

/**
 * Normalizes phone numbers to standard E.164 and canonical numeric strings.
 */
export function formatPhoneNumber(phoneInput: string): { e164: string; canonical: string } {
  const digits = (phoneInput || '').replace(/\D/g, '');
  let canonical = digits;

  if (digits.startsWith('0') && digits.length === 11) {
    canonical = '234' + digits.slice(1);
  } else if (!digits.startsWith('234') && digits.length === 10) {
    canonical = '234' + digits;
  }

  const e164 = '+' + canonical;
  return { e164, canonical };
}

/**
 * Generates a unique 6-character challenge code (e.g. "FL-7920")
 */
function generateChallengeCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Unambiguous characters
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `FL-${randomPart}`;
}

export class WhatsAppAuthService {
  private jwtSecret: string;

  constructor() {
    this.jwtSecret =
      process.env.FLOATE_JWT_SECRET ||
      process.env.JWT_SECRET ||
      'floate_jwt_secret_key_2026_super_secure_vault';
  }

  /**
   * 1. Request Auth Challenge Code
   * Endpoint: POST /api/v1/auth/whatsapp/request-code
   */
  public async requestAuthCode(
    phoneInput: string,
    clientIp: string
  ): Promise<{
    status: string;
    challenge_code: string;
    expires_in_seconds: number;
    whatsapp_link: string;
    phone: string;
  }> {
    // Rate Limiting: Max 3 requests per IP per 60 seconds
    const rateCheck = await redisService.checkRateLimit(`rate_auth_req_${clientIp}`, 3, 60);
    if (!rateCheck.allowed) {
      throw new Error('Rate limit exceeded. Maximum 3 auth requests allowed per minute per IP.');
    }

    const { e164, canonical } = formatPhoneNumber(phoneInput || '');
    if (!canonical || canonical.length < 10) {
      throw new Error('Invalid phone number format. Please provide a valid phone number.');
    }

    // Generate unique challenge code
    let challengeCode = generateChallengeCode();
    let attempts = 0;
    while (inMemorySessions.has(challengeCode) && attempts < 5) {
      challengeCode = generateChallengeCode();
      attempts++;
    }

    const ttlSeconds = 300; // 5 minutes
    const nowMs = Date.now();
    const expiresAtMs = nowMs + ttlSeconds * 1000;

    const botPhone =
      process.env.WHATSAPP_PHONE_NUMBER ||
      process.env.ADMIN_WHATSAPP_PHONE ||
      config.adminWhatsAppPhone ||
      '2348000000000';
    const cleanBotPhone = botPhone.replace(/\D/g, '');

    const authMsg = `AUTH: ${challengeCode}`;
    const waLink = `https://wa.me/${cleanBotPhone}?text=${encodeURIComponent(authMsg)}`;

    const sessionDoc: AuthSession = {
      challengeCode,
      phone: e164,
      canonicalPhone: canonical,
      status: 'PENDING',
      jwt: null,
      refreshToken: null,
      vendor: null,
      ip: clientIp || '127.0.0.1',
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };

    // Store in-memory
    inMemorySessions.set(challengeCode, sessionDoc);

    // Store in Redis
    await redisService.set(`auth_session:${challengeCode}`, sessionDoc, ttlSeconds);

    // Store in Firestore auth_sessions collection
    try {
      await firestoreDb.saveAuthSession(sessionDoc);
    } catch (fsErr) {
      console.warn('[WhatsAppAuthService] Firestore save notice:', fsErr);
    }

    console.log(`[WhatsApp Auth] 🔑 Code ${challengeCode} generated for ${e164} (IP: ${clientIp})`);

    return {
      status: 'success',
      challenge_code: challengeCode,
      expires_in_seconds: ttlSeconds,
      whatsapp_link: waLink,
      phone: e164,
    };
  }

  /**
   * 2. Validate WhatsApp Webhook Message against Pending Auth Sessions
   * Endpoint / Event: POST /api/v1/webhooks/whatsapp
   */
  public async handleInboundAuthMessage(
    senderPhone: string,
    messageBody: string
  ): Promise<{
    handled: boolean;
    challengeCode?: string;
    session?: AuthSession;
    replyMessage?: string;
  } | null> {
    if (!messageBody) return null;

    const trimmed = messageBody.trim();
    // Check if message matches "AUTH: FL-XXXX", "AUTH:FL-XXXX", or bare "FL-XXXX"
    const match =
      trimmed.match(/^AUTH:\s*([A-Z0-9-]{7})$/i) ||
      trimmed.match(/^AUTH:\s*(FL-[A-Z0-9]{4})$/i) ||
      trimmed.match(/^(FL-[A-Z0-9]{4})$/i);
    if (!match) return null;

    const extractedCode = match[1].toUpperCase();
    console.log(`[WhatsApp Auth Webhook] 📩 Incoming auth challenge code "${extractedCode}" from +${senderPhone}`);

    // Lookup session
    let session = inMemorySessions.get(extractedCode);
    if (!session) {
      session = await redisService.get<AuthSession>(`auth_session:${extractedCode}`);
    }
    if (!session) {
      session = await firestoreDb.getAuthSession(extractedCode);
    }

    if (!session) {
      console.warn(`[WhatsApp Auth Webhook] ⚠️ Session "${extractedCode}" not found or already deleted.`);
      return {
        handled: true,
        replyMessage: '⚠️ Invalid or expired authentication code. Please request a new code on FLOATE web stall.',
      };
    }

    if (session.status !== 'PENDING') {
      console.warn(`[WhatsApp Auth Webhook] ⚠️ Session "${extractedCode}" status is already ${session.status}.`);
      return {
        handled: true,
        replyMessage: 'ℹ️ This authentication code has already been used.',
      };
    }

    // Check expiration
    const nowMs = Date.now();
    if (new Date(session.expiresAt).getTime() <= nowMs) {
      session.status = 'EXPIRED';
      inMemorySessions.set(extractedCode, session);
      await firestoreDb.saveAuthSession(session);
      return {
        handled: true,
        replyMessage: '⚠️ Authentication code has expired. Please request a new code on your browser.',
      };
    }

    const { e164: senderE164, canonical: senderCanonical } = formatPhoneNumber(senderPhone);

    // Retrieve merchant profile from Firestore
    let vendor = await firestoreDb.getMerchant(senderCanonical);
    if (!vendor) {
      console.log(`[WhatsApp Auth] No registered business found for phone +${senderCanonical}`);
      
      const unregSession: AuthSession = {
        ...session,
        status: 'REQUIRES_REGISTRATION',
        jwt: null,
        refreshToken: null,
        vendor: null,
        verifiedAt: new Date().toISOString(),
        verifiedPhone: senderE164,
      };

      inMemorySessions.set(extractedCode, unregSession);
      await redisService.set(`auth_session:${extractedCode}`, unregSession, 600);
      await firestoreDb.saveAuthSession(unregSession);

      const unregMsg =
        `⚠️ *No registered business found for ${senderE164}*\n\n` +
        `You need to register your business stall on FLOATE first before logging in.\n\n` +
        `🎁 Get **5 free customer credits** when you complete your free registration!\n\n` +
        `👉 *Tap here to register your stall on FLOATE:*\n` +
        `${buildRegisterUrl()}`;

      try {
        await sendWhatsAppMessage(senderCanonical, unregMsg, {
          quickReplies: [
            { id: 'btn_register_stall', title: '🏪 Register Free Stall' },
            { id: 'btn_home', title: '🏠 Main Menu' },
          ],
        });
      } catch (msgErr) {
        console.warn('[WhatsApp Auth] Unregistered notice error:', msgErr);
      }

      return {
        handled: true,
        challengeCode: extractedCode,
        session: unregSession,
        replyMessage: unregMsg,
      };
    }

    // Registered Business: Generate Access Token and Refresh Token
    const accessToken = jwt.sign(
      {
        sub: senderCanonical,
        phone: senderE164,
        vendorId: vendor.id,
        businessName: vendor.businessName,
        role: vendor.isVerified ? 'VERIFIED_MERCHANT' : 'MERCHANT',
        iss: 'FLOATE_AUTH_ENGINE',
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        sub: senderCanonical,
        type: 'refresh_token',
        iss: 'FLOATE_AUTH_ENGINE',
      },
      this.jwtSecret,
      { expiresIn: '30d' }
    );

    // Update Auth Session
    const updatedSession: AuthSession = {
      ...session,
      status: 'VERIFIED',
      jwt: accessToken,
      refreshToken: refreshToken,
      vendor: {
        id: vendor.id,
        businessName: vendor.businessName || 'Verified Merchant',
        ownerFullName: vendor.ownerFullName || vendor.businessName || 'Verified Merchant',
        whatsapp: vendor.whatsapp || senderCanonical,
        phoneNumber: vendor.whatsapp || senderCanonical,
        phone: vendor.whatsapp || senderCanonical,
        state: vendor.state || 'Lagos',
        city: vendor.city || 'Lagos',
        category: vendor.category || 'General Commerce',
        isVerified: vendor.isVerified === true || vendor.verifiedStatus === 'YES',
        verifiedStatus: vendor.verifiedStatus || 'PENDING',
        verificationStatus: vendor.verificationStatus || (vendor.isVerified === true || vendor.verifiedStatus === 'YES' ? 'APPROVED' : 'PENDING_REVIEW'),
        kycTier: vendor.kycTier || 'TIER_1',
        selfieUrl: vendor.profilePhotoUrl || (vendor as any).kycSelfieUrl || (vendor as any).selfieUrl || vendor.photoUrl || '/assets/aistudio/floate-verified-badge.png',
        avatar_url: vendor.profilePhotoUrl || (vendor as any).kycSelfieUrl || (vendor as any).selfieUrl || vendor.photoUrl || '/assets/aistudio/floate-verified-badge.png',
        isUnmetered: true,
        inquiriesFree: true,
      },
      verifiedAt: new Date().toISOString(),
      verifiedPhone: senderE164,
    };

    // Save state across in-memory, Redis, and Firestore
    inMemorySessions.set(extractedCode, updatedSession);
    await redisService.set(`auth_session:${extractedCode}`, updatedSession, 600); // keep for 10 mins post-verification
    await firestoreDb.saveAuthSession(updatedSession);

    const vendorWebStoreUrl = buildMerchantProfileUrl(vendor.businessName || senderCanonical);

    const autoReplyText =
      `✅ *Account verified successfully!*\n\n` +
      `Welcome back to **FLOATE Merchant Portal** (*${vendor.businessName}*).\n` +
      `You can now return to your browser—your session is logged in! 🚀\n\n` +
      `🏪 *Your Live Web Store:* ${vendorWebStoreUrl}`;

    // Send instant WhatsApp auto-reply back to merchant
    try {
      await sendWhatsAppMessage(senderCanonical, autoReplyText, {
        quickReplies: [
          { id: 'btn_my_store', title: '🏪 My Web Store' },
          { id: 'btn_vendor_stats', title: '📊 View Stats' },
        ],
      });
    } catch (msgErr) {
      console.warn('[WhatsApp Auth] Auto-reply send notice:', msgErr);
    }

    console.log(`[WhatsApp Auth] 🎉 Session ${extractedCode} VERIFIED for registered vendor +${senderCanonical}!`);

    return {
      handled: true,
      challengeCode: extractedCode,
      session: updatedSession,
      replyMessage: autoReplyText,
    };
  }

  /**
   * 3. Check Auth Session Status via Real-time Polling
   * Endpoint: GET /api/v1/auth/whatsapp/session-status?code=FL-7920
   */
  public async getSessionStatus(
    codeQuery: string
  ): Promise<{
    authenticated: boolean;
    status: string;
    isRegistered?: boolean;
    phone?: string;
    registrationUrl?: string;
    token?: string | null;
    refreshToken?: string | null;
    vendor?: any;
    expires_in_seconds?: number;
    error?: string;
  }> {
    if (!codeQuery) {
      return {
        authenticated: false,
        status: 'BAD_REQUEST',
        error: 'Challenge code query parameter ("code") is required.',
      };
    }

    const code = codeQuery.trim().toUpperCase();

    // 1. In-memory lookup
    let session = inMemorySessions.get(code);

    // 2. Redis fallback
    if (!session) {
      session = await redisService.get<AuthSession>(`auth_session:${code}`);
    }

    // 3. Firestore fallback
    if (!session) {
      session = await firestoreDb.getAuthSession(code);
    }

    if (!session) {
      return {
        authenticated: false,
        status: 'NOT_FOUND',
        error: 'Invalid or non-existent challenge code.',
      };
    }

    const nowMs = Date.now();
    const expiresMs = new Date(session.expiresAt).getTime();

    // Check expiration
    if (session.status === 'PENDING' && expiresMs <= nowMs) {
      session.status = 'EXPIRED';
      inMemorySessions.set(code, session);
      await firestoreDb.saveAuthSession(session);
      return {
        authenticated: false,
        status: 'EXPIRED',
        error: 'Authentication challenge code expired. Please request a new code.',
      };
    }

    if (session.status === 'PENDING') {
      const remainingSecs = Math.max(0, Math.round((expiresMs - nowMs) / 1000));
      return {
        authenticated: false,
        status: 'PENDING',
        expires_in_seconds: remainingSecs,
      };
    }

    if (session.status === 'REQUIRES_REGISTRATION') {
      return {
        authenticated: false,
        status: 'REQUIRES_REGISTRATION',
        isRegistered: false,
        phone: session.phone,
        registrationUrl: buildRegisterUrl(),
        error: 'Phone number is not registered as a business on FLOATE.',
      };
    }

    if (session.status === 'VERIFIED') {
      return {
        authenticated: true,
        status: 'VERIFIED',
        isRegistered: true,
        token: session.jwt,
        refreshToken: session.refreshToken,
        vendor: session.vendor,
      };
    }

    return {
      authenticated: false,
      status: session.status || 'EXPIRED',
      error: 'Session is no longer active.',
    };
  }

  /**
   * Helper to verify JWT access tokens on protected routes
   */
  public verifyJwtToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch {
      return null;
    }
  }

  /**
   * Generate Single-Use Storefront Deep-Link Token (10 Min TTL)
   * POST /auth/whatsapp/generate/storefront
   */
  public async generateStorefrontToken(
    phoneInput: string,
    vendorId?: string
  ): Promise<{
    status: string;
    wa_token: string;
    deepLink: string;
    expires_in_seconds: number;
    phone: string;
  }> {
    const { e164, canonical } = formatPhoneNumber(phoneInput || '');
    if (!canonical || canonical.length < 10) {
      throw new Error('Invalid phone number provided for storefront token generation.');
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    const ttlSeconds = 600; // 10 minutes TTL
    const nowMs = Date.now();
    const expiresAtMs = nowMs + ttlSeconds * 1000;

    const tokenDoc: WhatsAppDeepLinkToken = {
      id: `watok_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      tokenHash,
      type: 'STOREFRONT',
      phone: e164,
      canonicalPhone: canonical,
      vendorId: vendorId || `merchant_${canonical}`,
      status: 'PENDING',
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };

    inMemoryAuthTokens.set(tokenHash, tokenDoc);
    await redisService.set(`wa_dl_token:${tokenHash}`, tokenDoc, ttlSeconds);

    const baseUrl = getPublicSiteUrl();
    const deepLink = `${baseUrl}/vendor/${canonical}?wa_token=${rawToken}`;

    console.log(`[WhatsApp DeepLink Auth] 🛍️ Generated storefront token for +${canonical}`);

    return {
      status: 'success',
      wa_token: rawToken,
      deepLink,
      expires_in_seconds: ttlSeconds,
      phone: e164,
    };
  }

  /**
   * Generate Single-Use Order-Bound Checkout Deep-Link Token (10 Min TTL)
   * POST /auth/whatsapp/generate/checkout
   */
  public async generateCheckoutToken(
    orderIdInput: string,
    phoneInput?: string
  ): Promise<{
    status: string;
    wa_token: string;
    orderId: string;
    checkoutUrl: string;
    expires_in_seconds: number;
  }> {
    const cleanOrderId = (orderIdInput || '').trim();
    if (!cleanOrderId) {
      throw new Error('Order ID is required to generate order-bound checkout token.');
    }

    let orderDoc: any = null;
    try {
      orderDoc = await firestoreDb.getEscrowOrderDoc(cleanOrderId);
    } catch (e) {
      console.warn('[WhatsApp Auth] Order lookup notice:', e);
    }

    const targetPhone = phoneInput || orderDoc?.buyerPhone || orderDoc?.vendorPhone || '2348000000000';
    const { e164, canonical } = formatPhoneNumber(targetPhone);

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);

    const ttlSeconds = 600; // 10 minutes TTL
    const nowMs = Date.now();
    const expiresAtMs = nowMs + ttlSeconds * 1000;

    const tokenDoc: WhatsAppDeepLinkToken = {
      id: `watok_chk_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      tokenHash,
      type: 'CHECKOUT',
      phone: e164,
      canonicalPhone: canonical,
      orderId: cleanOrderId,
      status: 'PENDING',
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(expiresAtMs).toISOString(),
    };

    inMemoryAuthTokens.set(tokenHash, tokenDoc);
    await redisService.set(`wa_dl_token:${tokenHash}`, tokenDoc, ttlSeconds);

    const baseUrl = getPublicSiteUrl();
    const checkoutUrl = `${baseUrl}/checkout?orderId=${encodeURIComponent(cleanOrderId)}&wa_token=${rawToken}`;

    console.log(`[WhatsApp DeepLink Auth] 💳 Generated order-bound checkout token for order ${cleanOrderId}`);

    return {
      status: 'success',
      wa_token: rawToken,
      orderId: cleanOrderId,
      checkoutUrl,
      expires_in_seconds: ttlSeconds,
    };
  }

  /**
   * Exchange Single-Use wa_token for EXISTING Session / JWT
   * POST /auth/whatsapp/exchange
   */
  public async exchangeWhatsAppToken(
    rawTokenInput: string
  ): Promise<{
    success: boolean;
    token: string | null;
    refreshToken: string | null;
    vendor: any | null;
    order: any | null;
    type: 'STOREFRONT' | 'CHECKOUT';
    phone: string;
    error?: string;
  }> {
    const rawToken = (rawTokenInput || '').trim();
    if (!rawToken) {
      return {
        success: false,
        token: null,
        refreshToken: null,
        vendor: null,
        order: null,
        type: 'STOREFRONT',
        phone: '',
        error: 'wa_token query or body parameter is required.',
      };
    }

    const tokenHash = hashToken(rawToken);

    // 1. In-memory lookup
    let tokenDoc = inMemoryAuthTokens.get(tokenHash);

    // 2. Redis fallback
    if (!tokenDoc) {
      tokenDoc = await redisService.get<WhatsAppDeepLinkToken>(`wa_dl_token:${tokenHash}`);
    }

    if (!tokenDoc) {
      return {
        success: false,
        token: null,
        refreshToken: null,
        vendor: null,
        order: null,
        type: 'STOREFRONT',
        phone: '',
        error: 'Invalid, used, or non-existent WhatsApp token.',
      };
    }

    const nowMs = Date.now();
    const expiresMs = new Date(tokenDoc.expiresAt).getTime();

    if (tokenDoc.status !== 'PENDING' || expiresMs <= nowMs) {
      tokenDoc.status = 'EXPIRED';
      inMemoryAuthTokens.set(tokenHash, tokenDoc);
      return {
        success: false,
        token: null,
        refreshToken: null,
        vendor: null,
        order: null,
        type: tokenDoc.type,
        phone: tokenDoc.phone,
        error: 'WhatsApp token has expired or was already used.',
      };
    }

    // ATOMIC SINGLE-USE ENFORCEMENT: Immediately mark as USED
    tokenDoc.status = 'USED';
    tokenDoc.usedAt = new Date().toISOString();
    inMemoryAuthTokens.set(tokenHash, tokenDoc);
    await redisService.set(`wa_dl_token:${tokenHash}`, tokenDoc, 600);

    // Retrieve vendor profile for the canonical phone
    let vendor = await firestoreDb.getMerchant(tokenDoc.canonicalPhone);
    if (!vendor) {
      vendor = {
        id: tokenDoc.canonicalPhone,
        businessName: 'Verified Merchant',
        whatsapp: tokenDoc.canonicalPhone,
        isVerified: true,
        credit_balance: 25,
        status: 'ACTIVE',
        updatedAt: new Date().toISOString(),
      } as any;
    }

    // Generate EXISTING JWT session
    const accessToken = jwt.sign(
      {
        sub: tokenDoc.canonicalPhone,
        phone: tokenDoc.phone,
        vendorId: vendor.id,
        businessName: vendor.businessName,
        role: vendor.isVerified ? 'VERIFIED_MERCHANT' : 'MERCHANT',
        iss: 'FLOATE_AUTH_ENGINE',
      },
      this.jwtSecret,
      { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
      {
        sub: tokenDoc.canonicalPhone,
        type: 'refresh_token',
        iss: 'FLOATE_AUTH_ENGINE',
      },
      this.jwtSecret,
      { expiresIn: '30d' }
    );

    // If CHECKOUT token, retrieve specific order bound to this exact token
    let order: any = null;
    if (tokenDoc.type === 'CHECKOUT' && tokenDoc.orderId) {
      try {
        order = await firestoreDb.getEscrowOrderDoc(tokenDoc.orderId);
      } catch (e) {
        console.warn('[WhatsApp Auth Exchange] Order fetch warning:', e);
      }
    }

    console.log(`[WhatsApp Auth Exchange] 🎉 Successfully exchanged wa_token for +${tokenDoc.canonicalPhone} (Type: ${tokenDoc.type})`);

    return {
      success: true,
      token: accessToken,
      refreshToken,
      vendor,
      order,
      type: tokenDoc.type,
      phone: tokenDoc.phone,
    };
  }

  /**
   * Express Middleware to recognize WhatsApp-established sessions or tokens
   */
  public expressWhatsAppAuthMiddleware(req: any, res: any, next: any) {
    const authHeader = req.headers.authorization || '';
    const queryToken = (req.query.wa_token || req.query.token || '').toString();
    const headerWaToken = (req.headers['x-wa-token'] || req.headers['x-wa-session'] || '').toString();

    const rawJwt = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;

    if (rawJwt) {
      const decoded = whatsappAuthService.verifyJwtToken(rawJwt);
      if (decoded) {
        req.user = decoded;
        req.vendor = { id: decoded.vendorId || decoded.sub, phone: decoded.phone };
        return next();
      }
    }

    const effectiveWaToken = queryToken || headerWaToken;
    if (effectiveWaToken) {
      whatsappAuthService
        .exchangeWhatsAppToken(effectiveWaToken)
        .then((result) => {
          if (result.success && result.token) {
            const decoded = whatsappAuthService.verifyJwtToken(result.token);
            req.user = decoded;
            req.vendor = result.vendor;
            req.order = result.order;
            req.waExchangeResult = result;
          }
          next();
        })
        .catch(() => next());
      return;
    }

    next();
  }
}

export const whatsappAuthService = new WhatsAppAuthService();
