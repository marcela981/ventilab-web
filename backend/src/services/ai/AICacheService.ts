/**
 * AI Cache Service
 * Implements look-aside cache with Redis (if available) or LRU in-memory fallback
 */

// @ts-ignore - Types will be available after npm install
import { createClient } from 'redis';
// @ts-ignore - lru-cache v10 includes its own types, but TypeScript may not detect them until installed
import { LRUCache } from 'lru-cache';

interface CacheEntry {
  answer: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  timestamp: number;
  noCache?: boolean;
}

// LRU Cache fallback (in-memory)
const lruCache = new LRUCache<string, CacheEntry>({
  max: 500,
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
});

let redisClient: ReturnType<typeof createClient> | null = null;
let redisConnected = false;

/**
 * Initialize Redis connection if REDIS_URL is available
 */
export const initializeCache = async (): Promise<void> => {
  const redisUrl = process.env.REDIS_URL;
  
  if (redisUrl) {
    try {
      redisClient = createClient({ url: redisUrl });
      
      redisClient.on('error', (err: Error) => {
        console.error('Redis Client Error:', err);
        redisConnected = false;
      });

      redisClient.on('connect', () => {
        console.log('✅ Redis connected');
        redisConnected = true;
      });

      await redisClient.connect();
      console.log('✅ AI Cache Service initialized with Redis');
    } catch (error) {
      console.warn('⚠️ Redis connection failed, using LRU cache fallback:', error);
      redisConnected = false;
    }
  } else {
    console.log('ℹ️ No REDIS_URL configured, using LRU cache (in-memory)');
  }
};

/**
 * Get cached response by hash
 */
export const getCache = async (hash: string): Promise<CacheEntry | null> => {
  try {
    // Try Redis first
    if (redisClient && redisConnected) {
      try {
        const cached = await redisClient.get(`ai_tutor_cache:${hash}`);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis get error, falling back to LRU:', error);
        redisConnected = false;
      }
    }

    // Fallback to LRU
    const cached = lruCache.get(hash);
    return cached || null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

/**
 * Set cached response
 */
export const setCache = async (
  hash: string,
  answer: string,
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number },
  noCache?: boolean
): Promise<void> => {
  try {
    const entry: CacheEntry = {
      answer,
      usage,
      timestamp: Date.now(),
      noCache,
    };

    // Don't cache if noCache flag is set or answer is too short
    if (noCache || answer.length < 30) {
      return;
    }

    // Try Redis first
    if (redisClient && redisConnected) {
      try {
        await redisClient.setEx(
          `ai_tutor_cache:${hash}`,
          7 * 24 * 60 * 60, // 7 days in seconds
          JSON.stringify(entry)
        );
        return;
      } catch (error) {
        console.warn('Redis set error, falling back to LRU:', error);
        redisConnected = false;
      }
    }

    // Fallback to LRU
    lruCache.set(hash, entry);
  } catch (error) {
    console.error('Error setting cache:', error);
  }
};

/**
 * Clear cache entry
 */
export const clearCache = async (hash: string): Promise<void> => {
  try {
    if (redisClient && redisConnected) {
      try {
        await redisClient.del(`ai_tutor_cache:${hash}`);
      } catch (error) {
        console.warn('Redis delete error:', error);
      }
    }
    lruCache.delete(hash);
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
};

/**
 * Close Redis connection
 */
export const closeCache = async (): Promise<void> => {
  if (redisClient && redisConnected) {
    try {
      await redisClient.quit();
      redisConnected = false;
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
};

