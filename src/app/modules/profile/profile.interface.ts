export type TLocation = {
  type: "Point";
  coordinates: [number, number];
  address?: string;
};

export type TProfile = {
  id?: string;
  userId: string | any;
  bio?: string;
  location?: TLocation;
  photos?: string[];
  interests?: string[];
  lookingFor?: string;
  maxDistance?: number;
  ageRangeMin?: number;
  ageRangeMax?: number;
  gender?: "male" | "female" | "other";
  interestedIn?: "male" | "female" | "everyone";
  height?: number;
  workplace?: string;
  school?: string;
  hometown?: string;
  jobTitle?: string;
  smokingStatus?: string;
  drinkingStatus?: string;
  studyLevel?: string;
  religious?: string;
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
}
