import { z } from "zod";

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

const createProfileValidation = z.object({
  body: z.object({
    bio: z.string().max(500).trim().optional(),
    location: locationSchema,
    interests: z.array(z.string()).max(10).optional(),
  }),
});

const updateProfileValidation = z.object({
  body: z.object({
    bio: z.string().max(500).trim().optional(),
    location: locationSchema,
    interests: z.array(z.string()).max(10).optional(),
  }),
});

const getProfilesValidation = z.object({
  query: z.object({}).passthrough(),
});

const getUserIdValidation = z.object({
  params: z.object({
    userId: z.string().min(1),
  }),
});

export const ProfileValidations = {
  createProfileValidation,
  updateProfileValidation,
  getProfilesValidation,
  getUserIdValidation,
};
