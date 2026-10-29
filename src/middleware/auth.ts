/**
 * Unified Authentication Middleware
 * Supports httpOnly session cookies, Authorization: Bearer headers,
 * and x-session-token headers established via WhatsApp deep-link exchanges or standard auth.
 */

import { Request, Response, NextFunction } from 'express';
import { whatsappTokenService } from '../services/whatsappTokenService.js';

export interface AuthenticatedUser {
  id: string;
  role: 'vendor' | 'customer' | 'admin' | string;
  vendorId?: string;
  phone?: string;
  businessName?: string;
  authMethod?: string;
  orderId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Helper to parse cookies from raw Cookie header string
 */
export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const key = pair.substring(0, idx).trim();
      const val = pair.substring(idx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

/**
 * Extract session token from cookies, Bearer header, or custom session header
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check Cookies
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.session) {
    return cookies.session;
  }

  // 2. Check Authorization Header (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.substring(7).trim();
  }

  // 3. Check x-session-token Header
  const customHeader = req.headers['x-session-token'] as string;
  if (customHeader) {
    return customHeader.trim();
  }

  return null;
}

/**
 * Middleware: Session resolution middleware (populates req.user if valid token present)
 */
export function sessionCookieMiddleware(req: Request, _res: Response, next: NextFunction) {
  const token = extractSessionToken(req);

  if (token) {
    const decoded = whatsappTokenService.verifySessionToken(token);
    if (decoded && decoded.sub) {
      req.user = {
        id: decoded.sub || decoded.id,
        role: decoded.role || 'customer',
        vendorId: decoded.vendorId,
        phone: decoded.phone,
        businessName: decoded.businessName,
        authMethod: decoded.authMethod || 'session',
        orderId: decoded.orderId,
      };
    }
  }

  next();
}

/**
 * Middleware: Require Authentication
 * Rejects with 401 if user session is not valid/present
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Unauthorized: Valid authentication session required.',
    });
  }
  next();
}

/**
 * Middleware: Require Vendor Role
 */
export function requireVendor(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      authenticated: false,
      error: 'Unauthorized: Valid authentication session required.',
    });
  }

  if (req.user.role !== 'vendor' && !req.user.vendorId) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Vendor privileges required.',
    });
  }

  next();
}
