import { model, Schema } from "mongoose";
import { TProfile, ProfileModal } from "./profile.interface";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";

const locationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["Point"],
      default: "Point",
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: (coords: number[]) => coords.length === 2,
        message: "Coordinates must be [longitude, latitude]",
      },
    },
    address: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const profileSchema = new Schema<TProfile, ProfileModal>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      trim: true,
    },
    location: locationSchema,
    photos: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
      validate: {
        validator: (arr: string[]) => arr.length <= 10,
        message: "Cannot have more than 10 interests",
      },
    },
    lookingFor: {
      type: String,
      enum: ["friendship", "dating", "relationship", "networking"],
    },
    
    maxDistance: {
      type: Number,
      min: 1,
      max: 100,
      default: 25,
    },
    ageRangeMin: {
      type: Number,
      min: 18,
      max: 100,
    },
    ageRangeMax: {
      type: Number,
      min: 18,
      max: 100,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    interestedIn: {
      type: String,
      enum: ["male", "female", "everyone"],
    },
    height: {
      type: Number,
      min: 100,
      max: 250,
    },
    workplace: {
      type: String,
      trim: true,
    },
    school: {
      type: String,
      trim: true,
    },
    hometown: {
      type: String,
      trim: true,
    },
    jobTitle: {
      type: String,
      trim: true,
    },
    smokingStatus: {
      type: String,
      enum: ["Yes", "Occasionally", "Prefer Not to Say", "No"],
    },
    drinkingStatus: {
      type: String,
      enum: ["Yes", "Occasionally", "Prefer Not to Say", "No"],
    },
    studyLevel: {
      type: String,
      enum: [
        "highSchool",
        "underGraduation",
        "postGraduation",
        "preferNotToSay",
      ],
    },
   
    religious: {
      type: String,
      enum: [
        "buddhist",
        "christian",
        "muslim",
        "atheist",
        "catholic",
        "hindu",
        "spiritual",
        "jewish",
        "agnostic",
        "other",
        "prefer_not_to_say",
      ],
      default: "prefer_not_to_say",
    },
    hiddenFields: {
      gender: {
        type: Boolean,
        default: false,
      },
      hometown: {
        type: Boolean,
        default: false,
      },
      workplace: {
        type: Boolean,
        default: false,
      },
      jobTitle: {
        type: Boolean,
        default: false,
      },
      school: {
        type: Boolean,
        default: false,
      },
      studyLevel: {
        type: Boolean,
        default: false,
      },
      religious: {
        type: Boolean,
        default: false,
      },
      drinkingStatus: {
        type: Boolean,
        default: false,
      },
      smokingStatus: {
        type: Boolean,
        default: false,
      },
    },
    profileViews: {
      type: Number,
      default: 0,
    },
    lastActive: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        delete ret.id;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
    versionKey: false,
  }
);

// Indexes for better performance
profileSchema.index({ location: "2dsphere" }); // Geospatial index for location-based queries
profileSchema.index({ interests: 1 });
profileSchema.index({ gender: 1 });
profileSchema.index({ ageRangeMin: 1, ageRangeMax: 1 });
profileSchema.index({ verified: 1 });
profileSchema.index({ lastActive: -1 });
profileSchema.index({ createdAt: -1 });
profileSchema.index({ userId: 1, gender: 1, interestedIn: 1 });
profileSchema.index({ gender: 1, interestedIn: 1 });

// Static method to find profile by user ID
profileSchema.statics.findByUserId = async function (userId: string) {
  return await this.findOne({ userId }).populate({
    path: "userId",
    select: "-authentication",
  });
};

// Static method to calculate profile completeness
profileSchema.statics.calculateCompleteness = function (
  profile: TProfile
): number {
  let completeness = 20; // Base score for having a profile

  if (profile.bio) completeness += 10;
  if (profile.location) completeness += 10;
  if (profile.photos && profile.photos.length > 0) completeness += 15;
  if (profile.interests && profile.interests.length > 0) completeness += 10;
  if (profile.gender) completeness += 5;
  if (profile.interestedIn) completeness += 5;
  if (profile.lookingFor) completeness += 5;
  if (profile.workplace || profile.school) completeness += 5;
  if (profile.hometown) completeness += 5;
  if (profile.height) completeness += 5;
  if (profile.smokingStatus) completeness += 2.5;
  if (profile.drinkingStatus) completeness += 2.5;

  return Math.min(100, completeness);
};


// Validation middleware for age range
profileSchema.pre("save", function (next) {
  if (
    this.ageRangeMin &&
    this.ageRangeMax &&
    this.ageRangeMin > this.ageRangeMax
  ) {
    next(new Error("Age range minimum cannot be greater than maximum"));
  }
  next();
});

// Plugin to include virtuals in lean queries
profileSchema.plugin(mongooseLeanVirtuals);

export const Profile = model<TProfile, ProfileModal>(
  "Profile",
  profileSchema,
  "profiles"
);
