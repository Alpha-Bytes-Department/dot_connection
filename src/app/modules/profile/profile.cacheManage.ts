import cacheService from "../../../redis/cacheService";
import { normalizeQuery } from "../../../util/normalizeQuery";
import { TProfile } from "./profile.interface";

const DEFAULT_TTL = 60 * 60 * 6;
const SEARCH_TTL = 60 * 30;

const ProfileCacheManage = {
  keys: {
    profileByUserId: (userId: string) => `profile:user:${userId}`,
    profileSearch: "profileSearch",
    profileListWithQuery: "profileListWithQuery",
    profileListWithQueryKey: (query: Record<string, unknown>) => {
      const normalized = normalizeQuery(query);
      return `${ProfileCacheManage.keys.profileListWithQuery}:${JSON.stringify(normalized)}`;
    },
    profileSearchKey: (query: Record<string, unknown>) => {
      const normalized = normalizeQuery(query);
      return `${ProfileCacheManage.keys.profileSearch}:${JSON.stringify(normalized)}`;
    },
  },

  invalidateProfileCache: async (userId: string) => {
    await Promise.allSettled([
      cacheService.deleteCache(ProfileCacheManage.keys.profileByUserId(userId)),
      cacheService.invalidateByPattern(`${ProfileCacheManage.keys.profileSearch}:*`),
      cacheService.invalidateByPattern(`${ProfileCacheManage.keys.profileListWithQuery}:*`),
    ]);
  },

  getCachedProfileByUserId: async (userId: string): Promise<TProfile | null> => {
    try {
      return await cacheService.getCache<TProfile>(
        ProfileCacheManage.keys.profileByUserId(userId),
      );
    } catch {
      return null;
    }
  },

  setCachedProfileByUserId: async (userId: string, data: TProfile) => {
    try {
      await cacheService.setCache(
        ProfileCacheManage.keys.profileByUserId(userId),
        data,
        DEFAULT_TTL,
      );
    } catch {
      // ignore cache errors
    }
  },

  getCachedProfileSearch: async (query: Record<string, unknown>) => {
    try {
      return await cacheService.getCache(ProfileCacheManage.keys.profileSearchKey(query));
    } catch {
      return null;
    }
  },

  setCachedProfileSearch: async (
    query: Record<string, unknown>,
    data: { result: TProfile[]; meta?: any },
  ) => {
    try {
      await cacheService.setCache(
        ProfileCacheManage.keys.profileSearchKey(query),
        data,
        SEARCH_TTL,
      );
    } catch {
      // ignore cache errors
    }
  },
};

export default ProfileCacheManage;
