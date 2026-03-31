import { Router } from "express";
import auth from "../../middlewares/auth";
import { SettingController } from "./setting.controller";
import validateRequest from "../../middlewares/validateRequest";
import { SettingValidation } from "./setting.validation";
import { USER_ROLES } from "../user/user.constant";

const router = Router();

router.post(
  "/about-us",
  auth(USER_ROLES.ADMIN),
  validateRequest(SettingValidation.createAboutUsSchema),
  SettingController.createAboutUs,
);

router.post(
  "/privacy-policy",
  auth(USER_ROLES.ADMIN),
  validateRequest(SettingValidation.createPrivacyPolicySchema),
  SettingController.createPrivacyPolicy,
);

router.post(
  "/terms-and-conditions",
  auth(USER_ROLES.ADMIN),
  validateRequest(SettingValidation.createTermsAndConditionsSchema),
  SettingController.createTermsAndConditions,
);

router.get("/", SettingController.getSettings);

export const SettingRoutes: Router = router;
