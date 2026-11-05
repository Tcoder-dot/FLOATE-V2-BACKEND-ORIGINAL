/**
 * Floate Redis Adapter & Distributed Cache Service
 * 
 * MOCKED — in-memory, data lost on container sleep.
 * Compliant with AI Studio migration specifications.
 */

// MOCKED — in-memory, data lost on container sleep
const rawStore = new Map<string, any>();
export const redis = {
  get: async (k: string) => rawStore.get(k) ?? null,
  set: async (k: string, v: any) => { rawStore.set(k, v); return 'OK'; },
  del: async (k: string) => rawStore.delete(k),
  incr: async (k: string) => { const n = (rawStore.get(k) || 0) + 1; rawStore.set(k, n); return n; },
};

export class RedisService {
  private store = new Map<string, { value: any; expiresAt?: number }>();

  constructor() {
    console.log('[RedisService] ⚡ In-memory cache engine initialized (AI Studio compliant).');
  }

  public isAvailable(): boolean {
    return true;
  }

  /**
   * Get cached JSON or value
   */
  public async get<T = any>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;

    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    try {
      if (typeof item.value === 'string') {
        try {
          return JSON.parse(item.value) as T;
        } catch {
          return item.value as unknown as T;
        }
      }
      return item.value as T;
    } catch {
      return null;
    }
  }

  /**
   * Set cached value with optional TTL (in seconds)
   */
  public async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : undefined;
      this.store.set(key, { value, expiresAt });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete key
   */
  public async del(key: string): Promise<boolean> {
    try {
      return this.store.delete(key);
    } catch {
      return false;
    }
  }

  /**
   * Rate limiting helper using sliding window / counter
   */
  public async checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const item = this.store.get(key);
    const now = Date.now();

    if (!item || (item.expiresAt && now > item.expiresAt)) {
      this.store.set(key, { value: 1, expiresAt: now + windowSeconds * 1000 });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const current = (typeof item.value === 'number' ? item.value : 0) + 1;
    this.store.set(key, { value: current, expiresAt: item.expiresAt });

    return {
      allowed: current <= maxRequests,
      remaining: Math.max(0, maxRequests - current),
    };
  }

  /**
   * Safe disconnect
   */
  public async close() {
    this.store.clear();
  }
}

export const redisClient = new RedisService();
export const redisService = redisClient;

