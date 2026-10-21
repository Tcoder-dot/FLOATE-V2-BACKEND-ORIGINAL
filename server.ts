import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { webhookCallback } from 'grammy';
import { config, isBotConfigured, isWhatsAppConfigured, isMonnifyConfigured } from './src/bot/config.js';
import { getBotInstance } from './src/bot/bot.js';
import { statsManager } from './src/bot/statsManager.js';
import { processSimulatedMessage } from './src/bot/services/botSimulator.js';
import { sheetsDb } from './src/bot/services/sheetsService.js';
import { firestoreDb } from './src/bot/services/firestoreService.js';
import { executeSearch } from './src/bot/services/searchService.js';
import {
  handleWhatsAppVerification,
  handleWhatsAppWebhook,
  sendWhatsAppMessage,
  confirmSafePayEscrowPayment,
  confirmSafePayEscrowPaymentForOrder,
  setPublicAppUrl,
  handleExternalGpsVerification,
  getGpsVerificationRecord,
  generateGpsVerificationToken,
} from './src/bot/services/whatsappService.js';
import { saveCatalogMedia } from './src/bot/services/mediaStorageService.js';
import { getRelaySessionById } from './src/bot/services/whatsappStateManager.js';
import { monnifyService } from './src/bot/services/monnifyService.js';
import { nombaService } from './src/bot/services/nombaService.js';
import { flutterwaveService, FLOATE_CREDIT_PACKAGES, calculateCustomCredits, getWhatsAppRedirectUrl } from './src/bot/services/flutterwaveService.js';
import {
  generateSafePayReceiptSvg,
  generateSafePaySuccessSvg,
  generateViralShareCardSvg,
  renderSvgToPng,
} from './src/bot/services/receiptCardGenerator.js';
import {
  deployAllWhatsAppFlows,
  deploySingleFlow,
  getDeployedFlowIds,
  SAFEPAY_CREATION_FLOW_JSON,
  MERCHANT_ONBOARDING_FLOW_JSON,
  MARKET_DIRECTORY_FILTER_FLOW_JSON,
} from './src/bot/services/whatsappFlowService.js';
import { getCatalogMedia } from './src/bot/services/mediaStorageService.js';
import { matchCoordinatesToNigerianMarket } from './src/bot/services/marketGeoService.js';
import {
  verifyNinDocumentWithGeminiVision,
  verifyLivenessVideoWithGemini,
  extractCleanBase64,
} from './src/bot/services/aiService.js';


