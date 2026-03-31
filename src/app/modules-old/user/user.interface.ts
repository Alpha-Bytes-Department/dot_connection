import { Model } from "mongoose";
import { USER_ROLES } from "./user.constant";
import type { z } from "zod";
import type { UserValidation } from "./user.validation";

export type TUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string; // Made optional - either email or phoneNumber required
  image?: string;
  role?: keyof typeof USER_ROLES;
  phoneNumber?: string;
  fcmToken?: string;
  status?: "active" | "delete";
  verified?: boolean;
  authentication?: {
    oneTimeCode?: string;
    expireAt?: Date;
    loginAttempts?: number;
    lastLoginAttempt?: Date;
  };
  allProfileFieldsFilled: boolean;
  allUserFieldsFilled: boolean;
  isProfileVerified: boolean;
  isPersonaVerified: boolean;
  pushNotification: boolean;
  lastLoginAt?: Date;
  dateOfBirth?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ContactType = 'email' | 'phone';

export type UserModal = {
  isExistUserById(id: string): Promise<TUser | null>;
  isExistUserByEmail(email: string): Promise<TUser | null>;
  isExistUserByPhone(phoneNumber: string): Promise<TUser | null>;
  isExistUserByEmailOrPhone(contact: string): Promise<TUser | null>;
  isValidOTP(contact: string, otp: string): Promise<boolean>;
  generateOTP(contact: string): Promise<string>;
  isOTPExpired(user: TUser): boolean;
  canAttemptLogin(user: TUser): boolean;
} & Model<TUser>;

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



//@author: @shaishab316

///////////////////////////
//! Validation interfaces
///////////////////////////

//? create or login user
export type TCreateOrLoginUserPayload = z.infer<typeof UserValidation.createUser>['body']