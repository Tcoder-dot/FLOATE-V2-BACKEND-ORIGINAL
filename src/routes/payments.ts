/**
 * Payment Initiation & Webhook Sync Routes
 * Enforces strict order-bound payment creation and handles gateway webhook reconciliation.
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { firestoreDb } from '../bot/services/firestoreService.js';
import { flutterwaveService } from '../bot/services/flutterwaveService.js';
import { confirmSafePayEscrowPaymentForOrder } from '../bot/services/whatsappService.js';
import { whatsappTokenService } from '../services/whatsappTokenService.js';
import { sessionCookieMiddleware } from '../middleware/auth.js';

export const paymentsRouter = Router();

/**
 * POST /payments/initiate
 * Order-bound payment initiation endpoint
 */
paymentsRouter.post(['/initiate', '/create'], sessionCookieMiddleware, async (req: Request, res: Response) => {
  try {
    const { order_id, orderId: altOrderId, provider = 'flutterwave' } = req.body || {};
    const targetOrderId = order_id || altOrderId;

    if (!targetOrderId || typeof targetOrderId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'order_id parameter is required.',
      });
    }

    // Resolve order from database
    let order = await firestoreDb.getEscrowOrderDoc(targetOrderId);
    if (!order && !targetOrderId.startsWith('FLT-SP-')) {
      order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${targetOrderId.toUpperCase()}`);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found.',
      });
    }

    // Enforce order status: must be PENDING/UNPAID
    const statusStr = String(order.status);
    if (
      statusStr === 'PAID' ||
      statusStr === 'FUNDS_HELD_IN_ESCROW' ||
      statusStr === 'DELIVERY_CONFIRMED' ||
      statusStr === 'FUNDS_RELEASED'
    ) {
      return res.status(400).json({
        success: false,
        status: order.status,
        error: 'Order has already been paid.',
      });
    }

    if (statusStr === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        status: 'EXPIRED',
        error: 'Order has expired.',
      });
    }

    if (statusStr === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        status: 'CANCELLED',
        error: 'Order has been cancelled.',
      });
    }

    const cleanAmount = order.totalBuyerAmount || order.numericBasePrice || 5000;
    const txRef = `FLW_SP_${order.escrowRef.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}`;
    const paymentId = `pay_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;

    // Create payment record bound to this order_id
    const paymentRecord = {
      id: paymentId,
      order_id: order.id,
      escrowRef: order.escrowRef,
      reference: txRef,
      provider,
      amount: cleanAmount,
      currency: 'NGN',
      status: 'PENDING',
      created_at: new Date().toISOString(),
    };

    await firestoreDb.savePaymentRecord(paymentRecord);

    // Call payment provider to generate checkout URL with Bank Transfer as standard option
    const checkoutResult = await flutterwaveService.createBankTransferCheckoutLink({
      txRef,
      amount: cleanAmount,
      customerPhone: order.buyerPhone,
      customerName: order.buyerName || 'Customer',
      title: `Floate SafePay • Order ${order.escrowRef}`,
      description: `Payment for ${order.item} (${order.escrowRef})`,
      meta: {
        order_id: order.id,
        escrowRef: order.escrowRef,
        vendorPhone: order.vendorPhone,
        buyerPhone: order.buyerPhone,
        paymentId,
      },
    });

    const checkoutUrl = checkoutResult.paymentLink || order.checkoutUrl;

    // Update order record with checkout details
    await firestoreDb.saveEscrowOrderDoc({
      ...order,
      checkoutUrl,
      payoutReference: txRef,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[Payments API] 💳 Payment initiated for Order ${order.escrowRef} (Ref: ${txRef}, Amount: ₦${cleanAmount.toLocaleString()})`);

    return res.json({
      success: true,
      paymentId,
      reference: txRef,
      provider,
      checkoutUrl,
      amount: cleanAmount,
      currency: 'NGN',
      orderId: order.id,
      escrowRef: order.escrowRef,
    });
  } catch (err: any) {
    console.error('[Payments API Exception]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to initiate payment.',
    });
  }
});

/**
 * POST /payments/webhook/flutterwave
 * Flutterwave Webhook Handler with HMAC verif-hash validation & atomic idempotency
 */
paymentsRouter.post('/webhook/flutterwave', async (req: Request, res: Response) => {
  try {
    const signature = (
      req.headers['verif-hash'] ||
      req.headers['verif_hash'] ||
      req.headers['x-flutterwave-signature']
    ) as string;

    if (!signature || !flutterwaveService.verifyWebhookSecret(signature)) {
      console.warn('[Flutterwave Webhook] ⚠️ Unauthorized webhook request rejected: signature mismatch.');
      return res.status(401).json({ error: 'Unauthorized: Invalid signature' });
    }

    const payload = req.body || {};
    const event = (payload?.event || payload?.['event.type'] || '').toLowerCase();
    const data = payload?.data || payload;

    const txRef = (
      data?.tx_ref ||
      data?.txRef ||
      data?.reference ||
      payload?.tx_ref ||
      data?.meta?.txRef ||
      data?.meta?.escrowRef ||
      ''
    ).trim();

    const status = (data?.status || payload?.status || '').toLowerCase();
    const amountPaid = Number(data?.amount || data?.charged_amount || payload?.amount || 0);

    console.log(`[Payments Webhook Verified] Event: ${event}, Status: ${status}, Ref: ${txRef}, Amount: ₦${amountPaid.toLocaleString()}`);

    const isSuccessful =
      status === 'successful' ||
      status === 'completed' ||
      event === 'charge.completed' ||
      event === 'transfer.completed';

    if (!isSuccessful) {
      return res.status(200).json({ status: 'ignored', message: `Webhook event ${event} ignored` });
    }

    if (!txRef) {
      return res.status(400).json({ error: 'Missing tx_ref in webhook payload' });
    }

    // Atomic idempotency claim
    const atomicClaim = await firestoreDb.claimWebhookEventAtomic(txRef, {
      eventId: String(payload?.id || data?.id || ''),
      transactionId: data?.id,
      amount: amountPaid,
      status,
      event,
    });

    if (atomicClaim.alreadyProcessed || !atomicClaim.success) {
      console.log(`[Payments Webhook Idempotency] Duplicate webhook ignored for txRef: ${txRef}`);
      return res.status(200).json({ status: 'success', message: 'Webhook already processed' });
    }

    // Resolve associated order
    const lookupRef = (data?.meta?.escrowRef || (txRef.startsWith('FLT-SP-') ? txRef : '') || txRef).trim();
    let order = await firestoreDb.getEscrowOrderDoc(lookupRef);
    if (!order && !lookupRef.startsWith('FLT-SP-')) {
      order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${lookupRef.replace(/^(safepay_|FLW_SP_|FLW-SP-)/i, '').toUpperCase()}`);
    }

    if (order) {
      console.log(`[Payments Webhook] 🔒 Order ${order.escrowRef} confirmed as PAID via Flutterwave Webhook`);

      // Confirm SafePay escrow payment and dispatch delivery code to vendor
      await confirmSafePayEscrowPaymentForOrder(order);

      // Invalidate single-use auth tokens tied to this order
      await whatsappTokenService.invalidateOrderTokens(order.id);

      return res.json({
        status: 'success',
        message: 'Payment processed and order status updated to PAID',
        orderId: order.id,
        escrowRef: order.escrowRef,
      });
    }

    return res.json({ status: 'received', message: 'Webhook processed' });
  } catch (err: any) {
    console.error('[Flutterwave Webhook Error]:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * POST /payments/webhook/paystack
 * Paystack Webhook Handler with x-paystack-signature HMAC-SHA512 verification
 */
paymentsRouter.post('/webhook/paystack', async (req: Request, res: Response) => {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY || '';
    const signature = req.headers['x-paystack-signature'] as string;

    if (paystackSecret && signature) {
      const hash = crypto.createHmac('sha512', paystackSecret).update(JSON.stringify(req.body)).digest('hex');
      if (hash !== signature) {
        return res.status(401).json({ error: 'Invalid Paystack signature' });
      }
    }

    const payload = req.body || {};
    const event = payload?.event;
    const data = payload?.data;

    if (event === 'charge.success' && data?.reference) {
      const txRef = data.reference;
      let order = await firestoreDb.getEscrowOrderDoc(txRef);
      if (order) {
        await confirmSafePayEscrowPaymentForOrder(order);
        await whatsappTokenService.invalidateOrderTokens(order.id);
        return res.json({ status: 'success', message: 'Paystack payment confirmed' });
      }
    }

    return res.json({ status: 'received' });
  } catch (err: any) {
    console.error('[Paystack Webhook Error]:', err);
    return res.status(500).json({ error: 'Paystack webhook processing failed' });
  }
});
