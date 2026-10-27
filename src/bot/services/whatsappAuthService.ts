import jwt from 'jsonwebtoken';
import { firestoreDb } from './firestoreService.js';
import { redisService } from './redisService.js';
import { normalizePhone } from './sheetsService.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { config } from '../config.js';

export interface AuthSession {
  challengeCode: string;
  phone: string; // E.164 format, e.g. "+2348031234567"
  canonicalPhone: string; // e.g. "2348031234567"
  status: 'PENDING' | 'VERIFIED' | 'EXPIRED';
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
    // Check if message matches "AUTH: FL-XXXX" or "AUTH:FL-XXXX"
    const match = trimmed.match(/^AUTH:\s*([A-Z0-9-]{7})$/i) || trimmed.match(/^AUTH:\s*(FL-[A-Z0-9]{4})$/i);
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

    // Retrieve or auto-create merchant profile
    let vendor = await firestoreDb.getMerchant(senderCanonical);
    if (!vendor) {
      console.log(`[WhatsApp Auth] Creating default merchant profile for new vendor +${senderCanonical}...`);
      vendor = {
        id: senderCanonical,
        businessName: `Stall +${senderCanonical.slice(-4)}`,
        ownerFullName: 'Merchant Vendor',
        whatsapp: senderCanonical,
        userId: senderCanonical,
        isVerified: true,
        credit_balance: 25,
        status: 'ACTIVE',
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await firestoreDb.saveMerchant(vendor);
    }

    // Generate Access Token and Refresh Token
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
        businessName: vendor.businessName,
        ownerFullName: vendor.ownerFullName || vendor.businessName,
        whatsapp: vendor.whatsapp || senderCanonical,
        state: vendor.state || 'Lagos',
        city: vendor.city || 'Lagos',
        isVerified: vendor.isVerified ?? true,
        credit_balance: vendor.credit_balance ?? 25,
      },
      verifiedAt: new Date().toISOString(),
      verifiedPhone: senderE164,
    };

    // Save state across in-memory, Redis, and Firestore
    inMemorySessions.set(extractedCode, updatedSession);
    await redisService.set(`auth_session:${extractedCode}`, updatedSession, 600); // keep for 10 mins post-verification
    await firestoreDb.saveAuthSession(updatedSession);

    const autoReplyText =
      `✅ *Account verified successfully!*\n\n` +
      `Welcome to **FLOATE Merchant Portal** (*${vendor.businessName}*).\n` +
      `You can now return to your web browser screen—your session is logged in! 🚀`;

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

    console.log(`[WhatsApp Auth] 🎉 Session ${extractedCode} VERIFIED for +${senderCanonical}!`);

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

    if (session.status === 'VERIFIED') {
      return {
        authenticated: true,
        status: 'VERIFIED',
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
}

export const whatsappAuthService = new WhatsAppAuthService();
