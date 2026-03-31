import { z } from "zod";
import {
  PROFILE_DRINKING_STATUS,
  PROFILE_INTERESTS,
  PROFILE_RELIGION,
  PROFILE_SMOKING_STATUS,
  PROFILE_STUDY_LEVEL,
} from "./profile.constant";

const locationSchema = z
  .object({
    type: z.literal("Point").default("Point"),
    coordinates: z
      .array(z.number())
      .length(
        2,
        "Coordinates must have exactly 2 numbers [longitude, latitude]"
      ),
    address: z.string().trim().optional(),
  })
  .optional();

const photoSchema = z.object({
  url: z.string().url("Invalid photo URL"),
  isMain: z.boolean().default(false),
});

const createProfileValidation = z.object({
  body: z
    .object({
      bio: z
        .string()
        .max(500, "Bio cannot exceed 500 characters")
        .trim()
        .optional(),
      location: locationSchema,
      photos: z
        .array(photoSchema)
        .max(6, "Cannot have more than 6 photos")
        .optional(),
      interests: z
        .array(
          z.enum(Object.values(PROFILE_INTERESTS) as [string, ...string[]])
        )
        .max(10, "Cannot have more than 10 interests")
        .optional(),
      lookingFor: z
        .enum(["friendship", "dating", "relationship", "networking"])
        .optional(),
      maxDistance: z
        .number()
        .min(1, "Max distance must be at least 1 km")
        .max(500, "Max distance cannot exceed 500 km")
        .optional(),
      ageRangeMin: z
        .number()
        .min(18, "Minimum age must be at least 18")
        .max(100, "Minimum age cannot exceed 100")
        .optional(),
      ageRangeMax: z
        .number()
        .min(18, "Maximum age must be at least 18")
        .max(100, "Maximum age cannot exceed 100")
        .optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      interestedIn: z.enum(["male", "female", "everyone"]).optional(),
      height: z
        .number()
        .min(70, "Height must be at least 70 cm")
        .max(250, "Height cannot exceed 250 cm")
        .optional(),
      workplace: z
        .string()
        .trim()
        .max(100, "Workplace cannot exceed 100 characters")
        .optional(),
      school: z
        .string()
        .trim()
        .max(100, "School cannot exceed 100 characters")
        .optional(),
      hometown: z
        .string()
        .trim()
        .max(100, "Hometown cannot exceed 100 characters")
        .optional(),
      jobTitle: z
        .string()
        .trim()
        .max(100, "Job title cannot exceed 100 characters")
        .optional(),
      studyLevel: z
        .enum(Object.values(PROFILE_STUDY_LEVEL) as [string, ...string[]])
        .optional(),
      religion: z
        .enum(Object.values(PROFILE_RELIGION) as [string, ...string[]])
        .optional(),
      smokingStatus: z
        .enum(Object.values(PROFILE_SMOKING_STATUS) as [string, ...string[]])
        .optional(),
      drinkingStatus: z
        .enum(Object.values(PROFILE_DRINKING_STATUS) as [string, ...string[]])
        .optional(),
      isActive: z.boolean().optional(),
      isVerified: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (
          data.ageRangeMin &&
          data.ageRangeMax &&
          data.ageRangeMin > data.ageRangeMax
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Age range minimum cannot be greater than maximum",
        path: ["ageRangeMax"],
      }
    )
    .refine(
      (data) => {
        if (data.photos && data.photos.length > 0) {
          const mainPhotos = data.photos.filter((photo) => photo.isMain);
          return mainPhotos.length <= 1;
        }
        return true;
      },
      {
        message: "Only one photo can be set as main",
        path: ["photos"],
      }
    ),
});

const updateProfileValidation = z.object({
  body: z
    .object({
      bio: z
        .string()
        .max(500, "Bio cannot exceed 500 characters")
        .trim()
        .optional(),
      location: locationSchema,
      photos: z
        .array(photoSchema)
        .max(6, "Cannot have more than 6 photos")
        .optional(),
      interests: z
        .array(
          z.enum(Object.values(PROFILE_INTERESTS) as [string, ...string[]])
        )
        .max(10, "Cannot have more than 10 interests")
        .optional(),
      lookingFor: z
        .enum(["friendship", "dating", "relationship", "networking"])
        .optional(),
      maxDistance: z
        .number()
        .min(1, "Max distance must be at least 1 km")
        .max(500, "Max distance cannot exceed 500 km")
        .optional(),
      ageRangeMin: z
        .number()
        .min(18, "Minimum age must be at least 18")
        .max(100, "Minimum age cannot exceed 100")
        .optional(),
      ageRangeMax: z
        .number()
        .min(18, "Maximum age must be at least 18")
        .max(100, "Maximum age cannot exceed 100")
        .optional(),
      jobTitle: z
        .string()
        .trim()
        .max(100, "Job title cannot exceed 100 characters")
        .optional(),
      gender: z.enum(["male", "female", "other"]).optional(),
      interestedIn: z.enum(["male", "female", "everyone"]).optional(),
      height: z
        .number()
        .min(100, "Height must be at least 100 cm")
        .max(250, "Height cannot exceed 250 cm")
        .optional(),
      workplace: z
        .string()
        .trim()
        .max(100, "Workplace cannot exceed 100 characters")
        .optional(),
      school: z
        .string()
        .trim()
        .max(100, "School cannot exceed 100 characters")
        .optional(),
      hometown: z
        .string()
        .trim()
        .max(100, "Hometown cannot exceed 100 characters")
        .optional(),
      studyLevel: z
        .enum(Object.values(PROFILE_STUDY_LEVEL) as [string, ...string[]])
        .optional(),
      religion: z
        .enum(Object.values(PROFILE_RELIGION) as [string, ...string[]])
        .optional(),
      smokingStatus: z
        .enum(Object.values(PROFILE_SMOKING_STATUS) as [string, ...string[]])
        .optional(),
      drinkingStatus: z
        .enum(Object.values(PROFILE_DRINKING_STATUS) as [string, ...string[]])
        .optional(),
      isActive: z.boolean().optional(),
      isVerified: z.boolean().optional(),
    })
    .refine(
      (data) => {
        if (
          data.ageRangeMin &&
          data.ageRangeMax &&
          data.ageRangeMin > data.ageRangeMax
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Age range minimum cannot be greater than maximum",
        path: ["ageRangeMax"],
      }
    )
    .refine(
      (data) => {
        if (data.photos && data.photos.length > 0) {
          const mainPhotos = data.photos.filter((photo) => photo.isMain);
          return mainPhotos.length <= 1;
        }
        return true;
      },
      {
        message: "Only one photo can be set as main",
        path: ["photos"],
      }
    ),
});

const getProfilesValidation = z.object({
  query: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, "Page must be a positive number"),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 10))
      .refine(
        (val) => val > 0 && val <= 100,
        "Limit must be between 1 and 100"
      ),
    sortBy: z
      .enum(["createdAt", "lastActive", "distance", "age"])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
    minAge: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || (val >= 18 && val <= 100),
        "Min age must be between 18 and 100"
      ),
    maxAge: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || (val >= 18 && val <= 100),
        "Max age must be between 18 and 100"
      ),
    gender: z.enum(["male", "female", "other"]).optional(),
    interests: z
      .string()
      .optional()
      .transform((val) => (val ? val.split(",") : undefined)),
    maxDistance: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined))
      .refine(
        (val) => val === undefined || (val > 0 && val <= 500),
        "Max distance must be between 1 and 500 km"
      ),
    longitude: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .refine(
        (val) => val === undefined || (val >= -180 && val <= 180),
        "Longitude must be between -180 and 180"
      ),
    latitude: z
      .string()
      .optional()
      .transform((val) => (val ? parseFloat(val) : undefined))
      .refine(
        (val) => val === undefined || (val >= -90 && val <= 90),
        "Latitude must be between -90 and 90"
      ),
  }),
});

const getUserIdValidation = z.object({
  params: z.object({
    userId: z
      .string({
        required_error: "User ID is required",
      })
      .regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
  }),
});

export const ProfileValidations = {
  createProfileValidation,
  updateProfileValidation,
  getProfilesValidation,
  getUserIdValidation,
};
