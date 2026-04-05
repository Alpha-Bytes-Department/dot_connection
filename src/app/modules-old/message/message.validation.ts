import { z } from "zod";

const createMessageSchema = z.object({
  body: z.object({
    senderId: z.string({
      required_error: "Sender ID is required",
    }),
    receiverId: z.string({
      required_error: "Receiver ID is required",
    }),
    message: z.string().optional(),
    messageType: z.enum(["text", "image", "audio"]).optional(),
  }),
});

const getChatMessagesSchema = z.object({
  params: z.object({
    userId: z.string({
      required_error: "User ID is required",
    }),
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

const markAsReadSchema = z.object({
  body: z.object({
    senderId: z.string({
      required_error: "Sender ID is required",
    }),
    receiverId: z.string({
      required_error: "Receiver ID is required",
    }),
  }),
});

export const MessageValidation = {
  createMessageSchema,
  getChatMessagesSchema,
  markAsReadSchema,
};
