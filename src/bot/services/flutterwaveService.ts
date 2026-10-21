/**
 * Flutterwave Payment Service for Floate Africa Ltd
 * Handles:
 * 1. SafePay Smart-Tiered Escrow Payment Links
 * 2. Floate Merchant Credits Top-Up Packages (₦200 per customer)
 * 3. Flutterwave Webhook Signature Verification & Transaction Verification
 */

import crypto from 'crypto';
import { config } from '../config.js';

/**
 * Mask sensitive bank account numbers for secure logging and audit records
 */
export function maskAccountNumber(accountNumber: string | undefined): string {
  if (!accountNumber) return '••••';
  const clean = String(accountNumber).replace(/\D/g, '');
  if (clean.length <= 4) return clean;
  return `••••••${clean.slice(-4)}`;
}

/**
 * Returns a WhatsApp deep link redirect URL that returns the user to WhatsApp with a pre-filled transaction message.
 */
export function getWhatsAppRedirectUrl(txRef: string): string {
  const directLink = process.env.WHATSAPP_DIRECT_LINK || '';
  const prefillText = encodeURIComponent(`Payment done for order ${txRef}`);
  if (directLink && directLink.includes('wa.me')) {
    const sep = directLink.includes('?') ? '&' : '?';
    return `${directLink}${sep}text=${prefillText}`;
  }

  const rawBotPhone = (
    process.env.WHATSAPP_BOT_PHONE ||
    process.env.ADMIN_WHATSAPP_PHONE ||
    config.adminWhatsAppPhone ||
    '2348000000000'
  ).replace(/\D/g, '');

  return `https://wa.me/${rawBotPhone || '2348000000000'}?text=${prefillText}`;
}

/**
 * Returns a Floate-controlled return URL for hosted Flutterwave checkouts.
 * This displays a clean success screen and returns the buyer seamlessly to WhatsApp.
 */
export function getFloateCallbackUrl(txRef: string): string {
  const baseUrl =
    process.env.APP_URL ||
    config.appUrl ||
    'https://ais-dev-doffhubcs26lvvc5toaulh-156196353029.europe-west2.run.app';
  return `${baseUrl.replace(/\/+$/, '')}/checkout/callback?ref=${encodeURIComponent(txRef)}`;
}

export interface FlutterwaveConfig {
  publicKey: string;
  secretKey: string;
  encryptionKey?: string;
  secretHash?: string;
  isLive: boolean;
}

export interface CreditPackage {
  id: string;
  credits: number;
  bonus: number;
  totalCredits: number;
  priceNgn: number;
  title: string;
  description: string;
}

export const FLOATE_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg_5',
    credits: 25, // 5 customers * 5 credits
    bonus: 0,
    totalCredits: 25,
    priceNgn: 1000,
    title: 'Starter Pack (₦1,000)',
    description: '25 Floate Credits (5 Customers)',
  },
  {
    id: 'pkg_10',
    credits: 50, // 10 customers * 5 credits
    bonus: 0,
    totalCredits: 50,
    priceNgn: 2000,
    title: 'Basic Pack (₦2,000)',
    description: '50 Floate Credits (10 Customers)',
  },
  {
    id: 'pkg_25',
    credits: 125, // 25 customers * 5 credits
    bonus: 0,
    totalCredits: 125,
    priceNgn: 5000,
    title: 'Standard Pack (₦5,000)',
    description: '125 Floate Credits (25 Customers)',
  },
  {
    id: 'pkg_55',
    credits: 250, // 50 customers * 5 credits
    bonus: 25, // 5 bonus customers * 5 credits (+10% bonus)
    totalCredits: 275,
    priceNgn: 10000,
    title: 'Growth Pack (₦10,000)',
    description: '275 Floate Credits (55 Customers • +10% Bonus)',
  },
  {
    id: 'pkg_115',
    credits: 500, // 100 customers * 5 credits
    bonus: 75, // 15 bonus customers * 5 credits (+15% bonus)
    totalCredits: 575,
    priceNgn: 20000,
    title: 'Power Pack (₦20,000)',
    description: '575 Floate Credits (115 Customers • +15% Bonus)',
  },
];

/**
 * Calculates credits for any custom amount (min ₦1,000; ₦200 per customer = 5 credits)
 */
