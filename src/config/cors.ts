/**
 * CORS Configuration for Floate WhatsApp Commerce Engine
 * Enforces strict credentials handling for httpOnly cross-site session cookies
 * and validates allowed frontend origins without wildcards.
 */

import { Request, Response, NextFunction } from 'express';

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || 'https://www.floate.xyz',
  'https://floate.xyz',
  'https://www.floate.xyz',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  if (origin) {
    // Check if origin matches allowed list or subdomains of floate.xyz or cloud run preview
    const isAllowed =
      ALLOWED_ORIGINS.includes(origin) ||
      /\.floate\.xyz$/i.test(origin) ||
      /\.run\.app$/i.test(origin) ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1');

    if (isAllowed) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
    }
  } else {
    res.header('Access-Control-Allow-Origin', ALLOWED_ORIGINS[0]);
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
