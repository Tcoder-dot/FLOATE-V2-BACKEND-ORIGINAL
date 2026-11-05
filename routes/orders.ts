/**
 * Order Sync & Management Routes
 * Handles order detail fetching with strict authorization scoping,
 * status validation, and order context creation.
 */

import { Router, Request, Response } from 'express';
import { firestoreDb } from '../bot/services/firestoreService.js';
import { sessionCookieMiddleware } from '../middleware/auth.js';

export const ordersRouter = Router();

/**
 * GET /orders/:id
 * Fetches order details with strict authorization scoping
 */
ordersRouter.get(['/:id', '/detail/:id'], sessionCookieMiddleware, async (req: Request, res: Response) => {
  try {
    const orderId = req.params.id;
    if (!orderId) {
      return res.status(400).json({ success: false, error: 'Order ID is required' });
    }

    let order = await firestoreDb.getEscrowOrderDoc(orderId);

    // Fallback prefix lookup if order ID format varies
    if (!order && !orderId.startsWith('FLT-SP-')) {
      order = await firestoreDb.getEscrowOrderDoc(`FLT-SP-${orderId.toUpperCase()}`);
    }

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or link has expired.',
      });
    }

    // Check order expiration
    if ((order.status as string) === 'EXPIRED') {
      return res.status(403).json({
        success: false,
        status: 'EXPIRED',
        error: 'This order link has expired. Please ask the vendor for a new order link on WhatsApp.',
      });
    }

    if (order.status === 'CANCELLED') {
      return res.status(403).json({
        success: false,
        status: 'CANCELLED',
        error: 'This order has been cancelled.',
      });
    }

    // Authorization scoping check:
    // Requester must match buyer, vendor, or have token orderId context matching this order
    const authenticatedUser = req.user;
    if (authenticatedUser) {
      const isBuyer = authenticatedUser.id === order.buyerPhone || authenticatedUser.phone === order.buyerPhone;
      const isVendor =
        authenticatedUser.id === order.vendorPhone ||
        authenticatedUser.vendorId === order.vendorPhone ||
        authenticatedUser.phone === order.vendorPhone;
      const isOrderTokenSession = authenticatedUser.orderId === order.id || authenticatedUser.orderId === order.escrowRef;

      if (!isBuyer && !isVendor && !isOrderTokenSession && authenticatedUser.role !== 'admin') {
        console.warn(`[Orders API Security Alert] User ${authenticatedUser.id} attempted unauthorized access to Order ${order.id}`);
        return res.status(403).json({
          success: false,
          error: 'Forbidden: You are not authorized to view this order.',
        });
      }
    }

    // Fetch vendor profile
    const vendorPhone = order.vendorPhone;
    const vendorMerchant = vendorPhone ? await firestoreDb.getMerchant(vendorPhone) : null;

    const formattedOrder = {
      id: order.id || order.escrowRef,
      order_id: order.id || order.escrowRef,
      escrowRef: order.escrowRef || order.id,
      vendor_id: vendorPhone || 'vendor_store',
      vendorId: vendorPhone || 'vendor_store',
      customer_id: order.buyerPhone,
      customerId: order.buyerPhone,
      buyerPhone: order.buyerPhone,
      buyerName: order.buyerName || 'Customer',
      vendorPhone: order.vendorPhone,
      vendorName: order.vendorName || vendorMerchant?.businessName || 'Verified Merchant',
      item: order.item || 'Merchandise',
      items: [
        {
          id: `item_${order.id}_1`,
          order_id: order.id,
          product_id: `prod_${order.id}`,
          name: order.item || 'Merchandise',
          qty: 1,
          price: order.numericBasePrice || 5000,
        },
      ],
      total_amount: order.numericBasePrice || 5000,
      totalAmount: order.numericBasePrice || 5000,
      buyerFeeAmount: order.buyerFeeAmount || 0,
      totalBuyerAmount: order.totalBuyerAmount || order.numericBasePrice || 5000,
      currency: 'NGN',
      status: order.status, // 'PENDING_PAYMENT' | 'PAID' | 'IN_ESCROW' | 'COMPLETED' | 'EXPIRED'
      checkoutUrl: order.checkoutUrl || null,
      deliveryCode: order.deliveryCode || null,
      created_at: order.createdAt,
      expires_at: (order as any).expiresAt || new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      vendor: {
        id: vendorPhone,
        store_name: vendorMerchant?.businessName || order.vendorName || 'Verified Merchant',
        phone: vendorPhone,
        city: vendorMerchant?.city || 'Nigeria',
        isVerified: vendorMerchant?.isVerified === true || vendorMerchant?.verifiedStatus === 'YES',
      },
      customer: {
        id: order.buyerPhone,
        name: order.buyerName || 'Customer',
        phone: order.buyerPhone,
      },
    };

    return res.json({
      success: true,
      order: formattedOrder,
    });
  } catch (err: any) {
    console.error('[Orders API Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve order context.',
    });
  }
});

/**
 * GET /orders/vendor/:vendorId
 * Returns orders for a specific vendor
 */
ordersRouter.get('/vendor/:vendorId', sessionCookieMiddleware, async (req: Request, res: Response) => {
  try {
    const vendorId = req.params.vendorId;
    if (!vendorId) {
      return res.status(400).json({ success: false, error: 'vendorId is required' });
    }

    const orders = await firestoreDb.getEscrowOrdersForVendor(vendorId);

    return res.json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (err: any) {
    console.error('[Orders Vendor List Error]:', err);
    return res.status(500).json({ success: false, error: 'Failed to retrieve vendor orders.' });
  }
});