export function calculateCustomCredits(amountNgn: number): {
  isValid: boolean;
  minAmount: number;
  baseCredits: number;
  bonusCredits: number;
  totalCredits: number;
  baseCustomers: number;
  bonusCustomers: number;
  totalCustomers: number;
  errorMessage?: string;
} {
  const minAmount = 1000;
  if (!amountNgn || isNaN(amountNgn) || amountNgn < minAmount) {
    return {
      isValid: false,
      minAmount,
      baseCredits: 0,
      bonusCredits: 0,
      totalCredits: 0,
      baseCustomers: 0,
      bonusCustomers: 0,
      totalCustomers: 0,
      errorMessage: `Minimum top-up amount is ₦${minAmount.toLocaleString()} (gives 25 Floate Credits / 5 customer connections).`,
    };
  }

  const baseCustomers = Math.floor(amountNgn / 200);
  const baseCredits = baseCustomers * 5;
  let bonusCredits = 0;
  let bonusCustomers = 0;

  if (amountNgn >= 20000) {
    bonusCredits = Math.floor(baseCredits * 0.15); // 15% bonus for 20k+
    bonusCustomers = Math.floor(bonusCredits / 5);
  } else if (amountNgn >= 10000) {
    bonusCredits = Math.floor(baseCredits * 0.1); // 10% bonus for 10k+
    bonusCustomers = Math.floor(bonusCredits / 5);
  }

  const totalCredits = baseCredits + bonusCredits;
  const totalCustomers = Math.floor(totalCredits / 5);

  return {
    isValid: true,
    minAmount,
    baseCredits,
    bonusCredits,
    totalCredits,
    baseCustomers,
    bonusCustomers,
    totalCustomers,
  };
}

export const NIGERIAN_BANK_CODES: Record<string, string> = {
  access: '044',
  'access diamond': '063',
  gtbank: '058',
  gtb: '058',
  'guaranty trust': '058',
  'guaranty trust bank': '058',
  zenith: '057',
  'zenith bank': '057',
  uba: '033',
  'united bank for africa': '033',
  firstbank: '011',
  'first bank': '011',
  fbn: '011',
  kuda: '090267',
  'kuda bank': '090267',
  opay: '999992',
  'opay digital services': '999992',
  paycom: '999992',
  moniepoint: '50515',
  'moniepoint mfb': '50515',
  palmpay: '999991',
  stanbic: '221',
  'stanbic ibtc': '221',
  sterling: '232',
  'sterling bank': '232',
  fidelity: '070',
  'fidelity bank': '070',
  fcmb: '214',
  'first city monument bank': '214',
  union: '032',
  'union bank': '032',
  wema: '035',
  'wema bank': '035',
  alat: '035',
  polaris: '076',
  'polaris bank': '076',
  ecobank: '050',
  'eco bank': '050',
  providus: '101',
  'providus bank': '101',
  jaiz: '301',
  'jaiz bank': '301',
  taj: '302',
  'taj bank': '302',
  rubies: '125',
  vfd: '566',
  'vfd mfb': '566',
  fairmoney: '51318',
};

export function resolveNigerianBankCode(bankName: string): string {
  if (!bankName) return '058';
  const clean = bankName.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const [key, code] of Object.entries(NIGERIAN_BANK_CODES)) {
    const cleanKey = key.replace(/[^a-z0-9]/g, '');
    if (clean.includes(cleanKey) || cleanKey.includes(clean)) {
      return code;
    }
  }
  return '058';
}

export class FlutterwaveService {
  private flwPublicKey: string;
  private flwSecretKey: string;
  private flwEncryptionKey: string;
  private flwSecretHash: string;

  constructor() {
    this.flwPublicKey =
      process.env.FLW_PUBLIC_KEY ||
      process.env.FLUTTERWAVE_PUBLIC_KEY ||
      process.env.VITE_FLW_PUBLIC_KEY ||
      config.flutterwavePublicKey ||
      '';
    this.flwSecretKey =
      process.env.FLW_SECRET_KEY ||
      process.env.FLUTTERWAVE_SECRET_KEY ||
      config.flutterwaveSecretKey ||
      '';
    this.flwEncryptionKey =
      process.env.FLW_ENCRYPTION_KEY ||
      process.env.FLUTTERWAVE_ENCRYPTION_KEY ||
      config.flutterwaveEncryptionKey ||
      '';
    this.flwSecretHash =
      process.env.FLW_SECRET_HASH ||
      process.env.FLUTTERWAVE_SECRET_HASH ||
      config.flutterwaveWebhookSecret ||
      '';
  }

