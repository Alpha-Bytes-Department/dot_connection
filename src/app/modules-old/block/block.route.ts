import { Router } from "express";
import auth from "../../middlewares/auth";
import { BlockController } from "./block.controller";
import validateRequest from "../../middlewares/validateRequest";
import { BlockValidation } from "./block.validation";
import { USER_ROLES } from "../user/user.constant";

const router = Router();

// Block a user
router.post(
  "/block/:userId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(BlockValidation.blockUserSchema),
  BlockController.blockUser
);

// Unblock a user
router.post(
  "/unblock/:userId", 
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(BlockValidation.unblockUserSchema),
  BlockController.unblockUser
);

// Get list of blocked users
router.get(
  "/blocked-users",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  BlockController.getBlockedUsers
);

// Check if users are blocking each other
router.get(
  "/status/:userId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(BlockValidation.blockUserSchema),
  BlockController.checkBlockStatus
);

export const BlockRoutes: Router = router;
