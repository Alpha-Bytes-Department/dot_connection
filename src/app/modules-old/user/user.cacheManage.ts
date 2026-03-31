// user.cacheManage.ts
import cacheService from "../../../redis/cacheService";
import fastCacheService from "../../../redis/fastCacheService";
import { normalizeQuery } from "../../../util/normalizeQuery";
import { TUser } from "./user.interface";

const DEFAULT_TTL = 60 * 60 * 12; // 12 hours

// Cache for normalized query keys to avoid recomputation
const queryKeyCache = new Map<string, string>();

// Use fast cache for single user operations (most common)
const USE_FAST_CACHE_FOR_USERS = true;

const UserCacheManage = {
  keys: {
    userList: "userList",
    userListWithQuery: "userListWithQuery",
    userId: (id: string) => `user:${id}`,
    userListWithQueryKey: (query: Record<string, unknown>) => {
      // Create a simple hash of the query for caching
      const queryString = JSON.stringify(query);
      
      // Check if we already computed this key
      if (queryKeyCache.has(queryString)) {
        return queryKeyCache.get(queryString)!;
      }
      
      // Only normalize if not cached
      const normalized = normalizeQuery(query);
      const key = `${UserCacheManage.keys.userListWithQuery}:${JSON.stringify(normalized)}`;
      
      // Cache the result (with size limit to prevent memory leaks)
      if (queryKeyCache.size < 1000) {
        queryKeyCache.set(queryString, key);
      }
      
      return key;
    },
  },
  updateUserCache: async (userId: string) => {
    try {
      // Remove the specific user cache
      await cacheService.deleteCache(UserCacheManage.keys.userId(userId));
      
      // Remove the general user list cache
      await cacheService.deleteCache(UserCacheManage.keys.userList);

      // Invalidate all query-based caches using pattern deletion (non-blocking)
      await cacheService.invalidateByPattern(
        UserCacheManage.keys.userListWithQuery + ":*"
      );
      

    } catch (error) {
      console.warn('Error updating user cache:', error);
      // Don't throw - cache invalidation failures shouldn't break the app
    }
  },

  getCacheSingleUser: async (userId: string): Promise<TUser | null> => {
    const startTime = Date.now();
    let success = true;
    
    try {
      const key = UserCacheManage.keys.userId(userId);
      
      // Use fast cache service for better performance
      const cached = USE_FAST_CACHE_FOR_USERS 
        ? await fastCacheService.getCache<TUser>(key)
        : await cacheService.getCache<TUser>(key);
        
      return cached ?? null;
    } catch (error) {
      success = false;
      console.warn('Error getting cached user:', error);
      return null;
    } finally {
      const duration = Date.now() - startTime;
    
    }
  },

  setCacheSingleUser: async (userId: string, data: Partial<TUser>) => {
    const startTime = Date.now();
    let success = true;
    
    try {
      const key = UserCacheManage.keys.userId(userId);
      
      // Use fast cache service for better performance
      if (USE_FAST_CACHE_FOR_USERS) {
        await fastCacheService.setCache(key, data, DEFAULT_TTL);
      } else {
        await cacheService.setCache(key, data, DEFAULT_TTL);
      }
    } catch (error) {
      success = false;
      console.warn('Error setting cached user:', error);
    } finally {
      const duration = Date.now() - startTime;
    }
  },

  setCacheListWithQuery: async (
    query: Record<string, unknown>,
    data: { result: any; meta?: any },
    ttl: number = DEFAULT_TTL
  ) => {
    try {
      const key = UserCacheManage.keys.userListWithQueryKey(query);
      await cacheService.setCache(key, data, ttl);
    } catch (error) {
      console.warn('Error setting cached list:', error);
    }
  },

  getCacheListWithQuery: async (
    query: Record<string, unknown>
  ): Promise<{ result: any; meta?: any } | null> => {
    try {
      const key = UserCacheManage.keys.userListWithQueryKey(query);
      const cached = await cacheService.getCache<{ result: any; meta?: any }>(
        key
      );
      return cached ?? null;
    } catch (error) {
      console.warn('Error getting cached list:', error);
      return null;
    }
  },
};

export default UserCacheManage;
