import { cacheConnection } from '../queues/index';
import logger from '../utils/logger';

/**
 * Tenant-scoped cache backed directly by ioredis.
 *
 * Previously this used cache-manager + cache-manager-ioredis-yet, but those
 * versions were incompatible (cache-manager v7 expects a Keyv store, while
 * redisStore() returns a v5-style Promise), so caching silently never worked.
 * Talking to ioredis directly is simpler, correct, and reuses the request-path
 * Redis connection. All methods fail soft so a Redis hiccup never breaks a request.
 */
export class CacheService {
  /**
   * Generates a strict tenant-scoped cache key
   */
  static generateKey(companyId: string, resource: string, id: string = 'list'): string {
    return `tenant:${companyId}:resource:${resource}:${id}`;
  }

  static async get<T>(key: string): Promise<T | undefined> {
    try {
      const raw = await cacheConnection.get(key);
      return raw ? (JSON.parse(raw) as T) : undefined;
    } catch (err) {
      logger.error(`[CacheService] Failed to get key ${key}`, err);
      return undefined;
    }
  }

  /**
   * @param ttlMs time-to-live in milliseconds
   */
  static async set<T>(key: string, value: T, ttlMs: number): Promise<void> {
    try {
      await cacheConnection.set(key, JSON.stringify(value), 'PX', ttlMs);
    } catch (err) {
      logger.error(`[CacheService] Failed to set key ${key}`, err);
    }
  }

  static async del(key: string): Promise<void> {
    try {
      await cacheConnection.del(key);
    } catch (err) {
      logger.error(`[CacheService] Failed to del key ${key}`, err);
    }
  }

  /**
   * Deletes all keys matching a pattern (e.g. `tenant:${companyId}:resource:department:*`).
   * Uses SCAN (non-blocking) rather than KEYS.
   */
  static async delByPattern(pattern: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const result = await cacheConnection.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = result[0];
        const keys = result[1];
        if (keys.length > 0) {
          await cacheConnection.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      logger.error(`[CacheService] Failed to del pattern ${pattern}`, err);
    }
  }
}
