import type { z } from "zod";
import type { UserValidation } from "./user.validation";
import { USER_ROLES } from "./user.constant";

export type TUser = {
  _id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  image?: string | null;
  role?: keyof typeof USER_ROLES;
  phoneNumber?: string | null;
  fcmToken?: string | null;
  status?: "active" | "delete";
  verified?: boolean;
  authentication?: {
    oneTimeCode?: string | null;
    expireAt?: Date | null;
    loginAttempts?: number;
    lastLoginAttempt?: Date | null;
  };
  allProfileFieldsFilled: boolean;
  allUserFieldsFilled: boolean;
  isProfileVerified: boolean;
  isPersonaVerified: boolean;
  pushNotification: boolean;
  lastLoginAt?: Date | null;
  dateOfBirth?: Date | null;
  profile?: any;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ContactType = "email" | "phone";

export namespace TReturnUser {
  export type Meta = {
    page: number;
    limit: number;
    totalPage: number;
    total: number;
  };
  export type getAllUser = {
    result: TUser[];
    meta?: Meta;
  };
}

export type TCreateOrLoginUserPayload = z.infer<
  typeof UserValidation.createUser
>["body"];
