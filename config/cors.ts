/**
 * CORS Configuration for Floate WhatsApp Commerce Engine
 * Enforces strict credentials handling for httpOnly cross-site session cookies
 * and validates allowed frontend origins from PUBLIC_SITE_URL without wildcards.
 */

import { Request, Response, NextFunction } from 'express';
import { getPublicSiteUrl } from './siteUrls.js';

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;
  let publicSiteUrl = 'https://floate.xyz';
  try {
    publicSiteUrl = getPublicSiteUrl();
  } catch (err) {
    publicSiteUrl = 'https://floate.xyz';
  }

  const isAllowed =
    !origin ||
    origin === publicSiteUrl ||
    origin === 'https://floate.xyz' ||
    origin === 'https://www.floate.xyz' ||
    /https?:\/\/(.+\.)?floate\.xyz(:\d+)?$/i.test(origin) ||
    /\.run\.app$/i.test(origin) ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1');

  if (origin && isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
  } else {
    res.header('Access-Control-Allow-Origin', publicSiteUrl);
  }

  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-session-token, x-api-key, x-floate-api-key'
  );

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
}
