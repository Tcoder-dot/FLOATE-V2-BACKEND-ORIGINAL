/**
 * WhatsApp Deep-Link Authentication Routes
 * Handles token exchanges, session cookie issuance, and current user context endpoints.
 */

import { Router, Request, Response } from 'express';
import { whatsappTokenService } from '../services/whatsappTokenService.js';
import { sessionCookieMiddleware } from '../middleware/auth.js';

export const whatsappAuthRouter = Router();

/**
 * POST /auth/whatsapp/exchange
 * Exchanges single-use WhatsApp deep-link token for secure httpOnly session cookie
 */
whatsappAuthRouter.post(['/whatsapp/exchange', '/exchange'], async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        authenticated: false,
        error: 'Authentication token is required.',
      });
    }

    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await whatsappTokenService.exchangeToken(token.trim(), clientIp, userAgent);

    if (!result.success || !result.sessionToken) {
      return res.status(401).json({
        success: false,
        authenticated: false,
        error: result.error || 'Invalid or expired authentication link.',
      });
    }

    // Set Secure httpOnly Cookie for cross-site WhatsApp in-app browser -> frontend
    const isProduction = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie('session', result.sessionToken, {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Allows cookie sending across WhatsApp iframe/webviews
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return res.json({
      success: true,
      authenticated: true,
      user: result.user,
      tokenType: result.tokenDoc?.type,
      orderId: result.orderId,
      vendorId: result.user?.vendorId,
      redirectUrl: result.redirectUrl,
      sessionToken: result.sessionToken, // Also return in body for mobile/SPA localStorage fallback
    });
  } catch (err: any) {
    console.error('[WhatsApp Auth Exchange Exception]:', err);
    return res.status(500).json({
      success: false,
      authenticated: false,
      error: 'An unexpected error occurred during token exchange.',
    });
  }
});

/**
 * GET /auth/me
 * Returns current authenticated user context from session cookie / header
 */
whatsappAuthRouter.get(['/me', '/user'], sessionCookieMiddleware, (req: Request, res: Response) => {
  if (req.user) {
    return res.json({
      success: true,
      authenticated: true,
      user: req.user,
    });
  }

  return res.status(401).json({
    success: false,
    authenticated: false,
    user: null,
    error: 'Unauthenticated',
  });
});

/**
 * POST /auth/logout
 * Clears session cookie
 */
whatsappAuthRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('session', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'none',
  });

  return res.json({
    success: true,
    authenticated: false,
    message: 'Logged out successfully.',
  });
});

/**
 * POST /auth/whatsapp/link/storefront
 * System endpoint to issue single-use storefront link
 */
whatsappAuthRouter.post('/whatsapp/link/storefront', async (req: Request, res: Response) => {
  try {
    const { vendorId, userId, redirectUrl } = req.body || {};
    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'vendorId is required' });
    }

    const result = await whatsappTokenService.generateStorefrontLink({
      vendorId: String(vendorId),
      userId: userId ? String(userId) : undefined,
      redirectUrl,
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      url: result.url,
      expiresAt: result.expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to generate link' });
  }
});

/**
 * POST /auth/whatsapp/link/payment
 * System endpoint to issue single-use order-bound payment link
 */
whatsappAuthRouter.post('/whatsapp/link/payment', async (req: Request, res: Response) => {
  try {
    const { orderId, vendorId, userId } = req.body || {};
    if (!orderId || !vendorId) {
      return res.status(400).json({ success: false, error: 'orderId and vendorId are required' });
    }

    const result = await whatsappTokenService.generatePaymentLink({
      orderId: String(orderId),
      vendorId: String(vendorId),
      userId: userId ? String(userId) : undefined,
      ip: req.ip,
      ua: req.headers['user-agent'],
    });

    return res.json({
      success: true,
      url: result.url,
      expiresAt: result.expiresAt,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed to generate link' });
  }
});
