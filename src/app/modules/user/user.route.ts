import express, { Router } from "express";
import { UserController } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { UserValidation } from "./user.validation";
import fileUploadHandler from "../../middlewares/fileUploadHandler";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "./user.constant";
import { authLimiter } from "../../middlewares/security";

const router = express.Router();

router.post("/", authLimiter, validateRequest(UserValidation.createUser), UserController.createUser);

router.get("/", auth(USER_ROLES.ADMIN, USER_ROLES.USER), UserController.getAllUsers);
router.get("/getme", auth(), UserController.getMe);

router.get(
  "/nearby",
  auth(),
  validateRequest(UserValidation.getNearbyUsers),
  UserController.getNearbyUsers,
);

router.put(
  "/add-user-fields",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(UserValidation.addUserFields),
  UserController.addUserFields,
);

router.put(
  "/add-profile-fields",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  validateRequest(UserValidation.addProfileFields),
  UserController.addProfileFields,
);

router.get("/:id", auth(), UserController.getUserById);

router.patch(
  "/update-user",
  auth(),
  fileUploadHandler,
  validateRequest(UserValidation.updateUser),
  UserController.updateUserByToken,
);

router.patch(
  "/update-profile",
  auth(),
  fileUploadHandler,
  validateRequest(UserValidation.updateProfileFields),
  UserController.updateProfileByToken,
);

router.patch(
  "/update-hidden-fields",
  auth(),
  validateRequest(UserValidation.updateHiddenFields),
  UserController.updateHiddenFields,
);

router.get("/persona/verification-url", auth(), UserController.getPersonaVerificationUrl);
router.post("/persona/webhook", UserController.personaWebhook);
router.delete("/profile/image/:imageIndex", auth(), UserController.deleteProfileImage);

router.patch(
  "/:id/status",
  validateRequest(UserValidation.updateUserActivationStatus),
  UserController.updateUserActivationStatus,
);

router.patch(
  "/:id/role",
  validateRequest(UserValidation.updateUserRole),
  UserController.updateUserRole,
);

router.post(
  "/verify-otp",
  validateRequest(UserValidation.verifyOTP),
  UserController.verifyOTPAndLogin,
);

router.delete("/delete", auth(), UserController.changeUserStatus);
router.delete("/delete-account", auth(), UserController.deleteUser);

export const UserRoutes: Router = router;
