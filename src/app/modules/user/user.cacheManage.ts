import cacheService from "../../../redis/cacheService";
import fastCacheService from "../../../redis/fastCacheService";
import { normalizeQuery } from "../../../util/normalizeQuery";
import { TUser } from "./user.interface";

const DEFAULT_TTL = 60 * 60 * 12;
const queryKeyCache = new Map<string, string>();
const USE_FAST_CACHE_FOR_USERS = true;

const UserCacheManage = {
  keys: {
    userList: "userList",
    userListWithQuery: "userListWithQuery",
    userId: (id: string) => `user:${id}`,
    userListWithQueryKey: (query: Record<string, unknown>) => {
      const queryString = JSON.stringify(query);
      if (queryKeyCache.has(queryString)) return queryKeyCache.get(queryString)!;

      const normalized = normalizeQuery(query);
      const key = `${UserCacheManage.keys.userListWithQuery}:${JSON.stringify(normalized)}`;
      if (queryKeyCache.size < 1000) queryKeyCache.set(queryString, key);
      return key;
    },
  },

  updateUserCache: async (userId: string) => {
    try {
      await cacheService.deleteCache(UserCacheManage.keys.userId(userId));
      await cacheService.deleteCache(UserCacheManage.keys.userList);
      await cacheService.invalidateByPattern(
        UserCacheManage.keys.userListWithQuery + ":*",
      );
    } catch (error) {
      console.warn("Error updating user cache:", error);
    }
  },

  getCacheSingleUser: async (userId: string): Promise<TUser | null> => {
    try {
      const key = UserCacheManage.keys.userId(userId);
      const cached = USE_FAST_CACHE_FOR_USERS
        ? await fastCacheService.getCache<TUser>(key)
        : await cacheService.getCache<TUser>(key);
      return cached ?? null;
    } catch (error) {
      console.warn("Error getting cached user:", error);
      return null;
    }
  },

  setCacheSingleUser: async (userId: string, data: Partial<TUser>) => {
    try {
      const key = UserCacheManage.keys.userId(userId);
      if (USE_FAST_CACHE_FOR_USERS) {
        await fastCacheService.setCache(key, data, DEFAULT_TTL);
      } else {
        await cacheService.setCache(key, data, DEFAULT_TTL);
      }
    } catch (error) {
      console.warn("Error setting cached user:", error);
    }
  },

  setCacheListWithQuery: async (
    query: Record<string, unknown>,
    data: { result: any; meta?: any },
    ttl: number = DEFAULT_TTL,
  ) => {
    try {
      const key = UserCacheManage.keys.userListWithQueryKey(query);
      await cacheService.setCache(key, data, ttl);
    } catch (error) {
      console.warn("Error setting cached list:", error);
    }
  },

  getCacheListWithQuery: async (
    query: Record<string, unknown>,
  ): Promise<{ result: any; meta?: any } | null> => {
    try {
      const key = UserCacheManage.keys.userListWithQueryKey(query);
      const cached = await cacheService.getCache<{ result: any; meta?: any }>(
        key,
      );
      return cached ?? null;
    } catch (error) {
      console.warn("Error getting cached list:", error);
      return null;
    }
  },
};

export default UserCacheManage;
