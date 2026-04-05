// profile.cacheManage.ts
import cacheService from "../../../redis/cacheService";
import { normalizeQuery } from "../../../util/normalizeQuery";
import { TProfile } from "./profile.interface";

const DEFAULT_TTL = 60 * 60 * 6; // 6 hours for profiles (shorter than users)
const SEARCH_TTL = 60 * 30; // 30 minutes for search results
const NEARBY_TTL = 60 * 15; // 15 minutes for nearby profiles

const ProfileCacheManage = {
  keys: {
    profileList: "profileList",
    profileListWithQuery: "profileListWithQuery",
    profileId: (id: string) => `profile:${id}`,
    profileByUserId: (userId: string) => `profile:user:${userId}`,
    profileSearch: "profileSearch",
    nearbyProfiles: (location: string, maxDistance: number) =>
      `nearby:${location}:${maxDistance}`,
    profileCompleteness: (userId: string) => `profile:completeness:${userId}`,

    profileListWithQueryKey: (query: Record<string, unknown>) => {
      const normalized = normalizeQuery(query);
      return `${ProfileCacheManage.keys.profileListWithQuery}:${JSON.stringify(normalized)}`;
    },

    profileSearchKey: (query: Record<string, unknown>) => {
      const normalized = normalizeQuery(query);
      return `${ProfileCacheManage.keys.profileSearch}:${JSON.stringify(normalized)}`;
    },
  },

  // Cache invalidation with smart key management
  invalidateProfileCache: async (userId: string, profileId?: string) => {
    const keysToDelete = [
      ProfileCacheManage.keys.profileByUserId(userId),
      ProfileCacheManage.keys.profileCompleteness(userId),
    ];

    // Only add profileId if it exists (we mainly use userId now)
    if (profileId) {
      keysToDelete.push(ProfileCacheManage.keys.profileId(profileId));
    }

    // Delete specific keys
    await Promise.allSettled(
      keysToDelete.map(key => cacheService.deleteCache(key))
    );

    // Invalidate search caches (non-blocking)
    cacheService.invalidateByPattern(`${ProfileCacheManage.keys.profileSearch}:*`)
      .catch((err: unknown) => console.warn('Failed to invalidate search cache:', err));

    cacheService.invalidateByPattern(`${ProfileCacheManage.keys.profileListWithQuery}:*`)
      .catch((err: unknown) => console.warn('Failed to invalidate list cache:', err));
  },

  // Profile CRUD operations
  getCachedProfile: async (profileId: string): Promise<TProfile | null> => {
    try {
      const key = ProfileCacheManage.keys.profileId(profileId);
      return await cacheService.getCache<TProfile>(key);
    } catch (error) {
      console.warn('Profile cache get error:', error);
      return null;
    }
  },

  setCachedProfile: async (profileId: string, data: TProfile) => {
    try {
      const key = ProfileCacheManage.keys.profileId(profileId);
      await cacheService.setCache(key, data, DEFAULT_TTL);
    } catch (error) {
      console.warn('Profile cache set error:', error);
    }
  },

  getCachedProfileByUserId: async (userId: string): Promise<TProfile | null> => {
    try {
      const key = ProfileCacheManage.keys.profileByUserId(userId);
      return await cacheService.getCache<TProfile>(key);
    } catch (error) {
      console.warn('Profile by user cache get error:', error);
      return null;
    }
  },

  setCachedProfileByUserId: async (userId: string, data: TProfile) => {
    try {
      const key = ProfileCacheManage.keys.profileByUserId(userId);
      await cacheService.setCache(key, data, DEFAULT_TTL);
    } catch (error) {
      console.warn('Profile by user cache set error:', error);
    }
  },

  // Search and list operations
  getCachedProfileSearch: async (query: Record<string, unknown>) => {
    try {
      const key = ProfileCacheManage.keys.profileSearchKey(query);
      return await cacheService.getCache(key);
    } catch (error) {
      console.warn('Profile search cache get error:', error);
      return null;
    }
  },

  setCachedProfileSearch: async (
    query: Record<string, unknown>,
    data: { result: TProfile[]; meta?: any }
  ) => {
    try {
      const key = ProfileCacheManage.keys.profileSearchKey(query);
      await cacheService.setCache(key, data, SEARCH_TTL);
    } catch (error) {
      console.warn('Profile search cache set error:', error);
    }
  },

  getCachedNearbyProfiles: async (location: string, maxDistance: number) => {
    try {
      const key = ProfileCacheManage.keys.nearbyProfiles(location, maxDistance);
      return await cacheService.getCache(key);
    } catch (error) {
      console.warn('Nearby profiles cache get error:', error);
      return null;
    }
  },

  setCachedNearbyProfiles: async (
    location: string,
    maxDistance: number,
    data: TProfile[]
  ) => {
    try {
      const key = ProfileCacheManage.keys.nearbyProfiles(location, maxDistance);
      await cacheService.setCache(key, data, NEARBY_TTL);
    } catch (error) {
      console.warn('Nearby profiles cache set error:', error);
    }
  },

  // Profile completeness caching
  getCachedProfileCompleteness: async (userId: string): Promise<number | null> => {
    try {
      const key = ProfileCacheManage.keys.profileCompleteness(userId);
      return await cacheService.getCache<number>(key);
    } catch (error) {
      console.warn('Profile completeness cache get error:', error);
      return null;
    }
  },

  setCachedProfileCompleteness: async (userId: string, completeness: number) => {
    try {
      const key = ProfileCacheManage.keys.profileCompleteness(userId);
      await cacheService.setCache(key, completeness, DEFAULT_TTL);
    } catch (error) {
      console.warn('Profile completeness cache set error:', error);
    }
  },

  // Bulk operations
  invalidateAllProfileCaches: async () => {
    try {
      const patterns = [
        'profile:*',
        'profileList*',
        'profileSearch*',
        'nearby:*'
      ];

      await Promise.allSettled(
        patterns.map(pattern => cacheService.invalidateByPattern(pattern))
      );
    } catch (error) {
      console.warn('Bulk profile cache invalidation error:', error);
    }
  },

  // Cache warming for popular profiles
  warmPopularProfilesCache: async (popularProfileIds: string[]) => {
    // Implementation for cache warming
    console.log('Warming cache for popular profiles:', popularProfileIds.length);
  },
};

export default ProfileCacheManage;
