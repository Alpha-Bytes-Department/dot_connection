import { StatusCodes } from "http-status-codes";
import { Prisma, UserStatus } from "@prisma/client";
import AppError from "../../errors/AppError";
import { prisma } from "../../../DB/prisma";
import ProfileCacheManage from "./profile.cacheManage";
import { TProfile, TReturnProfile } from "./profile.interface";

const mapUser = (user: any) => {
  if (!user) return null;
  return {
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    image: user.image,
    role: user.role,
    phoneNumber: user.phoneNumber,
    status: user.status,
    verified: user.verified,
    allProfileFieldsFilled: user.allProfileFieldsFilled,
    allUserFieldsFilled: user.allUserFieldsFilled,
    isProfileVerified: user.isProfileVerified,
    isPersonaVerified: user.isPersonaVerified,
    pushNotification: user.pushNotification,
    lastLoginAt: user.lastLoginAt,
    dateOfBirth: user.dateOfBirth,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

const mapProfile = (profile: any): TProfile => {
  const locationFromJson = profile.location as any;
  const location =
    locationFromJson && typeof locationFromJson === "object"
      ? locationFromJson
      : profile.latitude != null && profile.longitude != null
        ? {
            type: "Point",
            coordinates: [profile.longitude, profile.latitude] as [number, number],
            address: profile.address ?? undefined,
          }
        : undefined;

  return {
    id: profile.id,
    userId: profile.user ? mapUser(profile.user) : profile.userId,
    bio: profile.bio ?? undefined,
    location,
    photos: profile.photos ?? [],
    interests: profile.interests ?? [],
    lookingFor: profile.lookingFor ?? undefined,
    maxDistance: profile.maxDistance ?? undefined,
    ageRangeMin: profile.ageRangeMin ?? undefined,
    ageRangeMax: profile.ageRangeMax ?? undefined,
    gender: profile.gender ?? undefined,
    interestedIn: profile.interestedIn ?? undefined,
    height: profile.height ?? undefined,
    workplace: profile.workplace ?? undefined,
    school: profile.school ?? undefined,
    hometown: profile.hometown ?? undefined,
    jobTitle: profile.jobTitle ?? undefined,
    smokingStatus: profile.smokingStatus ?? undefined,
    drinkingStatus: profile.drinkingStatus ?? undefined,
    studyLevel: profile.studyLevel ?? undefined,
    religious: profile.religious ?? undefined,
    profileViews: profile.profileViews ?? 0,
    hiddenFields: {
      gender: Boolean(profile.hiddenGender),
      hometown: Boolean(profile.hiddenHometown),
      workplace: Boolean(profile.hiddenWorkplace),
      jobTitle: Boolean(profile.hiddenJobTitle),
      school: Boolean(profile.hiddenSchool),
      studyLevel: Boolean(profile.hiddenStudyLevel),
      religious: Boolean(profile.hiddenReligious),
      drinkingStatus: Boolean(profile.hiddenDrinkingStatus),
      smokingStatus: Boolean(profile.hiddenSmokingStatus),
    },
    lastActive: profile.lastActive ?? undefined,
    createdAt: profile.createdAt ?? undefined,
    updatedAt: profile.updatedAt ?? undefined,
  };
};

const getAllProfiles = async (
  query: Record<string, unknown>,
): Promise<TReturnProfile.getAllProfiles> => {
  const page = Math.max(Number(query.page ?? 1) || 1, 1);
  const limit = Math.max(Number(query.limit ?? 10) || 10, 1);
  const skip = (page - 1) * limit;
  const sortBy = String(query.sortBy ?? "createdAt");
  const sortOrder: Prisma.SortOrder =
    String(query.sortOrder ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const searchTerm = String(query.searchTerm ?? "").trim();

  const allowedSortFields = ["createdAt", "updatedAt", "lastActive", "profileViews"];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const where: Prisma.ProfileWhereInput = {};
  if (searchTerm) {
    where.OR = [
      { bio: { contains: searchTerm, mode: "insensitive" } },
      { workplace: { contains: searchTerm, mode: "insensitive" } },
      { school: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  const [total, profiles] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      include: { user: true },
      orderBy: { [safeSortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  return {
    result: profiles.map(mapProfile),
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const getProfileByUserId = async (userId: string): Promise<TProfile> => {
  const cached = await ProfileCacheManage.getCachedProfileByUserId(userId);
  if (cached) return cached;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Profile not found for this user");
  }

  await prisma.profile.update({
    where: { userId },
    data: { profileViews: { increment: 1 } },
  });

  const latest = await prisma.profile.findUnique({
    where: { userId },
    include: { user: true },
  });
  const mapped = mapProfile(latest ?? profile);
  await ProfileCacheManage.setCachedProfileByUserId(userId, mapped);
  return mapped;
};

const getMyProfile = async (userId: string): Promise<TProfile> => {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { user: true },
  });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Profile not found for this user");
  }

  await prisma.profile.update({
    where: { userId },
    data: { lastActive: new Date() },
  });

  const latest = await prisma.profile.findUnique({
    where: { userId },
    include: { user: true },
  });
  const mapped = mapProfile(latest ?? profile);
  await ProfileCacheManage.setCachedProfileByUserId(userId, mapped);
  return mapped;
};

const searchProfiles = async (
  query: Record<string, unknown>,
): Promise<TReturnProfile.getAllProfiles> => {
  const cached = await ProfileCacheManage.getCachedProfileSearch(query);
  if (cached) return cached as TReturnProfile.getAllProfiles;

  const page = Math.max(Number(query.page ?? 1) || 1, 1);
  const limit = Math.max(Number(query.limit ?? 10) || 10, 1);
  const skip = (page - 1) * limit;
  const searchTerm = String(query.searchTerm ?? "").trim();

  const parseCsv = (value: unknown): string[] =>
    typeof value === "string"
      ? value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean)
      : [];

  const interests = Array.isArray(query.interests)
    ? (query.interests as string[])
    : parseCsv(query.interests);

  const where: Prisma.ProfileWhereInput = {
    user: { status: UserStatus.active },
  };

  if (searchTerm) {
    where.OR = [
      { bio: { contains: searchTerm, mode: "insensitive" } },
      { workplace: { contains: searchTerm, mode: "insensitive" } },
      { school: { contains: searchTerm, mode: "insensitive" } },
    ];
  }
  if (interests.length) where.interests = { hasSome: interests };
  if (query.gender) where.gender = String(query.gender) as any;
  if (query.interestedIn) where.interestedIn = String(query.interestedIn) as any;

  const [total, profiles] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const payload: TReturnProfile.getAllProfiles = {
    result: profiles.map(mapProfile),
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };

  await ProfileCacheManage.setCachedProfileSearch(query, payload);
  return payload;
};

const updatePreferences = async (
  userId: string,
  preferences: Partial<TProfile>,
): Promise<TProfile> => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(StatusCodes.NOT_FOUND, "Profile not found");

  const updateData: Prisma.ProfileUpdateInput = {};
  if (preferences.lookingFor !== undefined) updateData.lookingFor = preferences.lookingFor as any;
  if (preferences.maxDistance !== undefined) updateData.maxDistance = preferences.maxDistance;
  if (preferences.ageRangeMin !== undefined) updateData.ageRangeMin = preferences.ageRangeMin;
  if (preferences.ageRangeMax !== undefined) updateData.ageRangeMax = preferences.ageRangeMax;
  if (preferences.interestedIn !== undefined) {
    updateData.interestedIn = preferences.interestedIn as any;
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data: updateData,
    include: { user: true },
  });

  await ProfileCacheManage.invalidateProfileCache(userId);
  return mapProfile(updated);
};

export const ProfileServices = {
  getAllProfiles,
  getProfileByUserId,
  getMyProfile,
  searchProfiles,
  updatePreferences,
};
