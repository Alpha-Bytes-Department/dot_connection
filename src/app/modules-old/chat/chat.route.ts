import { Router } from "express";
import auth from "../../middlewares/auth";
import { ChatController } from "./chat.controller";

const router = Router();

router.get("/", auth(), ChatController.getChatList);

export const ChatRoutes: Router = router;
