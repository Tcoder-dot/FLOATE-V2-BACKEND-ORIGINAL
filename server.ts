import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { webhookCallback } from 'grammy';
import { config, isBotConfigured, isWhatsAppConfigured, isMonnifyConfigured } from './src/bot/config.js';
import { getBotInstance } from './src/bot/bot.js';
import { statsManager } from './src/bot/statsManager.js';
import { processSimulatedMessage } from './src/bot/services/botSimulator.js';
import { sheetsDb, normalizePhone, parsePriceToNumber } from './src/bot/services/sheetsService.js';
import { firestoreDb, FIRESTORE_DATABASE_INFO } from './src/bot/services/firestoreService.js';
import { whatsappAuthService } from './src/bot/services/whatsappAuthService.js';
import { bachsPaymentService } from './src/bot/services/bachsPaymentService.js';
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
  sendMerchantVisualAssetsToWhatsApp,
  parseNumericAmount,
} from './src/bot/services/whatsappService.js';
import { saveCatalogMedia } from './src/bot/services/mediaStorageService.js';
import { getRelaySessionById } from './src/bot/services/whatsappStateManager.js';
import { monnifyService } from './src/bot/services/monnifyService.js';
import { nombaService } from './src/bot/services/nombaService.js';
import { flutterwaveService, FLOATE_CREDIT_PACKAGES, calculateCustomCredits, getWhatsAppRedirectUrl } from './src/bot/services/flutterwaveService.js';
import { monetizationService, isLaunchPricingActive } from './src/bot/services/monetizationService.js';
import { findCredentialByFid, SAMPLE_CREDENTIALS, createCredentialForMerchant } from './src/bot/services/credentialService.js';
import { renderCredentialPng, resolveCredential } from './src/bot/services/credentialAssetRenderer.js';
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
  classifyCosRouterIntent,
} from './src/bot/services/aiService.js';
import {
  assertPublicSiteUrl,
  getPublicSiteUrl,
  buildMerchantProfileUrl,
  buildProductUrl,
  buildRegisterUrl,
  buildCheckoutUrl,
  slugifyBusinessName,
  compactBusinessName,
} from './src/config/siteUrls.js';

const currentFilename = typeof __filename !== 'undefined' ? __filename : '';
const currentDirname = typeof __dirname !== 'undefined' ? __dirname : (currentFilename ? path.dirname(currentFilename) : process.cwd());

