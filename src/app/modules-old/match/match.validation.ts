import { z } from "zod";

const performAction = z.object({
  body: z.object({
    toUserId: z.string().min(1, "User ID is required"),
    action: z.enum(["skip", "love"], {
      errorMap: () => ({ message: "Action must be skip or love" }),
    }),
  }).strict(),
});

const respondToRequest = z.object({
  body: z.object({
    action: z.enum(["accept", "reject"], {
      errorMap: () => ({ message: "Action must be accept or reject" }),
    }),
  }).strict(),
});

export const MatchValidation = {
  performAction,
  respondToRequest,
};
