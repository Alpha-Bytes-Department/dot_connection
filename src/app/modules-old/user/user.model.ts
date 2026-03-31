import { model, Schema } from "mongoose";
import { TUser, UserModal } from "./user.interface";
import bcrypt from "bcryptjs";
import config from "../../../config";
import mongooseLeanVirtuals from "mongoose-lean-virtuals";
const userSchema = new Schema<TUser, UserModal>(
  {
    firstName: {
      type: String,
      required: false,
      trim: true,
      minlength: [2, "First name must be at least 2 characters long"],
      maxlength: [50, "First name can't be more than 50 characters"],
      match: [
        /^[a-zA-ZÀ-ÿ\u00f1\u00d1'-\s]+$/,
        "First name contains invalid characters",
      ],
    },
    lastName: {
      type: String,
      required: false,
      trim: true,
      minlength: [2, "Last name must be at least 2 characters long"],
      maxlength: [50, "Last name can't be more than 50 characters"],
      match: [
        /^[a-zA-ZÀ-ÿ\u00f1\u00d1'-\s]+$/,
        "Last name contains invalid characters",
      ],
    },
    email: {
      type: String,
      required: false, // Changed to optional - either email or phoneNumber required
      unique: true,
      sparse: true, // Allows multiple null values while maintaining unique constraint
      trim: true,
      lowercase: true,
      validate: {
        validator: (value: string) => {
          if (!value) return true; // Allow empty if phoneNumber is provided
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(value);
        },
        message: "Please provide a valid email",
      },
    },
    image: {
      type: String,
      trim: true,
      default: null,
    },
  
    role: {
      type: String,
      enum: ["ADMIN", "USER"],
      default: "USER",
    },

    phoneNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true, // Allows multiple null values while maintaining unique constraint
      required: false,
      validate: {
        validator: (value: string) => {
          if (!value) return true; // Allow empty if email is provided
          // E.164 format validation for international phone numbers (with required + prefix)
          const phoneRegex = /^\+[1-9]\d{1,14}$/;
          return phoneRegex.test(value);
        },
        message: "Please provide a valid phone number in E.164 format with + prefix (e.g., +1234567890)",
      },
    },

    fcmToken: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["active", "delete"],
      default: "active",
    },
    verified: {
      type: Boolean,
      default: false,
    },
    allProfileFieldsFilled: {
      type: Boolean,
      default: false,
    },
    allUserFieldsFilled: {
      type: Boolean,
      default: false,
    },
    isProfileVerified: {
      type: Boolean,
      default: false,
    },
    isPersonaVerified: {
      type: Boolean,
      default: false,
    },
    authentication: {
      oneTimeCode: {
        type: String,
        default: null,
      },
      expireAt: {
        type: Date,
        default: null,
      },
      loginAttempts: {
        type: Number,
        default: 0,
      },
      lastLoginAttempt: {
        type: Date,
        default: null,
      },
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    pushNotification: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Remove the auto-generated id property
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

// Custom validation: At least one of email or phoneNumber must be provided
userSchema.pre('validate', function(next) {
  if (!this.email && !this.phoneNumber) {
    this.invalidate('email', 'Either email or phone number must be provided');
    this.invalidate('phoneNumber', 'Either email or phone number must be provided');
  }
  next();
});
userSchema.index({ status: 1 });
// this for better index performance
userSchema.index({ createdAt: -1 });
userSchema.index({ 
  verified: 1, 
  allProfileFieldsFilled: 1, 
  allUserFieldsFilled: 1, 
  status: 1 
});
userSchema.index({ lastLoginAt: -1 });
userSchema.index({ dateOfBirth: 1 });
userSchema.index({ firstName: "text", lastName: "text" });
userSchema.index({ _id: 1, verified: 1, status: 1 });
userSchema.virtual("fullName").get(function () {
  const user = this as unknown as TUser;
  return `${user.firstName} ${user.lastName}`;
});

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
  const isExist = await User.findById(id);
  return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
  const isExist = await User.findOne({ email });
  return isExist;
};

userSchema.statics.isExistUserByPhone = async (phoneNumber: string) => {
  const isExist = await User.findOne({ phoneNumber });
  return isExist;
};

userSchema.statics.isExistUserByEmailOrPhone = async (contact: string) => {
  const isExist = await User.findOne({
    $or: [{ email: contact }, { phoneNumber: contact }]
  });
  return isExist;
};

//generate and store OTP
userSchema.statics.generateOTP = async function (
  contact: string
): Promise<string> {
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
  const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  await this.findOneAndUpdate(
    { $or: [{ email: contact }, { phoneNumber: contact }] },
    {
      $set: {
        "authentication.oneTimeCode": otpCode,
        "authentication.expireAt": expireAt,
      },
    }
  );

  return otpCode;
};

//validate OTP
userSchema.statics.isValidOTP = async function (
  contact: string,
  otp: string
): Promise<boolean> {
  //? This is a temporary bypass for OTP validation during development/testing.
  if(contact === "testg@gmail.com" && otp === "123456"){ 
    return true;
  }

  const user = await this.findOne({
    $or: [{ email: contact }, { phoneNumber: contact }]
  });
  if (
    !user ||
    !user.authentication?.oneTimeCode ||
    !user.authentication?.expireAt
  ) {
    return false;
  }

  const now = new Date();
  const isExpired = now > user.authentication.expireAt;
  const isMatch = user.authentication.oneTimeCode === otp;

  return !isExpired && isMatch;
};

//check if OTP is expired
userSchema.statics.isOTPExpired = function (user: TUser): boolean {
  if (!user.authentication?.expireAt) return true;
  return new Date() > user.authentication.expireAt;
};

//check if user can attempt login (rate limiting)
userSchema.statics.canAttemptLogin = function (user: TUser): boolean {
  const maxAttempts = 5;
  const lockoutTime = 15 * 60 * 1000; // 15 minutes

  if (!user.authentication?.loginAttempts) return true;

  if (user.authentication.loginAttempts >= maxAttempts) {
    if (!user.authentication.lastLoginAttempt) return false;

    const timeSinceLastAttempt =
      Date.now() - user.authentication.lastLoginAttempt.getTime();
    return timeSinceLastAttempt > lockoutTime;
  }

  return true;
};

//pre-save hook to clear expired OTPs
userSchema.pre("save", async function (next) {
  // Clear expired OTP
  const user = this as unknown as TUser;
  if (
    user.authentication?.expireAt &&
    new Date() > user.authentication.expireAt
  ) {
    user.authentication.oneTimeCode = undefined;
    user.authentication.expireAt = undefined;
  }
  next();
});

// Remove sensitive fields from query results
userSchema.pre(/^find/, function (this: any, next) {
  if (this.getQuery && this.getProjection) {
    const projection = this.getProjection();
    if (!projection || Object.keys(projection).length === 0) {
      this.select("-authentication.oneTimeCode");
    }
  }
  next();
});
// Plugin to include virtuals in lean queries.
userSchema.plugin(mongooseLeanVirtuals);

export const User = model<TUser, UserModal>("User", userSchema, "users");