  public isConfigured(): boolean {
    return Boolean(this.flwSecretKey && this.flwSecretKey.startsWith('FLW'));
  }

  public getConfig(): FlutterwaveConfig {
    return {
      publicKey: this.flwPublicKey ? `${this.flwPublicKey.substring(0, 10)}...` : '',
      secretKey: this.flwSecretKey ? `${this.flwSecretKey.substring(0, 10)}...` : '',
      secretHash: this.flwSecretHash ? '***' : '',
      isLive: this.flwSecretKey.startsWith('FLWSECK-') && !this.flwSecretKey.includes('TEST'),
    };
  }

  /**
   * SafePay Escrow Protection Fee Calculator (Split Escrow Model)
   * Total Fee: 3.5%
   * Buyer Protection Fee: 1.5% (added to agreed price)
   * Vendor Escrow Fee: 2.0% (deducted from agreed price)
   * If seller chooses to cover buyer fee: Total 3.5% deducted from seller payout.
   */
  public calculateSafePayFee(amount: number, vendorCoversBuyerFee = false): {
    tier: number;
    fee: number;
    totalFee: number;
    buyerFeePercent: number;
    buyerFeeAmount: number;
    vendorFeePercent: number;
    vendorFeeAmount: number;
    totalBuyerAmount: number;
    netVendorPayout: number;
    description: string;
  } {
    const numeric = Math.max(0, amount);
    const buyerFeePercent = vendorCoversBuyerFee ? 0 : 1.5;
    const vendorFeePercent = vendorCoversBuyerFee ? 3.5 : 2.0;
    const buyerFeeAmount = vendorCoversBuyerFee ? 0 : Math.round(numeric * 0.015);
    const vendorFeeAmount = vendorCoversBuyerFee ? Math.round(numeric * 0.035) : Math.round(numeric * 0.02);
    const totalFee = buyerFeeAmount + vendorFeeAmount;
    const totalBuyerAmount = numeric + buyerFeeAmount;
    const netVendorPayout = Math.max(0, numeric - vendorFeeAmount);

    return {
      tier: 1,
      fee: totalFee,
      totalFee,
      buyerFeePercent,
      buyerFeeAmount,
      vendorFeePercent,
      vendorFeeAmount,
      totalBuyerAmount,
      netVendorPayout,
      description: vendorCoversBuyerFee
        ? `Seller Covered (3.5%): ₦${vendorFeeAmount.toLocaleString()}`
        : `Buyer (1.5%): ₦${buyerFeeAmount.toLocaleString()} + Seller (2.0%): ₦${vendorFeeAmount.toLocaleString()}`,
    };
  }

