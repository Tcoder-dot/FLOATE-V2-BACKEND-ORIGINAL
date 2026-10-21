import { Context, Keyboard } from 'grammy';
import { sheetsDb, normalizePhone, BusinessListing } from './services/sheetsService.js';
import { userStore } from './userStore.js';

export function isRegisteredBusiness(userId: number | string): boolean {
  if (sheetsDb.isUserRegisteredBusiness(userId)) {
    return true;
  }
  const profile = userStore.getProfile(Number(userId));
  return profile.role === 'BUSINESS' && Boolean(profile.businessName);
}

export function getBusinessReplyKeyboard() {
  return new Keyboard()
    .text('📦 Add Product').text('✏️ Edit Products').row()
    .text('📋 View My Listings').text('📱 Update WhatsApp').row()
    .text('📊 My Stats').text('🗑️ Remove My Business').row()
    .text('❓ Help')
    .resized();
}

/**
 * Checks if a business name already exists in the database.
 * Returns the matching BusinessListing if found.
 */
export function findExistingBusinessByName(businessName: string, excludeUserId?: number | string): BusinessListing | undefined {
  if (!businessName) return undefined;
  const cleanEntered = businessName.trim().toLowerCase();
  const normalizedEntered = cleanEntered.replace(/[^a-z0-9]/g, '');
  if (!normalizedEntered) return undefined;

  const allListings = sheetsDb.getAllListings();
  return allListings.find((b) => {
    if (excludeUserId && String(b.userId) === String(excludeUserId)) return false;
    const bName = (b.businessName || '').trim().toLowerCase();
    const bNorm = bName.replace(/[^a-z0-9]/g, '');
    return bNorm === normalizedEntered || bName === cleanEntered;
  });
}

/**
 * Checks if a WhatsApp number already belongs to a registered business.
 * Returns the matching BusinessListing if found.
 */
export function findExistingBusinessByPhone(phone: string, excludeUserId?: number | string): BusinessListing | undefined {
  if (!phone) return undefined;
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 7) return undefined;

  const allListings = sheetsDb.getAllListings();
  return allListings.find((b) => {
    if (excludeUserId && String(b.userId) === String(excludeUserId)) return false;
    const bPhone = normalizePhone(b.whatsapp);
    return bPhone && bPhone === cleanPhone;
  });
}

/**
 * Safely sends a Telegram reply, auto-recovering from any Markdown formatting or parsing errors.
 */
export async function replySafe(ctx: Context, text: string, options?: any) {
  const opts = { parse_mode: 'Markdown' as const, ...options };
  try {
    return await ctx.reply(text, opts);
  } catch (err: any) {
    console.warn('[Telegram Reply Warning] Markdown formatting failed, attempting auto-fix recovery:', err?.message || err);
    try {
      // Auto-escape unescaped markdown symbols outside of markdown links
      const autoFixText = text.replace(/([_*`])/g, '\\$1');
      return await ctx.reply(autoFixText, opts);
    } catch (err2) {
      console.warn('[Telegram Reply Warning] Secondary attempt failed, converting to clean plain text:', err2);
      // Fallback: convert markdown links [Text](URL) -> Text (URL) so brackets don't leak
      const plainText = text
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
        .replace(/[*_`]/g, '');
      const fallbackOpts = { ...options };
      delete fallbackOpts.parse_mode;
      return await ctx.reply(plainText, fallbackOpts).catch((e2) => {
        console.error('[Telegram Reply Error] Unrecoverable failure sending reply:', e2?.message || e2);
      });
    }
  }
}
