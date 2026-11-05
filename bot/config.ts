import dotenv from 'dotenv';

if (typeof process !== 'undefined' && typeof (process as any).cwd === 'function') {
  try {
    dotenv.config();
  } catch (e) {
    // Ignore dotenv initialization error in browser context
  }
}

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  webhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  spreadsheetId: process.env.SPREADSHEET_ID || '',
  adminTelegramId: process.env.ADMIN_TELEGRAM_ID || '',
  adminWhatsAppPhone: process.env.ADMIN_WHATSAPP_PHONE || '07065599116',
  appUrl: process.env.APP_URL || '',
  publicSiteUrl: process.env.PUBLIC_SITE_URL || 'https://floate.xyz',
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  // WhatsApp Cloud API (Meta Graph API)
  whatsappAccessToken:
    process.env.WHATSAPP_ACCESS_TOKEN ||
    'EAAa9fW5px2gBSZBdV1Klbrp2FnNWy0iIkJDcb8qBC48ZCyG5ZAmgFdsoxebeBcTOjzq3pJLZCPVJxW3bFQmYwiPTZBaYdZC8ZCjvArVl46SYbTYmRBHBI3xudksiBbNqtbrPP4sJfBky2DVbz8Uwl4dFAv24DwYgrAFjVw8ykJD3YiSNi9VX32twZCZCDg2zmFxLZBMwZDZD',
  whatsappPhoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '1290427334158497',
  whatsappVerifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'floate_wa_verify_token_2026',
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
  // Monnify Payment Gateway
  monnifyApiKey: process.env.MONNIFY_API_KEY || '',
  monnifySecretKey: process.env.MONNIFY_SECRET_KEY || '',
  monnifyContractCode: process.env.MONNIFY_CONTRACT_CODE || '',
  monnifyWalletAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || '',
  monnifyEnvironment: process.env.MONNIFY_ENVIRONMENT || 'sandbox',
  // Flutterwave Payment Gateway
  flutterwavePublicKey: process.env.FLUTTERWAVE_PUBLIC_KEY || '',
  flutterwaveSecretKey: process.env.FLUTTERWAVE_SECRET_KEY || '',
  flutterwaveEncryptionKey: process.env.FLUTTERWAVE_ENCRYPTION_KEY || '',
  flutterwaveWebhookSecret: process.env.FLUTTERWAVE_WEBHOOK_SECRET || '',
  // Master Escrow Crypto Wallets & Settlement
  usdtTrc20Wallet: process.env.FLOATE_USDT_TRC20_WALLET || 'TF17bgD9GJJWPxWuYLnUzBA236NqV5uH1w',
  usdtPolygonWallet: process.env.FLOATE_USDT_POLYGON_WALLET || '0x71C836466DABf0F27115456950293282208d1234',
  usdtSolanaWallet: process.env.FLOATE_USDT_SOLANA_WALLET || '8F7Z3kX4mE3kYn2WjN1oP6qR8sT0uV2wX4yZ6aB8cDE',
  usdtNgnRate: parseFloat(process.env.FLOATE_USDT_NGN_RATE || '1500'),
  // Feature Flags: SafePay Escrow & Digital Pay on Delivery (Active)
  safepayEnabled: process.env.SAFEPAY_ENABLED !== 'false',
  safepayTesterPhones: (process.env.SAFEPAY_TESTER_PHONES || '')
    .split(',')
    .map((p) => p.replace(/\D/g, ''))
    .filter(Boolean),
  // Feature Flags: 4-Step KYC Trust & Identity Verification (Admin Beta Testing on 07065599116)
  verificationFeatureEnabled: true,
  verificationTesterPhones: [
    '07065599116',
    '2347065599116',
    ...(process.env.VERIFICATION_TESTER_PHONES || '')
      .split(',')
      .map((p) => p.replace(/\D/g, ''))
      .filter(Boolean),
  ],
};

export const isVerificationTestingPhone = (phoneOrUserId?: string | number): boolean => {
  if (!phoneOrUserId) return false;
  const clean = String(phoneOrUserId).replace(/\D/g, '');
  if (!clean) return false;
  // Always match the admin tester number 07065599116 / 2347065599116
  if (clean.endsWith('7065599116') || clean === '07065599116' || clean === '2347065599116') return true;
  // Admin Telegram ID if configured
  if (config.adminTelegramId && String(phoneOrUserId).trim() === config.adminTelegramId.trim()) return true;
  // Match any configured tester phones
  return config.verificationTesterPhones.some((t) => {
    const cleanT = t.replace(/\D/g, '');
    return Boolean(cleanT && (clean.endsWith(cleanT) || cleanT.endsWith(clean)));
  });
};

export const isSafePayEnabledForPhone = (phone?: string): boolean => {
  if (!config.safepayEnabled) return false;
  if (!phone) return true;
  const clean = phone.replace(/\D/g, '');
  if (!clean) return true;
  if (config.safepayTesterPhones.length === 0) return true;
  return config.safepayTesterPhones.some((t) => {
    const cleanT = t.replace(/\D/g, '');
    return clean.endsWith(cleanT) || cleanT.endsWith(clean);
  });
};

export const isBotConfigured = () => {
  const token = process.env.TELEGRAM_BOT_TOKEN || config.telegramToken || '';
  if (!token || token.includes('DummyToken') || token.length < 15) {
    return false;
  }
  return /^\d{7,12}:[A-Za-z0-9_-]{20,}$/.test(token.trim());
};

export const isWhatsAppConfigured = () => {
  return Boolean(config.whatsappAccessToken && config.whatsappPhoneNumberId);
};

export const isMonnifyConfigured = () => {
  return Boolean(config.monnifyApiKey && config.monnifySecretKey && config.monnifyContractCode);
};

export const isFlutterwaveConfigured = () => {
  return Boolean(config.flutterwaveSecretKey || config.flutterwavePublicKey);
};

