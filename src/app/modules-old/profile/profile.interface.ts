import { Model, Types } from "mongoose";
import {
  PROFILE_DRINKING_STATUS,
  PROFILE_INTERESTS,
  PROFILE_RELIGION,
  PROFILE_SMOKING_STATUS,
  PROFILE_STUDY_LEVEL,
} from "./profile.constant";

export type TLocation = {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
  address?: string;
};

export type TProfile = {
  userId: Types.ObjectId; // This will be the primary identifier (_id)
  bio?: string;
  location?: TLocation;
  photos?: string[];
  interests?: (typeof PROFILE_INTERESTS)[keyof typeof PROFILE_INTERESTS][];
  lookingFor?: string; // "friendship", "dating", "relationship", "networking"
  maxDistance?: number; // in kilometers
  ageRangeMin?: number;
  ageRangeMax?: number;
  gender?: "male" | "female" | "other";
  interestedIn?: "male" | "female" | "everyone";
  height?: number; // in cm
  workplace?: string;
  school?: string;
  hometown?: string;
  jobTitle?: string;
  smokingStatus?: (typeof PROFILE_SMOKING_STATUS)[keyof typeof PROFILE_SMOKING_STATUS];
  drinkingStatus?: (typeof PROFILE_DRINKING_STATUS)[keyof typeof PROFILE_DRINKING_STATUS];
  studyLevel?: (typeof PROFILE_STUDY_LEVEL)[keyof typeof PROFILE_STUDY_LEVEL];
  religious?: (typeof PROFILE_RELIGION)[keyof typeof PROFILE_RELIGION][];
  profileViews?: number;
  hiddenFields?: {
    gender: boolean;
    hometown: boolean;
    workplace: boolean;
    jobTitle: boolean;
    school: boolean;
    studyLevel: boolean;
    religious: boolean;
    drinkingStatus: boolean;
    smokingStatus: boolean;
  };
  lastActive?: Date;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ProfileModal = {
  findByUserId(userId: string): Promise<TProfile | null>;
  calculateCompleteness(profile: TProfile): number;
} & Model<TProfile>;
export namespace TReturnProfile {
  export type Meta = {
    page: number;
    limit: number;
    totalPage: number;
    total: number;
  };
  export type getAllProfiles = {
    result: TProfile[];
    meta?: Meta;
  };
  export type getSingleProfile = TProfile;
  export type updateProfile = TProfile;
  export type createProfile = TProfile;
}
