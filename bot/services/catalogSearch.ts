import { buildProductUrl } from '../../config/siteUrls.js';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'buy', 'can', 'for', 'find', 'get', 'i', 'in', 'is',
  'looking', 'me', 'my', 'of', 'on', 'please', 'product', 'products', 'search',
  'the', 'to', 'want', 'where', 'with',
]);

const TERM_GROUPS = [
  ['phone', 'phones', 'mobile', 'mobiles', 'smartphone', 'smartphones', 'iphone', 'android'],
  ['laptop', 'laptops', 'notebook', 'notebooks', 'computer', 'computers', 'pc'],
  ['shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'trainer', 'trainers'],
  ['bag', 'bags', 'handbag', 'handbags', 'purse', 'purses', 'backpack', 'backpacks'],
  ['slipper', 'slippers', 'sandal', 'sandals', 'slides', 'slide'],
  ['wig', 'wigs', 'hairpiece', 'hairpieces'],
  ['dress', 'dresses', 'gown', 'gowns'],
];

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeToken(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) return `${token.slice(0, -3)}y`;
  if (token.length > 3 && token.endsWith('s') && !token.endsWith('ss')) return token.slice(0, -1);
  return token;
}

function queryTerms(query: string): string[] {
  return [...new Set(
    normalizeText(query)
      .split(/\s+/)
      .map(normalizeToken)
      .filter((term) => term.length > 1 && !STOP_WORDS.has(term))
  )];
}

function termMatches(term: string, textTerms: Set<string>): boolean {
  if (textTerms.has(term)) return true;
  if (term === 'iphone' || term === 'android') return false;
  const group = TERM_GROUPS.find((terms) => terms.includes(term));
  return Boolean(group?.some((variant) => textTerms.has(normalizeToken(variant))));
}

export interface CatalogSearchProduct {
  id: string;
  name: string;
  title: string;
  product: string;
  price: string;
  numericPrice?: number;
  category: string;
  description: string;
  imageUrl: string;
  productUrl: string;
  vendorPhone: string;
  vendor: {
    name: string;
    phone: string;
    city: string;
    state: string;
  };
  city: string;
  state: string;
  [key: string]: unknown;
}

export function matchCatalogProducts(
  catalog: any[],
  query: string,
  location?: string,
  maxResults = 20,
): CatalogSearchProduct[] {
  const terms = queryTerms(query);
  if (!terms.length) return [];
  const specificTerms = terms.filter((term) => /\d/.test(term));

  const normalizedLocation = normalizeText(location);
  const matched = (catalog || []).flatMap((rawProduct) => {
    const productName = String(rawProduct.product || rawProduct.name || rawProduct.title || '').trim();
    if (!productName) return [];

    const titleText = normalizeText(productName);
    const detailText = normalizeText([
      rawProduct.specs,
      rawProduct.description,
      ...(Array.isArray(rawProduct.visualTags) ? rawProduct.visualTags : []),
    ].join(' '));
    const titleTerms = new Set(titleText.split(/\s+/).map(normalizeToken));
    const detailTerms = new Set(detailText.split(/\s+/).map(normalizeToken));
    const matchedTitleTerms = terms.filter((term) => termMatches(term, titleTerms));
    const matchedDetailTerms = terms.filter((term) => termMatches(term, detailTerms));

    if (specificTerms.some((term) => !termMatches(term, titleTerms) && !termMatches(term, detailTerms))) return [];
    if (!matchedTitleTerms.length && !matchedDetailTerms.length) return [];

    const city = String(rawProduct.city || '').trim();
    const state = String(rawProduct.state || '').trim();
    const productLocation = normalizeText(`${city} ${state}`);
    const locationMatch = normalizedLocation && productLocation.includes(normalizedLocation);
    const score =
      (titleText.includes(normalizeText(query)) ? 1000 : 0) +
      matchedTitleTerms.length * 100 +
      matchedDetailTerms.length * 15 +
      (locationMatch ? 25 : 0);
    const vendorName = String(rawProduct.businessName || rawProduct.vendorName || rawProduct.vendor?.name || 'Verified Merchant');
    const vendorPhone = String(rawProduct.whatsapp || rawProduct.vendorPhone || rawProduct.vendor?.whatsapp_number || '');
    const vendorSlug = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || vendorPhone || 'verified-store';
    const imageUrl = String(rawProduct.photo_url || rawProduct.photoUrl || rawProduct.imageUrl || rawProduct.image || '');
    const id = String(rawProduct.id || '');

    if (!id) return [];
    return [{
      score,
      product: {
        ...rawProduct,
        id,
        name: productName,
        title: productName,
        product: productName,
        price: String(rawProduct.price || rawProduct.formatted_price || ''),
        numericPrice: Number(rawProduct.numericPrice ?? rawProduct.price_naira) || undefined,
        category: String(rawProduct.category || ''),
        description: String(rawProduct.description || rawProduct.specs || ''),
        imageUrl,
        productUrl: buildProductUrl(id, vendorSlug),
        vendorSlug,
        vendorPhone,
        vendor: {
          ...(rawProduct.vendor || {}),
          slug: vendorSlug,
          name: vendorName,
          phone: vendorPhone,
          city,
          state,
        },
        city,
        state,
      } as CatalogSearchProduct,
    }];
  });

  matched.sort((a, b) => b.score - a.score);
  return matched.slice(0, maxResults).map(({ product }) => product);
}
