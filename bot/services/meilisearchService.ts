/**
 * Floate Meilisearch Ultra-Fast Commerce Search Adapter
 * 
 * Provides sub-15ms typo-tolerant search across verified merchants and products.
 * Seamlessly activates when MEILISEARCH_HOST (and optional MEILISEARCH_API_KEY / MEILISEARCH_MASTER_KEY)
 * are provided in environment variables, with automatic sync from sheets/Firestore listings.
 */

import { Meilisearch, Index } from 'meilisearch';
import { BusinessListing } from './sheetsService.js';

export interface MeiliSearchListingDoc {
  id: string;
  userId: string;
  businessName: string;
  product: string;
  price: string;
  category: string;
  listingType: string;
  state: string;
  city: string;
  location: string;
  whatsapp: string;
  isVerified: boolean;
  isHighlyRecommended: boolean;
  identityVerified: boolean;
  registeredSince: string;
}

export class MeilisearchService {
  private client: Meilisearch | null = null;
  private index: Index<MeiliSearchListingDoc> | null = null;
  private isConnected = false;
  private isIndexConfigured = false;
  private indexName = 'floate_merchants';

  constructor() {
    this.init();
  }

  private init() {
    const host = process.env.MEILISEARCH_HOST || process.env.MEILI_HOST || process.env.MEILISEARCH_URL;
    const apiKey = process.env.MEILISEARCH_API_KEY || process.env.MEILISEARCH_KEY || process.env.MEILISEARCH_MASTER_KEY || '';

    if (!host) {
      console.log('[MeilisearchService] ℹ️ MEILISEARCH_HOST not configured. Running with standard local search index.');
      return;
    }

    try {
      this.client = new Meilisearch({
        host,
        apiKey: apiKey || undefined,
      });

      this.index = this.client.index<MeiliSearchListingDoc>(this.indexName);
      this.checkHealthAndSetup();
    } catch (err: any) {
      console.warn('[MeilisearchService] Initialization warning, continuing with local search engine:', err.message);
      this.client = null;
      this.index = null;
      this.isConnected = false;
    }
  }

  private async checkHealthAndSetup() {
    if (!this.client || !this.index) return;
    try {
      const health = await this.client.health();
      if (health.status === 'available') {
        this.isConnected = true;
        console.log('[MeilisearchService] 🔍 Connected to Meilisearch cluster successfully.');

        // Configure index settings for Nigerian commerce search
        await this.index.updateSettings({
          searchableAttributes: [
            'product',
            'businessName',
            'category',
            'city',
            'state',
            'location',
          ],
          filterableAttributes: [
            'state',
            'city',
            'category',
            'listingType',
            'isVerified',
            'isHighlyRecommended',
          ],
          rankingRules: [
            'words',
            'typo',
            'proximity',
            'attribute',
            'sort',
            'exactness',
          ],
        });
        this.isIndexConfigured = true;
      }
    } catch (err: any) {
      console.warn('[MeilisearchService] Health check notice (operating in graceful fallback):', err?.message || err);
      this.isConnected = false;
    }
  }

  public isAvailable(): boolean {
    return Boolean(this.client && this.isConnected);
  }

  /**
   * Syncs active business listings into the Meilisearch index
   */
  public async syncListings(listings: BusinessListing[]): Promise<boolean> {
    if (!this.isAvailable() || !this.index || !listings || listings.length === 0) {
      return false;
    }

    try {
      const documents: MeiliSearchListingDoc[] = listings.map((l) => ({
        id: (l.id || `biz_${l.userId}_${l.businessName}`).replace(/[^a-zA-Z0-9_-]/g, '_'),
        userId: String(l.userId),
        businessName: l.businessName || '',
        product: l.product || '',
        price: l.price || '',
        category: l.category || '',
        listingType: l.listingType || 'Product',
        state: l.state || '',
        city: l.city || '',
        location: [l.city, l.state].filter(Boolean).join(', ') || 'Nigeria',
        whatsapp: l.whatsapp || '',
        isVerified: Boolean(l.isVerified || l.verifiedStatus === 'YES'),
        isHighlyRecommended: Boolean(l.isHighlyRecommended),
        identityVerified: Boolean(l.identityVerified),
        registeredSince: l.registeredSince || '',
      }));

      await this.index.addDocuments(documents);
      return true;
    } catch (err: any) {
      console.warn('[MeilisearchService] Notice syncing listings:', err.message);
      return false;
    }
  }

  /**
   * Performs typo-tolerant instant search
   */
  public async search(
    query: string,
    options?: {
      location?: string;
      category?: string;
      limit?: number;
    }
  ): Promise<BusinessListing[] | null> {
    if (!this.isAvailable() || !this.index) return null;

    try {
      const filters: string[] = [];
      if (options?.location) {
        const cleanLoc = options.location.replace(/'/g, "\\'");
        filters.push(`(city = '${cleanLoc}' OR state = '${cleanLoc}')`);
      }
      if (options?.category) {
        const cleanCat = options.category.replace(/'/g, "\\'");
        filters.push(`category = '${cleanCat}'`);
      }

      const searchParams: any = {
        limit: options?.limit || 20,
      };
      if (filters.length > 0) {
        searchParams.filter = filters.join(' AND ');
      }

      const res = await this.index.search(query, searchParams);
      if (!res || !res.hits || res.hits.length === 0) return [];

      return res.hits.map((h) => ({
        id: h.id,
        userId: h.userId,
        businessName: h.businessName,
        product: h.product,
        price: h.price,
        category: h.category,
        listingType: h.listingType,
        state: h.state,
        city: h.city,
        whatsapp: h.whatsapp,
        isVerified: h.isVerified,
        isHighlyRecommended: h.isHighlyRecommended,
        identityVerified: h.identityVerified,
        registeredSince: h.registeredSince,
        negotiation: 'Yes',
        productCount: 1,
      }));
    } catch (err: any) {
      console.warn('[MeilisearchService] Search fallback trigger:', err.message);
      return null;
    }
  }
}

export const meilisearchClient = new MeilisearchService();
