import crypto from 'crypto';
import { config } from '../config.js';

export interface MonnifyConfig {
  apiKey: string;
  secretKey: string;
  contractCode: string;
  walletAccountNumber?: string;
  environment: 'sandbox' | 'live';
}

export interface MonnifyInitPaymentResponse {
  success: boolean;
  checkoutUrl?: string;
  transactionReference?: string;
  paymentReference?: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  expiresOn?: string;
  error?: string;
}

export interface MonnifyVerifyResponse {
  success: boolean;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED' | 'OVERPAID' | 'PARTIALLY_PAID';
  amountPaid: number;
  paymentReference: string;
  transactionReference: string;
  paidOn?: string;
  paymentMethod?: string;
  customerEmail?: string;
  raw?: any;
}

class MonnifyService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  public getConfig(): MonnifyConfig {
    const environment = (process.env.MONNIFY_ENVIRONMENT || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
    return {
      apiKey: process.env.MONNIFY_API_KEY || '',
      secretKey: process.env.MONNIFY_SECRET_KEY || '',
      contractCode: process.env.MONNIFY_CONTRACT_CODE || '',
      walletAccountNumber: process.env.MONNIFY_WALLET_ACCOUNT_NUMBER || '',
      environment,
    };
  }

  public isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.apiKey && cfg.secretKey && cfg.contractCode);
  }

  public getBaseUrl(): string {
    const cfg = this.getConfig();
    return cfg.environment === 'live'
      ? 'https://api.monnify.com'
      : 'https://sandbox.monnify.com';
  }

  /**
   * Authenticates with Monnify API to retrieve an access token.
   * Caches token in memory until expiration.
   */
  public async getAuthToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    const cfg = this.getConfig();
    if (!cfg.apiKey || !cfg.secretKey) {
      throw new Error('Monnify API Key and Secret Key must be set in environment variables.');
    }

    const credentials = Buffer.from(`${cfg.apiKey}:${cfg.secretKey}`).toString('base64');
    const url = `${this.getBaseUrl()}/api/v1/auth/login`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Monnify Auth Failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    if (!data.requestSuccessful || !data.responseBody?.accessToken) {
      throw new Error(`Monnify Auth Error: ${data.responseMessage || 'No access token in response'}`);
    }

    this.accessToken = data.responseBody.accessToken;
    // expiresIn is usually in seconds (e.g., 3600)
    const expiresInMs = (data.responseBody.expiresIn || 3600) * 1000;
    this.tokenExpiresAt = now + expiresInMs;

    console.log(`[Monnify] 🔑 Successfully authenticated with Monnify (${cfg.environment.toUpperCase()})`);
    return this.accessToken;
  }

  /**
   * Initializes a transaction on Monnify for Floate SafePay Escrow or Wallet Topup.
   */
  public async initializeTransaction(params: {
    amount: number;
    customerName: string;
    customerEmail: string;
    paymentReference: string;
    paymentDescription: string;
    redirectUrl?: string;
    metaData?: Record<string, any>;
  }): Promise<MonnifyInitPaymentResponse> {
    const cfg = this.getConfig();
    if (!this.isConfigured()) {
      // Fallback sandbox preview payload if keys are not yet input
      console.warn('[Monnify] ⚠️ API credentials not configured yet. Generating mock sandbox reference.');
      return {
        success: true,
        checkoutUrl: `https://sandbox.monnify.com/checkout/${params.paymentReference}`,
        paymentReference: params.paymentReference,
        transactionReference: `MNFY_${Date.now()}`,
        bankName: 'Wema Bank (Monnify Sandbox)',
        accountNumber: '99' + Math.floor(10000000 + Math.random() * 90000000),
        accountName: `Floate SafePay - ${params.customerName}`,
      };
    }

    try {
      const token = await this.getAuthToken();
      const url = `${this.getBaseUrl()}/api/v1/merchant/transactions/init-transaction`;

      const payload = {
        amount: params.amount,
        customerName: params.customerName || 'Floate Customer',
        customerEmail: params.customerEmail || `customer_${Date.now()}@floate.xyz`,
        paymentReference: params.paymentReference,
        paymentDescription: params.paymentDescription,
        currencyCode: 'NGN',
        contractCode: cfg.contractCode,
        redirectUrl: params.redirectUrl || `${config.appUrl || 'https://floate.xyz'}/payment/callback`,
        paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
        metaData: params.metaData || {},
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        console.error('[Monnify Init Error]:', data);
        return {
          success: false,
          error: data.responseMessage || 'Failed to initialize Monnify transaction',
        };
      }

      const body = data.responseBody;
      return {
        success: true,
        checkoutUrl: body.checkoutUrl,
        transactionReference: body.transactionReference,
        paymentReference: body.paymentReference,
        accountNumber: body.accountNumber,
        bankName: body.bankName || 'Wema Bank / Moniepoint MFB',
        accountName: `Floate SafePay - ${params.customerName}`,
      };
    } catch (err: any) {
      console.error('[Monnify Init Exception]:', err);
      return {
        success: false,
        error: err?.message || 'Unexpected error connecting to Monnify',
      };
    }
  }

  /**
   * Creates a dedicated dynamic Reserved Virtual Bank Account on Monnify for Escrow transfer
   */
  public async createReservedAccount(params: {
    accountReference: string;
    accountName: string;
    customerEmail: string;
    customerName: string;
    bvn?: string;
    nin?: string;
  }): Promise<{
    success: boolean;
    accounts?: Array<{ bankName: string; accountNumber: string; bankCode: string }>;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: true,
        accounts: [
          { bankName: 'Wema Bank (Sandbox)', accountNumber: '0284910283', bankCode: '035' },
          { bankName: 'Moniepoint MFB (Sandbox)', accountNumber: '8291048291', bankCode: '50515' },
        ],
      };
    }

    try {
      const token = await this.getAuthToken();
      const cfg = this.getConfig();
      const url = `${this.getBaseUrl()}/api/v2/bank-transfer/reserved-accounts`;

      const payload = {
        accountReference: params.accountReference,
        accountName: params.accountName,
        currencyCode: 'NGN',
        contractCode: cfg.contractCode,
        customerEmail: params.customerEmail,
        customerName: params.customerName,
        getAllAvailableBanks: true,
        ...(params.bvn ? { bvn: params.bvn } : {}),
        ...(params.nin ? { nin: params.nin } : {}),
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        return {
          success: false,
          error: data.responseMessage || 'Failed to create reserved account',
        };
      }

      const accounts = data.responseBody?.accounts || [];
      return {
        success: true,
        accounts: accounts.map((acc: any) => ({
          bankName: acc.bankName,
          accountNumber: acc.accountNumber,
          bankCode: acc.bankCode,
        })),
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Error creating Monnify reserved account',
      };
    }
  }

  /**
   * Queries Monnify for transaction status by payment reference
   */
  public async verifyTransaction(paymentReference: string): Promise<MonnifyVerifyResponse> {
    if (!this.isConfigured()) {
      return {
        success: true,
        paymentStatus: 'PAID',
        amountPaid: 0,
        paymentReference,
        transactionReference: `MNFY_${Date.now()}`,
      };
    }

    try {
      const token = await this.getAuthToken();
      const encodedRef = encodeURIComponent(paymentReference);
      const url = `${this.getBaseUrl()}/api/v2/transactions/${encodedRef}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        return {
          success: false,
          paymentStatus: 'FAILED',
          amountPaid: 0,
          paymentReference,
          transactionReference: '',
          raw: data,
        };
      }

      const body = data.responseBody;
      return {
        success: true,
        paymentStatus: body.paymentStatus, // 'PAID', 'PENDING', 'FAILED', 'OVERPAID', 'PARTIALLY_PAID'
        amountPaid: Number(body.amountPaid || body.amount || 0),
        paymentReference: body.paymentReference,
        transactionReference: body.transactionReference,
        paidOn: body.paidOn,
        paymentMethod: body.paymentMethod,
        customerEmail: body.customer?.email,
        raw: body,
      };
    } catch (err: any) {
      console.error('[Monnify Query Error]:', err);
      return {
        success: false,
        paymentStatus: 'FAILED',
        amountPaid: 0,
        paymentReference,
        transactionReference: '',
        raw: { error: err?.message },
      };
    }
  }

  /**
   * Validates Monnify Webhook Signature using HMAC SHA512 of secretKey + rawBody
   */
  public verifyWebhookSignature(rawBody: string, signatureHeader?: string): boolean {
    const cfg = this.getConfig();
    if (!cfg.secretKey) return true; // If secret key not set yet, bypass for development
    if (!signatureHeader) return false;

    try {
      const computedHash = crypto
        .createHmac('sha512', cfg.secretKey)
        .update(rawBody)
        .digest('hex');

      return computedHash.toLowerCase() === signatureHeader.toLowerCase();
    } catch (err) {
      console.error('[Monnify Webhook Signature Error]:', err);
      return false;
    }
  }

  /**
   * Automatically disburses escrow funds directly to the vendor's registered bank account
   * using Monnify Single Transfer API
   */
  public async disburseToVendor(params: {
    amount: number;
    reference: string;
    narration: string;
    destinationBankCode: string;
    destinationAccountNumber: string;
  }): Promise<{
    success: boolean;
    status: string;
    transactionReference?: string;
    error?: string;
  }> {
    const cfg = this.getConfig();
    if (!this.isConfigured() || !cfg.walletAccountNumber) {
      console.log(`[Monnify Payout Sandbox Simulated] Disbursed ₦${params.amount} to account ${params.destinationAccountNumber} (Bank Code: ${params.destinationBankCode})`);
      return {
        success: true,
        status: 'SUCCESS',
        transactionReference: `MNFY_DISB_${Date.now()}`,
      };
    }

    try {
      const token = await this.getAuthToken();
      const url = `${this.getBaseUrl()}/api/v2/disbursements/single-transfer`;

      const payload = {
        amount: params.amount,
        reference: params.reference,
        narration: params.narration || 'Floate SafePay Escrow Settlement',
        destinationBankCode: params.destinationBankCode,
        destinationAccountNumber: params.destinationAccountNumber,
        currency: 'NGN',
        sourceAccountNumber: cfg.walletAccountNumber,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        console.error('[Monnify Disbursement Error]:', data);
        return {
          success: false,
          status: 'FAILED',
          error: data.responseMessage || 'Disbursement transfer failed',
        };
      }

      const body = data.responseBody;
      return {
        success: true,
        status: body.status || 'PENDING',
        transactionReference: body.transactionReference,
      };
    } catch (err: any) {
      console.error('[Monnify Disbursement Exception]:', err);
      return {
        success: false,
        status: 'FAILED',
        error: err?.message || 'Error processing disbursement',
      };
    }
  }

  /**
   * Validates / resolves a Nigerian bank account number
   */
  public async validateBankAccount(accountNumber: string, bankCode: string): Promise<{
    success: boolean;
    accountName?: string;
    accountNumber?: string;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        success: true,
        accountName: 'TEST VENDOR (SANDBOX)',
        accountNumber,
      };
    }

    try {
      const token = await this.getAuthToken();
      const url = `${this.getBaseUrl()}/api/v1/disbursements/account/validate?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok || !data.requestSuccessful) {
        return {
          success: false,
          error: data.responseMessage || 'Could not validate account number',
        };
      }

      return {
        success: true,
        accountName: data.responseBody?.accountName,
        accountNumber: data.responseBody?.accountNumber,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to validate bank account',
      };
    }
  }
}

export const monnifyService = new MonnifyService();
