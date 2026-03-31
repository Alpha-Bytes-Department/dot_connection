import { z } from "zod";

const createAboutUsSchema = z.object({
  body: z.object({
    aboutUs: z.string({
      required_error: "About us content is required",
    }).min(10, "About us must be at least 10 characters long"),
  }),
});

const createPrivacyPolicySchema = z.object({
  body: z.object({
    privacyPolicy: z.string({
      required_error: "Privacy policy content is required",
    }).min(10, "Privacy policy must be at least 10 characters long"),
  }),
});

const createTermsAndConditionsSchema = z.object({
  body: z.object({
    termsAndConditions: z.string({
      required_error: "Terms and conditions content is required",
    }).min(10, "Terms and conditions must be at least 10 characters long"),
  }),
});

export const SettingValidation = {
  createAboutUsSchema,
  createPrivacyPolicySchema,
  createTermsAndConditionsSchema,
};
