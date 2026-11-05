import sharp from 'sharp';
import {
  type ReceiptCardProps,
  type ViralShareCardProps,
  generateReceiptCardSvg,
  generateDeliverySuccessSvg,
  generateViralShareCardSvg,
  generateViralShareCard,
  renderSvgToPng as renderSvgToPngUtil,
  escapeXml,
  formatAmount,
  getNairaVectorSvg,
} from '../utils/generateReceiptCard.js';

export type { ReceiptCardProps, ViralShareCardProps };
export {
  generateReceiptCardSvg,
  generateDeliverySuccessSvg,
  generateViralShareCardSvg,
  generateViralShareCard,
  escapeXml,
  formatAmount,
  getNairaVectorSvg,
};

export interface SafePayCardData {
  escrowRef: string;
  item: string;
  price: string;
  numericPrice?: number;
  buyerName: string;
  buyerPhone?: string;
  vendorName: string;
  vendorPhone?: string;
  buyerFeePercent?: number;
  buyerFeeAmount?: number;
  totalBuyerAmount?: number;
  vendorFeePercent?: number;
  vendorFeeAmount?: number;
  netVendorPayout?: number;
  vendorCoversBuyerFee?: boolean;
  deliveryCode?: string;
  status?: string;
  date?: string;
  theme?: 'purple' | 'emerald';
}

export async function renderSvgToPng(svg: string, width = 600, height = 780): Promise<Buffer> {
  return await renderSvgToPngUtil(svg, width, height);
}

/**
 * Generates SafePay Escrow Receipt Card SVG with vector Naira glyphs
 * (100% immune to missing system fonts / tofu square boxes on Render/Cloud Run/Linux).
 */
export function generateSafePayReceiptSvg(data: SafePayCardData): string {
  return generateReceiptCardSvg({
    amount: data.numericPrice || data.price,
    currency: '₦',
    orderRef: data.escrowRef,
    vendorName: data.vendorName,
    buyerName: data.buyerName,
    item: data.item,
    releaseCode: data.deliveryCode,
    status: data.status || 'SafePay Escrow Active',
    date: data.date,
    buyerFee: data.buyerFeeAmount,
    totalPaid: data.totalBuyerAmount,
    theme: data.theme || 'purple',
  });
}

/**
 * Generates SafePay Deal Completion & Delivery Success SVG.
 */
export function generateSafePaySuccessSvg(data: SafePayCardData): string {
  return generateDeliverySuccessSvg({
    amount: data.numericPrice || data.price,
    currency: '₦',
    orderRef: data.escrowRef,
    vendorName: data.vendorName,
    buyerName: data.buyerName,
    item: data.item,
    releaseCode: data.deliveryCode || 'FLT-0000',
    date: data.date,
    theme: data.theme || 'purple',
  });
}
