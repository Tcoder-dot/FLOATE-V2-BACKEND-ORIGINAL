import { Meilisearch } from "meilisearch";

const MEILISEARCH_HOST = process.env.MEILISEARCH_HOST || "http://127.0.0.1:7700";
const MEILISEARCH_API_KEY = process.env.MEILISEARCH_MASTER_KEY || process.env.MEILISEARCH_API_KEY || "masterKey";

export const meiliClient = new Meilisearch({
  host: MEILISEARCH_HOST,
  apiKey: MEILISEARCH_API_KEY,
});

export const MERCHANTS_INDEX = "merchants";
export const PRODUCTS_INDEX = "products";

/**
 * Initializes and synchronizes Meilisearch index settings.
 * Ensures `category` is added to `filterableAttributes` to support Category Intent Routing.
 */
export async function initializeMeilisearchIndexes() {
  try {
    const merchantsIndex = meiliClient.index(MERCHANTS_INDEX);

    // 1. Configure filterable attributes on merchants index
    await merchantsIndex.updateFilterableAttributes([
      "category",
      "city",
      "state",
      "isVerified",
      "geoHubName",
      "primaryCategory"
    ]);

    // 2. Configure searchable attributes
    await merchantsIndex.updateSearchableAttributes([
      "name",
      "businessName",
      "category",
      "primaryCategory",
      "product",
      "bio",
      "marketLocation",
      "city",
      "state"
    ]);

    // 3. Configure ranking rules
    await merchantsIndex.updateRankingRules([
      "words",
      "typo",
      "proximity",
      "attribute",
      "sort",
      "exactness"
    ]);

    console.log("[Meilisearch] Merchants index settings synchronized successfully.");
  } catch (error: any) {
    // Meilisearch server optional in preview environment
  }
}
