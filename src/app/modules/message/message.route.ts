import { Router } from "express";
import auth from "../../middlewares/auth";
import { chatUpload, processChatImages } from "../../middlewares/chatUploadHandler";
import { MessageController } from "./message.controller";
import validateRequest from "../../middlewares/validateRequest";
import { MessageValidation } from "./message.validation";
import { USER_ROLES } from "../user/user.constant";

const router = Router();

router.get(
  "/chat/:userId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(MessageValidation.getChatMessagesSchema),
  MessageController.getChatMessages,
);

router.post(
  "/image",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  chatUpload.fields([
    { name: "image", maxCount: 1 },
    { name: "images", maxCount: 10 },
  ]),
  processChatImages,
  MessageController.createMessageWithImages,
);

router.post(
  "/audio",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  chatUpload.fields([{ name: "audio", maxCount: 1 }]),
  MessageController.createMessageWithAudio,
);

router.patch(
  "/mark-read",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(MessageValidation.markAsReadSchema),
  MessageController.markMessagesAsRead,
);

export const MessageRoutes: Router = router;
