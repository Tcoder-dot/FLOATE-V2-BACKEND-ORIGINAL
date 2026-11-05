import sharp from 'sharp';
import { FLOATE_LOGO_BASE64 } from '../assets/floateLogo.js';

export interface ReceiptCardProps {
  amount: string | number;
  currency?: string;
  orderRef: string;
  vendorName: string;
  buyerName?: string;
  item?: string;
  releaseCode?: string;
  status?: string;
  date?: string;
  location?: string;
  buyerFee?: string | number;
  totalPaid?: string | number;
  theme?: 'purple' | 'emerald';
}

/**
 * Sanitizes text to strictly eliminate emojis, surrogate pairs, and unrenderable unicode
 * so that Linux renderers (librsvg / fontconfig / sharp) never produce tofu boxes.
 */
export function sanitizeCardText(text: string | number | undefined | null): string {
  if (text === undefined || text === null) return '';
  let str = String(text);
  // Strip all emojis, pictographs, symbols, variation selectors, surrogate pairs
  str = str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}\u{FE00}-\u{FE0F}\u{1F000}-\u{1F02F}\u{200D}\u{200B}\u{2028}\u{2029}]/gu, '');
  // Normalize smart quotes and dashes to plain ASCII
  str = str.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[—–]/g, '-');
  // Strip any remaining non-printable or unsupported unicode characters outside basic Latin & symbols
  str = str.replace(/[^\x20-\x7E\u00A0-\u00FF•₦]/g, '');
  return str.trim();
}

/**
 * Escapes XML/SVG special characters to prevent markup injection or rendering crashes.
 */