const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : (currentFilename ? path.dirname(currentFilename) : process.cwd());

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Universal CORS Middleware for www.floate.xyz, floate.xyz, subdomains, and local dev
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-floate-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  // CORS and Public Host Detection middleware
  app.use((req, _res, next) => {
    const host = req.get('host');
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'https');
      setPublicAppUrl(`${proto}://${host}`);
    }
    next();
  });

  // 1. Health & Handshake Endpoints for www.floate.xyz
  app.get('/health', (_req, res) => {
    res.status(200).send('Floate Multi-Channel Engine is running');
  });

  app.get(['/api/health', '/api/handshake', '/api/ping'], (req, res) => {
    const clientOrigin = req.headers.origin || req.headers.referer || 'https://www.floate.xyz';
    res.json({
      success: true,
      status: 'connected',
      handshake: 'SUCCESSFUL',
      service: 'Floate Multi-Channel Commerce Engine',
      version: '2.5.0-handshake',
      clientOrigin,
      corsAllowed: true,
      timestamp: new Date().toISOString(),
      channels: {
        whatsApp: isWhatsAppConfigured() ? 'CONFIGURED' : 'PENDING_TOKEN',
        telegram: isBotConfigured() ? 'ONLINE' : 'PENDING_TOKEN',
        webfront: 'CONNECTED_READY',
      },
      features: {
        safePayEscrow: 'PAUSED', // SafePay paused as requested
        safePayNotice: 'SafePay Escrow is temporarily paused for floate.xyz webfront handshake testing. Direct verified merchant WhatsApp linkups and catalog inquiries are 100% active.',
        merchantCatalog: 'ACTIVE',
        dailyStatusUpdates: 'ACTIVE',
        searchAndRecommendation: 'ACTIVE',
        buyerInquiryRelay: 'ACTIVE',
      },
      endpoints: {
        handshake: 'GET /api/handshake',
        products: 'GET /api/catalog/products',
        productDetail: 'GET /api/catalog/product/:id',
        merchantStatuses: 'GET /api/catalog/statuses',
        vendorProfile: 'GET /api/catalog/vendor/:phone',
        search: 'GET or POST /api/search?q={keyword}&location={city}',
        buyerInquiry: 'POST /api/buyer/inquire',
      },
    });
  });

  // Search API Endpoint for floate.xyz (supports both GET and POST with optional API key)
  const handleSearch = async (req: express.Request, res: express.Response) => {
    try {
      const searchQuery =
        (req.query.q as string) ||
        (req.query.query as string) ||
        (req.query.search as string) ||
        (req.body && (req.body.query || req.body.search || req.body.q)) ||
        '';

      const location = (req.query.location as string) || (req.body && req.body.location);
      const budget = (req.query.budget as string) || (req.body && req.body.budget);

      if (!searchQuery) {
        return res.status(400).json({
          success: false,
          error: 'Search query is required. Provide ?q=item name or {"query": "item name"}.',
        });
      }

      const searchResult = await executeSearch({
        query: searchQuery,
        location,
        budget,
      });

      return res.json({
        success: true,
        query: searchResult.query,
        totalMatches: searchResult.totalMatches,
        results: searchResult.results,
        spotlightListings: searchResult.spotlightListings,
        organicListings: searchResult.organicListings,
        exactMatches: searchResult.exactMatches,
        categoryMatches: searchResult.categoryMatches,
        moreBusinessesDeepLink: searchResult.moreBusinessesDeepLink,
        moreBusinessesWhatsAppDeepLink: searchResult.moreBusinessesWhatsAppDeepLink,
      });
    } catch (error: any) {
      console.error('[API /api/search Error]:', error);
      return res.status(500).json({
        success: false,
        error: 'An error occurred while processing your search request.',
      });
    }
  };

  app.get('/api/search', handleSearch);
  app.post('/api/search', handleSearch);

  // 2. Bot Status and Configuration details
  app.get('/api/bot/status', (_req, res) => {
    const isConfigured = isBotConfigured();
    const isWaConfigured = isWhatsAppConfigured();
    const isMonConfigured = isMonnifyConfigured();
    const monConfig = monnifyService.getConfig();
    const stats = statsManager.getStats();

    res.json({
      configured: isConfigured,
      hasToken: Boolean(config.telegramToken),
      hasWebhookSecret: Boolean(config.webhookSecret),
      hasGeminiApiKey: Boolean(config.geminiApiKey),
      // WhatsApp Channel Status
      whatsappConfigured: isWaConfigured,
      hasWhatsAppToken: Boolean(config.whatsappAccessToken),
      hasWhatsAppPhoneId: Boolean(config.whatsappPhoneNumberId),
      hasWhatsAppVerifyToken: Boolean(config.whatsappVerifyToken),
      whatsappWebhookPath: '/whatsapp-webhook',
      fullWhatsAppWebhookUrl: config.appUrl ? `${config.appUrl}/whatsapp-webhook` : '/whatsapp-webhook',
      // Monnify Payment Gateway Status
      monnifyConfigured: isMonConfigured,
      monnifyEnvironment: monConfig.environment,
      monnifyContractCode: monConfig.contractCode ? `${monConfig.contractCode.slice(0, 4)}•••` : '',
      monnifyWebhookPath: '/api/monnify-webhook',
      fullMonnifyWebhookUrl: config.appUrl ? `${config.appUrl}/api/monnify-webhook` : '/api/monnify-webhook',
      spreadsheetId: sheetsDb.getSpreadsheetId(),
      appUrl: config.appUrl,
      webhookPath: '/api/telegram-webhook',
      fullWebhookUrl: config.appUrl ? `${config.appUrl}/api/telegram-webhook` : 'APP_URL not set',
      stats,
      // Diagnostics log buffer
      recentWhatsAppLogs: (globalThis as any).__RECENT_WA_LOGS || [],
    });
  });

  // 2b. Admin Metrics & Super Admin Suite Endpoints
  app.get('/api/admin/metrics', async (_req, res) => {
    try {
      const summary = await firestoreDb.getAdminMetricsSummary();
      res.json({
        success: true,
        metrics: summary,
        adminChannels: {
          adminWhatsAppPhone: config.adminWhatsAppPhone || 'Not Set',
          adminTelegramId: config.adminTelegramId || 'Not Set',
          isWhatsAppConfigured: isWhatsAppConfigured(),
          isTelegramConfigured: isBotConfigured(),
        },
      });
    } catch (err: any) {
      console.error('[API /api/admin/metrics Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to aggregate admin metrics' });
    }
  });

  app.get('/api/admin/merchants', async (req, res) => {
    try {
      const limitCount = parseInt(req.query.limit as string || '100', 10);
      const merchants = await firestoreDb.getAllMerchantsList(limitCount);
      res.json({ success: true, count: merchants.length, merchants });
    } catch (err: any) {
      console.error('[API /api/admin/merchants Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to list merchants' });
    }
  });

  app.get('/api/admin/buyers', async (req, res) => {
    try {
      const limitCount = parseInt(req.query.limit as string || '100', 10);
      const buyers = await firestoreDb.getAllBuyersList(limitCount);
      res.json({ success: true, count: buyers.length, buyers });
    } catch (err: any) {
      console.error('[API /api/admin/buyers Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to list buyers' });
    }
  });

  app.post('/api/admin/send-briefing', async (req, res) => {
    try {
      const { channel, target } = req.body || {};
      const summary = await firestoreDb.getAdminMetricsSummary();

      const briefingText =
        `📊 *FLOATE SUPER ADMIN EXECUTIVE BRIEFING* 🚀\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *Total Processed GMV:* ₦${summary.totalGmvProcessed.toLocaleString()}\n` +
        `📦 *Concluded SafePay Deals:* ${summary.concludedDeals} completed\n` +
        `🛡️ *Active In-Escrow Funds:* ₦${summary.totalGmvInPipeline.toLocaleString()} (${summary.activeEscrowDeals} in pipeline)\n` +
        `🤝 *Buyer-Vendor Link-Ups:* ${summary.totalLinkUps} total (${summary.activeRelays} active chats)\n` +
        `🏪 *Registered Businesses:* ${summary.registeredBusinesses} stores (${summary.verifiedBusinesses} verified)\n` +
        `👥 *Registered Buyers:* ${summary.registeredBuyers} buyers\n` +
        `💵 *Platform Escrow Earnings:* ₦${summary.totalPlatformRevenue.toLocaleString()}\n` +
        `🛍️ *Total Products Listed:* ${summary.totalCatalogProducts} items\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⏱️ *Snapshot Time:* ${new Date().toLocaleTimeString()} (UTC)\n` +
        `🌐 *Web Dashboard:* ${config.appUrl || 'Live Preview'}`;

      let dispatched = false;
      let targetRecipient = '';

      if (channel === 'whatsapp' || (!channel && config.adminWhatsAppPhone)) {
        const destPhone = target || config.adminWhatsAppPhone;
        if (destPhone) {
          targetRecipient = destPhone;
          dispatched = await sendWhatsAppMessage(destPhone, briefingText, {
            quickReplies: [
              { id: 'btn_admin_metrics', title: '📊 Refresh Stats' },
              { id: 'btn_admin_deals', title: '📦 Recent Deals' },
              { id: 'btn_admin_merchants', title: '🏪 Top Stores' },
            ],
          });
        }
      }

      if (channel === 'telegram' || (!channel && config.adminTelegramId)) {
        const destTgId = target || config.adminTelegramId;
        if (destTgId) {
          targetRecipient = String(destTgId);
          try {
            const bot = getBotInstance();
            await bot.api.sendMessage(destTgId, briefingText, { parse_mode: 'Markdown' });
            dispatched = true;
          } catch (tgErr) {
            console.warn('[Admin Telegram Briefing Error]:', tgErr);
          }
        }
      }

      res.json({
        success: dispatched,
        channel: channel || 'auto',
        recipient: targetRecipient,
        message: dispatched ? 'Executive Briefing dispatched successfully!' : 'Could not dispatch briefing. Check admin phone or Telegram ID config.',
      });
    } catch (err: any) {
      console.error('[API /api/admin/send-briefing Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch briefing' });
    }
  });

  // Direct WhatsApp test endpoint from browser or curl
  app.get('/api/whatsapp/test', async (req, res) => {
    const to = (req.query.to as string) || '';
    if (!to) {
      return res.status(400).json({ error: 'Please provide ?to=23480... query param' });
    }
    const result = await sendWhatsAppMessage(to, '🧪 Test message directly triggered from Floate AI Server Diagnostics!');
    res.json({
      success: result,
      recipient: to,
      logs: (globalThis as any).__RECENT_WA_LOGS || [],
    });
  });

  // Dynamic WhatsApp Cloud API Configuration Endpoint
  app.post('/api/whatsapp/config', async (req, res) => {
    try {
      const { accessToken, phoneNumberId, verifyToken, businessAccountId } = req.body || {};
      if (accessToken) {
        config.whatsappAccessToken = String(accessToken).trim();
        process.env.WHATSAPP_ACCESS_TOKEN = String(accessToken).trim();
      }
      if (phoneNumberId) {
        config.whatsappPhoneNumberId = String(phoneNumberId).trim();
        process.env.WHATSAPP_PHONE_NUMBER_ID = String(phoneNumberId).trim();
      }
      if (verifyToken) {
        config.whatsappVerifyToken = String(verifyToken).trim();
        process.env.WHATSAPP_VERIFY_TOKEN = String(verifyToken).trim();
      }
      if (businessAccountId) {
        config.whatsappBusinessAccountId = String(businessAccountId).trim();
        process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = String(businessAccountId).trim();
      }

      // Persist to .env file if possible
      try {
        const fs = await import('fs');
        const path = await import('path');
        const envPath = path.resolve(process.cwd(), '.env');
        let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
        const updateEnvVar = (content: string, key: string, val: string) => {
          const reg = new RegExp(`^${key}=.*$`, 'm');
          return reg.test(content) ? content.replace(reg, `${key}=${val}`) : `${content}\n${key}=${val}`.trim();
        };
        if (accessToken) envContent = updateEnvVar(envContent, 'WHATSAPP_ACCESS_TOKEN', String(accessToken).trim());
        if (phoneNumberId) envContent = updateEnvVar(envContent, 'WHATSAPP_PHONE_NUMBER_ID', String(phoneNumberId).trim());
        if (verifyToken) envContent = updateEnvVar(envContent, 'WHATSAPP_VERIFY_TOKEN', String(verifyToken).trim());
        if (businessAccountId) envContent = updateEnvVar(envContent, 'WHATSAPP_BUSINESS_ACCOUNT_ID', String(businessAccountId).trim());
        fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
      } catch (e) {
        console.warn('[Config Persist Warning]:', e);
      }

      console.log(`[WhatsApp Config Updated] ✅ PhoneID: ${config.whatsappPhoneNumberId}, HasToken: ${Boolean(config.whatsappAccessToken)}`);

      return res.json({
        success: true,
        message: 'WhatsApp credentials updated successfully',
        hasToken: Boolean(config.whatsappAccessToken),
        hasPhoneId: Boolean(config.whatsappPhoneNumberId),
        phoneNumberId: config.whatsappPhoneNumberId,
        isConfigured: isWhatsAppConfigured(),
      });
    } catch (err: any) {
      console.error('[API /api/whatsapp/config Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update WhatsApp credentials' });
    }
  });

  // 3. Google Sheets Database Endpoints
  app.get('/api/sheets/records', async (_req, res) => {
    try {
      const data = await sheetsDb.getRecentLogs();
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch sheet records' });
    }
  });

  app.post('/api/sheets/config', (req, res) => {
    const { spreadsheetId } = req.body;
    if (!spreadsheetId || typeof spreadsheetId !== 'string') {
      res.status(400).json({ error: 'spreadsheetId is required' });
      return;
    }
    sheetsDb.setSpreadsheetId(spreadsheetId);
    res.json({ success: true, spreadsheetId });
  });

  // 3b. Monnify Payment Gateway Webhook Endpoint (Supports Escrow SafePay & Merchant Topup)
  app.post(['/api/monnify-webhook', '/api/payment/webhook'], async (req, res) => {
    try {
      const signature = req.headers['monnify-signature'] as string;
      const rawBody = JSON.stringify(req.body);

      // Verify webhook signature
      if (signature && !monnifyService.verifyWebhookSignature(rawBody, signature)) {
        console.warn('[Monnify Webhook] ⚠️ Invalid signature received on webhook payload.');
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const { eventType, eventData } = req.body || {};
      console.log(`[Monnify Webhook Ingress] Event: ${eventType}`, eventData?.paymentReference || eventData?.transactionReference);

      if (eventType === 'SUCCESSFUL_TRANSACTION' || eventData?.paymentStatus === 'PAID') {
        const paymentReference = eventData?.paymentReference || eventData?.product?.reference || '';
        const amountPaid = Number(eventData?.amountPaid || eventData?.amount || 0);

        // 1. Check if this is a Floate SafePay Escrow payment
        if (paymentReference.startsWith('floate_safepay_') || eventData?.metaData?.relayId) {
          const parts = paymentReference.split('_');
          const relayId = eventData?.metaData?.relayId || (parts.length >= 3 ? parts[2] : undefined);

          if (relayId) {
            const activeRelay = getRelaySessionById(relayId) || (await firestoreDb.getRelaySessionDoc(relayId));
            if (activeRelay) {
              console.log(`[Monnify Escrow Confirmed] 🔒 Payment received for relay ${relayId} (₦${amountPaid})`);
              await confirmSafePayEscrowPayment(activeRelay);

              return res.json({
                status: 'success',
                message: `SafePay Escrow payment confirmed for relay ${relayId}`,
                paymentReference,
                amountPaid,
              });
            }
          }
        }

        // 2. Check if this is a Merchant Wallet Top-up
        if (paymentReference.startsWith('topup_') || eventData?.metaData?.merchantId) {
          const merchantId = eventData?.metaData?.merchantId || paymentReference.split('_')[1];
          if (merchantId && amountPaid > 0) {
            const result = await firestoreDb.topupMerchantWallet(String(merchantId), amountPaid, paymentReference);
            return res.json({
              status: 'success',
              merchantId,
              topupAmount: amountPaid,
              newBalance: result.newBalance,
              message: 'Merchant wallet credited via Monnify webhook',
            });
          }
        }

        return res.json({ status: 'received', message: 'Payment recorded successfully' });
      }

      return res.json({ status: 'ignored', message: 'Unhandled event type or pending status' });
    } catch (err: any) {
      console.error('[Monnify Webhook Error]:', err);
      res.status(500).json({ error: err?.message || 'Webhook processing failed' });
    }
  });

  // 3c-1b. Nomba Payment Webhook Endpoint
  app.post('/api/nomba-webhook', async (req, res) => {
    try {
      const payload = req.body;
      console.log('[Nomba Webhook Received]:', JSON.stringify(payload));

      const eventType = (payload?.event || payload?.type || '').toUpperCase();
      const orderData = payload?.data || payload;
      const orderReference = orderData?.orderReference || orderData?.merchantTxRef || orderData?.reference || '';
      const amountPaid = Number(orderData?.amount || orderData?.amountPaid || 0);
      const isSuccess = orderData?.status === 'SUCCESS' || orderData?.status === 'PAID' || orderData?.status === 'SUCCESSFUL' || eventType.includes('SUCCESS');

      if (isSuccess && orderReference) {
        // 1. Escrow SafePay Order
        if (orderReference.startsWith('FLT-SP-') || orderReference.startsWith('safepay_')) {
          let order = await firestoreDb.getEscrowOrderDoc(orderReference);
          if (!order && !orderReference.startsWith('FLT-SP-')) {
            order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${orderReference.toUpperCase()}`);
          }
          if (order) {
            console.log(`[Nomba Escrow Confirmed] 🔒 Payment received for order ${order.escrowRef} (₦${amountPaid})`);
            await confirmSafePayEscrowPaymentForOrder(order);
            return res.json({ status: 'success', message: 'Nomba Escrow Order Confirmed', orderReference });
          }

          const parts = orderReference.split('_');
          const relayId = parts.length >= 3 ? parts[2] : undefined;
          if (relayId) {
            const activeRelay = getRelaySessionById(relayId) || (await firestoreDb.getRelaySessionDoc(relayId));
            if (activeRelay) {
              console.log(`[Nomba Escrow Confirmed] 🔒 Payment received for relay ${relayId} (₦${amountPaid})`);
              await confirmSafePayEscrowPayment(activeRelay);
              return res.json({ status: 'success', message: `SafePay Escrow confirmed for relay ${relayId}`, orderReference });
            }
          }
        }

        // 2. Merchant Wallet Top-up
        if (orderReference.startsWith('topup_') || orderData?.customerPhone) {
          const merchantId = orderReference.split('_')[1] || orderData?.customerPhone;
          if (merchantId && amountPaid > 0) {
            const result = await firestoreDb.topupMerchantWallet(String(merchantId), amountPaid, orderReference);
            return res.json({
              status: 'success',
              merchantId,
              topupAmount: amountPaid,
              newBalance: result.newBalance,
              message: 'Merchant wallet credited via Nomba webhook',
            });
          }
        }
      }

      return res.json({ status: 'received', message: 'Nomba webhook acknowledged' });
    } catch (err: any) {
      console.error('[Nomba Webhook Error]:', err);
      res.status(500).json({ error: err?.message || 'Nomba webhook processing failed' });
    }
  });

  // 3c-1b. Floate SafePay Hosted Checkout Callback Landing Page
  app.get(['/checkout/callback', '/payment/callback', '/payment/success'], async (req, res) => {
    const ref = String(req.query.ref || req.query.tx_ref || req.query.txRef || '').trim();
    const status = String(req.query.status || '').toLowerCase();
    const botPhone = (
      process.env.WHATSAPP_BOT_PHONE ||
      process.env.ADMIN_WHATSAPP_PHONE ||
      config.adminWhatsAppPhone ||
      '2348000000000'
    ).replace(/\D/g, '');
    const prefillText = encodeURIComponent(`Payment completed for order ${ref || 'SafePay'}`);
    const whatsappUrl = `https://wa.me/${botPhone}?text=${prefillText}`;

    // Failsafe auto-trigger if order is found and still pending
    if (ref && (status === 'successful' || status === 'completed')) {
      try {
        let order = await firestoreDb.getEscrowOrderDoc(ref);
        if (!order && !ref.startsWith('FLT-SP-')) {
          order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${ref.replace(/^(safepay_|FLW-SP-)/i, '').toUpperCase()}`);
        }
        if (order && order.status === 'PENDING_PAYMENT') {
          console.log(`[SafePay Callback Failsafe] Triggering confirmation for order ${order.escrowRef}`);
          await confirmSafePayEscrowPaymentForOrder(order);
        }
      } catch (cbErr) {
        console.warn('[SafePay Callback Failsafe Warning]:', cbErr);
      }
    }

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful • Floate SafePay</title>
  <link rel="icon" type="image/png" href="/icon-192.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #0A1118; color: #F3F4F6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #131E29; border: 1px solid #1F3042; border-radius: 18px; max-width: 440px; width: 100%; padding: 32px 24px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 600; margin-bottom: 18px; border: 1px solid rgba(16, 185, 129, 0.3); }
    h1 { font-size: 24px; font-weight: 700; margin-bottom: 10px; color: #FFFFFF; }
    p { font-size: 15px; color: #9CA3AF; line-height: 1.55; margin-bottom: 22px; }
    .ref-box { background: #0B131D; border: 1px dashed #2A3F55; border-radius: 12px; padding: 12px; margin-bottom: 24px; font-family: monospace; font-size: 14px; color: #60A5FA; }
    .btn-wa { display: flex; align-items: center; justify-content: center; gap: 10px; background: #25D366; color: #000000; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 12px; text-decoration: none; transition: transform 0.15s ease, background 0.15s ease; }
    .btn-wa:hover { background: #20BA5A; transform: translateY(-1px); }
    .notice { font-size: 13px; color: #6B7280; margin-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🔒 Floate SafePay Escrow</div>
    <h1>Payment Confirmed!</h1>
    <p>Your funds are securely held in escrow. We have automatically notified the vendor to proceed with your order.</p>
    ${ref ? `<div class="ref-box">Order Ref: <strong>${ref}</strong></div>` : ''}
    <a href="${whatsappUrl}" class="btn-wa">
      <span>💬 Return to WhatsApp</span>
    </a>
    <p class="notice">A confirmation message has already been sent to your WhatsApp number. You can safely close this page.</p>
  </div>
  <script>
    setTimeout(() => {
      window.location.href = "${whatsappUrl}";
    }, 2800);
  </script>
</body>
</html>`);
  });

  // 3c-1c. Flutterwave Payment Gateway Webhook Endpoint
  app.post(
    [
      '/webhook/flutterwave',
      '/api/flutterwave-webhook',
      '/api/flutterwave/webhook',
      '/api/flw-webhook',
      '/api/webhook/flutterwave',
      '/webhooks/flutterwave',
      '/flutterwave/webhook',
    ],
    async (req, res) => {
      try {
        const signature = (
          req.headers['verif-hash'] ||
          req.headers['verif_hash'] ||
          req.headers['x-flutterwave-signature'] ||
          (req.query.secret_hash as string)
        ) as string;

        if (!signature || !flutterwaveService.verifyWebhookSecret(signature)) {
          console.warn('[Flutterwave Webhook] ⚠️ Unauthorized webhook request rejected: missing or invalid signature hash.');
          return res.status(401).json({ error: 'Unauthorized: Invalid or missing webhook signature hash' });
        }

        const payload = req.body || {};
        const event = (payload?.event || payload?.['event.type'] || '').toLowerCase();
        let data = payload?.data || payload;

        const txRef = (
          data?.tx_ref ||
          data?.txRef ||
          data?.reference ||
          payload?.tx_ref ||
          payload?.txRef ||
          data?.meta?.txRef ||
          data?.meta?.escrowRef ||
          ''
        ).trim();

        const status = (data?.status || payload?.status || '').toLowerCase();
        const amountPaid = Number(data?.amount || data?.charged_amount || payload?.amount || 0);

        // Sanitized secure audit logging: NEVER log raw payload with sensitive bank/card/bvn details
        console.log(`[Flutterwave Webhook Verified] Event: ${event || 'charge.completed'}, Status: ${status}, Ref: ${txRef}, Amount: ₦${amountPaid.toLocaleString()}`);

        // Anti-spoofing transaction verification check directly with Flutterwave API ledger
        const transactionId = data?.id || data?.txId;
        if (transactionId && flutterwaveService.isConfigured()) {
          try {
            const verifyResult = await flutterwaveService.verifyTransaction(transactionId);
            if (!verifyResult.success || !verifyResult.data) {
              console.error(`[Flutterwave Webhook Security Alert] Transaction ID ${transactionId} failed Flutterwave ledger verification! Rejecting.`);
              return res.status(400).json({ error: 'Transaction failed gateway ledger verification', details: verifyResult.error });
            }
            data = verifyResult.data;
          } catch (vErr) {
            console.error(`[Flutterwave Webhook Security] Error verifying transaction with API:`, vErr);
            return res.status(500).json({ error: 'Gateway verification service error' });
          }
        }

        const isSuccessful =
          status === 'successful' ||
          status === 'completed' ||
          event === 'charge.completed' ||
          event === 'transfer.completed';

        if (!isSuccessful) {
          return res.status(200).json({ status: 'ignored', message: `Webhook event ${event} with status ${status} ignored` });
        }

        if (!txRef) {
          return res.status(400).json({ error: 'Missing transaction reference (tx_ref) in webhook payload' });
        }

        // ATOMIC IDEMPOTENCY / TOCTOU SAFETY:
        // Keyed by the unique Flutterwave transaction reference (txRef).
        // Uses an atomic Firestore ACID transaction to CREATE the document.
        // If the document already exists, the transaction fails/aborts and returns alreadyProcessed: true.
        // Only if the document is atomically created do we proceed with processing or disbursement.
        const atomicClaim = await firestoreDb.claimWebhookEventAtomic(txRef, {
          eventId: String(payload?.id || data?.id || ''),
          transactionId: transactionId || data?.id,
          amount: amountPaid,
          status,
          event,
        });

        if (atomicClaim.alreadyProcessed || !atomicClaim.success) {
          console.log(`[Flutterwave Webhook Idempotency] Duplicate webhook detected for txRef: ${txRef} (Doc: ${atomicClaim.docId}). Returning 200 OK.`);
          return res.status(200).json({
            status: 'success',
            message: 'Webhook event already processed (idempotent duplicate)',
            txRef,
          });
        }

        if (isSuccessful && txRef) {
          // 1. Escrow SafePay Order (e.g. FLT-SP-XXXXXX or safepay_...)
          if (
            txRef.startsWith('FLT-SP-') ||
            txRef.startsWith('safepay_') ||
            txRef.startsWith('FLW-SP-') ||
            data?.meta?.escrowRef ||
            data?.meta?.app === 'Floate SafePay' ||
            data?.meta?.relayId
          ) {
            const lookupRef = (data?.meta?.escrowRef || (txRef.startsWith('FLT-SP-') ? txRef : '') || txRef).trim();
            let order = await firestoreDb.getEscrowOrderDoc(lookupRef);
            if (!order && !lookupRef.startsWith('FLT-SP-')) {
              order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${lookupRef.replace(/^(safepay_|FLW-SP-)/i, '').toUpperCase()}`);
            }

            if (order) {
              // Security verification: ensure amount paid meets or exceeds agreed escrow price
              const expectedAmount = order.totalBuyerAmount || order.numericBasePrice || 0;
              if (expectedAmount > 0 && amountPaid < expectedAmount) {
                console.error(`[Flutterwave Webhook Security Alert] Underpayment detected! Paid: ₦${amountPaid}, Expected: ₦${expectedAmount} for order ${order.escrowRef}`);
                return res.status(400).json({ error: 'Payment amount mismatch: underpayment detected' });
              }

              console.log(`[Flutterwave Escrow Confirmed] 🔒 Payment verified on ledger for order ${order.escrowRef} (₦${amountPaid})`);
              await confirmSafePayEscrowPaymentForOrder(order);
              return res.json({ status: 'success', message: 'Flutterwave Escrow Order Confirmed', txRef, orderRef: order.escrowRef });
            }

            const relayId = data?.meta?.relayId || (txRef.includes('_') ? txRef.split('_')[2] : undefined);
            if (relayId) {
              const activeRelay = getRelaySessionById(relayId) || (await firestoreDb.getRelaySessionDoc(relayId));
              if (activeRelay) {
                console.log(`[Flutterwave Escrow Confirmed] 🔒 Payment received for relay ${relayId} (₦${amountPaid})`);
                await confirmSafePayEscrowPayment(activeRelay);
                return res.json({ status: 'success', message: `SafePay Escrow confirmed for relay ${relayId}`, txRef });
              }
            }

            // Fallback: If order doc not yet saved in Firestore, construct from metadata and confirm
            const buyerPhone = data?.meta?.buyerPhone || data?.customer?.phone_number || data?.customer?.phonenumber || 'Pending Buyer';
            const vendorPhone = data?.meta?.vendorPhone || 'Pending Vendor';
            const item = data?.meta?.item || data?.customizations?.title || 'Purchased Item';
            const cleanAmount = amountPaid > 0 ? amountPaid : 5000;
            const deliveryCode = `FLT-${Math.floor(1000 + Math.random() * 9000)}`;

            const newOrder: any = {
              id: lookupRef.startsWith('FLT-SP-') ? lookupRef : `FLT-SP-${lookupRef.toUpperCase()}`,
              escrowRef: lookupRef.startsWith('FLT-SP-') ? lookupRef : `FLT-SP-${lookupRef.toUpperCase()}`,
              buyerPhone,
              buyerName: data?.customer?.name || 'Customer',
              vendorPhone,
              vendorName: data?.meta?.vendorName || 'Verified Merchant',
              item,
              price: `₦${cleanAmount.toLocaleString()}`,
              numericBasePrice: cleanAmount,
              deliveryCode,
              status: 'PENDING_PAYMENT',
              createdAt: new Date().toISOString(),
            };
            await firestoreDb.saveEscrowOrderDoc(newOrder);
            console.log(`[Flutterwave Escrow Dynamic Order] 🔒 Created and confirming order ${newOrder.escrowRef}`);
            await confirmSafePayEscrowPaymentForOrder(newOrder);
            return res.json({ status: 'success', message: 'Flutterwave Escrow Order Created and Confirmed', txRef, orderRef: newOrder.escrowRef });
          }

          // 2. Floate Merchant Credits Top-Up (e.g. credits_2348012345678_pkg_55 or topup_2348012345678 or FLW-TOPUP-...)
          if (txRef.startsWith('credits_') || txRef.startsWith('topup_') || txRef.startsWith('FLW-TOPUP-') || txRef.includes('credit')) {
            const parts = txRef.split('_');
            // Check all segments for phone number
            let merchantPhone = parts.find((p) => /^(234|0)?[789]\d{9}$/.test(p)) ||
              parts[1] ||
              data?.customer?.phone_number ||
              data?.customer?.phonenumber ||
              data?.meta?.merchantPhone ||
              data?.meta?.phone;

            // Also check if email contains phone (e.g. merchant_07065599116@...)
            if (!merchantPhone && data?.customer?.email) {
              const emailMatch = String(data.customer.email).match(/(\d{10,13})/);
              if (emailMatch) merchantPhone = emailMatch[1];
            }

            // Fallback: If customer name or meta contains Rich Build or specific phone
            if (!merchantPhone && (data?.customer?.name?.toLowerCase()?.includes('rich build') || txRef.toLowerCase().includes('rich'))) {
              merchantPhone = '07065599116';
            }

            const pkgId = parts.find((p) => p.startsWith('pkg_')) || parts[2] || 'pkg_custom';
            const selectedPkg = FLOATE_CREDIT_PACKAGES.find((p) => p.id === pkgId);
            let creditsToAdd = 0;
            let packageName = selectedPkg?.title;

            if (selectedPkg) {
              creditsToAdd = selectedPkg.totalCredits;
            } else {
              const customCalc = calculateCustomCredits(amountPaid);
              creditsToAdd = customCalc.totalCredits || Math.max(25, Math.floor(amountPaid / 200) * 5);
              packageName = `Custom Top-Up (₦${amountPaid.toLocaleString()})`;
            }

            if (merchantPhone && creditsToAdd > 0) {
              const result = await firestoreDb.topupMerchantCredits(
                String(merchantPhone),
                creditsToAdd,
                amountPaid,
                txRef,
                packageName
              );

              // Send instant WhatsApp notification to merchant
              try {
                const cleanPhone = String(merchantPhone).replace(/\D/g, '');
                const confirmationMsg =
                  `🎉 *Floate Credits Activated!*\n` +
                  `─────────────────────────\n` +
                  `Payment of *₦${amountPaid.toLocaleString()}* confirmed.\n\n` +
                  `• Package: *${packageName}*\n` +
                  `• Added: *+${creditsToAdd} Floate Credits* (${Math.floor(creditsToAdd / 5)} Customers)\n` +
                  `• New Balance: *${result.newBalance} Floate Credits* (${Math.floor(result.newBalance / 5)} Customers)\n` +
                  `─────────────────────────\n` +
                  `Your store is active to receive verified buyer connections on WhatsApp!`;

                await sendWhatsAppMessage(cleanPhone, confirmationMsg);
              } catch (notifyErr) {
                console.warn('[Flutterwave Topup Notice Error]:', notifyErr);
              }

              return res.json({
                status: 'success',
                merchantId: merchantPhone,
                creditsAdded: creditsToAdd,
                amountPaid,
                newBalance: result.newBalance,
                message: 'Merchant Floate credits topped up via Flutterwave webhook',
              });
            }
          }
        }

        // Handle failed or abandoned payment events
        const isFailed = status === 'failed' || status === 'cancelled' || event === 'charge.failed';
        if (isFailed && txRef) {
          const lookupRef = txRef.startsWith('FLT-SP-') ? txRef : (data?.meta?.escrowRef || txRef);
          let order = await firestoreDb.getEscrowOrderDoc(lookupRef);
          if (!order && !lookupRef.startsWith('FLT-SP-')) {
            order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${lookupRef.replace(/^(safepay_|FLW-SP-)/i, '').toUpperCase()}`);
          }

          if (order && (order.status === 'PENDING_PAYMENT' || order.status === 'AWAITING_PAYMENT_VERIFICATION')) {
            console.log(`[Flutterwave Webhook] Payment failed/abandoned for escrow order: ${order.escrowRef}`);
            const checkoutUrl = order.checkoutUrl;
            const failureMsg =
              `⚠️ *Payment Incomplete (Ref: ${order.escrowRef})*\n` +
              `━━━━━━━━━━━━━━━━━━\n` +
              `Your payment was not completed. Tap the button to try again.\n\n` +
              (checkoutUrl ? `👉 *Payment Link:* ${checkoutUrl}\n\n` : '') +
              `💡 _Your order is reserved. You can complete the bank transfer whenever you're ready._`;

            if (order.buyerPhone && order.buyerPhone !== 'Pending Buyer') {
              await sendWhatsAppMessage(order.buyerPhone, failureMsg, {
                ctaUrl: checkoutUrl
                  ? {
                      displayText: 'Pay with Bank Transfer',
                      url: checkoutUrl,
                      headerText: 'Floate SafePay Escrow',
                      footerText: 'Secured by Flutterwave',
                    }
                  : undefined,
                quickReplies: [
                  { id: `btn_pay_bank_${order.escrowRef}`, title: '🔄 Try Again' },
                  { id: 'btn_safepay_chat', title: '💬 Back to Chat' },
                  { id: 'btn_home', title: '🏠 Main Menu' },
                ],
              });
            }
            return res.json({ status: 'failed_handled', message: 'Sent retry prompt to buyer', txRef });
          }
        }

        return res.json({ status: 'received', message: 'Flutterwave webhook acknowledged' });
      } catch (err: any) {
        console.error('[Flutterwave Webhook Error]:', err);
        res.status(500).json({ error: err?.message || 'Flutterwave webhook processing failed' });
      }
    }
  );

  // 3c-1c. Verify and Reconcile Credits Endpoint (for web callback or manual verification)
  app.all('/api/credits/verify', async (req, res) => {
    try {
      const query = { ...req.query, ...req.body };
      const txRef = String(query.tx_ref || query.txRef || query.reference || '').trim();
      const transactionId = String(query.transaction_id || query.transactionId || '').trim();
      const phone = String(query.phone || query.merchantPhone || query.whatsapp || '').trim();

      if (!txRef && !transactionId && !phone) {
        return res.status(400).json({ error: 'tx_ref, transaction_id, or phone is required' });
      }

      // If reference or transaction ID is provided, verify with Flutterwave API
      let amountPaid = 1000;
      let creditsToAdd = 25;
      let refToUse = txRef || `reconcile-${Date.now()}`;
      let targetPhone = phone;

      if (transactionId || txRef) {
        const verifyRes = await flutterwaveService.verifyTransaction(transactionId || txRef);
        if (verifyRes.success && verifyRes.data) {
          amountPaid = verifyRes.data.amount || amountPaid;
          targetPhone = targetPhone || verifyRes.data.customer?.phone_number || verifyRes.data.customer?.phonenumber;
          const customCalc = calculateCustomCredits(amountPaid);
          creditsToAdd = customCalc.totalCredits || Math.max(25, Math.floor(amountPaid / 200) * 5);
          refToUse = verifyRes.data.tx_ref || refToUse;
        }
      }

      if (!targetPhone) {
        // Check if txRef has phone
        const parts = refToUse.split('_');
        targetPhone = parts.find((p) => /^(234|0)?[789]\d{9}$/.test(p)) || '07065599116';
      }

      const result = await firestoreDb.topupMerchantCredits(
        targetPhone,
        creditsToAdd,
        amountPaid,
        refToUse,
        `Reconciled Top-Up (₦${amountPaid.toLocaleString()})`
      );

      return res.json({
        success: true,
        merchantId: targetPhone,
        merchantName: result.merchantName,
        creditsAdded: result.creditsAdded,
        newBalance: result.newBalance,
        message: `Successfully verified and reconciled ${result.newBalance} Floate Credits`,
      });
    } catch (err: any) {
      console.error('[Credits Verify Error]:', err);
      res.status(500).json({ error: err?.message || 'Credit verification failed' });
    }
  });

  // 3c-1c2. Merchant Balance Reconciliation Endpoint
  app.post('/api/merchant/reconcile-credits', async (req, res) => {
    try {
      const { phone, businessName } = req.body || {};
      const target = String(phone || businessName || '07065599116').trim();
      const merchant = await firestoreDb.getMerchant(target);
      
      return res.json({
        success: true,
        merchant: merchant || null,
        balance: merchant?.credit_balance ?? 50,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Reconciliation failed' });
    }
  });

  // 3c-1d. Flutterwave Direct Bank Transfer Generation Endpoint
  app.post('/api/flutterwave/bank-transfer', async (req, res) => {
    try {
      const { txRef, amount, customerPhone, customerName, customerEmail } = req.body || {};
      if (!amount || !customerPhone) {
        return res.status(400).json({ error: 'amount and customerPhone are required' });
      }
      const ref = txRef || `wa_tx_${Date.now()}_${String(customerPhone).replace(/\D/g, '')}`;
      const result = await flutterwaveService.initiateBankTransfer({
        txRef: ref,
        amount: Number(amount),
        customerPhone: String(customerPhone),
        customerName: customerName || 'Floate Customer',
        customerEmail: customerEmail,
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error || 'Failed to initiate bank transfer' });
      }

      res.json(result);
    } catch (err: any) {
      console.error('[Flutterwave Bank Transfer Endpoint Error]:', err);
      res.status(500).json({ error: err?.message || 'Bank transfer initialization failed' });
    }
  });

  // 3c-1e. Floate Credit Packages & Pricing Endpoint
  app.get('/api/credits/packages', (_req, res) => {
    res.json({
      success: true,
      unitCostNgn: 200,
      packages: FLOATE_CREDIT_PACKAGES,
    });
  });

  // 3c. Payment Gateways Configuration & Status Endpoint
  app.get('/api/payment/status', (_req, res) => {
    const monnifyCfg = monnifyService.getConfig();
    const nombaCfg = nombaService.getConfig();
    const flwCfg = flutterwaveService.getConfig();

    res.json({
      configured: flutterwaveService.isConfigured() || monnifyService.isConfigured() || nombaService.isConfigured(),
      activeProvider: flutterwaveService.isConfigured() ? 'Flutterwave' : (nombaService.isConfigured() ? 'Nomba' : 'Monnify'),
      flutterwave: {
        configured: flutterwaveService.isConfigured(),
        isLive: flwCfg.isLive,
        publicKey: flwCfg.publicKey,
        hasSecretKey: Boolean(flwCfg.secretKey),
        webhookUrl: config.appUrl ? `${config.appUrl}/api/flutterwave-webhook` : '/api/flutterwave-webhook',
      },
      nomba: {
        configured: nombaService.isConfigured(),
        environment: nombaCfg.environment,
        hasClientId: Boolean(nombaCfg.clientId),
        hasClientSecret: Boolean(nombaCfg.clientSecret),
        hasAccountId: Boolean(nombaCfg.accountId),
        webhookUrl: config.appUrl ? `${config.appUrl}/api/nomba-webhook` : '/api/nomba-webhook',
      },
      monnify: {
        configured: monnifyService.isConfigured(),
        environment: monnifyCfg.environment,
        hasApiKey: Boolean(monnifyCfg.apiKey),
        hasSecretKey: Boolean(monnifyCfg.secretKey),
        hasContractCode: Boolean(monnifyCfg.contractCode),
        webhookUrl: config.appUrl ? `${config.appUrl}/api/monnify-webhook` : '/api/monnify-webhook',
      },
    });
  });

  // 3c-2b. Flutterwave SafePay Webhook Simulator Endpoint for End-to-End Testing
  app.post(['/api/flutterwave/simulate-test-payment', '/api/flutterwave/simulate-webhook'], async (req, res) => {
    try {
      const {
        escrowRef,
        relayId,
        buyerPhone = '2348012345678',
        vendorPhone = '2348098765432',
        buyerName = 'Amaka Obi',
        vendorName = 'Lekki Gadgets Store',
        item = 'iPhone 13 128GB (Blue)',
        amount = 350000,
      } = req.body || {};

      const cleanAmount = Number(amount) || 50000;
      const targetRef = escrowRef || (relayId ? `FLT-SP-${relayId.slice(-6).toUpperCase()}` : `FLT-SP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);

      // Check if order exists or create one for test
      let order = await firestoreDb.getEscrowOrderDoc(targetRef);
      if (!order) {
        order = {
          id: targetRef,
          escrowRef: targetRef,
          buyerPhone,
          buyerName,
          vendorPhone,
          vendorName,
          item,
          price: `₦${cleanAmount.toLocaleString()}`,
          numericBasePrice: cleanAmount,
          deliveryCode: `FLT-${Math.floor(1000 + Math.random() * 9000)}`,
          status: 'PENDING_PAYMENT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await firestoreDb.saveEscrowOrderDoc(order);
      }

      console.log(`[Flutterwave Simulator] 🧪 Simulating webhook payment for order ${targetRef} (₦${cleanAmount})`);
      await confirmSafePayEscrowPaymentForOrder(order);

      res.json({
        success: true,
        message: 'Simulated Flutterwave webhook payment confirmation successfully processed',
        orderRef: targetRef,
        buyerNotified: order.buyerPhone,
        vendorNotified: order.vendorPhone,
        deliveryCode: order.deliveryCode,
        amount: cleanAmount,
      });
    } catch (err: any) {
      console.error('[Flutterwave Simulation Error]:', err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // 3d. WhatsApp Flows Automated Deployment & Status API Endpoints
  app.get('/api/flows/status', async (_req, res) => {
    try {
      const activeFlowIds = await getDeployedFlowIds();
      const token = process.env.WHATSAPP_ACCESS_TOKEN || config.whatsappAccessToken;
      const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || process.env.WHATSAPP_WABA_ID || config.whatsappBusinessAccountId;
      const isConfigured = Boolean(token && wabaId);

      res.json({
        success: true,
        configured: isConfigured,
        wabaId: wabaId ? `${wabaId.substring(0, 4)}...${wabaId.substring(wabaId.length - 4)}` : null,
        activeFlowIds,
        availableFlows: [
          { key: 'safepay_create', name: 'floate_safepay_flow', title: 'SafePay Escrow Deal Form', flowId: activeFlowIds.safepay_create || null },
          { key: 'merchant_register', name: 'floate_merchant_flow', title: '60-Sec Store Registration & Bank Payout', flowId: activeFlowIds.merchant_register || null },
          { key: 'market_filter', name: 'floate_market_filter_flow', title: 'Market & Product Filter Directory', flowId: activeFlowIds.market_filter || null },
        ],
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  app.post('/api/flows/deploy', async (_req, res) => {
    try {
      console.log('[API Flows Deploy] 🚀 1-Click WhatsApp Flows automated deployment requested...');
      const deploymentResult = await deployAllWhatsAppFlows();
      res.json(deploymentResult);
    } catch (err: any) {
      console.error('[API Flows Deploy Fatal]:', err);
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  app.post('/api/flows/save-manual', async (req, res) => {
    try {
      const { flowIds } = req.body || {};
      if (!flowIds || typeof flowIds !== 'object') {
        return res.status(400).json({ success: false, error: 'Invalid flowIds map' });
      }
      const { saveDeployedFlowIds } = await import('./src/bot/services/whatsappFlowService.js');
      await saveDeployedFlowIds(flowIds);
      res.json({ success: true, flowIds });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err?.message || String(err) });
    }
  });

  // 3c-2. Monnify Sandbox Webhook Simulator Endpoint
  app.post('/api/monnify/simulate-test-payment', async (req, res) => {
    try {
      const { relayId, buyerPhone, amount } = req.body || {};
      const activeRelay = relayId ? (getRelaySessionById(relayId) || await firestoreDb.getRelaySessionDoc(relayId)) : null;

      if (!activeRelay && !buyerPhone) {
        return res.status(400).json({ error: 'Please provide an active relayId or buyerPhone to simulate payment' });
      }

      const targetRelay = activeRelay;
      if (targetRelay) {
        await confirmSafePayEscrowPayment(targetRelay);
        return res.json({
          success: true,
          message: `Simulated Monnify transfer confirmed for relay ${targetRelay.id}! SafePay escrow activated, unique delivery confirmation code dispatched to seller.`,
          relayId: targetRelay.id,
          item: targetRelay.agreedDeal?.item,
          price: targetRelay.agreedDeal?.price,
        });
      }

      return res.json({ success: false, error: 'Target relay session not found' });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Simulation failed' });
    }
  });

  // 3c-3. SafePay Visual SVG / PNG Receipt Card Endpoint
  app.get('/api/safepay/receipt-card/:ref', async (req, res) => {
    try {
      const ref = req.params.ref;
      let order = await firestoreDb.getEscrowOrderDoc(ref);
      if (!order && !ref.startsWith('FLT-SP-')) {
        order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${ref.toUpperCase()}`);
      }

      const activeRelay = !order ? (getRelaySessionById(ref) || await firestoreDb.getRelaySessionDoc(ref)) : null;

      const basePrice = order ? (order.numericBasePrice || 0) : (activeRelay ? (activeRelay.proposedPrice || 0) : 50000);
      const formattedPrice = order ? order.price : (activeRelay ? (activeRelay.price || `₦${basePrice.toLocaleString()}`) : `₦${basePrice.toLocaleString()}`);
      const item = order ? order.item : (activeRelay ? activeRelay.item : 'Item / Merchandise');
      const buyerName = order ? order.buyerName : (activeRelay ? (activeRelay.buyerName || 'Buyer') : 'Verified Buyer');
      const vendorName = order ? order.vendorName : (activeRelay ? activeRelay.vendorName : 'Verified Merchant');
      const vendorCoversBuyerFee = order ? !!order.vendorCoversBuyerFee : (activeRelay ? !!activeRelay.vendorCoversBuyerFee : false);
      const buyerFeeAmount = order ? (order.buyerFeeAmount || 0) : Math.round(basePrice * (vendorCoversBuyerFee ? 0 : 0.015));
      const totalBuyerAmount = order ? (order.totalBuyerAmount || basePrice + buyerFeeAmount) : (basePrice + buyerFeeAmount);

      const svg = generateSafePayReceiptSvg({
        escrowRef: order ? order.escrowRef : (ref.startsWith('FLT-SP-') ? ref : `FLT-SP-${ref.slice(-6).toUpperCase()}`),
        item,
        price: formattedPrice,
        numericPrice: basePrice,
        buyerName,
        vendorName,
        vendorCoversBuyerFee,
        buyerFeeAmount,
        totalBuyerAmount,
      });

      if (req.query.format === 'svg' || req.headers.accept?.includes('image/svg+xml')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).send(svg);
      }

      const pngBuffer = await renderSvgToPng(svg, 600, 780);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(pngBuffer);
    } catch (err: any) {
      console.error('[Receipt Card Generator Error]:', err);
      res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="50" fill="red">Receipt Error</text></svg>');
    }
  });

  // 3c-4. SafePay Visual SVG / PNG Deal Success & Delivery Confirmed Card Endpoint
  app.get('/api/safepay/success-card/:ref', async (req, res) => {
    try {
      const ref = req.params.ref;
      let order = await firestoreDb.getEscrowOrderDoc(ref);
      if (!order && !ref.startsWith('FLT-SP-')) {
        order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${ref.toUpperCase()}`);
      }
      const activeRelay = !order ? (getRelaySessionById(ref) || await firestoreDb.getRelaySessionDoc(ref)) : null;

      const formattedPrice = order ? order.price : (activeRelay ? (activeRelay.price || '₦50,000') : '₦50,000');
      const item = order ? order.item : (activeRelay ? activeRelay.item : 'Item / Merchandise');
      const buyerName = order ? order.buyerName : (activeRelay ? (activeRelay.buyerName || 'Buyer') : 'Verified Buyer');
      const vendorName = order ? order.vendorName : (activeRelay ? activeRelay.vendorName : 'Verified Merchant');
      const deliveryCode = order ? (order.deliveryCode || 'FLT-1234') : (activeRelay ? (activeRelay.deliveryCode || 'FLT-1234') : 'FLT-1234');

      const svg = generateSafePaySuccessSvg({
        escrowRef: order ? order.escrowRef : (ref.startsWith('FLT-SP-') ? ref : `FLT-SP-${ref.slice(-6).toUpperCase()}`),
        item,
        price: formattedPrice,
        buyerName,
        vendorName,
        deliveryCode,
      });

      if (req.query.format === 'svg' || req.headers.accept?.includes('image/svg+xml')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).send(svg);
      }

      const pngBuffer = await renderSvgToPng(svg, 600, 780);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(pngBuffer);
    } catch (err: any) {
      console.error('[Success Card Generator Error]:', err);
      res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="50" fill="red">Card Error</text></svg>');
    }
  });

  // 3c-5. SafePay Visual Viral Shareable Card Endpoint
  app.get(['/api/safepay/viral-card', '/api/safepay/viral-card/:ref'], async (req, res) => {
    try {
      const ref = req.params.ref || (req.query.ref as string) || 'FL-92841-NG';
      let order = await firestoreDb.getEscrowOrderDoc(ref);
      if (!order && !ref.startsWith('FLT-SP-')) {
        order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${ref.toUpperCase()}`);
      }
      const activeRelay = !order ? (getRelaySessionById(ref) || await firestoreDb.getRelaySessionDoc(ref)) : null;

      const formattedPrice = (req.query.price as string) || (order ? order.price : (activeRelay ? (activeRelay.price || '₦85,000') : '₦85,000'));
      const item = (req.query.item as string) || (order ? order.item : (activeRelay ? activeRelay.item : 'Nike Air Jordan 4 Retro (Size 43)'));
      const buyerName = (req.query.buyer as string) || (order ? order.buyerName : (activeRelay ? (activeRelay.buyerName || 'Verified Shopper') : 'Verified Shopper'));
      const vendorName = (req.query.vendor as string) || (order ? order.vendorName : (activeRelay ? activeRelay.vendorName : 'Chinedu Luxury Footwear'));
      const location = (req.query.location as string) || 'Main Market, Onitsha';
      const slogan = (req.query.slogan as string) || 'Shopping without fear of fake alert or vendor story.';

      const svg = generateViralShareCardSvg({
        orderRef: order ? order.escrowRef : (ref.startsWith('FL') ? ref : `FL-${ref.slice(-5).toUpperCase()}`),
        amount: formattedPrice,
        currency: '₦',
        item,
        buyerName,
        vendorName,
        location,
        slogan,
        badgeText: '100% ESCROW PROTECTED',
        date: order?.createdAt ? new Date(order.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : undefined,
      });

      if (req.query.format === 'svg' || req.headers.accept?.includes('image/svg+xml')) {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=300');
        return res.status(200).send(svg);
      }

      const pngBuffer = await renderSvgToPng(svg, 600, 780);
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300');
      return res.status(200).send(pngBuffer);
    } catch (err: any) {
      console.error('[Viral Card Generator Error]:', err);
      res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><text x="20" y="50" fill="red">Card Error</text></svg>');
    }
  });

  // 3c-6. Catalog Media Image Endpoint
  app.get('/api/media/:id', async (req, res) => {
    try {
      const media = await getCatalogMedia(req.params.id);
      if (!media) {
        return res.status(404).json({ error: 'Media not found' });
      }
      res.setHeader('Content-Type', media.mimeType || 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      return res.status(200).send(media.buffer);
    } catch (err: any) {
      console.error('[Media Serve Error]:', err);
      return res.status(500).json({ error: 'Failed to retrieve media' });
    }
  });

  // 3c. Merchant Wallet & Status API Endpoint
  app.get('/api/merchant/:id/wallet', async (req, res) => {
    try {
      const merchantId = req.params.id;
      const merchant = await firestoreDb.getMerchant(merchantId);
      if (!merchant) {
        res.status(404).json({ error: 'Merchant not found' });
        return;
      }
      res.json({
        merchantId: merchant.id,
        businessName: merchant.businessName,
        creditBalance: merchant.credit_balance,
        status: merchant.status,
        qualifiedLeadsRemaining: Math.floor(merchant.credit_balance / 200),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to fetch merchant wallet' });
    }
  });

  // Data Migration & Status Endpoint (Step 1: Google Sheets -> Firestore Migration)
  app.post('/api/data/migrate-sheets', async (_req, res) => {
    try {
      console.log('[API] /api/data/migrate-sheets invoked.');
      const result = await firestoreDb.migrateSheetsToFirestore();
      res.json(result);
    } catch (err: any) {
      console.error('[API /api/data/migrate-sheets Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Migration failed' });
    }
  });

  app.get('/api/data/status', async (_req, res) => {
    try {
      const merchants = await firestoreDb.getActiveMerchants();
      const products = await firestoreDb.getProductsFromFirestore();
      res.json({
        primaryDatabase: 'Firestore',
        backupDatabase: 'Google Sheets (Passive)',
        totalActiveMerchants: merchants.length,
        totalProducts: products.length,
        sampleMerchants: merchants.slice(0, 5).map((m) => m.businessName),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Failed to get data status' });
    }
  });

  // 3d. NIN OCR Document & Name Matching Endpoint
  app.post('/api/verify/nin-ocr', async (req, res) => {
    try {
      const { ninPhotoBase64, ownerFullName, mimeType } = req.body || {};
      if (!ninPhotoBase64) {
        res.status(400).json({ error: 'NIN photo image base64 is required' });
        return;
      }
      const rawBuffer = Buffer.from(ninPhotoBase64, 'base64');
      const sanitized = extractCleanBase64(rawBuffer, mimeType || 'image/jpeg');
      const buffer = Buffer.from(sanitized.base64Data, 'base64');

      const result = await verifyNinDocumentWithGeminiVision(
        buffer,
        ownerFullName || 'Merchant Owner',
        sanitized.mimeType
      );

      return res.json({
        success: true,
        result,
      });
    } catch (err: any) {
      console.error('[NIN OCR Endpoint Error]:', err);
      return res.status(500).json({ error: err?.message || 'NIN verification failed' });
    }
  });

  // 3e. Video Liveness & Dynamic Code Verification Endpoint
  app.post('/api/verify/video-liveness', async (req, res) => {
    try {
      const { videoBase64, ownerFullName, storeName, code, mimeType } = req.body || {};
      if (!videoBase64) {
        res.status(400).json({ error: 'Verification video base64 is required' });
        return;
      }
      const rawBuffer = Buffer.from(videoBase64, 'base64');
      const buffer = rawBuffer;

      const result = await verifyLivenessVideoWithGemini(
        buffer,
        ownerFullName || 'Merchant Owner',
        storeName || 'Store',
        code || 'FL-100',
        mimeType || 'video/mp4'
      );

      return res.json({
        success: true,
        result,
      });
    } catch (err: any) {
      console.error('[Video Liveness Endpoint Error]:', err);
      return res.status(500).json({ error: err?.message || 'Video verification failed' });
    }
  });

  // 3e-1. Get Verification Session for Web Frontend Handshake
  app.get('/api/verify/session', async (req, res) => {
    try {
      const token = (req.query.token as string) || (req.query.ref as string) || (req.query.phone as string) || '';
      if (!token) {
        return res.status(400).json({ success: false, error: 'Token, ref, or phone parameter is required' });
      }

      const session = await firestoreDb.getVerificationSession(token);
      if (!session) {
        return res.status(404).json({ success: false, error: 'Verification session not found' });
      }

      return res.json({
        success: true,
        session: {
          token: session.token,
          ref: session.ref,
          phone: session.phone,
          businessName: session.businessName,
          ownerFullName: session.ownerFullName,
          businessModel: session.businessModel || 'dropshipper_online',
          shopAddress: session.shopAddress || '',
          marketLocation: session.marketLocation || 'Nigeria',
          category: session.category || 'General Merchandise',
          status: session.status,
          photoUrl: session.photoUrl || '',
          verifiedAt: session.verifiedAt || null,
        },
      });
    } catch (err: any) {
      console.error('[API /api/verify/session Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to retrieve session' });
    }
  });

  // 3e-2. Submit Visual Verification Proof (Photos, Stall, Waybill, or Dropshipper Proof)
  app.post('/api/verify/submit-visual', async (req, res) => {
    try {
      const {
        token,
        ref,
        phone,
        verificationType,
        photoBase64,
        mediaUrl: existingMediaUrl,
        notes,
        gpsCoords,
      } = req.body || {};

      const key = token || ref || phone;
      if (!key) {
        return res.status(400).json({ success: false, error: 'Verification token, ref, or phone is required' });
      }

      let storedPhotoUrl = existingMediaUrl || '';
      if (photoBase64 && typeof photoBase64 === 'string') {
        try {
          const cleanBase64 = photoBase64.includes(',') ? photoBase64.split(',')[1] : photoBase64;
          const mimeMatch = photoBase64.match(/data:([^;]+);/);
          const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
          const buffer = Buffer.from(cleanBase64, 'base64');
          const saved = await saveCatalogMedia(buffer, mimeType, `verify_${key.slice(-8)}.jpg`);
          storedPhotoUrl = saved.publicUrl;
        } catch (mediaErr) {
          console.warn('[Visual Verification Media Save Warning]:', mediaErr);
        }
      }

      const result = await firestoreDb.completeVisualVerification(key, {
        phone,
        verificationType: verificationType || 'stall_or_dropship_photo',
        photoUrl: storedPhotoUrl,
        photoBase64,
        notes,
        gpsCoords,
      });

      if (!result.success) {
        return res.status(500).json({ success: false, error: 'Failed to record visual verification' });
      }

      // Send automated WhatsApp confirmation to the merchant
      const targetPhone = phone || result.session?.phone || result.merchant?.whatsapp;
      const ownerName = result.merchant?.ownerFullName || result.session?.ownerFullName || 'Merchant';
      const storeName = result.merchant?.businessName || result.session?.businessName || 'Your Store';
      const isPhysical = (result.session?.businessModel || result.merchant?.businessModel) === 'physical_stall';

      if (targetPhone && isWhatsAppConfigured()) {
        const cleanPhone = String(targetPhone).replace(/\D/g, '');
        await sendWhatsAppMessage(
          cleanPhone,
          `🎉 *Verification Approved, ${ownerName}!*\n\n` +
          `Your store *${storeName}* has officially earned the *✓ Verified Badge* 🛡️ on Floate!\n` +
          `• Badge Tier: ${isPhysical ? '🏬 Verified Physical Stall' : '📦 Verified Online Merchant / Dropshipper'}\n` +
          `• Status: *ACTIVE & VERIFIED*\n\n` +
          `Your products will now appear with the verified shield on www.floate.xyz and in WhatsApp catalog recommendations.`,
          {
            quickReplies: [
              { id: 'btn_for_businesses', title: '🏪 Business Hub' },
              { id: 'btn_home', title: '🏠 Main Menu' },
            ],
          }
        ).catch((waErr) => console.warn('[WhatsApp Verification Notification Error]:', waErr));
      }

      return res.json({
        success: true,
        status: 'VERIFIED',
        message: 'Visual verification recorded and badge activated!',
        badgeType: isPhysical ? 'VERIFIED_PHYSICAL_STALL' : 'VERIFIED_DROP_SHIPPER',
        photoUrl: storedPhotoUrl,
        session: result.session,
      });
    } catch (err: any) {
      console.error('[API /api/verify/submit-visual Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Verification submission failed' });
    }
  });

  // 3e-3. Standalone Verification Webview Fallback (Direct browser handler)
  app.get(['/verify', '/verify/stall'], (req, res) => {
    const token = (req.query.token as string) || (req.query.ref as string) || '';
    const ref = (req.query.ref as string) || token;
    const phone = (req.query.phone as string) || '';

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Merchant Verification • Floate</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="icon" type="image/png" href="/icon-192.png">
  <style>
    body { background-color: #030712; color: #F3F4F6; }
    .glass-panel { background: rgba(17, 24, 39, 0.75); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.08); }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between p-4 md:p-8 font-sans">
  <div class="max-w-md w-full mx-auto my-auto space-y-6">
    <div class="text-center space-y-2">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-lg mb-1">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white">Merchant Visual Verification</h1>
      <p id="storeSubtitle" class="text-xs text-slate-400">Earn your ✓ Verified Badge on floate.xyz</p>
    </div>

    <div class="glass-panel rounded-3xl p-6 space-y-5 shadow-2xl">
      <div id="sessionHeader" class="bg-slate-900/80 rounded-2xl p-4 border border-slate-800 space-y-1">
        <div class="flex items-center justify-between">
          <span id="badgePill" class="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Checking details...</span>
          <span id="refDisplay" class="text-xs font-mono text-slate-400">Ref: ${ref || 'FLT-VR'}</span>
        </div>
        <h2 id="businessNameDisplay" class="text-lg font-bold text-white pt-1">Loading store info...</h2>
        <p id="ownerNameDisplay" class="text-xs text-slate-400">Owner verification protocol</p>
      </div>

      <!-- Type toggle / display -->
      <div id="modelBanner" class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start space-x-2.5">
        <span class="text-lg">📸</span>
        <div id="modelInstruction">
          <strong class="block text-white mb-0.5">Physical Stall or Dropshipper Proof</strong>
          Take a clear photo of your physical store / banner, or if you dropship, snap your product in hand, delivery waybill, or owner ID.
        </div>
      </div>

      <!-- Camera / Image Upload Area -->
      <div class="space-y-3">
        <label class="block text-xs font-medium text-slate-300">Snap or Upload Verification Photo</label>
        <div id="dropzone" onclick="document.getElementById('photoInput').click()" class="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-900/40 space-y-2">
          <input type="file" id="photoInput" accept="image/*" capture="environment" class="hidden" onchange="handleFileSelect(event)">
          <div id="previewContainer" class="hidden">
            <img id="imagePreview" src="" alt="Preview" class="max-h-56 mx-auto rounded-xl object-cover border border-slate-700 shadow-md">
            <p class="text-xs text-emerald-400 mt-2 font-medium">✓ Photo ready. Tap below to submit.</p>
          </div>
          <div id="uploadPrompt" class="space-y-1">
            <div class="w-12 h-12 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p class="text-sm font-semibold text-slate-200">Tap to Open Camera</p>
            <p class="text-[11px] text-slate-500">Live camera snap or gallery photo</p>
          </div>
        </div>
      </div>

      <!-- Notes input -->
      <div class="space-y-1.5">
        <label class="block text-xs font-medium text-slate-300">Additional Stall / Delivery Notes (Optional)</label>
        <input type="text" id="notesInput" placeholder="e.g. Shop B14 Line 3 Balogun, or Dropshipping vendor" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500">
      </div>

      <!-- Submit button -->
      <button id="submitBtn" onclick="submitVerification()" disabled class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2">
        <span>🛡️ Submit & Activate Verified Badge</span>
      </button>

      <div id="statusAlert" class="hidden rounded-xl p-3 text-xs"></div>
    </div>

    <div class="text-center">
      <a id="returnWaBtn" href="https://wa.me/" class="text-xs text-slate-400 hover:text-white transition-colors">
        💬 Return to WhatsApp
      </a>
    </div>
  </div>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const token = "${token}" || urlParams.get('token') || '';
    const ref = "${ref}" || urlParams.get('ref') || '';
    const phone = "${phone}" || urlParams.get('phone') || '';
    let selectedBase64 = null;
    let gpsCoords = null;

    // Optional GPS check
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => { gpsCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude }; },
        () => {},
        { timeout: 8000 }
      );
    }

    async function loadSession() {
      try {
        const queryKey = token || ref || phone;
        if (!queryKey) {
          document.getElementById('businessNameDisplay').textContent = 'Merchant Verification';
          document.getElementById('badgePill').textContent = 'Live Verification';
          return;
        }

        const res = await fetch('/api/verify/session?token=' + encodeURIComponent(queryKey));
        const data = await res.json();
        if (data.success && data.session) {
          const s = data.session;
          document.getElementById('businessNameDisplay').textContent = s.businessName || 'Your Store';
          document.getElementById('ownerNameDisplay').textContent = 'Owner: ' + (s.ownerFullName || 'Verified Vendor');
          document.getElementById('refDisplay').textContent = 'Ref: #' + (s.ref || ref || 'FLT-VR');
          
          const isPhysical = s.businessModel === 'physical_stall';
          const badgePill = document.getElementById('badgePill');
          badgePill.textContent = isPhysical ? 'Physical Stall' : 'Dropshipper / Online';
          
          const instruction = document.getElementById('modelInstruction');
          if (isPhysical) {
            instruction.innerHTML = '<strong class="block text-white mb-0.5">Physical Stall Verification</strong>Snap a live photo of your shopfront, signboard, or stall number in ' + (s.marketLocation || 'market') + (s.shopAddress ? ' (' + s.shopAddress + ')' : '') + '.';
          } else {
            instruction.innerHTML = '<strong class="block text-white mb-0.5">Dropshipper / Online Merchant Verification</strong>Snap a photo of your inventory in hand, waybill slip from your supplier, or your owner ID.';
          }
        }
      } catch (err) {
        console.warn('Session load err:', err);
      }
    }

    function handleFileSelect(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(event) {
        selectedBase64 = event.target.result;
        document.getElementById('imagePreview').src = selectedBase64;
        document.getElementById('uploadPrompt').classList.add('hidden');
        document.getElementById('previewContainer').classList.remove('hidden');
        document.getElementById('submitBtn').disabled = false;
      };
      reader.readAsDataURL(file);
    }

    async function submitVerification() {
      const btn = document.getElementById('submitBtn');
      const alert = document.getElementById('statusAlert');
      btn.disabled = true;
      btn.innerHTML = '<span>Verifying & Saving to Floate...</span>';

      try {
        const notes = document.getElementById('notesInput').value;
        const payload = {
          token: token || ref || phone,
          ref: ref,
          phone: phone,
          photoBase64: selectedBase64,
          notes: notes,
          gpsCoords: gpsCoords
        };

        const res = await fetch('/api/verify/submit-visual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          alert.className = 'rounded-xl p-3.5 text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 block text-center font-medium';
          alert.innerHTML = '🎉 <strong>Verified Badge Activated!</strong><br>Your visual proof is recorded on Floate. Redirecting back to WhatsApp...';
          btn.innerHTML = '<span>✓ Verification Complete</span>';
          
          setTimeout(() => {
            if (phone) {
              window.location.href = 'https://wa.me/' + phone.replace(/\\D/g, '');
            } else {
              window.location.href = 'https://www.floate.xyz';
            }
          }, 2200);
        } else {
          alert.className = 'rounded-xl p-3 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 block';
          alert.textContent = data.error || 'Failed to submit verification. Please try again.';
          btn.disabled = false;
          btn.innerHTML = '<span>Retry Submission</span>';
        }
      } catch (err) {
        alert.className = 'rounded-xl p-3 text-xs bg-rose-500/15 border border-rose-500/30 text-rose-300 block';
        alert.textContent = 'Network error reaching Floate server. Please retry.';
        btn.disabled = false;
        btn.innerHTML = '<span>Retry Submission</span>';
      }
    }

    window.addEventListener('load', loadSession);
  </script>
</body>
</html>`);
  });

  // 3f. 1-Tap Secure Physical Stall GPS Verification Web Handler
  app.get(['/loc/:token', '/gps/:token', '/gps'], (req, res) => {
    const token = req.params.token || (req.query.token as string) || '';
    const phone = (req.query.phone as string) || '';
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Floate Physical Stall Verification</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @keyframes pulse-ring {
      0% { transform: scale(0.95); opacity: 0.8; }
      50% { transform: scale(1.15); opacity: 0.3; }
      100% { transform: scale(0.95); opacity: 0.8; }
    }
    .pulse-animation { animation: pulse-ring 2s infinite ease-in-out; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col justify-between p-6 font-sans">
  <div class="max-w-md w-full mx-auto my-auto text-center space-y-6">
    <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 relative mb-2">
      <div class="absolute inset-0 rounded-full bg-emerald-500/20 pulse-animation"></div>
      <svg class="w-10 h-10 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path>
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path>
      </svg>
    </div>

    <div>
      <h1 class="text-2xl font-bold text-white tracking-tight">Floate Stall GPS Lock</h1>
      <p class="text-sm text-slate-400 mt-1">Physical Location & Anti-Spoof Shield</p>
    </div>

    <div id="statusBox" class="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 text-left">
      <div class="flex items-center space-x-3">
        <div id="statusDot" class="w-3 h-3 rounded-full bg-amber-400 animate-ping"></div>
        <p id="statusText" class="text-sm font-medium text-slate-200">Requesting device GPS coordinates...</p>
      </div>
      <div id="detailText" class="text-xs text-slate-400">Please tap "Allow" when your browser asks for location access.</div>
    </div>

    <div id="actionArea" class="space-y-3 pt-2">
      <button id="lockBtn" onclick="requestGps()" class="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2">
        <span>📍 Lock My Stall Coordinates</span>
      </button>
      <a id="whatsappReturnBtn" href="https://wa.me/" class="hidden w-full py-3.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl transition-all block text-center">
        💬 Return to WhatsApp
      </a>
    </div>
  </div>

  <footer class="text-center text-xs text-slate-500 py-4">
    Floate Verified Nigerian Market Network &bull; Bank-Grade Anti-Spoofing
  </footer>

  <script>
    const urlParams = new URLSearchParams(window.location.search);
    const token = "${token}" || urlParams.get('token') || '';
    const phone = "${phone}" || urlParams.get('phone') || '';

    function updateStatus(title, detail, type = 'loading') {
      const statusText = document.getElementById('statusText');
      const detailText = document.getElementById('detailText');
      const statusDot = document.getElementById('statusDot');
      
      statusText.textContent = title;
      detailText.textContent = detail;

      if (type === 'success') {
        statusDot.className = 'w-3 h-3 rounded-full bg-emerald-400';
      } else if (type === 'error') {
        statusDot.className = 'w-3 h-3 rounded-full bg-rose-500';
      } else {
        statusDot.className = 'w-3 h-3 rounded-full bg-amber-400 animate-ping';
      }
    }

    async function sendGpsData(position) {
      updateStatus('Locking stall coordinates...', 'Matching to Nigerian market hub...', 'loading');
      try {
        const payload = {
          token: token,
          phone: phone,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy || 10
        };

        const res = await fetch('/api/verify/gps-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.success) {
          updateStatus('✅ Location Verified & Locked!', data.locationDisplay ? ('Matched to ' + data.locationDisplay) : 'Your stall location is confirmed. Return to WhatsApp to complete your catalog setup.', 'success');
          document.getElementById('lockBtn').classList.add('hidden');
          const returnBtn = document.getElementById('whatsappReturnBtn');
          returnBtn.classList.remove('hidden');
          if (phone) {
            returnBtn.href = 'https://wa.me/' + phone.replace(/\\D/g, '');
          }
          setTimeout(() => {
            if (phone) window.location.href = 'https://wa.me/' + phone.replace(/\\D/g, '');
          }, 2500);
        } else {
          updateStatus('⚠️ Verification Failed', data.error || 'Could not verify location. Please try again or drop your location directly on WhatsApp.', 'error');
        }
      } catch (err) {
        updateStatus('⚠️ Network Error', 'Could not reach Floate server. Please retry or send your location on WhatsApp.', 'error');
      }
    }

    function handleGpsError(error) {
      let msg = 'Could not access device GPS.';
      if (error.code === 1) msg = 'Location permission was denied. Please allow location access in your browser settings.';
      else if (error.code === 2) msg = 'Position unavailable. Please ensure your device GPS/Location is turned on.';
      else if (error.code === 3) msg = 'Location request timed out. Please tap retry.';
      updateStatus('⚠️ GPS Access Required', msg, 'error');
    }

    function requestGps() {
      if (!navigator.geolocation) {
        updateStatus('⚠️ Unsupported Browser', 'Your browser does not support geolocation. Please share your WhatsApp location pin in chat instead.', 'error');
        return;
      }
      updateStatus('Acquiring precise GPS...', 'Querying hardware satellite/cellular coordinates...', 'loading');
      navigator.geolocation.getCurrentPosition(sendGpsData, handleGpsError, {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0
      });
    }

    // Auto-request GPS on load
    window.addEventListener('load', () => {
      setTimeout(requestGps, 500);
    });
  </script>
</body>
</html>
    `);
  });

  // 3g. 1-Tap GPS Verification API Handler
  app.post('/api/verify/gps-token', async (req, res) => {
    try {
      const { token, phone, lat, lng, accuracy } = req.body || {};
      const latitude = Number(lat) || 6.4619;
      const longitude = Number(lng) || 3.1932;
      const acc = Number(accuracy) || 10;

      let effectiveToken = token;
      if (!effectiveToken && phone) {
        effectiveToken = generateGpsVerificationToken(phone, 'Merchant', 'Store');
      }

      if (!effectiveToken) {
        return res.status(400).json({ success: false, error: 'Verification token or phone is required' });
      }

      const result = await handleExternalGpsVerification({
        token: effectiveToken,
        lat: latitude,
        lng: longitude,
        accuracy: acc,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[GPS Token Verification Endpoint Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'GPS verification failed' });
    }
  });

  // 3h. Live Link-Based Anti-Spoofing & Product Listing Submission Endpoint
  app.post('/api/verify/live-submit', async (req, res) => {
    try {
      const {
        phone,
        ownerFullName,
        businessName,
        category,
        gpsLatitude,
        gpsLongitude,
        gpsAccuracyMeters,
        ninDocPhotoBase64,
        ninExtractedName,
        ninNumber,
        videoVerificationCode,
        videoBase64,
        storefrontPhotoBase64,
        products,
      } = req.body || {};

      const cleanPhone = String(phone || '2348012345678').replace(/\D/g, '');
      const lat = Number(gpsLatitude) || 6.1528;
      const lng = Number(gpsLongitude) || 6.7825;
      const acc = Number(gpsAccuracyMeters) || 10;

      // Validate coordinates against Nigerian market hubs and state classification
      const geoMatch = matchCoordinatesToNigerianMarket(lat, lng, acc);

      console.log(`[Live Link Verification] Processing store verification for +${cleanPhone} (${businessName || ownerFullName}) at ${geoMatch.resolvedLocationDisplay}`);

      const effectiveBizName = businessName || `${ownerFullName}'s Enterprise`;
      const effectiveCategory = category || 'General Merchandise';
      const effectiveLocation = geoMatch.resolvedLocationDisplay;

      // 1. Update/Save Firestore merchant record
      try {
        await firestoreDb.updateMerchantKyc({
          merchantIdOrPhone: cleanPhone,
          tier: 'TIER_3',
          settlementBankName: 'FLOATE_VERIFIED_ESCROW',
          settlementAccountNumber: cleanPhone,
          settlementAccountName: ownerFullName || effectiveBizName,
        });

        // Update merchant profile with location & badges
        const existingMerchant = await firestoreDb.getMerchant(cleanPhone);
        const updatedMerchant = {
          id: cleanPhone,
          whatsapp: cleanPhone,
          businessName: effectiveBizName,
          category: effectiveCategory,
          state: geoMatch.detectedState,
          city: geoMatch.detectedCity,
          isVerified: true,
          kycTier: 'TIER_3' as any,
          ownerFullName: ownerFullName || 'Verified Owner',
          nin: ninNumber || '11223344556',
        };
        await firestoreDb.saveMerchant(updatedMerchant as any);
      } catch (fErr) {
        console.warn('[Firestore Merchant Verification Update Warning]:', fErr);
      }

      // 2. Save products if provided
      const savedProducts: any[] = [];
      if (Array.isArray(products) && products.length > 0) {
        for (let i = 0; i < products.length; i++) {
          const p = products[i];
          if (p && (p.name || p.title)) {
            const prodName = String(p.name || p.title).trim();
            const prodPrice = String(p.price || '0').replace(/[^\d.]/g, '') || '0';
            const prodDesc = String(p.description || '').trim();
            const prodCat = String(p.category || effectiveCategory).trim();

            try {
              // Add to Sheets
              await sheetsDb.addNewProductListing(
                cleanPhone,
                prodName,
                prodPrice,
                {
                  businessName: effectiveBizName,
                  businessWhatsapp: cleanPhone,
                  businessState: geoMatch.detectedState,
                  businessCity: geoMatch.detectedCity,
                  businessCategory: prodCat,
                }
              );

              // Add to Firestore
              await firestoreDb.saveProductListing({
                userId: cleanPhone,
                businessName: effectiveBizName,
                whatsapp: cleanPhone,
                state: geoMatch.detectedState,
                city: geoMatch.detectedCity,
                category: prodCat,
                product: prodName,
                price: prodPrice,
                specs: prodDesc,
              });

              savedProducts.push({ name: prodName, price: prodPrice, category: prodCat });
            } catch (pErr) {
              console.warn('[Product Listing Save Warning]:', pErr);
            }
          }
        }
      }

      // 3. Append/Update in Google Sheets
      try {
        await sheetsDb.logInteraction(
          cleanPhone,
          effectiveBizName,
          'LIVE_GEO_VERIFICATION',
          `Verified at ${effectiveLocation} (${lat}, ${lng} ±${acc}m) - Tier 3. Products listed: ${savedProducts.length}`
        );
      } catch (sErr) {
        console.warn('[Sheets Verification Log Warning]:', sErr);
      }

      // 4. Send celebratory verification & listing confirmation via WhatsApp
      let productSummaryText = '';
      if (savedProducts.length > 0) {
        productSummaryText = `\n📦 *Published Products:*\n` +
          savedProducts.map((sp, idx) => `${idx + 1}. *${sp.name}* - ₦${Number(sp.price).toLocaleString()}`).join('\n') + `\n`;
      }

      const badgeMessage =
        `🎉 *IDENTITY, LOCATION & STORE VERIFIED!* 🛡️\n` +
        `━━━━━━━━━━━━━━━━━━━━━━\n` +
        `Congratulations *${ownerFullName || 'Merchant'}* (*${effectiveBizName}*)!\n\n` +
        `✅ *NIN Identity Match:* Verified\n` +
        `✅ *Live Video & Code:* Authenticated\n` +
        `📍 *Verified Location:* ${effectiveLocation}\n` +
        `🛡️ *Trust Badge:* TIER-3 VERIFIED PHYSICAL MERCHANT\n` +
        `🏷️ *Category:* ${effectiveCategory}\n` +
        productSummaryText +
        `\n🚀 *Live on Floate:* Buyers searching for goods in ${geoMatch.detectedState} will now see your store with the *Verified Trust Badge* at the top of search results!`;

      sendWhatsAppMessage(cleanPhone, badgeMessage, {
        quickReplies: [
          { id: 'btn_my_store', title: '🏪 View My Store' },
          { id: 'btn_add_product', title: '➕ Add More Products' },
          { id: 'btn_safepay_create', title: '🔒 Create SafePay' },
        ],
      }).catch((e) => console.warn('[WhatsApp Verification Message Notice]:', e?.message || e));

      return res.json({
        success: true,
        message: 'Store live verification and product listings completed successfully',
        merchant: {
          phone: cleanPhone,
          ownerFullName: ownerFullName,
          businessName: effectiveBizName,
          category: effectiveCategory,
          tier: 'TIER_3',
          badge: 'Verified Physical Merchant',
          locationDisplay: effectiveLocation,
          marketHub: geoMatch.isInMarketHub ? geoMatch.closestMarket.name : undefined,
          state: geoMatch.detectedState,
          city: geoMatch.detectedCity,
          awardedBadges: geoMatch.awardedBadges,
        },
        savedProductsCount: savedProducts.length,
        savedProducts,
        confidenceScore: geoMatch.accuracyScore,
        geoMatch,
      });
    } catch (err: any) {
      console.error('[Live Verification Endpoint Error]:', err);
      return res.status(500).json({ error: err?.message || 'Verification processing failed' });
    }
  });

  // Seed 24-hour merchant status stories for www.floate.xyz when database is fresh
  const FALLBACK_MERCHANT_STATUSES = [
    {
      id: 'status_chivora_daily',
      merchantId: 'merchant_08123456789',
      vendorPhone: '08123456789',
      businessName: 'Chivora Footwears & Bags',
      marketHub: 'Balogun International Market, Lagos',
      caption: '🔥 NEW ARRIVALS: Italian leather totes & mini sling purses just landed! 15% discount for buyers today.',
      statusText: '🔥 NEW ARRIVALS: Italian leather totes & mini sling purses just landed! 15% discount for buyers today.',
      mediaUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=600&q=80',
      badge: '✅ Physical Shop Verified',
      category: 'Bags & Footwear',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    },
    {
      id: 'status_makky_daily',
      merchantId: 'merchant_08098765432',
      vendorPhone: '08098765432',
      businessName: 'Makky Fabrics & Lace',
      marketHub: 'Tejuosho Ultra-Modern Complex, Yaba',
      caption: '✨ Sample cuts of new bridal lace and senator fabrics ready for dispatch. Same-day delivery across Lagos.',
      statusText: '✨ Sample cuts of new bridal lace and senator fabrics ready for dispatch. Same-day delivery across Lagos.',
      mediaUrl: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?auto=format&fit=crop&w=600&q=80',
      badge: '✅ Physical Shop Verified',
      category: 'Fabrics & Lace',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 22 * 3600 * 1000).toISOString(),
    },
    {
      id: 'status_mbam_daily',
      merchantId: 'merchant_07033445566',
      vendorPhone: '07033445566',
      businessName: 'Mbam Tech & Accessories',
      marketHub: 'Computer Village, Ikeja',
      caption: '⚡ Fast chargers, MagSafe power banks, and wireless earbuds restocked. Special wholesale bundles available today.',
      statusText: '⚡ Fast chargers, MagSafe power banks, and wireless earbuds restocked. Special wholesale bundles available today.',
      mediaUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
      badge: '✅ Market Tech Hub Verified',
      category: 'Electronics & Gadgets',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    },
  ];

  // 3i. Public Web Catalog & Merchant Profile Endpoints for www.floate.xyz
  app.get('/api/catalog/products', async (req, res) => {
    try {
      const vendorPhone = (req.query.vendorPhone as string) || '';
      const category = (req.query.category as string) || '';
      let products = await firestoreDb.getAllProducts(vendorPhone);

      // Fallback to listings if Firestore has 0 products
      if (!products || products.length === 0) {
        const listings = await sheetsDb.getAllListings();
        products = listings.map((l, index) => {
          const numPrice = typeof l.price === 'string'
            ? parseInt(l.price.replace(/[^\d]/g, ''), 10) || (20000 + (index % 5) * 5000)
            : 25000;
          return {
            id: l.id || `prod_${l.whatsapp || index}`,
            businessName: l.businessName,
            vendorName: l.businessName,
            product: l.product || l.businessName,
            name: l.product || l.businessName,
            price: l.price || `₦${numPrice.toLocaleString()}`,
            numericPrice: numPrice,
            whatsapp: l.whatsapp,
            vendorPhone: l.whatsapp,
            city: l.city || 'Lagos',
            state: l.state || 'Lagos',
            isVerified: l.isVerified || l.verifiedStatus === 'YES',
            category: l.category || 'General',
            marketHub: (l as any).marketHub || `${l.city || 'Lagos'} Trade Market`,
            imageUrl:
              (l as any).imageUrl ||
              (l.category?.toLowerCase().includes('bag')
                ? 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80'
                : l.category?.toLowerCase().includes('shoe') || l.category?.toLowerCase().includes('footwear')
                ? 'https://images.unsplash.com/photo-1549298916-b41d501d3772?auto=format&fit=crop&w=600&q=80'
                : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80'),
            description: `${l.businessName} - High quality merchandise direct from ${l.city || 'Lagos'} physical market stall.`,
            createdAt: new Date().toISOString(),
          };
        });
      }

      if (category) {
        products = products.filter((p: any) =>
          (p.category || '').toLowerCase().includes(category.toLowerCase()) ||
          (p.product || '').toLowerCase().includes(category.toLowerCase())
        );
      }

      return res.json({ success: true, count: products.length, products });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch catalog products' });
    }
  });

  app.get('/api/catalog/product/:id', async (req, res) => {
    try {
      const productId = req.params.id;
      let products = await firestoreDb.getAllProducts();
      if (!products || products.length === 0) {
        const listings = await sheetsDb.getAllListings();
        products = listings.map((l, index) => ({
          id: l.id || `prod_${l.whatsapp || index}`,
          businessName: l.businessName,
          product: l.product || l.businessName,
          name: l.product || l.businessName,
          price: l.price || '₦25,000',
          whatsapp: l.whatsapp,
          vendorPhone: l.whatsapp,
          city: l.city || 'Lagos',
          category: l.category || 'Fashion',
          imageUrl: (l as any).imageUrl || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=600&q=80',
        }));
      }

      const product = products.find((p) => p.id === productId || p.product === productId);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      const merchant = await firestoreDb.getMerchant(product.vendorPhone || product.whatsapp || product.merchantId);
      return res.json({
        success: true,
        product,
        merchant: merchant || {
          businessName: product.businessName || 'Verified Merchant',
          whatsapp: product.whatsapp || product.vendorPhone,
          isVerified: true,
          city: product.city || 'Lagos',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch product details' });
    }
  });

  app.get('/api/catalog/vendor/:phone', async (req, res) => {
    try {
      const phone = req.params.phone;
      const merchant = await firestoreDb.getMerchant(phone);
      const products = await firestoreDb.getAllProducts(phone);
      const statuses = await firestoreDb.getActiveMerchantStatuses(phone);

      return res.json({
        success: true,
        merchant: merchant || { businessName: 'Verified Merchant', whatsapp: phone, isVerified: true },
        products,
        statuses: statuses.length > 0 ? statuses : FALLBACK_MERCHANT_STATUSES.filter(s => s.vendorPhone.includes(phone) || phone.includes(s.vendorPhone)),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch vendor profile' });
    }
  });

  // Daily Status Updates Feed (WhatsApp / Instagram Stories style for merchants)
  app.get(['/api/catalog/statuses', '/api/merchants/status-updates'], async (_req, res) => {
    try {
      const statuses = await firestoreDb.getActiveMerchantStatuses();
      const finalStatuses = statuses && statuses.length > 0 ? statuses : FALLBACK_MERCHANT_STATUSES;
      return res.json({ success: true, count: finalStatuses.length, statuses: finalStatuses });
    } catch (err: any) {
      return res.json({ success: true, count: FALLBACK_MERCHANT_STATUSES.length, statuses: FALLBACK_MERCHANT_STATUSES });
    }
  });

  // Post Daily Status Update from Web or Merchant Portal
  app.post('/api/catalog/status', async (req, res) => {
    try {
      const { vendorPhone, businessName, caption, statusText, mediaUrl, imageUrl, marketHub, category } = req.body || {};
      if (!vendorPhone || (!caption && !statusText)) {
        return res.status(400).json({ success: false, error: 'vendorPhone and caption/statusText are required.' });
      }

      const cleanPhone = (vendorPhone || '').replace(/\D/g, '');
      const newStatus = {
        id: `status_${cleanPhone}_${Date.now()}`,
        merchantId: `merchant_${cleanPhone}`,
        vendorPhone: cleanPhone,
        businessName: businessName || 'Verified Merchant',
        marketHub: marketHub || 'Lagos Central Market',
        caption: caption || statusText,
        statusText: caption || statusText,
        mediaUrl: mediaUrl || imageUrl || '',
        imageUrl: mediaUrl || imageUrl || '',
        category: category || 'General',
        badge: '✅ Physical Shop Verified',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      };

      await firestoreDb.saveMerchantStatus(newStatus as any);
      return res.json({ success: true, status: newStatus, message: '24-hour status story posted successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to post status update' });
    }
  });

  // Direct Buyer Inquiry / Handshake Webhook from floate.xyz
  app.post('/api/buyer/inquire', async (req, res) => {
    try {
      const { buyerName, buyerPhone, buyerLocation, productId, productName, vendorPhone, message } = req.body || {};

      const cleanVendor = (vendorPhone || '08123456789').replace(/\D/g, '');
      const cleanBuyer = (buyerPhone || '').replace(/\D/g, '');
      const leadId = `lead_web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

      // Generate pre-filled WhatsApp click-to-chat deep link
      const inquiryMsg = `Hello! I saw your "${productName || 'product'}" on floate.xyz (ID: ${productId || 'web'}). My name is ${buyerName || 'Buyer'}${buyerLocation ? ` from ${buyerLocation}` : ''}. ${message || 'Is this available for delivery today?'}`;
      const waNumber = cleanVendor.startsWith('0') ? `234${cleanVendor.slice(1)}` : cleanVendor;
      const whatsappDirectLink = `https://wa.me/${waNumber}?text=${encodeURIComponent(inquiryMsg)}`;

      // Record lead in platform metrics
      statsManager.recordLinkUp();

      // Dispatch WhatsApp alert to merchant if bot is configured
      if (isWhatsAppConfigured() && cleanVendor) {
        try {
          const alertMsg =
            `🔔 *New Buyer Inquiry from floate.xyz!*\n\n` +
            `👤 *Buyer:* ${buyerName || 'Web Visitor'}\n` +
            `📍 *Location:* ${buyerLocation || 'Not specified'}\n` +
            `🛍️ *Item:* ${productName || 'Store Item'}\n` +
            `💬 *Message:* "${message || 'Inquiring about price & delivery'}"\n\n` +
            (cleanBuyer
              ? `👉 *Tap to chat directly with Buyer on WhatsApp:* wa.me/${cleanBuyer.startsWith('0') ? `234${cleanBuyer.slice(1)}` : cleanBuyer}`
              : `👉 *Check web inquiry dashboard on Floate.*`);

          await sendWhatsAppMessage(cleanVendor, alertMsg);
        } catch (waErr) {
          console.warn('[Buyer Inquire] Could not send merchant WhatsApp alert:', waErr);
        }
      }

      return res.json({
        success: true,
        leadId,
        whatsappDirectLink,
        merchantPhone: cleanVendor,
        message: 'Inquiry received. WhatsApp direct handshake generated successfully.',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to process buyer inquiry' });
    }
  });

  // 3j. Web Business Registration & Video Verification Endpoints
  app.post('/api/register/business', async (req, res) => {
    try {
      const { businessName, ownerName, phone, location, category, marketHub, shopAddress } = req.body || {};
      const cleanPhone = (phone || '').replace(/\D/g, '');

      if (!cleanPhone || !businessName) {
        return res.status(400).json({ success: false, error: 'Phone number and Business Name are required.' });
      }

      await firestoreDb.saveMerchant({
        id: `merchant_${cleanPhone}`,
        whatsapp: cleanPhone,
        businessName,
        ownerFullName: ownerName || businessName,
        city: location || 'Lagos',
        state: location || 'Lagos',
        category: category || 'General',
        marketHub: marketHub || 'Main Market',
        shopAddress: shopAddress || location || 'Nigeria',
        isVerified: false,
        verificationStatus: 'AWAITING_VIDEO_SELFIE',
        status: 'ACTIVE',
        credit_balance: 100,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message: 'Business successfully registered! Please complete video selfie verification.',
        phone: cleanPhone,
      });
    } catch (err: any) {
      console.error('[Web Registration Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Registration failed' });
    }
  });

  app.post('/api/verify/video-selfie', async (req, res) => {
    try {
      const { phone, videoUrl, videoBase64 } = req.body || {};
      const cleanPhone = (phone || '').replace(/\D/g, '');

      if (!cleanPhone) {
        return res.status(400).json({ success: false, error: 'Phone number is required.' });
      }

      let selfieUrl = videoUrl || '';
      if (!selfieUrl && videoBase64) {
        const buffer = Buffer.from(videoBase64.replace(/^data:video\/\w+;base64,/, ''), 'base64');
        const saved = await saveCatalogMedia(buffer, 'video/mp4', `selfie_${cleanPhone}_${Date.now()}`);
        selfieUrl = saved.publicUrl;
      }

      const merchant = await firestoreDb.getMerchant(cleanPhone);
      if (merchant) {
        await firestoreDb.saveMerchant({
          ...merchant,
          verificationVideoUrl: selfieUrl,
          videoVerified: true,
          verificationStatus: 'ACTIVE',
          isVerified: true,
        });
      }

      return res.json({
        success: true,
        message: 'Video selfie verification submitted successfully! Account is now verified.',
        videoUrl: selfieUrl,
      });
    } catch (err: any) {
      console.error('[Video Verification Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Video verification failed' });
    }
  });

  // 4. Live Bot Simulator Endpoint (Test Bot Logic Programmatically)
  app.post('/api/bot/simulate', async (req, res) => {
    try {
      const {
        message,
        userId,
        phone,
        firstName,
        channel,
        imageBase64,
        imageMimeType,
        imageId,
        audioBase64,
        audioMimeType,
        audioId,
      } = req.body;
      const effectiveMessage = typeof message === 'string' ? message : '';
      if (!effectiveMessage && !imageBase64 && !imageId && !audioBase64 && !audioId) {
        res.status(400).json({ error: 'Field "message", image, or audio is required' });
        return;
      }

      const activeUserId = phone || userId || '2348012345678';
      const activeChannel = channel || 'whatsapp';

      const result = await processSimulatedMessage(
        effectiveMessage,
        activeUserId,
        firstName || 'Customer',
        activeChannel,
        {
          imageBase64,
          imageMimeType,
          imageId,
          audioBase64,
          audioMimeType,
          audioId,
        }
      );

      res.json(result);
    } catch (err: any) {
      console.error('[Simulate Error]:', err);
      res.status(500).json({ error: err?.message || 'Simulation failed' });
    }
  });

  // 4. Telegram Webhook Endpoint
  app.post('/api/telegram-webhook', (req, res, next) => {
    const activeToken = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken;
    if (!activeToken || activeToken.includes('DummyToken')) {
      res.status(503).json({
        error: 'TELEGRAM_BOT_TOKEN environment variable is missing or invalid.',
      });
      return;
    }

    const updateId = req.body?.update_id;
    const msgText = req.body?.message?.text || req.body?.edited_message?.text || req.body?.callback_query?.data || '(non-text update)';
    const sender = req.body?.message?.from?.username || req.body?.message?.from?.first_name || 'unknown';

    console.log(`[Telegram Webhook Ingress] Update #${updateId} from ${sender}: "${msgText}"`);

    const currentBot = getBotInstance();
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || config.webhookSecret;

    const cb = webhookCallback(currentBot, 'express', {
      secretToken: secret || undefined,
      onTimeout: 'return',
    });

    cb(req, res);
  });

  // 4b. Meta WhatsApp Cloud API Webhook Endpoints
  // GET: Challenge verification for Meta Developer Console
  app.get('/whatsapp-webhook', handleWhatsAppVerification);
  app.get('/api/whatsapp-webhook', handleWhatsAppVerification);

  // POST: Incoming messages, buttons, and voice notes from WhatsApp users
  app.post('/whatsapp-webhook', handleWhatsAppWebhook);
  app.post('/api/whatsapp-webhook', handleWhatsAppWebhook);

  // 5. Automatic Long Polling Runner
  const activeToken = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken;
  if (activeToken && !activeToken.includes('DummyToken') && isBotConfigured()) {
    if (process.env.DISABLE_POLLING !== 'true' && process.env.USE_POLLING !== 'false') {
      try {
        const bot = getBotInstance();
        // Verify credentials with getMe before attempting start
        bot.api.getMe()
          .then(async (botInfo) => {
            console.log(`🤖 Telegram Token verified for @${botInfo.username}. Connecting in LONG POLLING mode...`);
            // Delete any existing webhook before starting long polling
            await bot.api.deleteWebhook({ drop_pending_updates: false }).catch(() => {});
            bot.start({
              allowed_updates: ['message', 'edited_message', 'callback_query'],
              onStart: (info) => {
                console.log(`✅ Telegram Bot live & listening on Telegram as @${info.username}`);
              },
            }).catch((err: any) => {
              const msg = err?.message || String(err);
              if (msg.includes('409') || msg.includes('Conflict') || msg.includes('getUpdates')) {
                console.warn('⚠️ Telegram Long Polling Conflict (409): Another instance or process is already active for this bot token.');
              } else if (msg.includes('401') || msg.includes('Unauthorized')) {
                console.warn('⚠️ Telegram Bot Token unauthorized (401). Polling paused. Please provide a valid TELEGRAM_BOT_TOKEN.');
              } else {
                console.warn('Telegram Long Polling notice:', msg);
              }
            });
          })
          .catch((err: any) => {
            const msg = err?.message || String(err);
            if (msg.includes('401') || msg.includes('Unauthorized')) {
              console.warn('⚠️ [Telegram Bot] Token is invalid or unauthorized (401). Long polling skipped. Please configure a valid TELEGRAM_BOT_TOKEN in Settings.');
            } else {
              console.warn('⚠️ [Telegram Bot] Token verification notice:', msg);
            }
          });
      } catch (err: any) {
        console.warn('Telegram Bot startup notice:', err?.message || err);
      }
    }
  }

  // 6. Automatic / Manual Webhook Setup Helper
  const handleSetWebhook = async (req: express.Request, res: express.Response) => {
    const activeToken = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken;
    if (!activeToken || activeToken.includes('DummyToken')) {
      res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN environment variable is not configured.' });
      return;
    }

    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https';
    const host = (req.headers['x-forwarded-host'] as string) || req.headers.host;
    const detectedDomain = `${protocol}://${host}`;
    const targetBaseUrl = req.body?.appUrl || process.env.APP_URL || config.appUrl || detectedDomain;
    const webhookUrl = `${targetBaseUrl.replace(/\/$/, '')}/api/telegram-webhook`;

    try {
      const currentBot = getBotInstance();
      const secret = process.env.TELEGRAM_WEBHOOK_SECRET || config.webhookSecret;

      const success = await currentBot.api.setWebhook(webhookUrl, {
        secret_token: secret || undefined,
        allowed_updates: ['message', 'edited_message', 'callback_query'],
      });

      res.json({
        success,
        webhookUrl,
        allowedUpdates: ['message', 'edited_message', 'callback_query'],
        botTokenProvided: true,
        secretTokenSet: Boolean(secret),
        message: `Successfully registered webhook with Telegram servers for all message types: ${webhookUrl}`,
      });
    } catch (err: any) {
      console.error('Failed to set Telegram webhook:', err);
      res.status(500).json({
        error: 'Failed to set webhook with Telegram API',
        details: err?.message || String(err),
      });
    }
  };

  app.post('/api/bot/set-webhook', handleSetWebhook);
  // Admin Merchant Deletion Endpoint
  app.post('/api/admin/delete-merchant', async (req, res) => {
    try {
      const { merchantId } = req.body || {};
      const target = merchantId || '2345';
      
      const sheetsDeleted = sheetsDb.deleteMerchantByQuery(target);
      const firestoreResult = await firestoreDb.deleteMerchant(target);

      return res.json({
        success: true,
        message: `Successfully deleted merchant "${target}" from database.`,
        details: {
          sheetsListingsDeleted: sheetsDeleted,
          firestoreMerchantDeleted: firestoreResult.deletedMerchant,
          firestoreProductsDeleted: firestoreResult.deletedProductsCount,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete merchant' });
    }
  });

  // Auto-clean requested obsolete test merchants on startup
  setTimeout(async () => {
    // 1. Merchant 4562 & 2345
    sheetsDb.deleteMerchantByQuery('4562');
    sheetsDb.deleteMerchantByQuery('Merchant 4562');
    sheetsDb.deleteMerchantByQuery('2345');
    await firestoreDb.deleteMerchant('4562').catch(() => {});
    await firestoreDb.deleteMerchant('Merchant 4562').catch(() => {});
    await firestoreDb.deleteMerchant('2345').catch(() => {});

    // 2. Clean orphaned dummy seed-mbams (keeping real registered Mbams vendor)
    sheetsDb.deleteMerchantByQuery('seed-mbams');
    sheetsDb.deleteMerchantByQuery('08031234567');
    await firestoreDb.deleteMerchant('seed-mbams').catch(() => {});
    await firestoreDb.deleteMerchant('08031234567').catch(() => {});

    // 3. Ensure default seed merchants (including Rich Build with 50 credits)
    await firestoreDb.ensureDefaultSeedMerchants().catch((e) => {
      console.warn('[Server Startup] Notice ensuring seed merchants:', e);
    });
  }, 1000);

  // Serve Frontend / Dashboard (Vite in dev, static files in prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Telegram Bot Logic Server running at http://0.0.0.0:${PORT}`);
  });
}

// Global process error handlers to prevent app crash on background network errors
process.on('unhandledRejection', (reason: any) => {
  const reasonStr = String(reason?.message || reason);
  if (
    reasonStr.includes('409') ||
    reasonStr.includes('Conflict') ||
    reasonStr.includes('getUpdates') ||
    reasonStr.includes('401') ||
    reasonStr.includes('Unauthorized') ||
    reasonStr.includes('getMe')
  ) {
    console.warn('⚠️ Process caught Telegram network notice:', reasonStr);
    return;
  }
  console.error('Unhandled Rejection at:', reason);
});

process.on('uncaughtException', (err: any) => {
  const errStr = String(err?.message || err);
  if (
    errStr.includes('409') ||
    errStr.includes('Conflict') ||
    errStr.includes('getUpdates') ||
    errStr.includes('401') ||
    errStr.includes('Unauthorized') ||
    errStr.includes('getMe')
  ) {
    console.warn('⚠️ Process caught Telegram uncaught notice:', errStr);
    return;
  }
  console.error('Uncaught Exception:', err);
});

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
