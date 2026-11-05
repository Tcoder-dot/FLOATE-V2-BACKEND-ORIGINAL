import crypto from 'crypto';

export interface NombaConfig {
  accountId: string; // Nomba Account / Merchant ID
  clientId: string;  // Client ID
  clientSecret: string; // Client Secret Key
  environment: 'sandbox' | 'live';
}

export interface NombaInitCheckoutResponse {
  success: boolean;
  checkoutUrl?: string;
  orderReference?: string;
  expiresAt?: string;
  error?: string;
}

export interface NombaVerifyResponse {
  success: boolean;
  paymentStatus: 'PAID' | 'PENDING' | 'FAILED';
  amountPaid: number;
  orderReference: string;
  transactionId?: string;
  paymentMethod?: string;
  customerEmail?: string;
  raw?: any;
}

export interface NombaTransferResponse {
  success: boolean;
  transferId?: string;
  status: 'SUCCESSFUL' | 'PENDING' | 'FAILED';
  message?: string;
  raw?: any;
}

class NombaService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  public getConfig(): NombaConfig {
    const environment = (process.env.NOMBA_ENVIRONMENT || 'sandbox').toLowerCase() === 'live' ? 'live' : 'sandbox';
    return {
      accountId: process.env.NOMBA_ACCOUNT_ID || '',
      clientId: process.env.NOMBA_CLIENT_ID || '',
      clientSecret: process.env.NOMBA_CLIENT_SECRET || '',
      environment,
    };
  }

  public isConfigured(): boolean {
    const cfg = this.getConfig();
    return Boolean(cfg.clientId && cfg.clientSecret && cfg.accountId);
  }

  public getBaseUrl(): string {
    const cfg = this.getConfig();
    return cfg.environment === 'live'
      ? 'https://api.nomba.com/v1'
      : 'https://api.nomba.com/v1'; // Nomba uses standard API endpoints with sandbox/live credentials
  }

  /**
   * Retrieves OAuth Access Token from Nomba
   */
  public async getAuthToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.tokenExpiresAt > now + 60000) {
      return this.accessToken;
    }

    const cfg = this.getConfig();
    if (!cfg.clientId || !cfg.clientSecret || !cfg.accountId) {
      throw new Error('Nomba Client ID, Secret, and Account ID must be set in environment variables.');
    }

    const url = `${this.getBaseUrl()}/auth/token/issue`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accountId': cfg.accountId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nomba Auth Failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const token = data?.data?.access_token || data?.access_token;
    const expiresIn = data?.data?.expires_in || data?.expires_in || 3600;

    if (!token) {
      throw new Error(`Nomba Auth Error: No access_token returned.`);
    }

    this.accessToken = token;
    this.tokenExpiresAt = Date.now() + expiresIn * 1000;
    return this.accessToken;
  }

  /**
   * Creates an in-app Nomba Checkout Order for SafePay escrow or credits topup
   */
  public async createCheckoutOrder(params: {
    orderReference: string;
    amount: number;
    currency?: string;
    customerEmail?: string;
    customerName?: string;
    customerPhone?: string;
    callbackUrl?: string;
    description?: string;
  }): Promise<NombaInitCheckoutResponse> {
    try {
      if (!this.isConfigured()) {
        // Fallback simulation / sandbox mode when keys are pending
        return {
          success: true,
          checkoutUrl: `https://checkout.nomba.com/pay/${params.orderReference}`,
          orderReference: params.orderReference,
        };
      }

      const token = await this.getAuthToken();
      const cfg = this.getConfig();
      const url = `${this.getBaseUrl()}/checkout/order`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'accountId': cfg.accountId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            orderReference: params.orderReference,
            customerId: params.customerPhone || params.customerEmail || 'floate-customer',
            callbackUrl: params.callbackUrl || `${process.env.APP_URL || ''}/api/safepay/callback`,
            customerEmail: params.customerEmail || `${params.customerPhone || 'buyer'}@floate.app`,
            amount: params.amount,
            currency: params.currency || 'NGN',
            description: params.description || `Floate SafePay Escrow (Ref: ${params.orderReference})`,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || (data?.code && data.code !== '00' && data.status !== 'success')) {
        return {
          success: false,
          error: data?.message || data?.description || 'Failed to initialize Nomba checkout',
        };
      }

      const checkoutLink = data?.data?.checkoutLink || data?.data?.checkoutUrl || data?.checkoutLink;
      return {
        success: true,
        checkoutUrl: checkoutLink || `https://checkout.nomba.com/pay/${params.orderReference}`,
        orderReference: params.orderReference,
      };
    } catch (err: any) {
      console.error('[Nomba Checkout Error]:', err.message);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Verifies an order status with Nomba API
   */
  public async verifyOrder(orderReference: string): Promise<NombaVerifyResponse> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          paymentStatus: 'PENDING',
          amountPaid: 0,
          orderReference,
          raw: { note: 'Nomba keys not configured in environment' },
        };
      }

      const token = await this.getAuthToken();
      const cfg = this.getConfig();
      const url = `${this.getBaseUrl()}/checkout/order/${encodeURIComponent(orderReference)}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'accountId': cfg.accountId,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        return {
          success: false,
          paymentStatus: 'FAILED',
          amountPaid: 0,
          orderReference,
          raw: data,
        };
      }

      const orderData = data?.data || data;
      const status = (orderData?.status || orderData?.orderStatus || '').toUpperCase();
      const isPaid = status === 'SUCCESS' || status === 'PAID' || status === 'SUCCESSFUL';

      return {
        success: true,
        paymentStatus: isPaid ? 'PAID' : status === 'FAILED' ? 'FAILED' : 'PENDING',
        amountPaid: Number(orderData?.amount || 0),
        orderReference,
        transactionId: orderData?.transactionId || orderData?.id,
        paymentMethod: orderData?.paymentMethod,
        customerEmail: orderData?.customerEmail,
        raw: orderData,
      };
    } catch (err: any) {
      console.error('[Nomba Verify Error]:', err.message);
      return {
        success: false,
        paymentStatus: 'PENDING',
        amountPaid: 0,
        orderReference,
        raw: { error: err.message },
      };
    }
  }

  /**
   * Disburses payout funds straight to vendor's bank account upon delivery code release
   */
  public async disburseVendorPayout(params: {
    accountNumber: string;
    bankCode: string;
    amount: number;
    narration: string;
    reference: string;
  }): Promise<NombaTransferResponse> {
    try {
      if (!this.isConfigured()) {
        console.log(`[Nomba Sandbox Disbursement]: Disbursing ₦${params.amount} to ${params.accountNumber} (${params.bankCode})`);
        return {
          success: true,
          status: 'SUCCESSFUL',
          transferId: `NOMBA-TX-${Date.now()}`,
          message: 'Disbursement executed successfully (Simulation)',
        };
      }

      const token = await this.getAuthToken();
      const cfg = this.getConfig();
      const url = `${this.getBaseUrl()}/transfers/bank`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'accountId': cfg.accountId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountNumber: params.accountNumber,
          accountBank: params.bankCode,
          amount: params.amount,
          merchantTxRef: params.reference,
          senderName: 'Floate SafePay Escrow',
          narration: params.narration,
        }),
      });

      const data = await response.json();
      const isSuccess = response.ok && (data?.status === 'success' || data?.code === '00');

      return {
        success: isSuccess,
        status: isSuccess ? 'SUCCESSFUL' : 'FAILED',
        transferId: data?.data?.id || data?.id,
        message: data?.message || data?.description,
        raw: data,
      };
    } catch (err: any) {
      console.error('[Nomba Disbursement Error]:', err.message);
      return {
        success: false,
        status: 'FAILED',
        message: err.message,
      };
    }
  }
}

export const nombaService = new NombaService();
