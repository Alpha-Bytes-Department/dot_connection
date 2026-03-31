import { z } from "zod";

const getChatListSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export const ChatValidation = {
  getChatListSchema,
};