  /**
   * Generates a hosted payment link using Flutterwave v3 API
   */
  public async createPaymentLink(params: {
    txRef: string;
    amount: number;
    customerEmail?: string;
    customerPhone: string;
    customerName?: string;
    title: string;
    description: string;
    redirectUrl?: string;
    meta?: Record<string, any>;
  }): Promise<{ success: boolean; paymentLink: string; txRef: string; error?: string }> {
    const cleanPhone = params.customerPhone.replace(/\D/g, '');
    const cleanEmail =
      params.customerEmail ||
      `customer_${cleanPhone || Date.now()}@floate.xyz`;
    const cleanName = params.customerName || 'Floate Customer';

    // Fallback URL if live secret key is not provided in environment yet
    const fallbackBaseUrl = config.appUrl || 'https://floate.xyz';
    const fallbackLink = `${fallbackBaseUrl}/checkout?ref=${params.txRef}&amount=${params.amount}&phone=${cleanPhone}`;

    if (!this.flwSecretKey) {
      console.warn('[Flutterwave] Secret key not configured. Providing fallback checkout link.');
      return {
        success: true,
        paymentLink: fallbackLink,
        txRef: params.txRef,
      };
    }

    try {
      const payload = {
        tx_ref: params.txRef,
        amount: String(params.amount),
        currency: 'NGN',
        payment_options: 'banktransfer',
        redirect_url: params.redirectUrl || getFloateCallbackUrl(params.txRef),
        meta: {
          ...params.meta,
          app: 'Floate Africa',
          phone: cleanPhone,
        },
        customer: {
          email: cleanEmail,
          phonenumber: cleanPhone,
          name: cleanName,
        },
        customizations: {
          title: params.title || 'Floate Africa Ltd',
          description: params.description || 'Secure Transaction',
          logo: `${fallbackBaseUrl}/icon-192.png`,
        },
      };

      const res = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.flwSecretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();

      if (data.status === 'success' && data.data?.link) {
        return {
          success: true,
          paymentLink: data.data.link,
          txRef: params.txRef,
        };
      }

      console.warn('[Flutterwave Create Payment API Error]:', data);
      return {
        success: true,
        paymentLink: fallbackLink,
        txRef: params.txRef,
        error: data.message || 'Could not generate live link, returned fallback.',
      };
    } catch (err: any) {
      console.error('[Flutterwave Create Payment Exception]:', err);
      return {
        success: true,
        paymentLink: fallbackLink,
        txRef: params.txRef,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Generates a dynamic Flutterwave Standard Checkout Link with "Pay with Bank Transfer" as the ONLY payment option.
   * Endpoint: POST https://api.flutterwave.com/v3/payments
   *
   * Requirements:
   * 1. payment_options: "banktransfer" only
   * 2. amount: exact escrow amount
   * 3. redirect_url: WhatsApp deep link returning user to WhatsApp with pre-filled transaction ref
   * 4. 30-minute validity timestamp in metadata
   * 5. txRef in metadata for webhook reconciliation
   */
  public async createBankTransferCheckoutLink(params: {
    txRef: string;
    amount: number;
    customerPhone: string;
    customerName?: string;
    customerEmail?: string;
    title?: string;
    description?: string;
    redirectUrl?: string;
    meta?: Record<string, any>;
  }): Promise<{ success: boolean; paymentLink?: string; txRef: string; error?: string }> {
    const cleanPhone = params.customerPhone.replace(/\D/g, '');
    const cleanEmail =
      params.customerEmail ||
      `customer_${cleanPhone || Date.now()}@floate.xyz`;
    const cleanName = params.customerName || 'Floate Customer';
    const redirect_url = params.redirectUrl || getWhatsAppRedirectUrl(params.txRef);

    if (!this.flwSecretKey) {
      console.warn('[Flutterwave] Secret key is not configured for Bank Transfer checkout link.');
      return {
        success: false,
        txRef: params.txRef,
        error: 'Payment service configuration is currently being finalized. Please try again shortly or contact support.',
      };
    }

    try {
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const payload = {
        tx_ref: params.txRef,
        amount: String(params.amount),
        currency: 'NGN',
        payment_options: 'banktransfer',
        redirect_url,
        meta: {
          app: 'Floate SafePay',
          txRef: params.txRef,
          escrowRef: params.txRef,
          phone: cleanPhone,
          expiresAt,
          ...params.meta,
        },
        customer: {
          email: cleanEmail,
          phonenumber: cleanPhone,
          name: cleanName,
        },
        customizations: {
          title: params.title || 'Floate SafePay Escrow',
          description: params.description || `Pay with Bank Transfer for order ${params.txRef}`,
          logo: `${config.appUrl || 'https://floate.xyz'}/icon-192.png`,
        },
      };

      console.log(`[Flutterwave Checkout Request] Calling /v3/payments for ref: ${params.txRef}, amount: ₦${params.amount}, options: banktransfer`);

      const res = await fetch('https://api.flutterwave.com/v3/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.flwSecretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();
      console.log(`[Flutterwave Checkout Response]:`, JSON.stringify(data));

      if (data.status === 'success' && data.data?.link) {
        return {
          success: true,
          paymentLink: data.data.link,
          txRef: params.txRef,
        };
      }

      console.warn('[Flutterwave Create Checkout API Error]:', data);
      return {
        success: false,
        txRef: params.txRef,
        error: data.message || 'Unable to generate Flutterwave checkout link',
      };
    } catch (err: any) {
      console.error('[Flutterwave Create Checkout Exception]:', err);
      return {
        success: false,
        txRef: params.txRef,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Initiates dynamic Nigerian bank transfer virtual account (Flutterwave Direct Bank Transfer Charges API)
   * Calls POST https://api.flutterwave.com/v3/charges?type=bank_transfer with is_permanent: false
   * and extracts transfer_bank, transfer_account, transfer_amount, account_expiration from meta.authorization.
   */
  public async initiateBankTransfer(params: {
    txRef: string;
    amount: number;
    customerEmail?: string;
    customerPhone: string;
    customerName?: string;
    meta?: Record<string, any>;
  }): Promise<{
    success: boolean;
    accountNumber?: string;
    bankName?: string;
    transferAmount?: number;
    expiryDate?: string;
    transferReference?: string;
    transferNote?: string;
    rawResponse?: any;
    error?: string;
  }> {
    const cleanPhone = params.customerPhone.replace(/\D/g, '');
    const cleanEmail =
      params.customerEmail ||
      `customer_${cleanPhone || Date.now()}@floate.xyz`;
    const cleanName = params.customerName || 'Floate Customer';

    if (!this.flwSecretKey) {
      console.warn('[Flutterwave] Secret key is missing in initiateBankTransfer');
      return {
        success: false,
        error: 'Payment service configuration is currently being finalized. Please try again shortly or contact support.',
      };
    }

    try {
      const payload = {
        tx_ref: params.txRef,
        amount: String(params.amount),
        currency: 'NGN',
        email: cleanEmail,
        phone_number: cleanPhone,
        fullname: cleanName,
        is_permanent: false,
        meta: {
          app: 'Floate SafePay',
          phone: cleanPhone,
          ...params.meta,
        },
      };

      console.log(`[Flutterwave Bank Transfer Request] Initiating dynamic charge for ref: ${params.txRef}, amount: ₦${params.amount}`);

      const res = await fetch('https://api.flutterwave.com/v3/charges?type=bank_transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.flwSecretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();
      console.log(`[Flutterwave Bank Transfer Response]:`, JSON.stringify(data));

      if (data.status === 'success') {
        const authMeta = data.meta?.authorization || {};
        const dataObj = data.data || {};

        const transferAccount =
          authMeta.transfer_account ||
          authMeta.account_number ||
          dataObj.transfer_account ||
          dataObj.account_number;

        const transferBank =
          authMeta.transfer_bank ||
          authMeta.bank_name ||
          dataObj.transfer_bank ||
          dataObj.bank_name ||
          'Flutterwave MFB / Wema Bank';

        const transferAmount = Number(
          authMeta.transfer_amount ||
          dataObj.transfer_amount ||
          dataObj.amount ||
          params.amount
        );

        const expiryDate =
          authMeta.account_expiration ||
          authMeta.expiry_date ||
          dataObj.account_expiration ||
          dataObj.expiry_date;

        const transferReference =
          authMeta.transfer_reference ||
          authMeta.flw_ref ||
          dataObj.transfer_reference ||
          dataObj.flw_ref ||
          params.txRef;

        const transferNote = authMeta.transfer_note || dataObj.transfer_note || 'Please transfer the exact amount within 60 minutes';

        if (transferAccount) {
          return {
            success: true,
            accountNumber: transferAccount,
            bankName: transferBank,
            transferAmount,
            expiryDate,
            transferReference,
            transferNote,
            rawResponse: data,
          };
        }
      }

      console.warn('[Flutterwave Bank Transfer Charge API Error]:', data);
      return {
        success: false,
        error: data.message || 'Unable to generate dynamic virtual account from Flutterwave',
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[Flutterwave Bank Transfer Charge Exception]:', err);
      return {
        success: false,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Creates a Dedicated / Flexible Virtual Account via Flutterwave
   * Endpoint: POST https://api.flutterwave.com/v3/virtual-account-numbers
   * Unlike fixed-amount dynamic charges, flexible accounts accept payments without strict bank-level
   * amount lock, allowing the webhook to reconcile exact, partial, or over-payments gracefully.
   */
  public async createDedicatedVirtualAccount(params: {
    txRef: string;
    email: string;
    phoneNumber: string;
    firstName?: string;
    lastName?: string;
    isPermanent?: boolean;
    bvn?: string;
    narration?: string;
  }): Promise<{
    success: boolean;
    accountNumber?: string;
    bankName?: string;
    orderRef?: string;
    flwRef?: string;
    rawResponse?: any;
    error?: string;
  }> {
    if (!this.flwSecretKey) {
      return {
        success: false,
        error: 'Flutterwave secret key is not configured',
      };
    }

    try {
      const cleanPhone = params.phoneNumber.replace(/\D/g, '');
      const payload = {
        email: params.email || `buyer_${cleanPhone || Date.now()}@floate.xyz`,
        is_permanent: Boolean(params.isPermanent),
        bvn: params.bvn || undefined,
        tx_ref: params.txRef,
        phonenumber: cleanPhone,
        firstname: params.firstName || 'Floate',
        lastname: params.lastName || 'Customer',
        narration: params.narration || 'Floate SafePay Escrow',
      };

      const res = await fetch('https://api.flutterwave.com/v3/virtual-account-numbers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.flwSecretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();
      if (data.status === 'success' && data.data) {
        return {
          success: true,
          accountNumber: data.data.account_number,
          bankName: data.data.bank_name || 'Wema Bank / Flutterwave',
          orderRef: data.data.order_ref,
          flwRef: data.data.flw_ref,
          rawResponse: data,
        };
      }

      console.warn('[Flutterwave Dedicated Account API Error]:', data);
      return {
        success: false,
        error: data.message || 'Could not create dedicated virtual account',
        rawResponse: data,
      };
    } catch (err: any) {
      console.error('[Flutterwave Dedicated Account Exception]:', err);
      return {
        success: false,
        error: err?.message || String(err),
      };
    }
  }

  /**
   * Verify transaction with Flutterwave API by transaction ID (GET https://api.flutterwave.com/v3/transactions/{id}/verify)
   * Prevents webhook spoofing by querying Flutterwave directly.
   */
  public async verifyTransaction(transactionId: string | number): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!this.flwSecretKey) {
      return { success: false, error: 'Flutterwave secret key missing' };
    }

    try {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.flwSecretKey}`,
          },
        }
      );
      const data: any = await res.json();
      if (data.status === 'success' && (data.data?.status === 'successful' || data.data?.status === 'completed')) {
        return { success: true, data: data.data };
      }
      return {
        success: false,
        data: data.data,
        error: data.message || 'Transaction not successful on Flutterwave',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Verify transaction with Flutterwave API by txRef (GET https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref={ref})
   */
  public async verifyTransactionByRef(txRef: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    if (!this.flwSecretKey) {
      return { success: false, error: 'Flutterwave secret key missing' };
    }

    try {
      const res = await fetch(
        `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.flwSecretKey}`,
          },
        }
      );
      const data: any = await res.json();
      if (data.status === 'success' && (data.data?.status === 'successful' || data.data?.status === 'completed')) {
        return { success: true, data: data.data };
      }
      return {
        success: false,
        data: data.data,
        error: data.message || 'Transaction not yet confirmed on Flutterwave',
      };
    } catch (err: any) {
      return { success: false, error: err?.message || String(err) };
    }
  }

  /**
   * Verify Flutterwave Webhook Secret Hash from verif-hash request header
   * Enforces cryptographic timing-safe comparison to prevent timing attacks.
   * Strictly rejects webhooks if secret hash is not configured in the environment.
   */
  public verifyWebhookSecret(headerHash: string | undefined): boolean {
    const configuredHash =
      this.flwSecretHash ||
      process.env.FLW_SECRET_HASH ||
      process.env.FLUTTERWAVE_SECRET_HASH ||
      process.env.FLUTTERWAVE_WEBHOOK_SECRET;

    if (!configuredHash) {
      console.error('[Flutterwave Webhook Security] CRITICAL: No FLW_SECRET_HASH configured in environment. Rejecting webhook for security.');
      return false;
    }

    if (!headerHash || typeof headerHash !== 'string') {
      console.warn('[Flutterwave Webhook Security] Warning: verif-hash header was missing or invalid in incoming request.');
      return false;
    }

    try {
      const headerBuf = Buffer.from(headerHash.trim(), 'utf8');
      const configBuf = Buffer.from(configuredHash.trim(), 'utf8');
      if (headerBuf.length !== configBuf.length) {
        return false;
      }
      return crypto.timingSafeEqual(headerBuf, configBuf);
    } catch (err) {
      console.error('[Flutterwave Webhook Security] Error during timing-safe hash comparison:', err);
      return false;
    }
  }

  /**
   * Disburse/transfer settlement to Vendor bank account using Flutterwave Transfer API
   */
  public async disburseToVendor(params: {
    amount: number;
    destinationBankCode: string;
    destinationAccountNumber: string;
    narration?: string;
    reference?: string;
  }): Promise<{
    success: boolean;
    reference?: string;
    transferId?: string;
    message?: string;
    error?: string;
  }> {
    if (!this.flwSecretKey) {
      return { success: false, error: 'Settlement service is temporarily unavailable.' };
    }

    const isLive = this.flwSecretKey.startsWith('FLWSECK-') && !this.flwSecretKey.includes('TEST');
    const reference = params.reference || `floate_flw_disb_${Date.now()}`;
    const maskedAcc = maskAccountNumber(params.destinationAccountNumber);

    if (!isLive) {
      console.log(`[Flutterwave Transfer Test Simulated] Disbursed ₦${params.amount} to account ${maskedAcc} (Bank Code: ${params.destinationBankCode})`);
      return {
        success: true,
        reference,
        transferId: reference,
        message: 'Disbursement simulated in test mode',
      };
    }

    try {
      const payload = {
        account_bank: params.destinationBankCode,
        account_number: params.destinationAccountNumber,
        amount: params.amount,
        narration: params.narration || 'Floate SafePay Settlement',
        currency: 'NGN',
        reference,
        debit_currency: 'NGN',
      };

      const res = await fetch('https://api.flutterwave.com/v3/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.flwSecretKey}`,
        },
        body: JSON.stringify(payload),
      });

      const data: any = await res.json();
      if (data.status === 'success') {
        return {
          success: true,
          reference: String(data.data?.id || reference),
          transferId: String(data.data?.id || reference),
          message: data.message || 'Transfer queued successfully',
        };
      }

      console.warn('[Flutterwave Transfer API Error]:', data);
      return {
        success: false,
        error: data.message || 'Transfer failed',
      };
    } catch (err: any) {
      console.error('[Flutterwave Transfer Exception]:', err);
      return {
        success: false,
        error: err?.message || String(err),
      };
    }
  }

  public validateAccountNameMatch(ownerFullName: string, resolvedBankName: string) {
    return validateAccountNameMatch(ownerFullName, resolvedBankName);
  }

  public validateBVN(bvn: string) {
    return validateBVN(bvn);
  }

  public validateNIN(nin: string) {
    return validateNIN(nin);
  }

  /**
   * Resolve and verify Nigerian bank account name via NIBSS (Flutterwave Account Resolution)
   */
  public async resolveBankAccount(accountNumber: string, bankCode: string): Promise<{
    success: boolean;
    accountName?: string;
    accountNumber?: string;
    error?: string;
  }> {
    const isLive = this.flwSecretKey && this.flwSecretKey.startsWith('FLWSECK-') && !this.flwSecretKey.includes('TEST');

    if (!isLive) {
      // In sandbox / test environment, attempt resolution or return a verified clean test name
      return {
        success: true,
        accountName: 'VERIFIED MERCHANT ACCOUNT',
        accountNumber,
      };
    }

    try {
      const response = await fetch('https://api.flutterwave.com/v3/accounts/resolve', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.flwSecretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: accountNumber,
          account_bank: bankCode,
        }),
      });

      const data: any = await response.json();
      if (!response.ok || data.status !== 'success') {
        return {
          success: false,
          error: data.message || 'Could not verify account name with bank',
        };
      }

      return {
        success: true,
        accountName: data.data?.account_name,
        accountNumber: data.data?.account_number || accountNumber,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to verify account number',
      };
    }
  }
}

/**
 * Strips honorifics, corporate noise words, and punctuation for strict fuzzy/token name matching
 */
export function normalizeNameTokens(name: string): string[] {
  const noiseWords = new Set([
    'mr', 'mrs', 'miss', 'ms', 'dr', 'chief', 'alhaji', 'alh', 'pastor', 'engr', 'barr', 'esq',
    'ltd', 'limited', 'ent', 'enterprise', 'enterprises', 'ventures', 'venture', 'nig', 'nigeria',
    'global', 'concept', 'concepts', 'conceptz', 'services', 'stores', 'store', 'biz', 'group',
    'consulting', 'international', 'intl', 'and', 'the', 'of', 'co', 'company'
  ]);
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !noiseWords.has(t));
}

/**
 * Validates that the Flutterwave/NIBSS resolved bank account name matches the owner legal full name.
 */
export function validateAccountNameMatch(
  ownerFullName: string,
  resolvedBankName: string
): { isMatch: boolean; confidence: number; matchedTokens: string[]; reason?: string } {
  if (!ownerFullName || !resolvedBankName) {
    return { isMatch: false, confidence: 0, matchedTokens: [], reason: 'Owner name or bank account name is empty.' };
  }

  // If in sandbox/test mode and placeholder is returned, accept as simulated match
  if (resolvedBankName === 'VERIFIED MERCHANT ACCOUNT' || resolvedBankName.includes('TEST ACCOUNT')) {
    return { isMatch: true, confidence: 1.0, matchedTokens: ['verified'], reason: 'Test environment automatic match.' };
  }

  const ownerTokens = normalizeNameTokens(ownerFullName);
  const bankTokens = normalizeNameTokens(resolvedBankName);

  if (ownerTokens.length === 0 || bankTokens.length === 0) {
    return { isMatch: false, confidence: 0, matchedTokens: [], reason: 'Unable to extract valid name tokens.' };
  }

  const matchedTokens: string[] = [];
  for (const oToken of ownerTokens) {
    const found = bankTokens.some(
      (bToken) =>
        bToken === oToken ||
        (oToken.length >= 4 && bToken.startsWith(oToken)) ||
        (bToken.length >= 4 && oToken.startsWith(bToken))
    );
    if (found) {
      matchedTokens.push(oToken);
    }
  }

  const confidence = matchedTokens.length / ownerTokens.length;
  // Match requires at least 1 distinctive token or majority of tokens
  const isMatch =
    matchedTokens.length >= Math.min(2, ownerTokens.length) ||
    (ownerTokens.length === 1 && matchedTokens.length === 1) ||
    (confidence >= 0.5 && matchedTokens.length >= 1);

  if (!isMatch) {
    return {
      isMatch: false,
      confidence,
      matchedTokens,
      reason: `Account name "${resolvedBankName}" does not match the registered owner name "${ownerFullName}".`,
    };
  }

  return {
    isMatch: true,
    confidence,
    matchedTokens,
  };
}

/**
 * Validates Nigerian 11-digit BVN format and checks for dummy inputs
 */
export function validateBVN(bvn: string): { isValid: boolean; valid: boolean; reason?: string; error?: string; maskedBvn?: string } {
  const clean = (bvn || '').replace(/\D/g, '');
  if (clean.length !== 11) {
    return { isValid: false, valid: false, reason: 'BVN must be exactly 11 digits.', error: 'BVN must be exactly 11 digits.' };
  }
  if (/^(\d)\1{10}$/.test(clean) || clean === '12345678901' || clean === '01234567890') {
    return { isValid: false, valid: false, reason: 'Please provide a valid 11-digit BVN (dummy numbers are rejected).', error: 'Please provide a valid 11-digit BVN (dummy numbers are rejected).' };
  }
  const maskedBvn = `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
  return { isValid: true, valid: true, maskedBvn };
}

/**
 * Validates Nigerian 11-digit NIN format and checks for dummy inputs
 */
export function validateNIN(nin: string): { isValid: boolean; valid: boolean; reason?: string; error?: string; maskedNin?: string } {
  const clean = (nin || '').replace(/\D/g, '');
  if (clean.length !== 11) {
    return { isValid: false, valid: false, reason: 'NIN must be exactly 11 digits.', error: 'NIN must be exactly 11 digits.' };
  }
  if (/^(\d)\1{10}$/.test(clean) || clean === '12345678901' || clean === '01234567890') {
    return { isValid: false, valid: false, reason: 'Please provide a valid 11-digit NIN (dummy numbers are rejected).', error: 'Please provide a valid 11-digit NIN (dummy numbers are rejected).' };
  }
  const maskedNin = `${clean.slice(0, 3)}*****${clean.slice(-3)}`;
  return { isValid: true, valid: true, maskedNin };
}

export const flutterwaveService = new FlutterwaveService();
