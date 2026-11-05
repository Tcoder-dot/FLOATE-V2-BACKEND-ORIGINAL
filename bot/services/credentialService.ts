/**
 * Floate Credential Service
 * Generates and manages FIDs (Floate Identification IDs), verified credentials,
 * certificates, badge cards, flyers, and verification manifests per base-kit spec.
 */
import { getPublicSiteUrl, buildMerchantProfileUrl } from '../../config/siteUrls.js';

export interface FloateCredential {
  fid: string;
  merchantId: string;
  name: string;
  biz: string;
  loc: string;
  city: string;
  slug: string;
  verifiedOn: string;
  tier: 'basic' | 'plus';
  status: 'active' | 'revoked' | 'expired';
  checks: string[];
  photoUrl?: string;
  initials: string;
  verifyUrl: string;
  certificateUrl: string;
  badgeCardUrl: string;
  flyerUrl: string;
  squareBoostUrl: string;
}

// Map Nigerian markets/cities to 3-letter FID prefix
export const CITY_CODE_MAP: Record<string, string> = {
  onitsha: 'ONT',
  enugu: 'ENU',
  owerri: 'OWR',
  lagos: 'LOS',
  aba: 'ABA',
  kano: 'KAN',
  ibadan: 'IBA',
  abuja: 'ABJ',
  asaba: 'ASB',
  port_harcourt: 'PHC',
};

export function getCityCode(locationOrMarket: string): string {
  const norm = locationOrMarket.toLowerCase();
  for (const [key, code] of Object.entries(CITY_CODE_MAP)) {
    if (norm.includes(key)) {
      return code;
    }
  }
  return 'ONT'; // Default to Onitsha (Floate primary launch market)
}

export function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'FL';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function generateFid(locationOrMarket: string, sequenceNumber: number): string {
  const cityCode = getCityCode(locationOrMarket);
  const seqPadded = String(sequenceNumber).padStart(5, '0');
  return `FLT-${cityCode}-${seqPadded}`;
}

// Built-in verified sample merchants from base-kit
export const SAMPLE_CREDENTIALS: FloateCredential[] = [
  {
    fid: 'FLT-ONT-00142',
    merchantId: 'm-onitsha-chidi-001',
    name: 'Chidinma Okafor',
    biz: 'Chidi Fabrics & Lace',
    loc: 'Onitsha Main Market, Anambra',
    city: 'Onitsha',
    slug: 'chidi-fabrics',
    verifiedOn: '27 Oct 2026',
    tier: 'plus',
    status: 'active',
    checks: ['Real stall', 'Contact confirmed', 'Chat on WhatsApp', 'Physical audit passed'],
    photoUrl: '/brand/base-kit/samples/inputs/sample-merchant-photo.png',
    initials: 'CO',
    verifyUrl: 'https://floate.xyz/v/FLT-ONT-00142',
    certificateUrl: '/brand/base-kit/samples/FLT-ONT-00142-certificate.png',
    badgeCardUrl: '/brand/base-kit/samples/FLT-ONT-00142-badge-card.png',
    flyerUrl: '/brand/base-kit/templates/flyer-A5-blank-1748x2480.png',
    squareBoostUrl: '/brand/base-kit/templates/square-blank-1080.png',
  },
  {
    fid: 'FLT-ENU-00057',
    merchantId: 'm-enugu-ken-002',
    name: 'Emeka Nwankwo',
    biz: 'Kene Electronics & Accessories',
    loc: 'Ogbete Main Market, Enugu',
    city: 'Enugu',
    slug: 'kene-electronics',
    verifiedOn: '24 Oct 2026',
    tier: 'basic',
    status: 'active',
    checks: ['Real stall', 'Contact confirmed', 'Chat on WhatsApp'],
    initials: 'EN',
    verifyUrl: 'https://floate.xyz/v/FLT-ENU-00057',
    certificateUrl: '/brand/base-kit/samples/FLT-ENU-00057-certificate.png',
    badgeCardUrl: '/brand/base-kit/samples/FLT-ENU-00057-badge-card.png',
    flyerUrl: '/brand/base-kit/templates/flyer-A5-blank-1748x2480.png',
    squareBoostUrl: '/brand/base-kit/templates/square-blank-1080.png',
  },
  {
    fid: 'FLT-OWR-00089',
    merchantId: 'm-owerri-ngozi-003',
    name: 'Ngozi Eze',
    biz: 'Ngozi Provisions & Wholesale',
    loc: 'Relief Market, Owerri, Imo',
    city: 'Owerri',
    slug: 'ngozi-provisions',
    verifiedOn: '26 Oct 2026',
    tier: 'plus',
    status: 'active',
    checks: ['Real stall', 'Contact confirmed', 'Chat on WhatsApp', 'Founding Merchant'],
    initials: 'NE',
    verifyUrl: 'https://floate.xyz/v/FLT-OWR-00089',
    certificateUrl: '/brand/base-kit/samples/FLT-ONT-00142-certificate.png',
    badgeCardUrl: '/brand/base-kit/samples/FLT-ONT-00142-badge-card.png',
    flyerUrl: '/brand/base-kit/templates/flyer-A5-blank-1748x2480.png',
    squareBoostUrl: '/brand/base-kit/templates/square-blank-1080.png',
  },
  {
    fid: 'FLT-LOS-00219',
    merchantId: 'm-lagos-balogun-004',
    name: 'Alhaji Sani Balogun',
    biz: 'Balogun Fabrics & Silk',
    loc: 'Balogun Market, Lagos Island, Lagos',
    city: 'Lagos',
    slug: 'balogun-fabrics',
    verifiedOn: '28 Oct 2026',
    tier: 'plus',
    status: 'active',
    checks: ['Real stall', 'Contact confirmed', 'Chat on WhatsApp', 'Lagos Market Audit'],
    initials: 'SB',
    verifyUrl: 'https://floate.xyz/v/FLT-LOS-00219',
    certificateUrl: '/brand/base-kit/samples/FLT-ONT-00142-certificate.png',
    badgeCardUrl: '/brand/base-kit/samples/FLT-ONT-00142-badge-card.png',
    flyerUrl: '/brand/base-kit/templates/flyer-A5-blank-1748x2480.png',
    squareBoostUrl: '/brand/base-kit/templates/square-blank-1080.png',
  },
  {
    fid: 'FLT-ABA-00045',
    merchantId: 'm-aba-ariaria-005',
    name: 'Kalu Uche',
    biz: 'Ariaria Footwear & Leather Works',
    loc: 'Ariaria International Market, Aba, Abia',
    city: 'Aba',
    slug: 'ariaria-footwear',
    verifiedOn: '25 Oct 2026',
    tier: 'plus',
    status: 'active',
    checks: ['Real stall', 'Contact confirmed', 'Chat on WhatsApp', 'Factory & Stall Inspected'],
    initials: 'KU',
    verifyUrl: 'https://floate.xyz/v/FLT-ABA-00045',
    certificateUrl: '/brand/base-kit/samples/FLT-ONT-00142-certificate.png',
    badgeCardUrl: '/brand/base-kit/samples/FLT-ONT-00142-badge-card.png',
    flyerUrl: '/brand/base-kit/templates/flyer-A5-blank-1748x2480.png',
    squareBoostUrl: '/brand/base-kit/templates/square-blank-1080.png',
  },
  {
    fid: 'FLT-ABJ-00072',
    merchantId: 'm-abuja-wuse-006',
    name: 'Hajiya Fatima Bello',
    biz: 'Wuse Luxury Attire & Scents',
    loc: 'Wuse Modern Market, Abuja FCT',
    city: 'Abuja',
    slug: 'wuse-luxury',
    verifiedOn: '27 Oct 2026',
    tier: 'plus',
    status: 'active',
    checks: ['Real stall', 'Contact confirmed', 'Chat on WhatsApp', 'Abuja Verified Vendor'],
    initials: 'FB',
    verifyUrl: 'https://floate.xyz/v/FLT-ABJ-00072',
    certificateUrl: '/brand/base-kit/samples/FLT-ONT-00142-certificate.png',
    badgeCardUrl: '/brand/base-kit/samples/FLT-ONT-00142-badge-card.png',
    flyerUrl: '/brand/base-kit/templates/flyer-A5-blank-1748x2480.png',
    squareBoostUrl: '/brand/base-kit/templates/square-blank-1080.png',
  }
];

