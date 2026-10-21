import { config } from '../config.js';

export interface SupportReportPayload {
  userIdentifier: string; // Phone number or Telegram ID / @username
  userName?: string;
  platform: 'Telegram' | 'WhatsApp' | 'Web';
  reportText: string;
  timestamp?: string;
}

/**
 * Narrow, explicit trigger pattern checker for support / report / complaints.
 * Strictly checks for unambiguous trigger phrases. Does NOT intercept normal product searches.
 */
export function isExplicitSupportOrReport(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ');

  // Exact command or single-word matches
  if (/^(report|complaint|support|contact us|contact support|customer care|customer support|help desk|scam|fraud)$/i.test(clean)) {
    return true;
  }

  // Explicit starting phrases
  if (
    /^(i want to report|report an issue|report a problem|report a vendor|report vendor|report a seller|report seller|report issue|report problem|i have a complaint|i want to make a complaint|make a complaint|lodge a complaint|this isnt working|this is not working|something is not working|something isn't working|i got scammed|i was scammed|vendor scammed me|seller scammed me|fraudulent vendor|fraudulent seller)\b/i.test(clean)
  ) {
    return true;
  }

  // Explicit keywords containing fraud / scam / report intent
  if (
    /\b(i got scammed|i was scammed|vendor scammed me|seller scammed me|i want to report a scam|report scammer|report fraud)\b/i.test(clean)
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if the message already contains substantive report details (not just a 2-word trigger).
 */
export function hasSufficientReportDetails(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  // If user wrote a detailed explanation (> 6 words and > 30 chars), treat as complete report
  return wordCount >= 6 && trimmed.length >= 30;
}

/**
 * Dispatches the formatted support/complaint report to ADMIN_TELEGRAM_ID
 */
export async function sendReportToAdminTelegram(
  botApi: any,
  payload: SupportReportPayload
): Promise<boolean> {
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;
  if (!adminTelegramId) {
    console.warn('[Support Service Warning] ADMIN_TELEGRAM_ID not configured; report logged locally:', payload);
    return false;
  }

  const timeStr = payload.timestamp || new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' });
  const nameDisplay = payload.userName && payload.userName !== 'User' && payload.userName !== 'Customer'
    ? payload.userName
    : 'Not Provided';

  const adminMessage =
    `🆘 *NEW SUPPORT / REPORT RECEIVED*\n\n` +
    `👤 *Name:* ${nameDisplay}\n` +
    `🆔 *User Identifier:* \`${payload.userIdentifier}\`\n` +
    `📱 *Platform:* ${payload.platform}\n` +
    `⏰ *Timestamp:* ${timeStr}\n\n` +
    `📝 *Report Details:*\n${payload.reportText}`;

  try {
    if (botApi && typeof botApi.sendMessage === 'function') {
      await botApi.sendMessage(adminTelegramId, adminMessage, { parse_mode: 'Markdown' });
      console.log(`[Support Service] ✅ Dispatched report to ADMIN_TELEGRAM_ID (${adminTelegramId})`);
      return true;
    }
  } catch (err: any) {
    console.error('[Support Service Error] Failed to send report to ADMIN_TELEGRAM_ID:', err?.message || err);
  }

  return false;
}
