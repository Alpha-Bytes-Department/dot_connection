import { z } from "zod";

const blockUserSchema = z.object({
  params: z.object({
    userId: z.string({
      required_error: "User ID is required",
    }).regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
  }),
});

const unblockUserSchema = z.object({
  params: z.object({
    userId: z.string({
      required_error: "User ID is required", 
    }).regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
  }),
});

export const BlockValidation = {
  blockUserSchema,
  unblockUserSchema,
};