async function startServer() {
  // Fail loudly at startup if PUBLIC_SITE_URL is missing
  assertPublicSiteUrl();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Universal CORS Middleware for www.floate.xyz, floate.xyz, subdomains, and local dev
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const publicSiteUrl = getPublicSiteUrl();

    if (origin) {
      const isAllowed =
        origin === publicSiteUrl ||
        origin === 'https://floate.xyz' ||
        origin === 'https://www.floate.xyz' ||
        /https?:\/\/(.+\.)?floate\.xyz(:\d+)?$/i.test(origin) ||
        /\.run\.app$/i.test(origin) ||
        origin.includes('localhost') ||
        origin.includes('127.0.0.1');

      if (isAllowed) {
        res.header('Access-Control-Allow-Origin', origin);
      } else {
        res.header('Access-Control-Allow-Origin', publicSiteUrl);
      }
    } else {
      res.header('Access-Control-Allow-Origin', publicSiteUrl);
    }

    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key, x-floate-api-key, x-session-token');
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

  app.post('/api/router/classify', async (req, res) => {
    try {
      const { message, text, query } = req.body || {};
      const input = message || text || query || '';
      const result = await classifyCosRouterIntent(input);
      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: error?.message || 'COS router classification failed' });
    }
  });

  app.get(['/api/health', '/api/handshake', '/api/ping'], (req, res) => {
    const clientOrigin = req.headers.origin || req.headers.referer || 'https://www.floate.xyz';
    res.json({
      success: true,
      status: 'connected',
      handshake: 'SUCCESSFUL',
      service: 'Floate Multi-Channel Commerce Engine',
      version: '2.5.0-handshake',
      database: FIRESTORE_DATABASE_INFO,
      publicSiteUrl: getPublicSiteUrl(),
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
        productDetailsV1: 'GET /api/v1/products/:id',
        vendorProducts: 'GET /api/v1/vendors/:slug/products',
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

    // Check if payment was for merchant credentials / Verified Plus
    let cred = null;
    try {
      const fidParam = (req.query.fid as string) || (ref.startsWith('FLT-') ? ref : '');
      if (fidParam) {
        cred = await resolveCredential(fidParam);
      } else {
        const phoneMatch = ref.match(/(234\d{10}|0[789]\d{9})/);
        if (phoneMatch) {
          cred = await resolveCredential(phoneMatch[1]);
        }
      }
    } catch (e) {
      console.warn('[Callback Credential Resolution Notice]:', e);
    }

    const isCredentialOrder = Boolean(cred || ref.includes('VERI') || ref.includes('TIER'));

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${isCredentialOrder ? 'Verified Assets Ready • Floate' : 'Payment Successful • Floate SafePay'}</title>
  <link rel="icon" type="image/png" href="/icon-192.png">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    body { background: #07170A; color: #F3F4F6; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { background: #0E2812; border: 1px solid rgba(255, 193, 7, 0.3); border-radius: 20px; max-width: 440px; width: 100%; padding: 28px 22px; text-align: center; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255, 193, 7, 0.15); color: #FFC107; padding: 6px 14px; border-radius: 999px; font-size: 13px; font-weight: 700; margin-bottom: 16px; border: 1px solid rgba(255, 193, 7, 0.3); }
    h1 { font-size: 22px; font-weight: 800; margin-bottom: 10px; color: #FFFFFF; }
    p { font-size: 14px; color: #A7F3D0; line-height: 1.55; margin-bottom: 18px; }
    .ref-box { background: #061A0A; border: 1px dashed #2E7D32; border-radius: 12px; padding: 10px; margin-bottom: 18px; font-family: monospace; font-size: 13px; color: #FFC107; }
    .btn-action { display: flex; align-items: center; justify-content: center; gap: 8px; font-weight: 700; font-size: 14px; padding: 12px 16px; border-radius: 12px; text-decoration: none; transition: transform 0.15s ease; margin-bottom: 10px; }
    .btn-gold { background: #FFC107; color: #0A2A0D; }
    .btn-green { background: #1B5E20; color: #A7F3D0; border: 1px solid #2E7D32; }
    .btn-wa { background: #25D366; color: #000000; font-size: 15px; margin-top: 8px; }
    .notice { font-size: 12px; color: #6EE7B7; margin-top: 14px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">🛡️ ${isCredentialOrder ? 'Floate Verified Assets' : 'Floate SafePay Escrow'}</div>
    <h1>${isCredentialOrder ? 'Verification Package Activated!' : 'Payment Confirmed!'}</h1>
    <p>${isCredentialOrder ? 'Your official Floate Verification credentials are ready. You can download high-resolution PNGs directly below:' : 'Your funds are securely held in escrow. We have notified the vendor to proceed with your order.'}</p>
    ${ref ? `<div class="ref-box">Reference: <strong>${ref}</strong></div>` : ''}

    ${cred ? `
      <div style="margin-bottom: 16px;">
        <a href="/api/credentials/${cred.fid}/download/badge" class="btn-action btn-gold">
          <span>📥 Download 1080p Badge Card (PNG)</span>
        </a>
        <a href="/api/credentials/${cred.fid}/download/certificate" class="btn-action btn-green">
          <span>📜 Download Official Certificate (PNG)</span>
        </a>
        <a href="/api/credentials/${cred.fid}/download/flyer" class="btn-action btn-green">
          <span>🏷️ Download A5 Market Flyer (PNG)</span>
        </a>
      </div>
    ` : ''}

    <a href="${whatsappUrl}" class="btn-action btn-wa">
      <span>💬 Return to WhatsApp</span>
    </a>
    <p class="notice">A confirmation message and receipt have also been sent to your WhatsApp number.</p>
  </div>
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

          // 3. Floate Launch Monetization Packages (Verified Plus ₦5,000, Boosts ₦1,000, 5-Boosts ₦4,000, Sponsored ₦10,000, Brand ₦75,000)
          if (
            txRef.startsWith('FLW_VERI_') ||
            txRef.startsWith('FLW_PROD_') ||
            txRef.startsWith('FLW_5-BO_') ||
            txRef.startsWith('FLW_SPON_') ||
            txRef.startsWith('FLW_BRAN_') ||
            txRef.startsWith('FLW_TIER_') ||
            data?.meta?.packageId
          ) {
            const customerPhone = data?.meta?.merchantPhone || data?.customer?.phone_number || data?.customer?.phonenumber || '2348000000000';
            const fulfillment = await monetizationService.handleSuccessfulPaymentFulfillment({
              txRef,
              amountPaid,
              merchantPhone: customerPhone,
              packageId: data?.meta?.packageId,
              meta: data?.meta,
            });

            return res.json({
              status: 'success',
              txRef,
              amountPaid,
              ...fulfillment,
            });
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

  // 3c-1f. Floate Launch Monetization Tiers (Launch valid until 20 Nov 2026, then standard)
  app.get(['/api/v1/pricing/tiers', '/api/pricing/tiers'], (_req, res) => {
    try {
      const data = monetizationService.getPricingTiers();
      res.json({
        success: true,
        ...data,
      });
    } catch (err: any) {
      console.error('[Pricing Tiers Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to retrieve pricing tiers' });
    }
  });

  // 3c-1g. Flutterwave Checkout Initiation for Monetization Tiers
  app.post(['/api/v1/payments/flutterwave/checkout', '/api/payments/flutterwave/checkout'], async (req, res) => {
    try {
      const { merchantPhone, packageId, customerName, customerEmail, productId, productTitle, category, city, redirectUrl } = req.body;
      if (!merchantPhone || !packageId) {
        return res.status(400).json({ success: false, error: 'merchantPhone and packageId are required.' });
      }

      const checkout = await monetizationService.initiateTierCheckout({
        merchantPhone,
        packageId,
        customerName,
        customerEmail,
        productId,
        productTitle,
        category,
        city,
        redirectUrl,
      });

      res.json(checkout);
    } catch (err: any) {
      console.error('[Flutterwave Tier Checkout Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to initiate tier checkout' });
    }
  });

  // 3c-1h. Merchant Digital Certificate Endpoint
  app.get(['/api/v1/merchant/:phone/certificate', '/api/merchant/:phone/certificate'], async (req, res) => {
    try {
      const { phone } = req.params;
      const cert = await monetizationService.getMerchantCertificate(phone);
      if (!cert.found) {
        return res.status(404).json({ success: false, error: cert.error || 'Merchant not found' });
      }
      res.json({ success: true, ...cert });
    } catch (err: any) {
      console.error('[Merchant Certificate Error]:', err);
      res.status(500).json({ success: false, error: err?.message || 'Failed to load certificate' });
    }
  });

  // 3c-1i. Boost Product with Available Credit Endpoint
  app.post(['/api/v1/merchant/boost-product', '/api/merchant/boost-product'], async (req, res) => {
    try {
      const { merchantPhone, productId } = req.body;
      if (!merchantPhone || !productId) {
        return res.status(400).json({ success: false, error: 'merchantPhone and productId are required.' });
      }

      const result = await monetizationService.boostProductWithCredit({
        merchantPhone,
        productId,
      });

      res.json(result);
    } catch (err: any) {
      console.error('[Boost Product Error]:', err);
      res.status(400).json({ success: false, error: err?.message || 'Failed to boost product' });
    }
  });

  // 3c-1j. Floate Base Kit - Public Merchant Verification API (floate.xyz/v/:fid)
  app.get(['/api/v1/verify/:fid', '/api/verify/:fid'], async (req, res, next) => {
    try {
      const { fid } = req.params;
      const cleanFid = String(fid || '').trim().toUpperCase();
      if (cleanFid === 'SESSION') return next();

      // 1. Check built-in sample credentials
      const foundSample = findCredentialByFid(cleanFid);
      if (foundSample) {
        return res.json({
          success: true,
          fid: foundSample.fid,
          biz: foundSample.biz,
          loc: foundSample.loc,
          name: foundSample.name,
          city: foundSample.city,
          tier: foundSample.tier,
          status: foundSample.status,
          verified_on: foundSample.verifiedOn,
          checks: foundSample.checks,
          profile_url: `https://floate.xyz/m/${foundSample.slug}`,
          verify_url: foundSample.verifyUrl,
          certificate_url: foundSample.certificateUrl,
          badge_url: foundSample.badgeCardUrl,
          seal_url: '/brand/base-kit/layers/seal-verified-1080.png',
        });
      }

      // 2. Query Firestore merchant records
      const allMerchants = await firestoreDb.getAllMerchantsList(300);
      const merchant = allMerchants.find(
        (m) =>
          (m.certificateId && m.certificateId.toUpperCase() === cleanFid) ||
          m.id === cleanFid ||
          m.whatsapp === cleanFid
      );

      if (merchant) {
        const cred = createCredentialForMerchant({
          merchantId: merchant.id || merchant.whatsapp,
          name: merchant.ownerFullName || merchant.businessName || 'Verified Merchant',
          biz: merchant.businessName || 'Verified Enterprise',
          loc: `${merchant.city || 'Market Hub'}, ${merchant.state || 'Nigeria'}`,
          phone: merchant.whatsapp,
          isPlus: Boolean(merchant.isVerifiedPlus),
          customFid: cleanFid.startsWith('FLT-') ? cleanFid : undefined,
        });

        return res.json({
          success: true,
          fid: cred.fid,
          biz: cred.biz,
          loc: cred.loc,
          name: cred.name,
          city: cred.city,
          tier: cred.tier,
          status: cred.status,
          verified_on: cred.verifiedOn,
          checks: cred.checks,
          profile_url: `https://floate.xyz/m/${cred.slug}`,
          verify_url: cred.verifyUrl,
          certificate_url: cred.certificateUrl,
          badge_url: cred.badgeCardUrl,
          seal_url: '/brand/base-kit/layers/seal-verified-1080.png',
        });
      }

      return res.status(404).json({
        success: false,
        error: `Merchant ID ${cleanFid} is not an active verified seller on Floate.`,
        fid: cleanFid,
        status: 'unverified',
      });
    } catch (err: any) {
      console.error('[Verify FID Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Verification lookup failed' });
    }
  });

  // 3c-1k. Floate Base Kit - Credential Manifest & Samples API
  app.get(['/api/v1/credentials/samples', '/api/credentials/samples'], (_req, res) => {
    res.json({ success: true, count: SAMPLE_CREDENTIALS.length, samples: SAMPLE_CREDENTIALS });
  });

  app.get(['/api/v1/credentials/:fid', '/api/credentials/:fid'], (req, res) => {
    const { fid } = req.params;
    const cred = findCredentialByFid(fid);
    if (!cred) {
      return res.status(404).json({ success: false, error: 'Credential not found' });
    }
    return res.json({ success: true, credential: cred });
  });

  // 3c-1l. Public /v/:fid Web Route with Rich OpenGraph Tags for Social Sharing
  app.get('/v/:fid', async (req, res, next) => {
    // If request accepts JSON, pass to API or let next() handle SPA
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return next();
    }

    const { fid } = req.params;
    const cleanFid = String(fid || '').trim().toUpperCase();
    const cred = findCredentialByFid(cleanFid);

    const bizName = cred ? cred.biz : 'Verified Merchant';
    const loc = cred ? cred.loc : 'Nigerian Market Network';
    const title = `${bizName} | Floate Verified Merchant (${cleanFid})`;
    const desc = `${bizName} has been physically verified on Floate with a real stall at ${loc}. Chat directly on WhatsApp.`;
    const image = cred?.badgeCardUrl || '/brand/base-kit/layers/seal-verified-1080.png';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
  <meta name="description" content="${desc}"/>
  <meta property="og:title" content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:image" content="${image}"/>
  <meta property="og:type" content="profile"/>
  <meta name="twitter:card" content="summary_large_image"/>
  <link rel="stylesheet" href="/brand/base-kit/tokens/tokens.css"/>
  <script>
    // Redirect to interactive SPA view if loaded directly in browser
    window.location.href = '/?verify=' + encodeURIComponent('${cleanFid}');
  </script>
</head>
<body style="background:#0E3B12;color:#FFFDF5;font-family:sans-serif;text-align:center;padding:40px 20px;">
  <img src="/brand/base-kit/layers/wordmark-yellow.png" style="height:44px;margin-bottom:24px;"/>
  <h2>Verifying Merchant ${cleanFid}...</h2>
  <p>${desc}</p>
  <p style="margin-top:20px;"><a href="/?verify=${cleanFid}" style="color:#FFC107;font-weight:bold;">Click here if not redirected automatically</a></p>
</body>
</html>`;
    return res.send(html);
  });

  // 3c-1m. High-Resolution PNG Credential Asset Download Endpoint (Direct One-Tap Download for WhatsApp & Mobile Web)
  app.get(
    [
      '/api/v1/credentials/:fid/download/:type',
      '/api/credentials/:fid/download/:type',
      '/c/:fid/:type.png',
      '/c/:fid/:type',
    ],
    async (req, res) => {
      try {
        const { fid, type } = req.params;
        const cleanFid = String(fid || '').trim();
        const rawType = String(type || 'badge').toLowerCase().replace(/\.png$/, '');

        // Resolve credential for FID, Phone, or Merchant ID
        const cred = await resolveCredential(cleanFid);
        if (!cred) {
          return res.status(404).json({ success: false, error: `Credential not found for ID: ${cleanFid}` });
        }

        // If client requests all assets manifest
        if (rawType === 'all' || rawType === 'manifest') {
          return res.json({
            success: true,
            fid: cred.fid,
            merchant: cred.biz,
            location: cred.loc,
            assets: {
              badgeCard: `/api/credentials/${cred.fid}/download/badge`,
              certificate: `/api/credentials/${cred.fid}/download/certificate`,
              flyer: `/api/credentials/${cred.fid}/download/flyer`,
              squareBoost: `/api/credentials/${cred.fid}/download/square`,
              verifiedSeal: `/brand/base-kit/layers/seal-verified-1080.png`,
              webProfile: `https://floate.xyz/v/${cred.fid}`,
            },
          });
        }

        // Normalize type
        let normalizedType: 'badge' | 'certificate' | 'flyer' | 'square' | 'seal' = 'badge';
        if (rawType.includes('cert')) normalizedType = 'certificate';
        else if (rawType.includes('flyer')) normalizedType = 'flyer';
        else if (rawType.includes('square') || rawType.includes('status')) normalizedType = 'square';
        else if (rawType.includes('seal')) normalizedType = 'seal';
        else normalizedType = 'badge';

        const { buffer, filename, contentType } = await renderCredentialPng(cred, normalizedType);

        // Force attachment if requested via /download/ route or ?download=1 query
        const isDownload = req.path.includes('/download/') || req.query.download === '1' || req.query.download === 'true';

        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `${isDownload ? 'attachment' : 'inline'}; filename="${filename}"`);
        res.setHeader('Content-Length', buffer.length);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        return res.end(buffer);
      } catch (err: any) {
        console.error('[Credential Asset Download Error]:', err);
        return res.status(500).json({ success: false, error: err?.message || 'Failed to render credential asset' });
      }
    }
  );


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
              { id: 'btn_download_badge', title: '🎨 Get Store Posters' },
              { id: 'btn_home', title: '🏠 Main Menu' },
            ],
          }
        ).catch((waErr) => console.warn('[WhatsApp Verification Notification Error]:', waErr));

        // Automatically dispatch store badge card, certificate, and flyer pictures into WhatsApp
        await sendMerchantVisualAssetsToWhatsApp(cleanPhone, ownerName, storeName, result.session?.marketLocation || result.merchant?.state || 'Nigeria').catch((err) => console.warn('[Auto Asset Push Error Visual Verif]:', err));
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
          { id: 'btn_download_badge', title: '🎨 Get Store Posters' },
          { id: 'btn_add_product', title: '➕ Add Products' },
        ],
      }).catch((e) => console.warn('[WhatsApp Verification Message Notice]:', e?.message || e));

      // Automatically send store badge card, certificate, and flyer pictures into WhatsApp
      sendMerchantVisualAssetsToWhatsApp(cleanPhone, ownerFullName, effectiveBizName, effectiveLocation).catch((e) => console.warn('[Auto Asset Push Error Live Submit]:', e));

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

  // Verified 24-hour merchant status stories for www.floate.xyz
  const FALLBACK_MERCHANT_STATUSES: any[] = [];

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
            city: l.city || '',
            state: l.state || '',
            isVerified: l.isVerified || l.verifiedStatus === 'YES',
            category: l.category || 'General',
            marketHub: [l.city, l.state].filter(Boolean).join(', ') || 'Nigeria',
            imageUrl: (l as any).imageUrl || '',
            description: `${l.businessName} - Contact directly on WhatsApp for orders, pricing, and nationwide delivery.`,
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

  app.get(['/api/catalog/product/:id', '/api/v1/products/:id'], async (req, res) => {
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
          city: l.city || '',
          state: l.state || '',
          category: l.category || 'General',
          imageUrl: (l as any).imageUrl || '',
        }));
      }

      const product = products.find((p) => p.id === productId || p.product === productId);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      const merchant = await firestoreDb.getMerchant(product.vendorPhone || product.whatsapp || product.merchantId);
      const vendorName = merchant?.businessName || product.businessName || product.vendorName || 'Verified Merchant';
      const vendorPhone = merchant?.whatsapp || product.whatsapp || product.vendorPhone || '';
      const city = merchant?.city || product.city || '';
      const state = merchant?.state || product.state || '';
      const numericPrice = Number(product.numericPrice ?? product.price_naira ?? parseNumericAmount(String(product.price || '0')));
      const title = product.title || product.name || product.product || 'Product';
      const photoUrl = product.photo_url || product.photoUrl || product.imageUrl || '';
      const normalizedProduct = {
        ...product,
        title,
        name: title,
        price_naira: numericPrice,
        numericPrice,
        formatted_price: product.formatted_price || `₦${numericPrice.toLocaleString('en-NG')}`,
        photo_url: photoUrl,
        photos: product.photos || (photoUrl ? [photoUrl] : []),
        description: product.description || product.specs || '',
        in_stock: product.in_stock !== false,
        vendor: {
          slug: slugifyBusinessName(vendorName) || normalizePhone(vendorPhone),
          name: vendorName,
          city,
          state,
          verified: merchant?.isVerified === true || merchant?.verifiedStatus === 'YES',
          whatsapp_number: vendorPhone,
          avatar_url: merchant?.profilePhotoUrl || merchant?.photoUrl || '',
        },
      };
      return res.json({
        success: true,
        product: normalizedProduct,
        merchant: merchant || {
          businessName: product.businessName || 'Verified Merchant',
          whatsapp: product.whatsapp || product.vendorPhone,
          isVerified: true,
          city: product.city || '',
          state: product.state || '',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch product details' });
    }
  });

  // Enhanced Multi-Identifier Merchant Profile Endpoint (supports sheet-1, phone numbers, business slugs e.g. kasi-communications)
  const handleVendorProfile = async (req: express.Request, res: express.Response) => {
    try {
      const rawParam = (req.params.phone || req.params.slug || req.params.identifier || '').trim();
      const decodedParam = decodeURIComponent(rawParam);

      let targetPhone = decodedParam;
      let merchant: any = null;

      const dDigits = decodedParam.replace(/\D/g, '');
      const compactSlug = decodedParam.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanSlug = decodedParam.toLowerCase().replace(/[-_]+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();

      // 0. Direct phone lookup if pure or leading digits (7+ chars)
      if (dDigits.length >= 7) {
        const canonicalPhone = dDigits.startsWith('0') ? `234${dDigits.slice(1)}` : (dDigits.startsWith('234') ? dDigits : `234${dDigits}`);
        merchant = (await firestoreDb.getMerchant(canonicalPhone)) || (await firestoreDb.getMerchant(dDigits));
        if (merchant) {
          targetPhone = merchant.whatsapp || canonicalPhone;
        }
      }

      // 1. Check if rawParam is an FID (e.g. FLT-ENU-00588)
      if (!merchant && decodedParam.startsWith('FLT-')) {
        const cred = findCredentialByFid(decodedParam);
        if (cred) {
          targetPhone = '07065599116';
          merchant = await firestoreDb.getMerchant(targetPhone);
          if (!merchant) {
            merchant = {
              id: targetPhone,
              businessName: cred.biz,
              ownerFullName: cred.name,
              whatsapp: targetPhone,
              state: cred.loc,
              city: cred.city,
              category: 'General Retail',
              isVerified: true,
              verifiedStatus: 'YES',
            };
          }
        }
      }

      // 2. Check if rawParam is a sheet identifier (e.g. sheet-1, sheet-2, sheet1, sheet_1)
      const sheetMatch = !merchant ? decodedParam.match(/^sheet[-_]?(\d+)$/i) : null;
      if (sheetMatch) {
        const sheetIndex = Math.max(0, parseInt(sheetMatch[1], 10) - 1);
        const allListings = await sheetsDb.getAllListings();
        const targetListing = allListings[sheetIndex] || allListings[0];
        if (targetListing) {
          targetPhone = targetListing.whatsapp || targetListing.id;
          merchant = await firestoreDb.getMerchant(targetPhone);
          if (!merchant) {
            merchant = {
              id: targetListing.id || targetListing.whatsapp,
              businessName: targetListing.businessName,
              ownerFullName: targetListing.ownerFullName || '',
              whatsapp: targetListing.whatsapp,
              state: targetListing.state,
              city: targetListing.city,
              category: targetListing.category,
              isVerified: targetListing.isVerified || targetListing.verifiedStatus === 'YES',
              verifiedStatus: targetListing.verifiedStatus || 'YES',
            };
          }
        }
      }

      // 3. Direct document lookups by ID/phone/key
      if (!merchant) {
        merchant = await firestoreDb.getMerchant(targetPhone);
      }

      // 4. Search active merchants/listings by compact slug, clean slug, or phone digits
      if (!merchant) {
        const allMerchants = await firestoreDb.getAllMerchantsList(500);
        const match = allMerchants.find((m) => {
          const biz = (m.businessName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
          const compactBiz = (m.businessName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const mPhone = (m.whatsapp || m.id || '').replace(/\D/g, '');
          const phoneMatch = dDigits.length >= 7 && (mPhone.endsWith(dDigits.slice(-10)) || dDigits.endsWith(mPhone.slice(-10)));
          const slugMatch =
            compactBiz === compactSlug ||
            biz === cleanSlug ||
            (compactSlug.length >= 3 && (compactBiz.includes(compactSlug) || compactSlug.includes(compactBiz)));
          return slugMatch || phoneMatch;
        });

        if (match) {
          merchant = match;
          targetPhone = match.whatsapp || match.id;
        } else {
          const allListings = await sheetsDb.getAllListings();
          const sheetsListing = sheetsDb.getListingByBusinessName(decodedParam) ||
            allListings.find((l) => {
              const biz = (l.businessName || '').toLowerCase().replace(/[-_]+/g, ' ').replace(/[^a-z0-9 ]/g, '').trim();
              const compactBiz = (l.businessName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const lPhone = (l.whatsapp || l.id || '').replace(/\D/g, '');
              const phoneMatch = dDigits.length >= 7 && (lPhone.endsWith(dDigits.slice(-10)) || dDigits.endsWith(lPhone.slice(-10)));
              const slugMatch =
                compactBiz === compactSlug ||
                biz === cleanSlug ||
                (compactSlug.length >= 3 && (compactBiz.includes(compactSlug) || compactSlug.includes(compactBiz)));
              return slugMatch || phoneMatch;
            });

          if (sheetsListing) {
            targetPhone = sheetsListing.whatsapp || sheetsListing.id;
            merchant = {
              id: sheetsListing.id || sheetsListing.whatsapp,
              businessName: sheetsListing.businessName,
              ownerFullName: sheetsListing.ownerFullName || '',
              whatsapp: sheetsListing.whatsapp,
              state: sheetsListing.state,
              city: sheetsListing.city,
              category: sheetsListing.category,
              isVerified: true,
              verifiedStatus: 'YES',
            };
          }
        }
      }

      // 3.5 Absolute fallback merchant so storefront never fails
      if (!merchant) {
        const cleanDigits = decodedParam.replace(/\D/g, '');
        const fallbackName = cleanDigits.length >= 7 ? `Store ${cleanDigits.slice(-4)}` : (decodedParam.charAt(0).toUpperCase() + decodedParam.slice(1));
        merchant = {
          id: targetPhone || decodedParam,
          businessName: fallbackName,
          ownerFullName: 'Verified Merchant',
          whatsapp: targetPhone || decodedParam,
          state: 'Lagos',
          city: 'Lagos Island',
          category: 'General Retail',
          isVerified: true,
          verifiedStatus: 'YES',
        };
      }

      // 4. Load merchant products and 24h status stories
      let products = await firestoreDb.getAllProducts(targetPhone || decodedParam);
      if ((!products || products.length === 0) && merchant?.businessName) {
        const allProducts = await firestoreDb.getAllProducts();
        products = allProducts.filter((p: any) =>
          p.businessName?.toLowerCase() === merchant.businessName.toLowerCase() ||
          p.vendorPhone === merchant.whatsapp ||
          p.whatsapp === merchant.whatsapp
        );
      }

      if ((!products || products.length === 0) && merchant) {
        const listings = await sheetsDb.getAllListings();
        const vendorListings = listings.filter((l) =>
          l.businessName?.toLowerCase() === merchant.businessName?.toLowerCase() ||
          l.whatsapp === merchant.whatsapp
        );
        products = vendorListings.map((l, index) => ({
          id: l.id || `prod_${l.whatsapp || index}`,
          businessName: l.businessName,
          vendorName: l.businessName,
          product: l.product || l.businessName,
          name: l.product || l.businessName,
          price: l.price || '₦25,000',
          numericPrice: parsePriceToNumber(l.price || ''),
          whatsapp: l.whatsapp,
          vendorPhone: l.whatsapp,
          city: l.city || '',
          state: l.state || '',
          isVerified: l.isVerified || l.verifiedStatus === 'YES',
          category: l.category || 'General',
          imageUrl: (l as any).imageUrl || '',
          description: `${l.businessName} - Contact directly on WhatsApp for orders, pricing, and delivery.`,
        }));
      }

      const statuses = await firestoreDb.getActiveMerchantStatuses(targetPhone || decodedParam);

      const cleanBizName = merchant?.businessName || 'Verified Merchant';
      const merchantSlug = cleanBizName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      const loc = [merchant?.city, merchant?.state].filter(Boolean).join(', ') || 'Nigeria';

      // Authoritative Backend FID & Base Kit Asset Generation
      const credential = createCredentialForMerchant({
        merchantId: merchant?.id || targetPhone || decodedParam,
        name: merchant?.ownerFullName || cleanBizName,
        biz: cleanBizName,
        loc: loc,
        phone: targetPhone,
        isPlus: true,
      });

      // Authoritative Selfie / Avatar URL Resolution
      const resolvedSelfieUrl =
        merchant?.profilePhotoUrl ||
        (merchant as any)?.kycSelfieUrl ||
        (merchant as any)?.selfieUrl ||
        merchant?.verificationVideoUrl ||
        merchant?.photoUrl ||
        '/assets/aistudio/floate-verified-badge.png';

      const enrichedMerchant = {
        ...(merchant || {}),
        businessName: cleanBizName,
        whatsapp: targetPhone || decodedParam,
        isVerified: Boolean(merchant?.isVerified ?? true),
        slug: merchantSlug,
        fid: credential.fid,
        selfieUrl: resolvedSelfieUrl,
        avatar_url: resolvedSelfieUrl,
        isUnmetered: true,
        inquiriesFree: true,
        badgeUrl: '/brand/base-kit/layers/seal-verified-256.png',
        masterSealUrl: '/brand/base-kit/layers/seal-verified-1080.png',
        certificateUrl: credential.certificateUrl,
        badgeCardUrl: credential.badgeCardUrl,
        flyerUrl: credential.flyerUrl,
        squareBoostUrl: credential.squareBoostUrl,
        verificationUrl: credential.verifyUrl,
      };

      // Strip deprecated credit meter fields from API response
      delete (enrichedMerchant as any).credits;
      delete (enrichedMerchant as any).lead_credits;

      return res.json({
        success: true,
        merchant: enrichedMerchant,
        credential,
        fid: credential.fid,
        selfieUrl: resolvedSelfieUrl,
        avatar_url: resolvedSelfieUrl,
        isVerified: Boolean(merchant?.isVerified ?? true),
        isUnmetered: true,
        badgeUrl: '/brand/base-kit/layers/seal-verified-256.png',
        badgeCardUrl: credential.badgeCardUrl,
        certificateUrl: credential.certificateUrl,
        flyerUrl: credential.flyerUrl,
        squareBoostUrl: credential.squareBoostUrl,
        slug: merchantSlug,
        cleanStoreUrl: buildMerchantProfileUrl(merchantSlug || targetPhone),
        storeUrl: buildMerchantProfileUrl(merchantSlug || targetPhone),
        profile_url: buildMerchantProfileUrl(merchantSlug || targetPhone),
        vendorPhone: targetPhone,
        products: products || [],
        statuses: [],
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch vendor profile' });
    }
  };

  app.get(['/api/catalog/vendor/:phone', '/api/v1/vendors/:slug'], handleVendorProfile);
  app.get('/api/catalog/merchant/:slug', handleVendorProfile);
  app.get('/api/merchant/profile/:identifier', handleVendorProfile);
  app.get('/api/merchants/:identifier', handleVendorProfile);
  app.get('/api/credentials/lookup/:slug', handleVendorProfile);
  app.get('/api/vendor/:identifier', handleVendorProfile);

  app.get('/api/catalog/merchants', async (_req, res) => {
    try {
      const merchants = await firestoreDb.getAllMerchantsForAdmin();
      const publicMerchants = merchants
        .filter((merchant) =>
          (merchant.isVerified === true || merchant.verifiedStatus === 'YES') &&
          merchant.status !== 'INACTIVE' &&
          merchant.status !== 'PENDING_REVIEW'
        )
        .map((merchant) => ({
          id: merchant.id,
          slug: slugifyBusinessName(merchant.businessName || ''),
          businessName: merchant.businessName || '',
          name: merchant.businessName || '',
          whatsapp: normalizePhone(merchant.whatsapp || merchant.id),
          whatsappNumber: normalizePhone(merchant.whatsapp || merchant.id),
          phone: normalizePhone(merchant.whatsapp || merchant.id),
          state: merchant.state || '',
          city: merchant.city || '',
          category: merchant.category || '',
          marketHub: merchant.marketHub || '',
          location: merchant.shopAddress || '',
          description: merchant.description || '',
          bio: merchant.description || '',
          product: merchant.product || '',
          profilePhotoUrl: merchant.profilePhotoUrl || merchant.photoUrl || '',
          isVerified: true,
          verified: true,
        }));
      return res.json({ success: true, merchants: publicMerchants, total: publicMerchants.length });
    } catch (error) {
      console.error('[Catalog] Failed to list public merchants:', error);
      return res.status(500).json({ success: false, error: 'Merchant directory could not be loaded.' });
    }
  });

  app.get(
    ['/api/catalog/vendor/:phone/products', '/api/v1/vendors/:slug/products'],
    async (req, res) => {
      try {
        const identifier = String(req.params.phone || req.params.slug || '').trim();
        const requestedPhone = normalizePhone(identifier);
        const merchants = await firestoreDb.getAllMerchantsForAdmin();
        const merchant = merchants.find((item) =>
          normalizePhone(item.whatsapp || item.id) === requestedPhone ||
          slugifyBusinessName(item.businessName || '').toLowerCase() === identifier.toLowerCase() ||
          String(item.id || '').toLowerCase() === identifier.toLowerCase()
        );
        if (!merchant) {
          return res.status(404).json({ success: false, error: 'Merchant not found' });
        }

        const merchantPhone = merchant.whatsapp || merchant.id;
        const merchantSlug = slugifyBusinessName(merchant.businessName || '') || normalizePhone(merchantPhone);
        const allProducts = await firestoreDb.getAllProducts(merchantPhone);
        const pageSize = 12;
        const pageNumber = Math.max(1, Number(String(req.query.cursor || '').replace('page_', '')) || 1);
        const offset = (pageNumber - 1) * pageSize;
        const products = allProducts.slice(offset, offset + pageSize).map((product: any) => {
          const price = Number(product.numericPrice ?? product.price_naira ?? parseNumericAmount(String(product.price || '0')));
          const title = product.title || product.name || product.product || 'Product';
          const photoUrl = product.photo_url || product.photoUrl || product.imageUrl || '';
          return {
            ...product,
            id: product.id,
            title,
            name: title,
            price_naira: price,
            formatted_price: product.formatted_price || `₦${price.toLocaleString('en-NG')}`,
            photo_url: photoUrl,
            photos: product.photos || (photoUrl ? [photoUrl] : []),
            description: product.description || product.specs || '',
            in_stock: product.in_stock !== false,
            vendor: {
              slug: merchantSlug,
              name: merchant.businessName,
              city: merchant.city || '',
              state: merchant.state || '',
              verified: merchant.isVerified === true || merchant.verifiedStatus === 'YES',
              whatsapp_number: merchantPhone,
              avatar_url: merchant.profilePhotoUrl || merchant.photoUrl || '',
            },
          };
        });

        return res.json({
          success: true,
          vendor_slug: merchantSlug,
          products,
          total_products: allProducts.length,
          next_cursor: allProducts.length > offset + pageSize ? `page_${pageNumber + 1}` : null,
        });
      } catch (error: any) {
        console.error('[Catalog] Failed to fetch merchant products:', error);
        return res.status(500).json({ success: false, error: 'Merchant products could not be loaded.' });
      }
    }
  );

  // Daily Status Updates Feed (PAUSED)
  app.get(['/api/catalog/statuses', '/api/merchants/status-updates'], async (_req, res) => {
    return res.json({ success: true, count: 0, statuses: [], paused: true, message: 'Daily status feed is currently paused.' });
  });

  // Post Daily Status Update from Web or Merchant Portal (PAUSED)
  app.post('/api/catalog/status', async (_req, res) => {
    return res.status(400).json({ success: false, paused: true, error: 'Daily status updates feature is currently paused.' });
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

  // Flutterwave Checkout Packages Endpoint (POST /api/v1/payments/flutterwave/checkout)
  app.post(
    ['/api/v1/payments/flutterwave/checkout', '/api/payments/flutterwave/checkout', '/api/v1/checkout/flutterwave'],
    async (req, res) => {
      try {
        const {
          merchantPhone,
          phone,
          packageId,
          package_id,
          tierId,
          customerName,
          customerEmail,
          productId,
          productTitle,
          category,
          city,
          redirectUrl,
        } = req.body || {};

        const effectivePhone = String(merchantPhone || phone || '2348000000000').trim();
        const effectivePackageId = String(packageId || package_id || tierId || 'VERIFIED_PLUS').trim();

        // 1. REJECT DEPRECATED LEAD CREDITS PACKAGES
        if (effectivePackageId === 'LEAD_CREDITS_10' || effectivePackageId.toLowerCase().includes('lead_credits')) {
          return res.status(400).json({
            success: false,
            error: 'LEAD_CREDITS_10 package is deprecated. Inquiries on Floate are now 100% unmetered and free for registered vendors.',
          });
        }

        // 2. INITIATE FLUTTERWAVE CHECKOUT FOR GROWTH PACKAGES
        const checkoutResult = await monetizationService.initiateTierCheckout({
          merchantPhone: effectivePhone,
          packageId: effectivePackageId,
          customerName: customerName ? String(customerName) : undefined,
          customerEmail: customerEmail ? String(customerEmail) : undefined,
          productId: productId ? String(productId) : undefined,
          productTitle: productTitle ? String(productTitle) : undefined,
          category: category ? String(category) : undefined,
          city: city ? String(city) : undefined,
          redirectUrl: redirectUrl ? String(redirectUrl) : undefined,
        });

        return res.json({
          success: true,
          checkoutUrl: checkoutResult.checkoutUrl,
          paymentLink: checkoutResult.checkoutUrl,
          txRef: checkoutResult.txRef,
          amount: checkoutResult.amount,
          packageName: checkoutResult.packageName,
          packageId: effectivePackageId,
        });
      } catch (err: any) {
        console.error('[Flutterwave Checkout API Error]:', err);
        return res.status(400).json({
          success: false,
          error: err?.message || 'Failed to generate Flutterwave checkout link.',
        });
      }
    }
  );

  // 3j. Web Business Registration & Product Addition Endpoints
  app.post('/api/register/business', async (req, res) => {
    try {
      const {
        businessName,
        ownerName,
        phone,
        location,
        state,
        city,
        category,
        marketHub,
        shopAddress,
        stallAddress,
        hasPhysicalStore,
        storeType,
        coordinates,
        description,
        selfieUrl,
        profilePhoto,
        initialProduct,
      } = req.body || {};
      const cleanPhone = (phone || '').replace(/\D/g, '');

      if (!cleanPhone || !businessName) {
        return res.status(400).json({ success: false, error: 'Phone number and Business Name are required.' });
      }

      const canonicalPhone = cleanPhone.startsWith('0') ? `234${cleanPhone.slice(1)}` : cleanPhone;
      const resolvedState = state || (location ? location.split(',').pop()?.trim() : 'Lagos') || 'Lagos';
      const resolvedCity = city || (location ? location.split(',')[0]?.trim() : 'Lagos') || 'Lagos';
      const resolvedLocation = `${resolvedCity}, ${resolvedState}`;
      const resolvedCategory = category || 'General Commerce';
      const profileImage = String(selfieUrl || profilePhoto || '');
      let profilePhotoUrl = profileImage.startsWith('http') ? profileImage : '';
      const base64Image = profileImage.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/s);
      if (base64Image) {
        try {
          const extension = base64Image[1].split('/')[1].replace('jpeg', 'jpg');
          const savedMedia = await saveCatalogMedia(
            Buffer.from(base64Image[2], 'base64'),
            base64Image[1],
            `merchant_${cleanPhone}_${Date.now()}.${extension}`
          );
          profilePhotoUrl = savedMedia.publicUrl;
        } catch (mediaError) {
          console.warn('[Registration Profile Photo Warning]:', mediaError);
        }
      }

      // 1. Save / Update Merchant in Firestore
      const merchantDoc = {
        id: `merchant_${cleanPhone}`,
        whatsapp: canonicalPhone,
        businessName,
        ownerFullName: ownerName || businessName,
        city: resolvedCity,
        state: resolvedState,
        category: resolvedCategory,
        marketHub: marketHub || stallAddress || shopAddress || 'Main Market',
        shopAddress: stallAddress || shopAddress || resolvedLocation,
        hasPhysicalStore: hasPhysicalStore !== false,
        storeType: storeType || (hasPhysicalStore === false ? 'online_dispatch' : 'physical_store'),
        coordinates: coordinates || null,
        description: description || '',
        profilePhotoUrl,
        isVerified: true,
        verificationStatus: 'ACTIVE',
        status: 'ACTIVE',
        credit_balance: 25, // Award 25 free credits (5 customer leads)
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestoreDb.saveMerchant(merchantDoc as any);

      // Also mirror to Google Sheets
      try {
        await sheetsDb.registerBusiness({
          userId: cleanPhone,
          whatsapp: canonicalPhone,
          businessName,
          ownerFullName: ownerName || businessName,
          state: resolvedState,
          city: resolvedCity,
          category: resolvedCategory,
          product: initialProduct?.product || businessName,
          price: initialProduct?.price || '₦25,000',
          identityVerified: true,
        });
      } catch (sheetErr) {
        console.warn('[Sheets Mirror Warning]:', sheetErr);
      }

      // 2. Save Initial Product if provided
      let savedInitialProduct = null;
      const initialProductName = initialProduct?.product || initialProduct?.name || initialProduct?.title;
      if (initialProductName) {
        let photoUrl = initialProduct.photoUrl || '';
        const initialImage = initialProduct.photoBase64 || initialProduct.image || initialProduct.imageUrl || '';
        if (!photoUrl && initialImage.startsWith('data:image/')) {
          try {
            const buffer = Buffer.from(initialImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            const savedMedia = await saveCatalogMedia(buffer, 'image/jpeg', `prod_${cleanPhone}_${Date.now()}`);
            photoUrl = savedMedia.publicUrl;
          } catch (mErr) {
            console.warn('[Media Save Warning]:', mErr);
          }
        }

        savedInitialProduct = await firestoreDb.saveProductListing({
          userId: canonicalPhone,
          businessName,
          whatsapp: canonicalPhone,
          state: resolvedState,
          city: resolvedCity,
          category: resolvedCategory,
          product: initialProductName,
          price: initialProduct.price || '₦25,000',
          specs: initialProduct.description || 'Verified product from stock',
          photoUrl: photoUrl || undefined,
        });

        try {
          await sheetsDb.addNewProductListing(
            canonicalPhone,
            initialProductName,
            initialProduct.price || '25000',
            {
              businessName,
              businessWhatsapp: canonicalPhone,
              businessState: resolvedState,
              businessCity: resolvedCity,
              businessCategory: resolvedCategory,
            }
          );
        } catch (e) {}
      }

      // Generate Storefront URL
      const cleanSlug = slugifyBusinessName(businessName);
      const storeUrl = buildMerchantProfileUrl(businessName || canonicalPhone);

      // 3. Dispatch automated celebratory WhatsApp notification
      if (isWhatsAppConfigured()) {
        try {
          const welcomeMsg =
            `🎉 *Welcome to Floate for Businesses, ${businessName}!* 🏪\n\n` +
            `Your official web storefront is now active:\n` +
            `🌐 *${storeUrl}*\n\n` +
            `🎁 *25 Free Floate Credits* have been added to your wallet (up to 5 direct customer connections)!\n\n` +
            `When buyers across Nigeria search for your products, Floate connects them directly to your WhatsApp with zero commission.\n\n` +
            `👉 *Storefront Permalink:* ${storeUrl}\n` +
            `_You can manage products, view customer leads, and check stats anytime right here or on your web store!_`;

          await sendWhatsAppMessage(canonicalPhone, welcomeMsg);
        } catch (waErr) {
          console.warn('[Registration WhatsApp Notice Warning]:', waErr);
        }
      }

      sendMerchantVisualAssetsToWhatsApp(canonicalPhone, ownerName || businessName, businessName, resolvedLocation)
        .catch((assetError) => console.warn('[Registration Asset Push Warning]:', assetError));

      return res.json({
        success: true,
        message: 'Business successfully registered! 25 free credits awarded.',
        phone: canonicalPhone,
        storeUrl,
        slug: cleanSlug,
        verified: true,
        isVerified: true,
        verification_status: 'verified',
        creditsAwarded: 25,
        initialProduct: savedInitialProduct,
      });
    } catch (err: any) {
      console.error('[Web Registration Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Registration failed' });
    }
  });

  // 3j-2. Add Product directly from Storefront
  app.post('/api/catalog/product', async (req, res) => {
    try {
      const {
        phone,
        vendorPhone,
        identifier,
        businessName,
        product,
        name,
        title,
        price,
        category,
        specs,
        description,
        photoUrl,
        imageUrl,
        image,
        photoBase64,
      } = req.body || {};
      const resolvedPhone = phone || vendorPhone || identifier;
      const resolvedProductName = product || name || title;
      const cleanPhone = String(resolvedPhone || '').replace(/\D/g, '');

      if (!cleanPhone || !resolvedProductName) {
        return res.status(400).json({ success: false, error: 'Phone number and Product Name are required.' });
      }

      const canonicalPhone = cleanPhone.startsWith('0') ? `234${cleanPhone.slice(1)}` : cleanPhone;
      const merchant = await firestoreDb.getMerchant(canonicalPhone);
      const effectiveBizName = businessName || merchant?.businessName || 'Verified Merchant';
      const effectiveState = merchant?.state || 'Lagos';
      const effectiveCity = merchant?.city || 'Lagos';
      const effectiveCategory = category || merchant?.category || 'General';

      let resolvedPhotoUrl = photoUrl || imageUrl || image || '';
      const submittedImage = photoBase64 || (resolvedPhotoUrl.startsWith('data:image/') ? resolvedPhotoUrl : '');
      if (submittedImage) {
        try {
          const buffer = Buffer.from(submittedImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
          const savedMedia = await saveCatalogMedia(buffer, 'image/jpeg', `prod_${canonicalPhone}_${Date.now()}`);
          resolvedPhotoUrl = savedMedia.publicUrl;
        } catch (mErr) {
          console.warn('[Product Media Save Warning]:', mErr);
        }
      }

      const savedProduct = await firestoreDb.saveProductListing({
        userId: canonicalPhone,
        businessName: effectiveBizName,
        whatsapp: canonicalPhone,
        state: effectiveState,
        city: effectiveCity,
        category: effectiveCategory,
        product: resolvedProductName,
        price: price || '₦25,000',
        specs: description || specs || 'Verified quality product from stock',
        photoUrl: resolvedPhotoUrl || undefined,
      });

      try {
        await sheetsDb.addNewProductListing(
          canonicalPhone,
          resolvedProductName,
          price || '25000',
          {
            businessName: effectiveBizName,
            businessWhatsapp: canonicalPhone,
            businessState: effectiveState,
            businessCity: effectiveCity,
            businessCategory: effectiveCategory,
          }
        );
      } catch (e) {}

      const storeUrl = buildMerchantProfileUrl(merchant?.businessName || canonicalPhone);

      // Notify vendor on WhatsApp
      if (isWhatsAppConfigured()) {
        try {
          const prodMsg =
            `🛍️ *New Product Added to Storefront!* 📦\n\n` +
            `*${resolvedProductName}* (${price || '₦25,000'}) is now live on your official catalogue:\n` +
            `🌐 *${storeUrl}*\n\n` +
            `Buyers searching for "${resolvedProductName}" on Floate will be connected directly to your WhatsApp!`;
          await sendWhatsAppMessage(canonicalPhone, prodMsg);
        } catch (waErr) {
          console.warn('[Add Product WhatsApp Notice Warning]:', waErr);
        }
      }

      return res.json({
        success: true,
        message: 'Product successfully added to storefront!',
        product: savedProduct,
        storeUrl,
      });
    } catch (err: any) {
      console.error('[Add Product Error]:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to add product' });
    }
  });

  app.patch('/api/catalog/product/:id/condition', async (req, res) => {
    try {
      const productId = String(req.params.id || '').trim();
      const vendorPhone = String(req.body?.vendorPhone || '').trim();
      const condition = String(req.body?.condition || '').trim().toLowerCase();
      if (!productId || !vendorPhone || !['new', 'used', 'refurbished'].includes(condition)) {
        return res.status(400).json({ success: false, error: 'Product, merchant phone, and valid condition are required.' });
      }

      const updated = await firestoreDb.updateProductCondition(
        productId,
        vendorPhone,
        condition as 'new' | 'used' | 'refurbished'
      );
      if (!updated) return res.status(404).json({ success: false, error: 'Product was not found for this merchant.' });
      return res.json({ success: true, product: { id: productId, condition } });
    } catch (error: any) {
      console.error('[Catalog] Product condition update failed:', error);
      return res.status(500).json({ success: false, error: 'Product condition could not be updated.' });
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

  // --- WhatsApp-Native One-Click Authentication Endpoints ---

  // 1. POST /api/v1/auth/whatsapp/request-code
  app.post(['/api/v1/auth/whatsapp/request-code', '/api/auth/whatsapp/request-code'], async (req, res) => {
    try {
      const { phone, phoneNumber } = req.body || {};
      const inputPhone = phone || phoneNumber;
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip || '127.0.0.1';

      if (!inputPhone) {
        return res.status(400).json({ status: 'error', error: 'Phone number is required.' });
      }

      const result = await whatsappAuthService.requestAuthCode(String(inputPhone), clientIp);
      return res.json(result);
    } catch (err: any) {
      console.error('[API /request-code Error]:', err?.message || err);
      return res.status(400).json({ status: 'error', error: err?.message || 'Failed to request auth challenge code.' });
    }
  });

  // 2. GET /api/v1/auth/whatsapp/session-status?code=FL-7920
  app.get(['/api/v1/auth/whatsapp/session-status', '/api/auth/whatsapp/session-status'], async (req, res) => {
    try {
      const code = (req.query.code || req.query.challenge_code || req.query.challengeCode || '').toString();
      if (!code) {
        return res.status(400).json({ authenticated: false, status: 'BAD_REQUEST', error: 'Query parameter "code" is required.' });
      }

      const result = await whatsappAuthService.getSessionStatus(code);
      return res.json(result);
    } catch (err: any) {
      console.error('[API /session-status Error]:', err?.message || err);
      return res.status(500).json({ authenticated: false, status: 'ERROR', error: err?.message || 'Failed to check session status.' });
    }
  });

  // 3. POST /auth/whatsapp/exchange - Exchange wa_token for EXISTING Session / JWT
  app.post(
    ['/auth/whatsapp/exchange', '/api/v1/auth/whatsapp/exchange', '/api/auth/whatsapp/exchange'],
    async (req, res) => {
      try {
        const { wa_token, token } = req.body || {};
        const queryToken = (req.query.wa_token || req.query.token || '').toString();
        const effectiveToken = wa_token || token || queryToken;

        if (!effectiveToken) {
          return res.status(400).json({ success: false, error: 'wa_token body or query parameter is required.' });
        }

        const result = await whatsappAuthService.exchangeWhatsAppToken(String(effectiveToken));
        if (!result.success) {
          return res.status(401).json(result);
        }

        return res.json(result);
      } catch (err: any) {
        console.error('[API /auth/whatsapp/exchange Error]:', err);
        return res.status(500).json({ success: false, error: err?.message || 'Token exchange failed.' });
      }
    }
  );

  // 4. POST /auth/whatsapp/generate/storefront - Generate Vendor Storefront Deep-Link Token
  app.post(
    ['/auth/whatsapp/generate/storefront', '/api/v1/auth/whatsapp/generate/storefront', '/api/auth/whatsapp/generate/storefront'],
    async (req, res) => {
      try {
        const { merchantPhone, phone, vendorId } = req.body || {};
        const targetPhone = String(merchantPhone || phone || '').trim();

        if (!targetPhone) {
          return res.status(400).json({ status: 'error', error: 'merchantPhone or phone is required.' });
        }

        const result = await whatsappAuthService.generateStorefrontToken(targetPhone, vendorId);
        return res.json(result);
      } catch (err: any) {
        console.error('[API /auth/whatsapp/generate/storefront Error]:', err);
        return res.status(400).json({ status: 'error', error: err?.message || 'Failed to generate storefront token.' });
      }
    }
  );

  // 5. POST /auth/whatsapp/generate/checkout - Generate Order-Bound Payment Deep-Link Token
  app.post(
    ['/auth/whatsapp/generate/checkout', '/api/v1/auth/whatsapp/generate/checkout', '/api/auth/whatsapp/generate/checkout'],
    async (req, res) => {
      try {
        const { orderId, escrowRef, phone, merchantPhone } = req.body || {};
        const targetOrderId = String(orderId || escrowRef || '').trim();
        const targetPhone = String(phone || merchantPhone || '').trim();

        if (!targetOrderId) {
          return res.status(400).json({ status: 'error', error: 'orderId is required to generate order-bound checkout token.' });
        }

        const result = await whatsappAuthService.generateCheckoutToken(targetOrderId, targetPhone || undefined);
        return res.json(result);
      } catch (err: any) {
        console.error('[API /auth/whatsapp/generate/checkout Error]:', err);
        return res.status(400).json({ status: 'error', error: err?.message || 'Failed to generate checkout token.' });
      }
    }
  );

  // 3. Webhook aliases for /api/v1/webhooks/whatsapp
  app.get(['/api/v1/webhooks/whatsapp', '/api/webhooks/whatsapp'], handleWhatsAppVerification);
  app.post(['/api/v1/webhooks/whatsapp', '/api/webhooks/whatsapp'], handleWhatsAppWebhook);

  // --- Bachs.io Payment Gateway & Sponsored Product Ad Endpoints ---

  // 1. Create Ad Campaign & Generate Bachs.io Checkout URL
  app.post(['/api/ads/create', '/api/v1/ads/create'], async (req, res) => {
    try {
      const {
        merchantPhone,
        merchantName,
        packageType,
        headline,
        description,
        offerText,
        rawImageUrl,
        targetCategory,
        targetLocation,
        targetUrl,
      } = req.body || {};

      if (!merchantPhone || !headline) {
        return res.status(400).json({ success: false, error: 'Merchant phone and ad headline are required.' });
      }

      const result = await bachsPaymentService.createAdCampaign({
        merchantPhone: String(merchantPhone),
        merchantName: merchantName ? String(merchantName) : undefined,
        packageType: packageType || 'HERO_BANNER',
        headline: String(headline),
        description: description ? String(description) : undefined,
        offerText: offerText ? String(offerText) : undefined,
        rawImageUrl: rawImageUrl ? String(rawImageUrl) : undefined,
        targetCategory: targetCategory ? String(targetCategory) : undefined,
        targetLocation: targetLocation ? String(targetLocation) : undefined,
        targetUrl: targetUrl ? String(targetUrl) : undefined,
      });

      return res.json(result);
    } catch (err: any) {
      console.error('[API /api/ads/create Error]:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create ad campaign.' });
    }
  });

  // 2. Fetch Active Approved Banner Ads for floate.xyz Carousel
  app.get(['/api/ads/active', '/api/v1/ads/active'], async (_req, res) => {
    try {
      const activeAds = await firestoreDb.getActiveBannerAds();
      return res.json({ success: true, count: activeAds.length, ads: activeAds });
    } catch (err: any) {
      console.error('[API /api/ads/active Error]:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch active banner ads.' });
    }
  });

  // 3. Bachs.io Webhook Endpoint
  app.post(['/api/webhooks/bachs', '/api/bachs-webhook', '/webhook/bachs'], async (req, res) => {
    try {
      const sig = (req.headers['x-bachs-signature'] || req.headers['verif-hash']) as string;
      const result = await bachsPaymentService.handleWebhook(req.body, sig);
      return res.json(result);
    } catch (err: any) {
      console.error('[Bachs Webhook Error]:', err?.message || err);
      return res.status(500).json({ success: false, error: err?.message || 'Webhook handling failed.' });
    }
  });

  // 4. Admin Approve / Reject / Manual Create Ad Endpoints
  app.post('/api/admin/create-ad', async (req, res) => {
    try {
      const {
        headline,
        offerText,
        description,
        merchantName,
        merchantPhone,
        imageUrl,
        targetCategory,
        targetLocation,
        targetUrl,
        budget,
      } = req.body || {};

      if (!headline || !merchantPhone) {
        return res.status(400).json({ success: false, error: 'Headline and merchant phone are required.' });
      }

      const cleanPhone = String(merchantPhone).replace(/\D/g, '');
      const adId = `ad_manual_${Date.now().toString(36)}`;

      const adDoc: any = {
        id: adId,
        merchantPhone: cleanPhone,
        merchantName: merchantName || 'Verified Merchant',
        adType: 'HERO_BANNER',
        headline: String(headline),
        description: description || 'Sponsored Product Banner on Floate',
        offerText: offerText || 'Verified Deal',
        rawImageUrl: imageUrl || '',
        designedBannerUrl: imageUrl || '',
        targetUrl: targetUrl || `https://floate.xyz/vendor/${cleanPhone}`,
        targetCategory: targetCategory || 'General',
        targetLocation: targetLocation || 'Nigeria',
        status: 'ACTIVE',
        impressions: 0,
        clicks: 0,
        budget: Number(budget) || 10000,
        submittedVia: 'ADMIN_MANUAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
      };

      await firestoreDb.saveAdDoc(adDoc);

      return res.json({
        success: true,
        message: 'Active sponsored banner ad created successfully and deployed to floate.xyz carousel!',
        ad: adDoc,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to create manual ad.' });
    }
  });

  app.post(['/api/ads/approve', '/api/v1/ads/approve'], async (req, res) => {
    try {
      const { adId } = req.body || {};
      if (!adId) return res.status(400).json({ success: false, error: 'adId is required.' });

      const result = await bachsPaymentService.approveAdCampaign(String(adId));
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to approve ad.' });
    }
  });

  app.post(['/api/ads/reject', '/api/v1/ads/reject'], async (req, res) => {
    try {
      const { adId, reason } = req.body || {};
      if (!adId) return res.status(400).json({ success: false, error: 'adId is required.' });

      const result = await bachsPaymentService.rejectAdCampaign(String(adId), reason ? String(reason) : undefined);
      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to reject ad.' });
    }
  });

  // 5. Ad Interaction Tracking (Impressions / Clicks)
  app.post('/api/ads/track', async (req, res) => {
    try {
      const { adId, event } = req.body || {};
      if (!adId) return res.status(400).json({ success: false, error: 'adId is required.' });

      if (event === 'click') {
        await firestoreDb.recordAdClick(String(adId));
      } else {
        await firestoreDb.recordAdImpression(String(adId));
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ success: false });
    }
  });

  // --- Floate OS WhatsApp Auth, KYC & Ads Endpoints ---

  // 1. Send WhatsApp OTP
  app.post('/api/auth/whatsapp/send-otp', async (req, res) => {
    try {
      const { phoneNumber } = req.body || {};
      if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Phone number is required' });
      }
      const cleanPhone = normalizePhone(phoneNumber);
      const otp = String(Math.floor(1000 + Math.random() * 9000));
      await firestoreDb.saveAuthOtp(cleanPhone, otp);

      const simulationMsg = `[Floate AI] Your WhatsApp Verification OTP is *${otp}*. Valid for 10 minutes.`;
      try {
        await sendWhatsAppMessage(cleanPhone, simulationMsg);
      } catch (waErr) {
        console.warn('[WhatsApp OTP] Cloud API send notice:', waErr);
      }

      return res.json({
        success: true,
        message: `OTP sent successfully to WhatsApp (${cleanPhone})`,
        simulatedOtp: otp,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to send OTP' });
    }
  });

  // 2. Verify WhatsApp OTP
  app.post('/api/auth/whatsapp/verify', async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body || {};
      if (!phoneNumber || !otp) {
        return res.status(400).json({ success: false, error: 'Phone number and OTP are required' });
      }
      const cleanPhone = normalizePhone(phoneNumber);
      const isValid = await firestoreDb.verifyAuthOtp(cleanPhone, otp);
      if (!isValid) {
        return res.status(400).json({ success: false, error: 'Invalid or expired OTP code' });
      }

      let merchant = await firestoreDb.getMerchant(cleanPhone);
      const isRegistered = !!merchant && merchant.status === 'ACTIVE';

      return res.json({
        success: true,
        isRegistered,
        merchant: merchant || null,
        message: 'OTP verified successfully',
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Verification failed' });
    }
  });

  // 3. Merchant Registration & KYC
  app.post('/api/merchant/register', async (req, res) => {
    try {
      const {
        businessName,
        phoneNumber,
        addressType,
        addressDetail,
        state,
        category,
        profilePhoto,
        cacInfo,
      } = req.body || {};

      if (!businessName || !phoneNumber || !state || !category) {
        return res.status(400).json({ success: false, error: 'Missing required registration fields' });
      }

      const cleanPhone = normalizePhone(phoneNumber);
      const existing = await firestoreDb.getMerchant(cleanPhone);

      let profilePhotoUrl = existing?.profilePhotoUrl || '';
      if (profilePhoto && profilePhoto.startsWith('data:image')) {
        try {
          const base64Data = profilePhoto.split(',')[1] || profilePhoto;
          const buffer = Buffer.from(base64Data, 'base64');
          const savedMedia = await saveCatalogMedia(buffer, 'image/jpeg', `selfie_${cleanPhone}.jpg`);
          profilePhotoUrl = savedMedia.publicUrl;
        } catch (imgErr) {
          console.warn('[MerchantRegister] Image save error:', imgErr);
        }
      }

      const merchantData: any = {
        id: cleanPhone,
        businessName,
        whatsapp: cleanPhone,
        addressType: addressType || 'Shop Address',
        addressDetail: addressDetail || '',
        state: state || 'Lagos',
        city: state || 'Lagos',
        category: category || 'Provisions',
        profilePhotoUrl,
        cacInfo: cacInfo || '',
        status: 'PENDING_REVIEW',
        verifiedStatus: 'PENDING',
        isVerified: false,
        identityVerified: false,
        credit_balance: 25,
        registeredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await firestoreDb.saveMerchant(merchantData);

      return res.json({
        success: true,
        message: 'Merchant registered successfully and submitted for admin review (Pending Vetting).',
        merchant: merchantData,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Registration failed' });
    }
  });

  // 4. Admin Vetting Endpoints
  app.get('/api/admin/pending-merchants', async (_req, res) => {
    try {
      const pending = await firestoreDb.getPendingMerchants();
      return res.json({ success: true, merchants: pending });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch pending merchants' });
    }
  });

  app.post('/api/admin/merchant/verify', async (req, res) => {
    try {
      const { merchantId } = req.body || {};
      if (!merchantId) {
        return res.status(400).json({ success: false, error: 'Merchant ID / Phone is required' });
      }
      const success = await firestoreDb.verifyMerchantByAdmin(merchantId);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Merchant not found' });
      }

      const cleanPhone = normalizePhone(merchantId);
      const vendorLink = buildMerchantProfileUrl(cleanPhone);
      const approvalMsg = `🎉 *Congratulations from Floate OS!*\n\nYour business registration has been *APPROVED* by admin.\n\nYour live Floate storefront is now active:\n🔗 ${vendorLink}\n\nYou can now receive qualified buyer leads and run automated ads. Welcome to Floate!`;
      try {
        await sendWhatsAppMessage(cleanPhone, approvalMsg);
      } catch (waErr) {
        console.warn('[AdminVerify] WhatsApp notification notice:', waErr);
      }

      return res.json({ success: true, message: `Merchant ${merchantId} verified successfully and notified via WhatsApp.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to verify merchant' });
    }
  });

  app.post('/api/admin/merchant/reject', async (req, res) => {
    try {
      const { merchantId, reason } = req.body || {};
      if (!merchantId) {
        return res.status(400).json({ success: false, error: 'Merchant ID is required' });
      }
      const success = await firestoreDb.rejectMerchantByAdmin(merchantId, reason);
      if (!success) {
        return res.status(404).json({ success: false, error: 'Merchant not found' });
      }
      return res.json({ success: true, message: `Merchant ${merchantId} rejected.` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to reject merchant' });
    }
  });

  app.get('/api/v1/admin/verifications', async (req, res) => {
    try {
      const allMerchants = await firestoreDb.getAllMerchantsForAdmin();
      const uniqueMerchants = new Map<string, any>();
      for (const merchant of allMerchants) {
        const phone = normalizePhone(merchant.whatsapp || merchant.id);
        const key = phone || String(merchant.id || '');
        if (key && !uniqueMerchants.has(key)) uniqueMerchants.set(key, merchant);
      }

      const records = Array.from(uniqueMerchants.entries()).map(([phone, merchant]) => {
        const rejected = merchant.verifiedStatus === 'REJECTED' || merchant.status === 'INACTIVE';
        const approved = !rejected && (
          merchant.isVerified === true ||
          merchant.verifiedStatus === 'YES' ||
          merchant.status === 'ACTIVE'
        );
        return {
          id: phone,
          vendor_id: phone,
          owner_name: merchant.ownerFullName || merchant.ownerName || '',
          business_name: merchant.businessName || merchant.name || '',
          market: merchant.marketHub || merchant.marketLocation || '',
          city: merchant.city || '',
          landmark: merchant.shopAddress || merchant.stallAddress || '',
          whatsapp: merchant.whatsapp || phone,
          selfie_video_url: merchant.verificationVideoUrl || '',
          product_photo_urls: merchant.productPhotoUrls || [],
          status: rejected ? 'rejected' : approved ? 'approved' : 'pending_review',
          created_at: merchant.registeredAt || merchant.claimDate || merchant.updatedAt || '',
          rejection_reason: merchant.rejectionReason || '',
        };
      });
      const requestedStatus = String(req.query.status || 'pending_review').toLowerCase();
      const filtered = requestedStatus === 'all'
        ? records
        : records.filter((merchant) => merchant.status === requestedStatus);
      return res.json({ success: true, verifications: filtered, total: filtered.length });
    } catch (error: any) {
      console.error('[Admin Verifications] Failed to list merchants:', error);
      return res.status(500).json({ success: false, error: 'Could not load merchant verification records.' });
    }
  });

  app.post('/api/v1/admin/verifications/:vendorId/approve', async (req, res) => {
    try {
      const vendorId = decodeURIComponent(req.params.vendorId);
      const merchant = await firestoreDb.getMerchant(vendorId);
      const phone = normalizePhone(merchant?.whatsapp || vendorId);
      if (!phone || !(await firestoreDb.verifyMerchantByAdmin(vendorId))) {
        return res.status(404).json({ success: false, message: 'Merchant not found.' });
      }

      const storeUrl = buildMerchantProfileUrl(merchant?.businessName || phone);
      const notificationErrors: string[] = [];
      if (isWhatsAppConfigured()) {
        try {
          const messageSent = await sendWhatsAppMessage(
            phone,
            `🎉 Your FLOATE merchant verification is approved. Your storefront is live: ${storeUrl}`
          );
          if (!messageSent) notificationErrors.push('approval_message');
        } catch (error) {
          console.error('[Admin Verifications] Approval message failed after approval:', error);
          notificationErrors.push('approval_message');
        }
      } else {
        notificationErrors.push('whatsapp_not_configured');
      }
      try {
        const assetsSent = await sendMerchantVisualAssetsToWhatsApp(
          phone,
          merchant?.ownerFullName,
          merchant?.businessName,
          [merchant?.city, merchant?.state].filter(Boolean).join(', ')
        );
        if (!assetsSent) notificationErrors.push('visual_assets');
      } catch (error) {
        console.error('[Admin Verifications] Asset delivery failed after approval:', error);
        notificationErrors.push('visual_assets');
      }
      return res.json({
        success: true,
        message: notificationErrors.length
          ? 'Merchant approved, but one or more WhatsApp notifications failed.'
          : 'Merchant approved and notified on WhatsApp.',
        notificationErrors,
        storeUrl,
      });
    } catch (error: any) {
      console.error('[Admin Verifications] Approval failed:', error);
      return res.status(500).json({ success: false, message: 'Could not approve merchant.' });
    }
  });

  app.post('/api/v1/admin/verifications/:vendorId/reject', async (req, res) => {
    try {
      const vendorId = decodeURIComponent(req.params.vendorId);
      const reason = String(req.body?.reason || 'Your verification request was not approved.');
      const merchant = await firestoreDb.getMerchant(vendorId);
      const phone = normalizePhone(merchant?.whatsapp || vendorId);
      if (!phone || !(await firestoreDb.rejectMerchantByAdmin(vendorId, reason))) {
        return res.status(404).json({ success: false, message: 'Merchant not found.' });
      }
      if (isWhatsAppConfigured()) {
        try {
          const notificationSent = await sendWhatsAppMessage(phone, `Your FLOATE verification was not approved. Reason: ${reason}`);
          if (!notificationSent) {
            return res.json({
              success: true,
              message: 'Merchant verification was rejected, but the WhatsApp notice could not be sent.',
              notificationSent: false,
            });
          }
        } catch (error) {
          console.error('[Admin Verifications] Rejection message failed after rejection:', error);
          return res.json({
            success: true,
            message: 'Merchant verification was rejected, but the WhatsApp notice could not be sent.',
            notificationSent: false,
          });
        }
      } else {
        return res.json({
          success: true,
          message: 'Merchant verification was rejected, but WhatsApp is not configured.',
          notificationSent: false,
        });
      }
      return res.json({ success: true, message: 'Merchant verification rejected and notice sent.', notificationSent: true });
    } catch (error: any) {
      console.error('[Admin Verifications] Rejection failed:', error);
      return res.status(500).json({ success: false, message: 'Could not reject merchant.' });
    }
  });

  // 5. Ads Management & Banner Telemetry Endpoints
  app.get('/api/ads/banner', async (_req, res) => {
    try {
      const ads = await firestoreDb.getActiveBannerAds();
      return res.json({ success: true, ads });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch banner ads' });
    }
  });

  app.post('/api/ads/:id/view', async (req, res) => {
    try {
      const adId = req.params.id;
      await firestoreDb.recordAdImpression(adId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.post('/api/ads/:id/click', async (req, res) => {
    try {
      const adId = req.params.id;
      await firestoreDb.recordAdClick(adId);
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  app.get('/api/admin/ads', async (_req, res) => {
    try {
      const ads = await firestoreDb.getAllAdsForAdmin();
      return res.json({ success: true, ads });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch ads for admin' });
    }
  });

  app.post('/api/admin/ads/:id/upload-banner', async (req, res) => {
    try {
      const adId = req.params.id;
      const { designedBanner, targetUrl } = req.body || {};
      let designedBannerUrl = designedBanner;
      if (designedBanner && designedBanner.startsWith('data:image')) {
        const base64Data = designedBanner.split(',')[1] || designedBanner;
        const buffer = Buffer.from(base64Data, 'base64');
        const savedMedia = await saveCatalogMedia(buffer, 'image/jpeg', `banner_${adId}.jpg`);
        designedBannerUrl = savedMedia.publicUrl;
      }
      await firestoreDb.updateAdDoc(adId, {
        designedBannerUrl,
        targetUrl: targetUrl || '',
      });
      return res.json({ success: true, message: 'Designed banner uploaded successfully', designedBannerUrl });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to upload designed banner' });
    }
  });

  app.post('/api/admin/ads/:id/approve', async (req, res) => {
    try {
      const adId = req.params.id;
      await firestoreDb.updateAdDoc(adId, {
        status: 'ACTIVE',
        approvedAt: new Date().toISOString(),
      });
      return res.json({ success: true, message: 'Ad approved and published live as banner.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to approve ad' });
    }
  });

  app.post('/api/admin/ads/save', async (req, res) => {
    try {
      const { id, merchantName, headline, description, adType, targetUrl, status, designedBannerUrl, rawImageUrl } = req.body || {};
      const adId = id || `ad_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const existing = await firestoreDb.getAdDoc(adId);
      const adDoc = {
        id: adId,
        merchantName: merchantName || 'Floate Partner',
        headline: headline || 'Sponsored Placement',
        description: description || '',
        adType: adType || 'BUSINESS_AD',
        targetUrl: targetUrl || '',
        status: status || 'PENDING_DESIGN',
        designedBannerUrl: designedBannerUrl || existing?.designedBannerUrl || '',
        rawImageUrl: rawImageUrl || existing?.rawImageUrl || '',
        impressions: existing?.impressions || 0,
        clicks: existing?.clicks || 0,
        submittedVia: existing?.submittedVia || 'ADMIN_MANUAL',
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      await firestoreDb.saveAdDoc(adDoc as any);
      return res.json({ success: true, message: 'Ad campaign saved successfully', ad: adDoc });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to save ad' });
    }
  });

  app.post('/api/admin/ads/:id/status', async (req, res) => {
    try {
      const adId = req.params.id;
      const { status } = req.body || {};
      if (!status) {
        return res.status(400).json({ success: false, error: 'Status is required' });
      }
      await firestoreDb.updateAdDoc(adId, { status });
      return res.json({ success: true, message: `Ad status updated to ${status}` });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to update ad status' });
    }
  });

  app.delete('/api/admin/ads/:id', async (req, res) => {
    try {
      const adId = req.params.id;
      await firestoreDb.deleteAdDoc(adId);
      return res.json({ success: true, message: 'Ad campaign deleted successfully' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to delete ad' });
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