export function findCredentialByFid(fid: string): FloateCredential | undefined {
  const clean = fid.trim().toUpperCase();
  return SAMPLE_CREDENTIALS.find(c => c.fid === clean);
}

export function resolveCityFromLocation(loc: string): string {
  const norm = loc.toLowerCase();
  if (norm.includes('lagos')) return 'Lagos';
  if (norm.includes('onitsha')) return 'Onitsha';
  if (norm.includes('enugu')) return 'Enugu';
  if (norm.includes('owerri')) return 'Owerri';
  if (norm.includes('aba')) return 'Aba';
  if (norm.includes('kano')) return 'Kano';
  if (norm.includes('abuja')) return 'Abuja';
  if (norm.includes('ibadan')) return 'Ibadan';
  if (norm.includes('asaba')) return 'Asaba';
  if (norm.includes('port harcourt') || norm.includes('ph')) return 'Port Harcourt';
  return 'Lagos';
}

export function createCredentialForMerchant(params: {
  merchantId: string;
  name: string;
  biz: string;
  loc: string;
  phone?: string;
  isPlus?: boolean;
  photoUrl?: string;
  customFid?: string;
}): FloateCredential {
  const cityCode = getCityCode(params.loc);
  const city = resolveCityFromLocation(params.loc);
  const randomSeq = Math.floor(100 + Math.random() * 899);
  const fid = params.customFid || `FLT-${cityCode}-00${randomSeq}`;
  const slug = params.biz.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const initials = generateInitials(params.name);
  const today = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());

  const checks = ['Real stall', 'Contact confirmed', 'Chat on WhatsApp'];
  if (params.isPlus) {
    checks.push('Founding Merchant 2026');
  }

  return {
    fid,
    merchantId: params.merchantId,
    name: params.name,
    biz: params.biz,
    loc: params.loc,
    city,
    slug,
    verifiedOn: today,
    tier: params.isPlus ? 'plus' : 'basic',
    status: 'active',
    checks,
    photoUrl: params.photoUrl,
    initials,
    verifyUrl: buildMerchantProfileUrl(params.biz || slug || fid),
    certificateUrl: `/brand/base-kit/src/certificate.html?fid=${fid}&name=${encodeURIComponent(params.name)}&biz=${encodeURIComponent(params.biz)}&loc=${encodeURIComponent(params.loc)}&date=${encodeURIComponent(today)}&tier=${params.isPlus ? 'plus' : 'basic'}&link=floate.xyz/m/${slug}&initials=${initials}`,
    badgeCardUrl: `/brand/base-kit/src/badge-card.html?fid=${fid}&biz=${encodeURIComponent(params.biz)}&loc=${encodeURIComponent(params.loc)}&link=floate.xyz/v/${fid}&initials=${initials}`,
    flyerUrl: `/brand/base-kit/src/flyer.html`,
    squareBoostUrl: `/brand/base-kit/src/square.html?headline=${encodeURIComponent(params.biz)}&body=${encodeURIComponent(params.loc + ' · Chat direct on WhatsApp')}`
  };
}
