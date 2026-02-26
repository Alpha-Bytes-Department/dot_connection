import express, { Router } from "express";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";
import fileUploadHandler from "../../middlewares/fileUploadHandler";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "./user.constant";

import { authLimiter} from "../../middlewares/security";

const router = express.Router();

// User routes

//! both for login and create account
//!mine
router.post(
  "/",
  authLimiter, 
  validateRequest(UserValidation.createUser),
  UserController.createUser
);
//!admin route
router.get(
  "/",
  auth(USER_ROLES.ADMIN, USER_ROLES.USER),
  UserController.getAllUsers
);

//!mine
router.get("/getme", auth(), UserController.getMe);


//!mine - Get nearby users within specified radius (default 25km)
router.get(
  "/nearby",
  auth(),
  validateRequest(UserValidation.getNearbyUsers),
  UserController.getNearbyUsers
);

//!mine
router.put(
  "/add-user-fields",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(UserValidation.addUserFields),
  UserController.addUserFields
);
//!mine
router.put(
  "/add-profile-fields",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(UserValidation.addProfileFields),
  UserController.addProfileFields
);

//!mine - Get user by ID
router.get("/:id", auth(), UserController.getUserById);

//!mine
router.patch(
  "/update-user",
  auth(),
  fileUploadHandler,
  validateRequest(UserValidation.updateUser),
  UserController.updateUserByToken
);

//!mine
router.patch(
  "/update-profile",
  auth(),
  fileUploadHandler,
  validateRequest(UserValidation.updateProfileFields),
  UserController.updateProfileByToken
);

//!mine - Update hidden fields for user profile
router.patch(
  "/update-hidden-fields",
  auth(),
  validateRequest(UserValidation.updateHiddenFields),
  UserController.updateHiddenFields
);

//!mine - Get Persona verification URL
router.get(
  "/persona/verification-url",
  auth(),
  UserController.getPersonaVerificationUrl
);

//!mine - Persona webhook endpoint (no auth, verified via signature)
router.post(
  "/persona/webhook",
  UserController.personaWebhook
);

//!mine
router.delete(
  "/profile/image/:imageIndex",
  auth(),
  UserController.deleteProfileImage
);
//!mine
router.patch(
  "/:id/status",
  validateRequest(UserValidation.updateUserActivationStatus),
  UserController.updateUserActivationStatus
);
//!admin route
router.patch(
  "/:id/role",
  validateRequest(UserValidation.updateUserRole),
  UserController.updateUserRole
);


//!mine
router.post(
  "/verify-otp",
  validateRequest(UserValidation.verifyOTP),
  UserController.verifyOTPAndLogin
);
//!mine
router.delete("/delete", auth(), UserController.changeUserStatus);


/**
 * Delete user account (soft delete by changing status to "delete")
 * 
 * @author - @shaishab316
 */
router.delete("/delete-account", auth(), UserController.deleteUser);

export const UserRoutes: Router = router;
