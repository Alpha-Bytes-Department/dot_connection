import { StatusCodes } from "http-status-codes";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { TProfile, TReturnProfile } from "./profile.interface";
import { Profile } from "./profile.model";

import ProfileCacheManage from "./profile.cacheManage";

const getAllProfiles = async (
  query: Record<string, unknown>
): Promise<TReturnProfile.getAllProfiles> => {
  const profileQuery = new QueryBuilder(
    Profile.find().populate({
      path: "userId",
      select: "-authentication",
    }),
    query
  )
    .search(["bio"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await profileQuery.modelQuery;
  const meta = await profileQuery.countTotal();

  return { result, meta };
};

const getProfileByUserId = async (userId: string): Promise<TProfile> => {
  // Try cache first
  const cachedProfile = await ProfileCacheManage.getCachedProfileByUserId(
    userId
  );
  if (cachedProfile) {
    return cachedProfile;
  }

  const profile = await Profile.findOne({ userId }).populate({
    path: "userId",
    select: "-authentication",
  });

  if (!profile) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Profile not found for this user"
    );
  }

  // Update profile views using the profile's _id
  await Profile.findByIdAndUpdate(profile._id, {
    $inc: { profileViews: 1 },
  });

  // Cache the profile
  await ProfileCacheManage.setCachedProfileByUserId(userId, profile);

  return profile;
};

const getMyProfile = async (userId: string): Promise<TProfile> => {
  const profile = await Profile.findOne({ userId }).populate({
    path: "userId",
    select: "-authentication",
  });

  if (!profile) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Profile not found for this user"
    );
  }

  // Update last active using the profile's _id
  await Profile.findByIdAndUpdate(profile._id, {
    lastActive: new Date(),
  });

  // Cache the profile after updating
  await ProfileCacheManage.setCachedProfileByUserId(userId, profile);

  return profile;
};

const searchProfiles = async (
  query: Record<string, unknown>
): Promise<TReturnProfile.getAllProfiles> => {
  const {
    searchTerm,
    interests,
    maxDistance,
    gender,
    interestedIn,
    verified,
    location,
    page = 1,
    limit = 10,
  } = query;

  let searchQuery: any = {};

  // Text search
  if (searchTerm) {
    searchQuery.$or = [
      { bio: { $regex: searchTerm, $options: "i" } },
      { workplace: { $regex: searchTerm, $options: "i" } },
      { school: { $regex: searchTerm, $options: "i" } },
    ];
  }

  // Interests filter
  if (interests && Array.isArray(interests)) {
    searchQuery.interests = { $in: interests };
  }

  // Gender filter
  if (gender) {
    searchQuery.gender = gender;
  }

  // Interested in filter
  if (interestedIn) {
    searchQuery.interestedIn = interestedIn;
  }

  // Verified filter
  if (verified !== undefined) {
    searchQuery.verified = verified;
  }

  // Location-based search
  if (location && maxDistance) {
    searchQuery.location = {
      $near: {
        $geometry: location,
        $maxDistance: Number(maxDistance) * 1000, // Convert km to meters
      },
    };
  }

  const profileQuery = new QueryBuilder(
    Profile.find(searchQuery).populate({
      path: "userId",
      select: "-authentication",
    }),
    { page, limit }
  )
    .sort()
    .paginate()
    .fields();

  const result = await profileQuery.modelQuery;
  const meta = await profileQuery.countTotal();

  return { result, meta };
};

const updatePreferences = async (
  userId: string,
  preferences: Partial<TProfile>
): Promise<TProfile> => {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Profile not found");
  }

  const preferenceFields = [
    "lookingFor",
    "maxDistance",
    "ageRangeMin",
    "ageRangeMax",
    "interestedIn",
  ];

  const updateData: Partial<TProfile> = {};

  preferenceFields.forEach((field) => {
    const value = preferences[field as keyof TProfile];
    if (value !== undefined) {
      (updateData as any)[field] = value;
    }
  });

  const updatedProfile = await Profile.findByIdAndUpdate(
    profile._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate({
    path: "userId",
    select: "-authentication",
  });

  if (!updatedProfile) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Preferences update failed");
  }

  return updatedProfile;
};

export const ProfileServices = {
  getAllProfiles,
  getProfileByUserId,
  getMyProfile,
  searchProfiles,
  updatePreferences,
};
