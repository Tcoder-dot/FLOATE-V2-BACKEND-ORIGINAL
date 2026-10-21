import { config } from '../config.js';
import { sendWhatsAppMessage } from './whatsappService.js';
import { firestoreDb } from './firestoreService.js';

export interface VendorReport {
  id: string;
  reporterPhone: string;
  reporterName: string;
  vendorId?: string;
  vendorName?: string;
  vendorPhone?: string;
  reason: string;
  isFraudOrScam?: boolean;
  timestamp: string;
}

/**
 * Handles buyer reporting a suspicious or scam vendor on WhatsApp.
 * Logs to Firestore and alerts the Admin WhatsApp line immediately.
 */
export async function submitVendorReport(report: Omit<VendorReport, 'id' | 'timestamp'>): Promise<string> {
  const reportId = `REP-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const timestamp = new Date().toISOString();

  console.log(`[Vendor Report] ⚠️ New report submitted by +${report.reporterPhone} against "${report.vendorName || report.vendorId || 'Unknown'}" (Fraud/Scam: ${!!report.isFraudOrScam}, Reason: ${report.reason})`);

  // 1. Alert Admin on WhatsApp if configured
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || config.adminWhatsAppPhone;
  if (adminPhone) {
    const reportTypeHeader = report.isFraudOrScam
      ? `🚨 *URGENT: FRAUD / SCAM REPORT (SECURITY ESCALATION)*`
      : `⚠️ *NEW VENDOR DISPUTE / COMPLAINT REPORT*`;

    const adminAlert =
      `${reportTypeHeader}\n\n` +
      `🆔 *Report ID:* \`${reportId}\`\n` +
      `👤 *Reporter:* +${report.reporterPhone} (${report.reporterName})\n` +
      `🏬 *Reported Vendor:* ${report.vendorName || 'N/A'}\n` +
      `📱 *Vendor Phone:* ${report.vendorPhone || 'N/A'}\n` +
      `🏷️ *Vendor ID:* \`${report.vendorId || 'N/A'}\`\n\n` +
      `📝 *Customer Complaint / Details:*\n"${report.reason}"\n\n` +
      `⏰ *Time:* ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}\n\n` +
      `⚡ *Action Required:* Please review and reach out to the reporter at +${report.reporterPhone} on WhatsApp.`;

    await sendWhatsAppMessage(adminPhone, adminAlert).catch((err) => {
      console.warn('[Admin Report Alert Error]:', err?.message || err);
    });
  }

  // 2. Alert Admin on Telegram if configured
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;
  if (adminTelegramId) {
    try {
      const { getBotInstance } = await import('../bot.js');
      const bot = getBotInstance();
      if (bot && bot.token && !bot.token.includes('DummyToken')) {
        const title = report.isFraudOrScam ? `🚨 *URGENT: FRAUD / SCAM REPORT*` : `⚠️ *NEW VENDOR COMPLAINT*`;
        await bot.api.sendMessage(
          adminTelegramId,
          `${title}\n\n` +
          `🆔 *Report ID:* \`${reportId}\`\n` +
          `👤 *Reporter:* +${report.reporterPhone} (${report.reporterName})\n` +
          `🏬 *Vendor:* ${report.vendorName || 'N/A'}\n` +
          `📱 *Vendor Phone:* ${report.vendorPhone || 'N/A'}\n` +
          `📝 *Reason:* ${report.reason}`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (e) {
      // ignore
    }
  }

  return reportId;
}

/**
 * Alerts Admin when a registration requires manual compliance review (PENDING_REVIEW)
 * Dispatches to ADMIN_TELEGRAM_ID with inline Approve/Reject buttons and ADMIN_WHATSAPP_PHONE
 */
export async function alertAdminPendingReviewRegistration(pending: {
  merchantId: string;
  businessName: string;
  phone: string;
  category?: string;
  product?: string;
  price?: string;
  location?: string;
  ownerFullName?: string;
  reason?: string;
  flags?: string[];
}) {
  const flagsStr = pending.flags && pending.flags.length > 0 ? pending.flags.join(', ') : 'Regulated/Age-restricted';
  
  // 1. Alert Admin on Telegram (with inline buttons "Approve" and "Reject")
  const adminTelegramId = process.env.ADMIN_TELEGRAM_ID || config.adminTelegramId;
  if (adminTelegramId) {
    try {
      const { getBotInstance } = await import('../bot.js');
      const { InlineKeyboard } = await import('grammy');
      const bot = getBotInstance();
      if (bot && bot.token && !bot.token.includes('DummyToken')) {
        const reviewKb = new InlineKeyboard()
          .text('✅ Approve', `admin_approve_reg_${pending.merchantId}`)
          .text('❌ Reject', `admin_reject_reg_${pending.merchantId}`);

        const text =
          `⚠️ *REGISTRATION HELD FOR MANUAL REVIEW*\n\n` +
          `A new business registration was flagged by the Gemini safety gate and requires admin review before going live:\n\n` +
          `🏬 *Business:* ${pending.businessName}\n` +
          `👤 *Owner:* ${pending.ownerFullName || 'N/A'}\n` +
          `📱 *Phone / WhatsApp:* \`${pending.phone}\`\n` +
          `🏷️ *Category:* ${pending.category || 'General'}\n` +
          `📦 *Products/Services:* ${pending.product || 'N/A'}\n` +
          `💰 *Price:* ${pending.price || 'N/A'}\n` +
          `📍 *Location:* ${pending.location || 'N/A'}\n\n` +
          `🚩 *Flagged Category:* ${flagsStr}\n` +
          `📝 *Reason:* ${pending.reason || 'Regulated / Age-restricted item'}\n\n` +
          `⏰ *Time:* ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}`;

        await bot.api.sendMessage(adminTelegramId, text, {
          parse_mode: 'Markdown',
          reply_markup: reviewKb,
        });
      }
    } catch (tgErr: any) {
      console.warn('[Admin TG Pending Alert Error]:', tgErr?.message || tgErr);
    }
  }

  // 2. Alert Admin on WhatsApp if configured
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || config.adminWhatsAppPhone;
  if (adminPhone) {
    const waMsg =
      `⚠️ *REGISTRATION HELD FOR MANUAL REVIEW*\n\n` +
      `🏬 *Business:* ${pending.businessName}\n` +
      `👤 *Owner:* ${pending.ownerFullName || 'N/A'}\n` +
      `📱 *Phone / WhatsApp:* +${pending.phone}\n` +
      `🏷️ *Category:* ${pending.category || 'General'}\n` +
      `📦 *Products:* ${pending.product || 'N/A'}\n` +
      `🚩 *Flags:* ${flagsStr}\n` +
      `📝 *Reason:* ${pending.reason || 'Regulated goods'}\n\n` +
      `_Review on Telegram using /approvereg ${pending.phone} or /rejectreg ${pending.phone}_`;

    await sendWhatsAppMessage(adminPhone, waMsg).catch(() => {});
  }
}

export async function alertAdminNewVendorRegistration(vendor: {
  ownerFullName: string;
  businessName: string;
  cacNumber?: string;
  location: string;
  products: string;
  priceRange: string;
  phone: string;
}) {
  const adminPhone = process.env.ADMIN_WHATSAPP_PHONE || config.adminWhatsAppPhone;
  if (!adminPhone) return;

  const adminMsg =
    `🎉 *New Verified Vendor Registered on WhatsApp!*\n\n` +
    `👤 *Owner:* ${vendor.ownerFullName}\n` +
    `🏬 *Business:* ${vendor.businessName}\n` +
    `🏛️ *CAC Number:* ${vendor.cacNumber || 'Sole Proprietor / None'}\n` +
    `📍 *Location:* ${vendor.location}\n` +
    `📦 *Products:* ${vendor.products}\n` +
    `💰 *Prices:* ${vendor.priceRange}\n` +
    `📱 *WhatsApp Contact:* +${vendor.phone}\n` +
    `📸 *Face Verification:* ✅ Approved by Gemini Vision AI\n\n` +
    `⏰ *Time:* ${new Date().toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}`;

  await sendWhatsAppMessage(adminPhone, adminMsg).catch(() => {});
}