export function escapeXml(unsafe: string | number | undefined | null): string {
  if (unsafe === undefined || unsafe === null) return '';
  const str = sanitizeCardText(unsafe);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Cleanly formats numeric amounts with thousand commas (e.g. 45000 -> "45,000")
 */
export function formatAmount(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '0';
  if (typeof val === 'number') {
    return val.toLocaleString('en-NG');
  }
  const clean = val.toString().replace(/[^\d.]/g, '');
  const num = parseFloat(clean);
  return isNaN(num) ? val.toString().replace(/[₦NGN\s]/g, '') : num.toLocaleString('en-NG');
}

/**
 * Vector Naira (₦) Glyph path generator.
 * Renders the Naira symbol as crisp vector paths to eliminate missing font/tofu issues.
 */
export function getNairaVectorSvg(x: number, y: number, size = 20, color = '#ffffff'): string {
  const scale = size / 24;
  return `<g transform="translate(${x}, ${y - size * 0.85}) scale(${scale})" fill="${color}">
    <path d="M4 20 L4 4 L7 4 L17 17 L17 4 L20 4 L20 20 L17 20 L7 7 L7 20 Z" />
    <rect x="2" y="8.5" width="20" height="2" rx="0.5" />
    <rect x="2" y="13.5" width="20" height="2" rx="0.5" />
  </g>`;
}

/**
 * Common SVG Font Styles & Patterns
 */
function getSvgStylesAndDefs(): string {
  return `
    <style>
      text {
        font-family: DejaVu Sans, Liberation Sans, Arial, Helvetica, sans-serif;
      }
      .mono-text {
        font-family: DejaVu Sans Mono, Liberation Mono, Courier New, monospace;
      }
    </style>
    <pattern id="cardDotGrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.2" fill="#7e22ce" fill-opacity="0.08" />
      <circle cx="14" cy="14" r="1.2" fill="#581c87" fill-opacity="0.08" />
    </pattern>
  `;
}

/**
 * Clean Official Floate Logo Image (Embedded Base64 Data URI)
 */
function getFloateLogoSvg(x: number, y: number): string {
  return `
    <g transform="translate(${x}, ${y})">
      <image href="${FLOATE_LOGO_BASE64}" xlink:href="${FLOATE_LOGO_BASE64}" x="0" y="0" width="46" height="46" preserveAspectRatio="xMidYMid meet" />
    </g>
  `;
}

/**
 * 1. BUYER ESCROW RECEIPT (VisualAssetGallery Design - Clean White Canvas, Solid Purple & Black Panels, Zero Emojis)
 */
export function generateReceiptCardSvg(props: ReceiptCardProps): string {
  const amountStr = formatAmount(props.amount);
  const currency = props.currency || '₦';
  const isNaira = currency === '₦' || currency.toUpperCase() === 'NGN';
  const orderRef = escapeXml(props.orderRef || 'FL-89234-NG');
  const vendorName = escapeXml(props.vendorName || 'Chinedu Luxury Footwear');
  const buyerName = escapeXml(props.buyerName || 'Verified Customer');
  const item = escapeXml(props.item || 'Merchandise');
  const location = escapeXml(props.location || 'Main Market, Onitsha');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    ${getSvgStylesAndDefs()}
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#3b0764" flood-opacity="0.12"/>
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.05"/>
    </filter>
  </defs>

  <!-- Background Base Canvas -->
  <rect width="600" height="780" fill="#f8fafc"/>

  <!-- Main Card Container (Clean White with Purple Border) -->
  <rect x="28" y="28" width="544" height="724" rx="28" fill="#ffffff" stroke="#e9d5ff" stroke-width="2.5" filter="url(#cardShadow)"/>

  <!-- Geometric Watermark Fill Inside Card -->
  <rect x="28" y="28" width="544" height="724" rx="28" fill="url(#cardDotGrid)" pointer-events="none"/>

  <!-- Decorative Corner Rings -->
  <circle cx="530" cy="50" r="70" fill="none" stroke="#f3e8ff" stroke-width="3" opacity="0.6"/>
  <circle cx="70" cy="710" r="70" fill="none" stroke="#f3e8ff" stroke-width="3" opacity="0.6"/>

  <!-- Header with Official Logo & Status Badge -->
  <g transform="translate(60, 60)">
    ${getFloateLogoSvg(0, 0)}
    <text x="56" y="20" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="16" font-weight="900" fill="#3b0764" letter-spacing="1">FLOATE SAFEPAY</text>
    <text x="56" y="38" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="800" fill="#7e22ce" letter-spacing="1.5">BUYER ESCROW RECEIPT</text>

    <!-- Top Right Status Badge -->
    <g transform="translate(350, 6)">
      <rect width="130" height="32" rx="16" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5"/>
      <text x="65" y="20.5" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="10.5" font-weight="900" fill="#065f46" text-anchor="middle" letter-spacing="0.5">FUNDS SECURED</text>
    </g>
  </g>

  <!-- Divider Line -->
  <line x1="60" y1="122" x2="540" y2="122" stroke="#f3e8ff" stroke-width="2"/>

  <!-- Central Solid Purple Amount Box -->
  <g transform="translate(60, 140)">
    <rect width="480" height="116" rx="20" fill="#581c87" stroke="#3b0764" stroke-width="2"/>
    <text x="240" y="32" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="800" fill="#e9d5ff" text-anchor="middle" letter-spacing="1.5">TOTAL HELD IN SAFEPAY ESCROW</text>
    
    <!-- Hero Price Text & Vector Naira -->
    <g transform="translate(240, 78)">
      ${isNaira ? getNairaVectorSvg(-110, 0, 36, '#ffffff') : ''}
      <text x="${isNaira ? -68 : 0}" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="40" font-weight="900" fill="#ffffff" text-anchor="${isNaira ? 'start' : 'middle'}" letter-spacing="-1">${isNaira ? '' : currency}${amountStr}</text>
    </g>

    <text x="240" y="102" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="700" fill="#d8b4fe" text-anchor="middle">Order Ref: <tspan fill="#ffffff" font-weight="900">${orderRef}</tspan></text>
  </g>

  <!-- Transaction Specs (Solid Off-Black Panel) -->
  <g transform="translate(60, 276)">
    <rect width="480" height="210" rx="20" fill="#020617" stroke="#1e293b" stroke-width="1.5"/>
    
    <!-- Row 1: Item -->
    <g transform="translate(24, 34)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="0.5">ITEM</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="end">${item}</text>
    </g>

    <line x1="24" y1="52" x2="456" y2="52" stroke="#1e293b" stroke-width="1"/>

    <!-- Row 2: Seller -->
    <g transform="translate(24, 82)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="0.5">SELLER</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#d8b4fe" text-anchor="end">${vendorName}</text>
    </g>

    <line x1="24" y1="100" x2="456" y2="100" stroke="#1e293b" stroke-width="1"/>

    <!-- Row 3: Market Depot -->
    <g transform="translate(24, 130)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="0.5">MARKET DEPOT</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="13.5" font-weight="700" fill="#f1f5f9" text-anchor="end">${location}</text>
    </g>

    <line x1="24" y1="148" x2="456" y2="148" stroke="#1e293b" stroke-width="1"/>

    <!-- Row 4: Buyer -->
    <g transform="translate(24, 178)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8" letter-spacing="0.5">BUYER</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="13.5" font-weight="700" fill="#f1f5f9" text-anchor="end">${buyerName}</text>
    </g>
  </g>

  <!-- Protection Notice Box (Solid White with Purple Border) -->
  <g transform="translate(60, 506)">
    <rect width="480" height="96" rx="18" fill="#faf5ff" stroke="#ddd6fe" stroke-width="2"/>
    <text x="240" y="28" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="13" font-weight="900" fill="#4c1d95" text-anchor="middle" letter-spacing="0.5">100% ESCROW PROTECTION</text>
    <text x="240" y="52" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11.5" font-weight="600" fill="#581c87" text-anchor="middle">The seller will only receive funds after you physically inspect</text>
    <text x="240" y="70" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11.5" font-weight="600" fill="#581c87" text-anchor="middle">the item and submit your release code upon delivery.</text>
  </g>

  <!-- Bottom Bar: Verified Escrow Guarantee (No QR Code) -->
  <g transform="translate(60, 622)">
    <rect width="480" height="54" rx="16" fill="#faf5ff" stroke="#ddd6fe" stroke-width="1.5"/>
    <g transform="translate(20, 22)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="900" fill="#581c87" letter-spacing="0.5">100% ESCROW PROTECTION</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#7e22ce">SECURED BY FLUTTERWAVE GATEWAY</text>
    </g>

    <!-- Right-Side Trademark -->
    <g transform="translate(460, 22)">
      <text x="0" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="900" fill="#1e293b" text-anchor="end">FLOATE SAFEPAY</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9.5" font-weight="800" fill="#6b21a8" text-anchor="end">floate.xyz</text>
    </g>
  </g>

  <!-- Footer Bottom Bar -->
  <line x1="60" y1="694" x2="540" y2="694" stroke="#f3e8ff" stroke-width="1.5"/>
  <text x="300" y="718" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">OFFICIAL SAFEPAY RECEIPT • INSTANT VERIFICATION AT FLOATE.XYZ</text>
</svg>`;
}

/**
 * 2. VENDOR ORDER & DISPATCH SLIP (Includes Secret Delivery PIN, Solid Purple & Black, Zero Emojis)
 */
export function generateVendorSlipSvg(props: ReceiptCardProps): string {
  const amountStr = formatAmount(props.amount);
  const currency = props.currency || '₦';
  const isNaira = currency === '₦' || currency.toUpperCase() === 'NGN';
  const orderRef = escapeXml(props.orderRef || 'FL-89234-NG');
  const vendorName = escapeXml(props.vendorName || 'Chinedu Luxury Footwear');
  const buyerName = escapeXml(props.buyerName || 'Verified Customer');
  const item = escapeXml(props.item || 'Merchandise');
  const location = escapeXml(props.location || 'Main Market, Onitsha');
  const deliveryCode = escapeXml(props.releaseCode || '4912');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    ${getSvgStylesAndDefs()}
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#3b0764" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="600" height="780" fill="#f8fafc"/>
  <rect x="28" y="28" width="544" height="724" rx="28" fill="#ffffff" stroke="#e9d5ff" stroke-width="2.5" filter="url(#cardShadow)"/>
  <rect x="28" y="28" width="544" height="724" rx="28" fill="url(#cardDotGrid)" pointer-events="none"/>

  <!-- Header -->
  <g transform="translate(60, 60)">
    ${getFloateLogoSvg(0, 0)}
    <text x="56" y="20" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="16" font-weight="900" fill="#3b0764" letter-spacing="1">FLOATE DISPATCH SLIP</text>
    <text x="56" y="38" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="800" fill="#7e22ce" letter-spacing="1.5">MERCHANT PAYOUT GUARANTEE</text>

    <g transform="translate(350, 6)">
      <rect width="130" height="32" rx="16" fill="#faf5ff" stroke="#d8b4fe" stroke-width="1.5"/>
      <text x="65" y="20.5" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="10.5" font-weight="900" fill="#581c87" text-anchor="middle" letter-spacing="0.5">PAYOUT LOCKED</text>
    </g>
  </g>

  <line x1="60" y1="122" x2="540" y2="122" stroke="#f3e8ff" stroke-width="2"/>

  <!-- Solid Purple Amount Box -->
  <g transform="translate(60, 140)">
    <rect width="480" height="116" rx="20" fill="#581c87" stroke="#3b0764" stroke-width="2"/>
    <text x="240" y="32" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="800" fill="#e9d5ff" text-anchor="middle" letter-spacing="1.5">GUARANTEED SETTLEMENT AMOUNT</text>
    
    <g transform="translate(240, 78)">
      ${isNaira ? getNairaVectorSvg(-110, 0, 36, '#ffffff') : ''}
      <text x="${isNaira ? -68 : 0}" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="40" font-weight="900" fill="#ffffff" text-anchor="${isNaira ? 'start' : 'middle'}" letter-spacing="-1">${isNaira ? '' : currency}${amountStr}</text>
    </g>

    <text x="240" y="102" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="700" fill="#d8b4fe" text-anchor="middle">Order ID: <tspan fill="#ffffff" font-weight="900">${orderRef}</tspan></text>
  </g>

  <!-- Details (Solid Off-Black Panel) -->
  <g transform="translate(60, 276)">
    <rect width="480" height="160" rx="20" fill="#020617" stroke="#1e293b" stroke-width="1.5"/>
    
    <g transform="translate(24, 34)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">PRODUCT TO DISPATCH</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="end">${item}</text>
    </g>

    <line x1="24" y1="54" x2="456" y2="54" stroke="#1e293b" stroke-width="1"/>

    <g transform="translate(24, 84)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">RECIPIENT (BUYER)</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="end">${buyerName}</text>
    </g>

    <line x1="24" y1="104" x2="456" y2="104" stroke="#1e293b" stroke-width="1"/>

    <g transform="translate(24, 134)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">DISPATCH DEPOT</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="13.5" font-weight="700" fill="#f1f5f9" text-anchor="end">${location}</text>
    </g>
  </g>

  <!-- Vendor Secret Delivery PIN Box -->
  <g transform="translate(60, 456)">
    <rect width="480" height="144" rx="20" fill="#faf5ff" stroke="#7e22ce" stroke-width="2.5"/>
    <text x="240" y="30" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11.5" font-weight="900" fill="#4c1d95" text-anchor="middle" letter-spacing="1">DELIVERY CONFIRMATION PIN</text>
    
    <text x="240" y="78" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="38" font-weight="900" fill="#3b0764" text-anchor="middle" letter-spacing="12">${deliveryCode}</text>
    
    <text x="240" y="112" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="600" fill="#581c87" text-anchor="middle">Write this PIN on the parcel. Once buyer confirms receipt on WhatsApp,</text>
    <text x="240" y="128" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="600" fill="#581c87" text-anchor="middle">settlement will credit your bank account immediately.</text>
  </g>

  <!-- Bottom Bar: Verified Merchant Guarantee (No QR Code) -->
  <g transform="translate(60, 622)">
    <rect width="480" height="54" rx="16" fill="#faf5ff" stroke="#ddd6fe" stroke-width="1.5"/>
    <g transform="translate(20, 22)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="900" fill="#581c87" letter-spacing="0.5">GUARANTEED MERCHANT SETTLEMENT</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#7e22ce">SECURED BY FLUTTERWAVE GATEWAY</text>
    </g>

    <g transform="translate(460, 22)">
      <text x="0" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="900" fill="#1e293b" text-anchor="end">FLOATE SAFEPAY</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9.5" font-weight="800" fill="#6b21a8" text-anchor="end">floate.xyz</text>
    </g>
  </g>

  <line x1="60" y1="694" x2="540" y2="694" stroke="#f3e8ff" stroke-width="1.5"/>
  <text x="300" y="718" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">OFFICIAL DISPATCH SLIP • SECURED SETTLEMENT PIPELINE</text>
</svg>`;
}

/**
 * 3. DELIVERY VERIFIED & APPROVED SUCCESS CARD (VisualAssetGallery Design - Zero Emojis)
 */
export function generateDeliverySuccessSvg(props: ReceiptCardProps): string {
  const amountStr = formatAmount(props.amount);
  const currency = props.currency || '₦';
  const isNaira = currency === '₦' || currency.toUpperCase() === 'NGN';
  const orderRef = escapeXml(props.orderRef || 'FL-89234-NG');
  const vendorName = escapeXml(props.vendorName || 'Chinedu Luxury Footwear');
  const buyerName = escapeXml(props.buyerName || 'Verified Customer');
  const item = escapeXml(props.item || 'Merchandise');
  const releaseCode = escapeXml(props.releaseCode || '4912');

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    ${getSvgStylesAndDefs()}
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="20" flood-color="#064e3b" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="600" height="780" fill="#f8fafc"/>
  <rect x="28" y="28" width="544" height="724" rx="28" fill="#ffffff" stroke="#a7f3d0" stroke-width="2.5" filter="url(#cardShadow)"/>
  <rect x="28" y="28" width="544" height="724" rx="28" fill="url(#cardDotGrid)" pointer-events="none"/>

  <!-- Header -->
  <g transform="translate(60, 60)">
    ${getFloateLogoSvg(0, 0)}
    <text x="56" y="20" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="16" font-weight="900" fill="#064e3b" letter-spacing="1">FLOATE SAFEPAY</text>
    <text x="56" y="38" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="800" fill="#059669" letter-spacing="1.5">DELIVERY VERIFIED &amp; APPROVED</text>

    <g transform="translate(350, 6)">
      <rect width="130" height="32" rx="16" fill="#ecfdf5" stroke="#6ee7b7" stroke-width="1.5"/>
      <text x="65" y="20.5" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="10.5" font-weight="900" fill="#065f46" text-anchor="middle" letter-spacing="0.5">FUNDS RELEASED</text>
    </g>
  </g>

  <line x1="60" y1="122" x2="540" y2="122" stroke="#d1fae5" stroke-width="2"/>

  <!-- Central Solid Emerald Amount Box -->
  <g transform="translate(60, 140)">
    <rect width="480" height="116" rx="20" fill="#064e3b" stroke="#022c22" stroke-width="2"/>
    <text x="240" y="32" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="800" fill="#a7f3d0" text-anchor="middle" letter-spacing="1.5">SETTLEMENT DISBURSED TO SELLER</text>
    
    <g transform="translate(240, 78)">
      ${isNaira ? getNairaVectorSvg(-110, 0, 36, '#ffffff') : ''}
      <text x="${isNaira ? -68 : 0}" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="40" font-weight="900" fill="#ffffff" text-anchor="${isNaira ? 'start' : 'middle'}" letter-spacing="-1">${isNaira ? '' : currency}${amountStr}</text>
    </g>

    <text x="240" y="102" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="700" fill="#6ee7b7" text-anchor="middle">Order Ref: <tspan fill="#ffffff" font-weight="900">${orderRef}</tspan></text>
  </g>

  <!-- Transaction Specs (Solid Off-Black Panel) -->
  <g transform="translate(60, 276)">
    <rect width="480" height="200" rx="20" fill="#020617" stroke="#1e293b" stroke-width="1.5"/>
    
    <g transform="translate(24, 34)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">DELIVERED ITEM</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#ffffff" text-anchor="end">${item}</text>
    </g>

    <line x1="24" y1="52" x2="456" y2="52" stroke="#1e293b" stroke-width="1"/>

    <g transform="translate(24, 82)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">SELLER (PAYOUT RECIPIENT)</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14" font-weight="800" fill="#34d399" text-anchor="end">${vendorName}</text>
    </g>

    <line x1="24" y1="100" x2="456" y2="100" stroke="#1e293b" stroke-width="1"/>

    <g transform="translate(24, 130)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">BUYER</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="13.5" font-weight="700" fill="#f1f5f9" text-anchor="end">${buyerName}</text>
    </g>

    <line x1="24" y1="148" x2="456" y2="148" stroke="#1e293b" stroke-width="1"/>

    <g transform="translate(24, 176)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="700" fill="#94a3b8">DELIVERY PIN CONFIRMED</text>
      <text x="432" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="14" font-weight="900" fill="#6ee7b7" text-anchor="end">${releaseCode}</text>
    </g>
  </g>

  <!-- Zero-Risk Confirmation Notice -->
  <g transform="translate(60, 496)">
    <rect width="480" height="96" rx="18" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="2"/>
    <text x="240" y="28" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="13" font-weight="900" fill="#065f46" text-anchor="middle" letter-spacing="0.5">100% ESCROW SETTLEMENT COMPLETE</text>
    <text x="240" y="52" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11.5" font-weight="600" fill="#047857" text-anchor="middle">Buyer has inspected the package and submitted the release PIN.</text>
    <text x="240" y="70" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11.5" font-weight="600" fill="#047857" text-anchor="middle">Settlement transferred directly to vendor bank account.</text>
  </g>

  <!-- Bottom Bar: Verified Delivery Confirmation (No QR Code) -->
  <g transform="translate(60, 622)">
    <rect width="480" height="54" rx="16" fill="#ecfdf5" stroke="#a7f3d0" stroke-width="1.5"/>
    <g transform="translate(20, 22)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="900" fill="#065f46" letter-spacing="0.5">FUNDS TRANSFERRED DIRECTLY TO SELLER</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#059669">SETTLEMENT PROCESSED VIA FLUTTERWAVE</text>
    </g>

    <g transform="translate(460, 22)">
      <text x="0" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="900" fill="#1e293b" text-anchor="end">FLOATE SAFEPAY</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9.5" font-weight="800" fill="#047857" text-anchor="end">floate.xyz</text>
    </g>
  </g>

  <line x1="60" y1="694" x2="540" y2="694" stroke="#d1fae5" stroke-width="1.5"/>
  <text x="300" y="718" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">OFFICIAL DISBURSEMENT RECEIPT • PROCESSED BY FLUTTERWAVE</text>
</svg>`;
}

export interface ViralShareCardProps extends ReceiptCardProps {
  location?: string;
  slogan?: string;
  badgeText?: string;
  cardType?: 'buyer_welcome' | 'merchant_card';
}

/**
 * 4. VIRAL SHAREABLE CARD (Matches Tab 3 / Tab 4 in VisualAssetGallery - Clean Solid Finish, Bold Capitalized Typography, Zero Emojis)
 */
export function generateViralShareCardSvg(props: ViralShareCardProps): string {
  const amountStr = formatAmount(props.amount);
  const currency = props.currency || '₦';
  const isNaira = currency === '₦' || currency.toUpperCase() === 'NGN';
  const orderRef = escapeXml(props.orderRef || 'FL-89234-NG');
  const vendorName = escapeXml(props.vendorName || 'CHINEDU LUXURY FOOTWEAR').toUpperCase();
  const buyerName = escapeXml(props.buyerName || 'EMEKA CHUKWU').toUpperCase();
  const item = escapeXml(props.item || 'Nike Air Jordan 4 Retro (Size 43)');
  const location = escapeXml(props.location || 'MAIN MARKET, ONITSHA').toUpperCase();
  const slogan = escapeXml(props.slogan || 'SHOPPING WITHOUT FEAR OF FAKE ALERT OR VENDOR STORY.').toUpperCase();
  const isMerchantCard = props.cardType === 'merchant_card';

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 600 780" width="600" height="780">
  <defs>
    ${getSvgStylesAndDefs()}
    <filter id="viralCardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="14" stdDeviation="22" flood-color="#3b0764" flood-opacity="0.14"/>
    </filter>
  </defs>

  <!-- Outer Base Canvas -->
  <rect width="600" height="780" fill="#f8fafc"/>

  <!-- Main Card Body (White with Purple Border) -->
  <rect x="28" y="28" width="544" height="724" rx="28" fill="#ffffff" stroke="#d8b4fe" stroke-width="2.5" filter="url(#viralCardShadow)"/>
  <rect x="28" y="28" width="544" height="724" rx="28" fill="url(#cardDotGrid)" pointer-events="none"/>

  <!-- Decorative Border Rings -->
  <circle cx="530" cy="50" r="70" fill="none" stroke="#f3e8ff" stroke-width="3" opacity="0.6"/>
  <circle cx="70" cy="710" r="70" fill="none" stroke="#f3e8ff" stroke-width="3" opacity="0.6"/>

  <!-- Header -->
  <g transform="translate(60, 60)">
    ${getFloateLogoSvg(0, 0)}
    <text x="56" y="20" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="16" font-weight="900" fill="#3b0764" letter-spacing="1">${isMerchantCard ? 'FLOATE VERIFIED' : 'SMART SHOPPER'}</text>
    <text x="56" y="38" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="800" fill="#7e22ce" letter-spacing="1.5">${isMerchantCard ? 'OFFICIAL STORE CARD' : 'FLOATE AFRICA INSIDER'}</text>

    <!-- Header Badge -->
    <g transform="translate(330, 6)">
      <rect width="150" height="32" rx="16" fill="${isMerchantCard ? '#581c87' : '#faf5ff'}" stroke="${isMerchantCard ? '#3b0764' : '#d8b4fe'}" stroke-width="1.5"/>
      <text x="75" y="20.5" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="10.5" font-weight="900" fill="${isMerchantCard ? '#ffffff' : '#581c87'}" text-anchor="middle" letter-spacing="0.8">${isMerchantCard ? 'VERIFIED SELLER' : 'SAFEPAY PROTECTED'}</text>
    </g>
  </g>

  <line x1="60" y1="122" x2="540" y2="122" stroke="#f3e8ff" stroke-width="2"/>

  <!-- Center Profile / Hero Panel: BOLD, CAPITALIZED, CENTERED (Solid Off-Black Panel) -->
  <g transform="translate(60, 140)">
    <rect width="480" height="250" rx="22" fill="#020617" stroke="#1e293b" stroke-width="2"/>
    
    <text x="240" y="38" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="11" font-weight="900" fill="#c084fc" text-anchor="middle" letter-spacing="2">${isMerchantCard ? 'OFFICIAL TRUSTED MERCHANT' : `${buyerName} IS SHOPPING WITH FLOATE`}</text>

    <!-- Main Big Title -->
    <text x="240" y="96" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${isMerchantCard ? vendorName : `"${slogan}"`}</text>
    
    <!-- Location or Deal Subtitle -->
    <text x="240" y="146" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="12" font-weight="800" fill="#e9d5ff" text-anchor="middle" letter-spacing="1">${location} • <tspan fill="#a855f7" font-weight="900">SAFEPAY ENABLED</tspan></text>

    <!-- Guarantee Badges Inside Black Panel -->
    <g transform="translate(240, 192)">
      <rect x="-175" y="-16" width="350" height="34" rx="17" fill="#581c87" stroke="#7e22ce" stroke-width="1.5"/>
      <text x="0" y="6" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="1">100% SCAM-PROOF • ESCROW SECURED</text>
    </g>
  </g>

  <!-- Deal & Item Showcase Box -->
  <g transform="translate(60, 412)">
    <rect width="480" height="186" rx="20" fill="#faf5ff" stroke="#ddd6fe" stroke-width="2"/>
    
    <g transform="translate(24, 34)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="800" fill="#6b21a8" letter-spacing="0.5">FEATURED PRODUCT</text>
      <text x="432" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="14.5" font-weight="900" fill="#1e1b4b" text-anchor="end">${item}</text>
    </g>

    <line x1="24" y1="54" x2="456" y2="54" stroke="#e9d5ff" stroke-width="1.5"/>

    <g transform="translate(24, 88)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="800" fill="#6b21a8" letter-spacing="0.5">AMOUNT SECURED IN ESCROW</text>
      <g transform="translate(432, 0)">
        ${isNaira ? getNairaVectorSvg(-80, 0, 18, '#581c87') : ''}
        <text x="0" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="17" font-weight="900" fill="#581c87" text-anchor="end">${isNaira ? '' : currency}${amountStr}</text>
      </g>
    </g>

    <line x1="24" y1="110" x2="456" y2="110" stroke="#e9d5ff" stroke-width="1.5"/>

    <g transform="translate(24, 144)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="800" fill="#6b21a8" letter-spacing="0.5">ESCROW ORDER REFERENCE</text>
      <text x="432" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="13.5" font-weight="900" fill="#1e1b4b" text-anchor="end">${orderRef}</text>
    </g>
  </g>

  <!-- Bottom Area: Clean Escrow Footer (No QR Code) -->
  <g transform="translate(60, 620)">
    <rect width="480" height="54" rx="16" fill="#faf5ff" stroke="#ddd6fe" stroke-width="1.5"/>
    <g transform="translate(20, 22)">
      <text x="0" y="0" font-family="DejaVu Sans, Liberation Sans, Arial, sans-serif" font-size="11" font-weight="900" fill="#581c87" letter-spacing="0.5">SHOP WITH 100% ESCROW PROTECTION</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#7e22ce">POWERED BY FLUTTERWAVE GATEWAY</text>
    </g>

    <!-- Right-Side Trademark -->
    <g transform="translate(460, 22)">
      <text x="0" y="0" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="10.5" font-weight="900" fill="#1e293b" text-anchor="end">FLOATE SAFEPAY</text>
      <text x="0" y="16" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9.5" font-weight="800" fill="#6b21a8" text-anchor="end">floate.xyz</text>
    </g>
  </g>

  <!-- Footer -->
  <line x1="60" y1="694" x2="540" y2="694" stroke="#f3e8ff" stroke-width="1.5"/>
  <text x="300" y="718" font-family="DejaVu Sans Mono, Liberation Mono, monospace" font-size="9" font-weight="700" fill="#64748b" text-anchor="middle">AFRICA'S CONVERSATIONAL ESCROW OPERATING SYSTEM • POWERED BY FLOATE</text>
</svg>`;
}

/**
 * Converts SVG to PNG buffer using sharp with precise scaling and compression.
 */
export async function renderSvgToPng(svg: string, width = 600, height = 780): Promise<Buffer> {
  return await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 95, compressionLevel: 8 })
    .toBuffer();
}

/**
 * High-level isolated helpers
 */
export async function generateReceiptCard(props: ReceiptCardProps): Promise<{ svg: string; buffer: Buffer }> {
  const svg = generateReceiptCardSvg(props);
  const buffer = await renderSvgToPng(svg, 600, 780);
  return { svg, buffer };
}

export async function generateVendorSlipCard(props: ReceiptCardProps): Promise<{ svg: string; buffer: Buffer }> {
  const svg = generateVendorSlipSvg(props);
  const buffer = await renderSvgToPng(svg, 600, 780);
  return { svg, buffer };
}

export async function generateDeliverySuccessCard(props: ReceiptCardProps): Promise<{ svg: string; buffer: Buffer }> {
  const svg = generateDeliverySuccessSvg(props);
  const buffer = await renderSvgToPng(svg, 600, 780);
  return { svg, buffer };
}

export async function generateViralShareCard(props: ViralShareCardProps): Promise<{ svg: string; buffer: Buffer }> {
  const svg = generateViralShareCardSvg(props);
  const buffer = await renderSvgToPng(svg, 600, 780);
  return { svg, buffer };
}
