import { z } from "zod";

const PROFILE_SMOKING_STATUS = [
  "Yes",
  "Occasionally",
  "Prefer Not to Say",
  "No",
] as const;
const PROFILE_DRINKING_STATUS = [
  "Yes",
  "Occasionally",
  "Prefer Not to Say",
  "No",
] as const;
const PROFILE_STUDY_LEVEL = [
  "highSchool",
  "underGraduation",
  "postGraduation",
  "preferNotToSay",
] as const;
const PROFILE_RELIGION = [
  "buddhist",
  "christian",
  "muslim",
  "atheist",
  "catholic",
  "hindu",
  "spiritual",
  "jewish",
  "agnostic",
  "other",
  "prefer_not_to_say",
] as const;
const PROFILE_INTERESTS = [
  "travel",
  "art",
  "fitness",
  "photography",
  "cooking",
  "reading",
  "hiking",
  "fashion",
  "craft_beer",
  "dancing",
  "sports",
  "tango",
  "music",
  "movies",
  "gaming",
  "yoga",
] as const;

const locationSchema = z
  .object({
    type: z
      .enum(["Point", "point"])
      .transform(() => "Point")
      .default("Point"),
    coordinates: z
      .array(z.number())
      .length(2, "Coordinates must have exactly 2 numbers [longitude, latitude]"),
    address: z.string().trim().optional(),
  })
  .optional();

const createUser = z.object({
  body: z
    .object({
      email: z.string().email("Invalid email address").trim().toLowerCase().optional(),
      phoneNumber: z
        .string()
        .trim()
        .regex(
          /^\+[1-9]\d{1,14}$/,
          "Invalid phone number format. Use E.164 format with + prefix (e.g., +1234567890)",
        )
        .optional(),
      fcmToken: z.string().trim().optional(),
    })
    .strict()
    .refine((data) => data.email || data.phoneNumber, {
      message: "Either email or phoneNumber must be provided",
      path: ["email"],
    }),
});

const verifyOTP = z.object({
  body: z
    .object({
      email: z.string().email("Invalid email address").trim().toLowerCase().optional(),
      phoneNumber: z
        .string()
        .trim()
        .regex(
          /^\+[1-9]\d{1,14}$/,
          "Invalid phone number format. Use E.164 format with + prefix (e.g., +1234567890)",
        )
        .optional(),
      otp: z
        .string()
        .min(6, "OTP must be 6 digits")
        .max(6, "OTP must be 6 digits")
        .regex(/^\d{6}$/, "OTP must be 6 digits"),
      fcmToken: z.string().trim().optional(),
    })
    .strict()
    .refine((data) => data.email || data.phoneNumber, {
      message: "Either email or phoneNumber must be provided",
      path: ["email"],
    }),
});

