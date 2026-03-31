import { Router } from "express";
import auth from "../../middlewares/auth";
import { SettingController } from "./setting.controller";
import validateRequest from "../../middlewares/validateRequest";
import { SettingValidation } from "./setting.validation";
import { USER_ROLES } from "../user/user.constant";

const router = Router();

// Create/Update About Us (Admin only)
router.post(
  "/about-us",
  auth(USER_ROLES.ADMIN),
  validateRequest(SettingValidation.createAboutUsSchema),
  SettingController.createAboutUs
);

// Create/Update Privacy Policy (Admin only)
router.post(
  "/privacy-policy",
  auth(USER_ROLES.ADMIN),
  validateRequest(SettingValidation.createPrivacyPolicySchema),
  SettingController.createPrivacyPolicy
);

// Create/Update Terms and Conditions (Admin only)
router.post(
  "/terms-and-conditions",
  auth(USER_ROLES.ADMIN),
  validateRequest(SettingValidation.createTermsAndConditionsSchema),
  SettingController.createTermsAndConditions
);

// Get all settings (Public - no auth required)
router.get(
  "/",
  SettingController.getSettings
);

export const SettingRoutes: Router = router;