const updateUser = z.object({
  data: z
    .object({
      firstName: z
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(50, "First name can't be more than 50 characters")
        .regex(
          /^[a-zA-ZÀ-ÿ\u00f1\u00d1'-\s]+$/,
          "First name contains invalid characters",
        )
        .trim()
        .optional(),
      lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(50, "Last name can't be more than 50 characters")
        .regex(
          /^[a-zA-ZÀ-ÿ\u00f1\u00d1'-\s]+$/,
          "Last name contains invalid characters",
        )
        .trim()
        .optional(),
      phoneNumber: z.string().trim().optional(),
      fcmToken: z.string().nullable().optional(),
      pushNotification: z.boolean().optional(),
      dateOfBirth: z
        .string()
        .or(z.date())
        .optional()
        .refine((date) => !date || new Date(date) < new Date(), {
          message: "Date of birth cannot be in the future",
        })
        .refine((date) => {
          if (!date) return true;
          const birthDate = new Date(date);
          const today = new Date();
          return today.getFullYear() - birthDate.getFullYear() >= 4;
        }, { message: "Must be at least 4 years old" }),
    })
    .strict()
    .nullable(),
});

const updateUserActivationStatus = z.object({
  body: z.object({ status: z.enum(["active", "delete"]) }).strict(),
});

const updateUserRole = z.object({
  body: z.object({ role: z.enum(["ADMIN", "USER"]) }).strict(),
});

const addUserFields = z.object({
  body: z
    .object({
      firstName: z
        .string()
        .min(2, "First name must be at least 2 characters long")
        .max(50, "First name can't be more than 50 characters")
        .regex(
          /^[a-zA-ZÀ-ÿ\u00f1\u00d1'-\s]+$/,
          "First name contains invalid characters",
        )
        .trim(),
      lastName: z
        .string()
        .min(2, "Last name must be at least 2 characters long")
        .max(50, "Last name can't be more than 50 characters")
        .regex(
          /^[a-zA-ZÀ-ÿ\u00f1\u00d1'-\s]+$/,
          "Last name contains invalid characters",
        )
        .trim(),
      dateOfBirth: z
        .string()
        .or(z.date())
        .refine((date) => !date || new Date(date) < new Date(), {
          message: "Date of birth cannot be in the future",
        })
        .refine((date) => {
          if (!date) return true;
          const birthDate = new Date(date);
          const today = new Date();
          return today.getFullYear() - birthDate.getFullYear() >= 4;
        }, { message: "Must be at least 4 years old" }),
      pushNotification: z.boolean().optional(),
    })
    .strict(),
});

const addProfileFields = z.object({
  body: z
    .object({
      location: locationSchema,
      gender: z.string().min(1, "Gender is required"),
      interestedIn: z.string().min(1, "Interested in is required"),
      height: z.number().min(1, "Height is required"),
      interests: z.array(z.enum(PROFILE_INTERESTS)).max(11).optional(),
      lookingFor: z.string().min(1, "Looking for is required"),
      ageRangeMin: z.number().min(14, "Minimum age must be 14"),
      ageRangeMax: z.number().max(130, "Maximum age cannot exceed 130"),
      maxDistance: z.number().min(1, "Maximum distance must be at least 1"),
      hometown: z.string().min(1, "Hometown is required"),
      workplace: z.string().min(1, "Workplace is required"),
      jobTitle: z.string().min(1, "Job title is required"),
      school: z.string().min(1, "School is required"),
      studyLevel: z.enum(PROFILE_STUDY_LEVEL).optional(),
      religious: z.enum(PROFILE_RELIGION).optional(),
      smokingStatus: z.enum(PROFILE_SMOKING_STATUS).optional(),
      drinkingStatus: z.enum(PROFILE_DRINKING_STATUS).optional(),
      bio: z.string().min(1, "Bio is required"),
      hiddenFields: z
        .object({
          gender: z.boolean().optional(),
          hometown: z.boolean().optional(),
          workplace: z.boolean().optional(),
          jobTitle: z.boolean().optional(),
          school: z.boolean().optional(),
          studyLevel: z.boolean().optional(),
          religious: z.boolean().optional(),
          drinkingStatus: z.boolean().optional(),
          smokingStatus: z.boolean().optional(),
        })
        .optional(),
    })
    .strict(),
});

const updateProfileFields = z.object({
  data: z
    .object({
      location: locationSchema,
      gender: z.string().min(1, "Gender is required").optional(),
      interestedIn: z.string().min(1, "Interested in is required").optional(),
      height: z.number().min(1, "Height is required").optional(),
      interests: z.array(z.enum(PROFILE_INTERESTS)).max(11).optional(),
      lookingFor: z.string().min(1, "Looking for is required").optional(),
      ageRangeMin: z.number().min(14, "Minimum age must be 14").optional(),
      ageRangeMax: z.number().max(130, "Maximum age cannot exceed 130").optional(),
      maxDistance: z.number().min(1, "Maximum distance must be at least 1").optional(),
      hometown: z.string().min(1, "Hometown is required").optional(),
      workplace: z.string().min(1, "Workplace is required").optional(),
      jobTitle: z.string().min(1, "Job title is required").optional(),
      school: z.string().min(1, "School is required").optional(),
      studyLevel: z.enum(PROFILE_STUDY_LEVEL).optional(),
      religious: z.enum(PROFILE_RELIGION).optional(),
      smokingStatus: z.enum(PROFILE_SMOKING_STATUS).optional(),
      drinkingStatus: z.enum(PROFILE_DRINKING_STATUS).optional(),
      bio: z.string().min(1, "Bio is required").optional(),
    })
    .strict(),
});

const getNearbyUsers = z.object({
  query: z
    .object({
      radius: z
        .string()
        .optional()
        .refine((val) => !val || (!Number.isNaN(Number(val)) && Number(val) > 0), {
          message: "Radius must be a positive number",
        }),
      latitude: z
        .string()
        .optional()
        .refine(
          (val) =>
            !val || (!Number.isNaN(Number(val)) && Number(val) >= -90 && Number(val) <= 90),
          { message: "Latitude must be a number between -90 and 90" },
        ),
      longitude: z
        .string()
        .optional()
        .refine(
          (val) =>
            !val || (!Number.isNaN(Number(val)) && Number(val) >= -180 && Number(val) <= 180),
          { message: "Longitude must be a number between -180 and 180" },
        ),
      gender: z.enum(["male", "female", "other"]).optional(),
      interests: z
        .string()
        .optional()
        .refine((val) => {
          if (!val) return true;
          const interestArray = val.split(",").map((i) => i.trim());
          return interestArray.every((interest) =>
            PROFILE_INTERESTS.includes(interest as (typeof PROFILE_INTERESTS)[number]),
          );
        }, { message: "Invalid interests provided" }),
      interestedIn: z.enum(["male", "female", "everyone"]).optional(),
      lookingFor: z.enum(["friendship", "dating", "relationship", "networking"]).optional(),
      religious: z.enum(PROFILE_RELIGION).optional(),
      studyLevel: z.enum(PROFILE_STUDY_LEVEL).optional(),
    })
    .refine(
      (data) => (data.latitude !== undefined) === (data.longitude !== undefined),
      {
        message:
          "Both latitude and longitude must be provided together, or neither should be provided",
        path: ["latitude"],
      },
    ),
});

const updateHiddenFields = z.object({
  body: z
    .object({
      hiddenFields: z
        .object({
          gender: z.boolean().optional(),
          hometown: z.boolean().optional(),
          workplace: z.boolean().optional(),
          jobTitle: z.boolean().optional(),
          school: z.boolean().optional(),
          studyLevel: z.boolean().optional(),
          religious: z.boolean().optional(),
          drinkingStatus: z.boolean().optional(),
          smokingStatus: z.boolean().optional(),
        })
        .refine((data) => Object.keys(data).length > 0, {
          message: "At least one hidden field must be provided",
        }),
    })
    .strict(),
});

export const UserValidation = {
  createUser,
  updateUser,
  updateUserActivationStatus,
  updateUserRole,
  verifyOTP,
  addUserFields,
  addProfileFields,
  updateProfileFields,
  getNearbyUsers,
  updateHiddenFields,
};
