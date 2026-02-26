import { StatusCodes } from "http-status-codes";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import UserCacheManage from "./user.cacheManage";
import type { ContactType, TCreateOrLoginUserPayload, TReturnUser, TUser } from "./user.interface";
import { User } from "./user.model";
import mongoose from "mongoose";
import { emailTemplate } from "../../../mail/emailTemplate";
import { emailHelper } from "../../../mail/emailHelper";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import { Profile } from "../profile/profile.model";
import unlinkFile from "../../../shared/unlinkFile";
import { TProfile } from "../profile/profile.interface";
import { sendOtp } from "../../../helpers/twilioSendMessage";
import { 
  createPersonaInquiry, 
  verifyPersonaWebhookSignature 
} from "../../../shared/personaService";

// Helper function to identify if contact is email or phone number
const identifyContactType = (contact: string): ContactType => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phoneRegex = /^\+[1-9]\d{1,14}$/; // E.164 format with required + prefix

  if (emailRegex.test(contact)) return "email";
  if (phoneRegex.test(contact)) return "phone";

  throw new AppError(
    StatusCodes.BAD_REQUEST,
    "Invalid contact format. Provide a valid email or phone number in E.164 format."
  );
};

const getUserById = async (id: string) => {
  console.log(id);
  // First check cache
  const cached = await UserCacheManage.getCacheSingleUser(id);
  if (cached) {
    // Apply hidden fields filtering to cached data
    return applyHiddenFieldsFilter(cached);
  }

  // If not cached, query the database using lean with virtuals enabled.
  const user = await User.findById(id).lean();
  const profile = await Profile.findOne({ userId: id }).lean();
  if (profile) {
    (user as any).profile = profile || null;
  }

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  await UserCacheManage.setCacheSingleUser(id, user);

  // Apply hidden fields filtering before returning
  return applyHiddenFieldsFilter(user);
};

// Helper function to filter out hidden fields from user profile
const applyHiddenFieldsFilter = (user: any) => {
  if (!user.profile || !user.profile.hiddenFields) {
    return user;
  }

  const { hiddenFields } = user.profile;
  const filteredUser = { ...user };

  if (filteredUser.profile) {
    filteredUser.profile = { ...filteredUser.profile };

    // Remove fields that are marked as hidden
    if (hiddenFields.gender) delete filteredUser.profile.gender;
    if (hiddenFields.hometown) delete filteredUser.profile.hometown;
    if (hiddenFields.workplace) delete filteredUser.profile.workplace;
    if (hiddenFields.jobTitle) delete filteredUser.profile.jobTitle;
    if (hiddenFields.school) delete filteredUser.profile.school;
    if (hiddenFields.studyLevel) delete filteredUser.profile.studyLevel;
    if (hiddenFields.religious) delete filteredUser.profile.religious;
    if (hiddenFields.drinkingStatus) delete filteredUser.profile.drinkingStatus;
    if (hiddenFields.smokingStatus) delete filteredUser.profile.smokingStatus;
  }

  return filteredUser;
};

const updateUserActivationStatus = async (
  id: string,
  status: "active" | "delete"
) => {
  // console.log(status);
  // console.log(id);

  const user = await User.findByIdAndUpdate(
    id,
    { status: status },
    { new: true }
  );
  // console.log(user);
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
  //remove cache
  await UserCacheManage.updateUserCache(id);

  //set new cache
  // UserCacheManage.setCacheSingleUser(id, user);
  return user;
};
const updateUserRole = async (
  id: string,
  role: "USER" | "ADMIN"
): Promise<Partial<TUser>> => {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { role } },
    { new: true }
  );
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
  //remove cache
  await UserCacheManage.updateUserCache(id);

  return user;
};

const changeUserStatus = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
  let status = user.status;
  if (user.role === "ADMIN") {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "You can't change admin status"
    );
  }
  if (user.status === "active") {
    status = "delete";
  } else {
    status = "active";
  }
  await User.findByIdAndUpdate(userId, { status }, { new: true });
  //remove cache
  await UserCacheManage.updateUserCache(userId);
  return user;
};

// Send OTP for login
const sendOTPForLogin = async (contact: string) => {
  const contactType = identifyContactType(contact);

  const user = await User.isExistUserByEmailOrPhone(contact);
  if (!user) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `User not found with this ${contactType}`
    );
  }

  // Check rate limiting
  if (!User.canAttemptLogin(user)) {
    throw new AppError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Too many login attempts. Please try again later."
    );
  }

  // Generate and store OTP
  const otp = await User.generateOTP(contact);
  console.log(otp);

  // Send OTP via email or SMS based on contact type
  if (contactType === "email") {
    const emailContent = emailTemplate.createAccount({
      otp,
      email: contact,
      name: user.firstName || "User",
      theme: "theme-blue",
    });

    await emailHelper.sendEmail({
      to: contact,
      subject: "Your Sign-in Verification Code",
      html: emailContent.html,
    });
  } else {
    // Send via SMS
    await sendOtp(contact, otp);
  }

  return {
    message: `Verification code sent successfully to your ${contactType}`,
    ...(contactType === "email"
      ? { email: contact }
      : { phoneNumber: contact }),
  };
};

// Request new OTP (resend)
const resendOTP = async (contact: string) => {
  return await sendOTPForLogin(contact);
};
//!mine
const verifyOTPAndLogin = async (contact: string, otp: string, fcmToken?: string) => {
  const user = await User.isExistUserByEmailOrPhone(contact);
  if (!user) {
    const contactType = identifyContactType(contact);
    throw new AppError(
      StatusCodes.NOT_FOUND,
      `User not found with this ${contactType}`
    );
  }

  // Check rate limiting
  if (!User.canAttemptLogin(user)) {
    throw new AppError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Too many login attempts. Please try again later."
    );
  }

  // Validate OTP
  const isValidOTP = await User.isValidOTP(contact, otp);
  if (!isValidOTP) {
    // Increment failed attempts
    await User.findByIdAndUpdate(user._id, {
      $inc: { "authentication.loginAttempts": 1 },
      $set: { "authentication.lastLoginAttempt": new Date() },
    });

    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid or expired OTP");
  }

  // Clear OTP completely and reset login attempts, optionally update FCM token
  const updateData: any = {
    $unset: {
      "authentication.oneTimeCode": 1,
      "authentication.expireAt": 1,
    },
    $set: {
      "authentication.loginAttempts": 0,
      lastLoginAt: new Date(),
      verified: true,
    },
  };

  // Add FCM token to update if provided
  if (fcmToken) {
    updateData.$set.fcmToken = fcmToken;
  }

  await User.findByIdAndUpdate(user._id, updateData);

  // Generate JWT token
  const jwtPayload = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
    image: user.image,
    verified: true,
    allProfileFieldsFilled: user.allProfileFieldsFilled || false,
    allUserFieldsFilled: user.allUserFieldsFilled || false,
  };

  const accessToken = jwtHelper.createToken(
    jwtPayload,
    config.jwt.jwt_secret as string,
    config.jwt.jwt_expire_in as string
  );

  const refreshToken = jwtHelper.createToken(
    jwtPayload,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expire_in as string
  );

  // Update user cache
  if (user._id) {
    await UserCacheManage.updateUserCache(user._id.toString());
  }

  return {
    user: jwtPayload,
    accessToken,
    refreshToken,
  };
};
//?  admin routes
const getAllUsers = async (
  query: Record<string, unknown>
): Promise<TReturnUser.getAllUser> => {
  const cached = await UserCacheManage.getCacheListWithQuery(query);
  if (cached) return cached;

  const userQuery = new QueryBuilder(User.find(), query)
    .search(["firstName", "lastName", "email"])
    .filter()
    .sort()
    .paginate()
    .fields();
  const result = await userQuery.modelQuery;
  // console.log(result);
  const meta = await userQuery.countTotal();
  await UserCacheManage.setCacheListWithQuery(query, { result, meta });
  return { result, meta };
};
//!mine
const createUser = async (
  payload: TCreateOrLoginUserPayload
): Promise<{ message: string; email?: string; phoneNumber?: string; accessToken?: string; refreshToken?: string; user?: any }> => {
  let message = "";

  // Determine the contact provided
  const contact = payload.email || payload.phoneNumber;
  if (!contact) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Either email or phone number must be provided"
    );
  }

  const contactType = identifyContactType(contact);

  // TEST EMAIL BYPASS: Auto-login for test@gmail.com if user exists and is verified
  if (payload.email === "test@gmail.com") {
    const existingUser = await User.findOne({ email: payload.email });
    
    if (!existingUser || !existingUser.verified) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        "User not found or not verified"
      );
    }

    // Update FCM token if provided
    if (payload.fcmToken) {
      await User.findByIdAndUpdate(existingUser._id, { 
        fcmToken: payload.fcmToken,
        lastLoginAt: new Date()
      });
    } else {
      await User.findByIdAndUpdate(existingUser._id, { 
        lastLoginAt: new Date()
      });
    }

    // Generate JWT tokens
    const jwtPayload = {
      _id: existingUser._id,
      firstName: existingUser.firstName,
      lastName: existingUser.lastName,
      email: existingUser.email,
      role: existingUser.role,
      image: existingUser.image,
      verified: existingUser.verified,
      allProfileFieldsFilled: existingUser.allProfileFieldsFilled || false,
      allUserFieldsFilled: existingUser.allUserFieldsFilled || false,
    };

    const accessToken = jwtHelper.createToken(
      jwtPayload,
      config.jwt.jwt_secret as string,
      config.jwt.jwt_expire_in as string
    );

    const refreshToken = jwtHelper.createToken(
      jwtPayload,
      config.jwt.jwt_refresh_secret as string,
      config.jwt.jwt_refresh_expire_in as string
    );

    // Update user cache
    if (existingUser._id) {
      await UserCacheManage.updateUserCache(existingUser._id.toString());
    }

    return {
      message: "Test login successful",
      email: existingUser.email,
      user: jwtPayload,
      accessToken,
      refreshToken,
    };
  }

  // Check if user exists with this email or phone
  const existingUser = await User.findOne({
    $or: [
      ...(payload.email ? [{ email: payload.email }] : []),
      ...(payload.phoneNumber ? [{ phoneNumber: payload.phoneNumber }] : []),
    ],
  }).lean();

  if (existingUser) {
    // If user exists and is verified, update FCM token if provided and send OTP
    if (existingUser.verified) {
      // Update FCM token if provided
      if (payload.fcmToken) {
        await User.findByIdAndUpdate(existingUser._id, { 
          fcmToken: payload.fcmToken 
        });
      }
      
      const userContact = existingUser.email || existingUser.phoneNumber;
      if (!userContact) {
        throw new AppError(
          StatusCodes.INTERNAL_SERVER_ERROR,
          "User contact information missing"
        );
      }
      await sendOTPForLogin(userContact);
      message = `Verification code sent successfully to your ${contactType}`;
      return {
        message,
        ...(existingUser.email ? { email: existingUser.email } : {}),
        ...(existingUser.phoneNumber
          ? { phoneNumber: existingUser.phoneNumber }
          : {}),
      };
    }

    // If user exists but not verified, delete the old account
    await User.findByIdAndDelete(existingUser._id);
    await Profile.findOneAndDelete({ userId: existingUser._id });
  }

  // Create new user with email or phone and optional FCM token
  const newUser = await User.create({
    ...(payload.email && { email: payload.email }),
    ...(payload.phoneNumber && { phoneNumber: payload.phoneNumber }),
    ...(payload.fcmToken && { fcmToken: payload.fcmToken }),
  });

  if (!newUser) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User creation failed");
  }

  // Send OTP for verification
  const newUserContact = newUser.email || newUser.phoneNumber;
  if (!newUserContact) {
    throw new AppError(
      StatusCodes.INTERNAL_SERVER_ERROR,
      "User contact information missing"
    );
  }
  await sendOTPForLogin(newUserContact);

  if (newUser._id) {
    await UserCacheManage.updateUserCache(newUser._id.toString());
  }

  message = `User created successfully. Verification code sent to your ${contactType}`;
  return {
    message,
    ...(newUser.email ? { email: newUser.email } : {}),
    ...(newUser.phoneNumber ? { phoneNumber: newUser.phoneNumber } : {}),
  };
};
//!mine
const getMe = async (id: string) => {
  console.log(id);
  if (!id) {
    throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized");
  }
  const cached = await UserCacheManage.getCacheSingleUser(`${id}-me`);
  if (cached) return cached;
  const user = await User.findById(id).lean();
  const profile = await Profile.findOne({ userId: id }).lean();
  if (profile) {
    (user as any).profile = profile || null;
  }

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
  await UserCacheManage.setCacheSingleUser(`${id}-me`, user);
  return user;
};
//!mine
const addUserFields = async (userId: string, fields: Partial<TUser>) => {
  // Check if all required user fields are provided
  const requiredUserFields = ["firstName", "lastName", "dateOfBirth"];
  const allFieldsFilled = requiredUserFields.every((field) => {
    const fieldValue = fields[field as keyof typeof fields];
    return fieldValue && fieldValue.toString().trim().length > 0;
  });
  if (allFieldsFilled) {
    fields.allUserFieldsFilled = true;
  } else {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "All user fields must be filled"
    );
  }
  console.log(fields);
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: fields },
    { new: true, runValidators: true }
  );

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
  //remove cache
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);

  return user;
};
//!mine
const addProfileFields = async (userId: string, fields: Partial<TUser>) => {
  // Check if all required profile fields are provided
  const requiredProfileFields = [
    "location",
    "gender",
    "interestedIn",
    "height",
    "interests",
    "lookingFor",
    "ageRangeMin",
    "ageRangeMax",
    "maxDistance",
    "hometown",
    "workplace",
    "jobTitle",
    "school",
    "studyLevel",
    "religious",
    "drinkingStatus",
    "smokingStatus",
    "bio",
  ];

  const allFieldsFilled = requiredProfileFields.every((field) => {
    const fieldValue = fields[field as keyof typeof fields];
    return fieldValue && fieldValue.toString().trim().length > 0;
  });

  if (allFieldsFilled) {
    fields.allProfileFieldsFilled = true;
  } else {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "All profile fields must be filled"
    );
  }

  const profile = await Profile.findOneAndUpdate(
    { userId },
    { $set: fields },
    { new: true, upsert: true, runValidators: true }
  );
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Profile not found");
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $set: { allProfileFieldsFilled: true } },
    { new: true }
  );
  console.log(user);
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }
  //remove cache
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);

  return user;
};
//!mine
const updateUserByToken = async (
  id: string,
  updateData: Partial<TUser>
): Promise<Partial<TUser>> => {
  const user = await User.findById(id);

  if (updateData.image && user?.image) {
    unlinkFile(user.image);
  }
  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
  });
  if (!updatedUser) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  //remove cache
  await UserCacheManage.updateUserCache(id);
  await UserCacheManage.updateUserCache(`${id}-me`);
  return updatedUser;
};
//!mine
const updateProfileByToken = async (
  userId: string,
  updateData: Partial<TProfile & { newPhotos?: string[] }>
) => {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Profile not found for this user"
    );
  }

  // Handle multiple image uploads - append new images to existing ones
  if (updateData.newPhotos && updateData.newPhotos.length > 0) {
    const existingPhotos = profile.photos || [];
    updateData.photos = [...existingPhotos, ...updateData.newPhotos];
  }

  // Remove newPhotos from updateData as it's not part of the schema
  delete updateData.newPhotos;

  const updatedProfile = await Profile.findByIdAndUpdate(
    profile._id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate({
    path: "userId",
    select: "-authentication",
  });
  if (!updatedProfile) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Profile update failed");
  }
  //remove cache
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);
  return updatedProfile;
};
//!mine
const deleteProfileImage = async (userId: string, imageIndex: number) => {
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Profile not found for this user"
    );
  }

  if (!profile.photos || !Array.isArray(profile.photos)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "No photos found in profile");
  }

  if (imageIndex < 0 || imageIndex >= profile.photos.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid image index");
  }

  // Remove the image at the specified index
  const updatedPhotos = profile.photos.filter(
    (_, index) => index !== imageIndex
  );

  const updatedProfile = await Profile.findByIdAndUpdate(
    profile._id,
    { photos: updatedPhotos },
    { new: true, runValidators: true }
  ).populate({
    path: "userId",
    select: "-authentication",
  });
  if (updatedProfile && profile.photos[imageIndex]) {
    unlinkFile(profile.photos[imageIndex]);
  }

  if (!updatedProfile) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Failed to delete image");
  }
  //remove cache
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);
  return updatedProfile;
};

//!mine - Get nearby users within specified radius with enhanced filtering
const getNearbyUsers = async (
  currentUserId: string,
  filters: {
    radius?: number;
    latitude?: number;
    longitude?: number;
    gender?: string;
    interests?: string[];
    interestedIn?: string;
    lookingFor?: string;
    religious?: string;
    studyLevel?: string;
  } = {}
) => {
  const {
    radius = 25,
    latitude: queryLatitude,
    longitude: queryLongitude,
    gender,
    interests,
    interestedIn,
    lookingFor,
    religious,
    studyLevel,
  } = filters;

  let longitude: number;
  let latitude: number;

  // Validate that both latitude and longitude are provided together
  const hasLatitude = queryLatitude !== undefined;
  const hasLongitude = queryLongitude !== undefined;

  if (hasLatitude !== hasLongitude) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Both latitude and longitude must be provided together, or neither should be provided."
    );
  }

  // Use provided coordinates or get from current user's profile
  if (hasLatitude && hasLongitude) {
    latitude = queryLatitude;
    longitude = queryLongitude;
  } else {
    // Get current user's profile with location
    const currentUserProfile = await Profile.findOne({
      userId: currentUserId,
    }).select("location");

    if (!currentUserProfile || !currentUserProfile.location) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User location not found. Please provide both latitude and longitude or update your profile location."
      );
    }

    const { coordinates } = currentUserProfile.location;
    [longitude, latitude] = coordinates;
  }

  // Convert radius from kilometers to meters for MongoDB
  const radiusMeters = radius * 1000;

  // Build match conditions for additional filters
  const additionalMatchConditions: any = {
    userId: { $ne: new mongoose.Types.ObjectId(currentUserId) }, // Exclude current user
    location: { $exists: true }, // Only users with location
  };

  // Add profile field filters
  if (gender) additionalMatchConditions.gender = gender;
  if (interestedIn) additionalMatchConditions.interestedIn = interestedIn;
  if (lookingFor) additionalMatchConditions.lookingFor = lookingFor;
  if (religious) additionalMatchConditions.religious = religious;
  if (studyLevel) additionalMatchConditions.studyLevel = studyLevel;
  if (interests && interests.length > 0) {
    additionalMatchConditions.interests = { $in: interests };
  }

  const nearbyUsers = await Profile.aggregate([
    {
      $geoNear: {
        near: {
          type: "Point",
          coordinates: [longitude, latitude],
        },
        distanceField: "distance",
        maxDistance: radiusMeters,
        spherical: true,
        query: additionalMatchConditions,
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $match: {
        "user.status": "active", // Only active users
        "user.verified": true, // Only verified users
        "user.allProfileFieldsFilled": true, // Only users with complete profiles
        "user.allUserFieldsFilled": true, // Only users with complete user fields
      },
    },
    {
      $lookup: {
        from: "connections",
        let: { nearbyUserId: "$userId" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  {
                    $in: [
                      new mongoose.Types.ObjectId(currentUserId),
                      "$userIds",
                    ],
                  },
                  { $in: ["$$nearbyUserId", "$userIds"] },
                ],
              },
            },
          },
        ],
        as: "connection",
      },
    },
    {
      $project: {
        userId: "$userId",
        distance: { $round: ["$distance", 0] }, // Distance in meters, rounded
        distanceKm: { $round: [{ $divide: ["$distance", 1000] }, 2] }, // Distance in km
        location: {
          latitude: { $arrayElemAt: ["$location.coordinates", 1] },
          longitude: { $arrayElemAt: ["$location.coordinates", 0] },
        },
        name: {
          $concat: [
            { $ifNull: ["$user.firstName", ""] },
            " ",
            { $ifNull: ["$user.lastName", ""] },
          ],
        },
        age: {
          $floor: {
            $divide: [
              { $subtract: [new Date(), "$user.dateOfBirth"] },
              365.25 * 24 * 60 * 60 * 1000,
            ],
          },
        },

        gender: 1,
        interests: 1,
        interestedIn: 1,
        lookingFor: 1,
        religious: 1,
        studyLevel: 1,
        bio: 1,
        profilePicture: { $ifNull: ["$user.image", null] }, // Profile picture from User model
        photos: 1,
        height: 1,
        workplace: 1,
        school: 1,
        isConnected: {
          $cond: [{ $gt: [{ $size: "$connection" }, 0] }, true, false],
        },
      },
    },
    {
      $sort: { distance: 1 },
    },
  ]);

  return nearbyUsers;
};

//!mine - Update hidden fields for user profile
const updateHiddenFields = async (
  userId: string,
  hiddenFieldsUpdate: {
    [key: string]: boolean;
  }
) => {
  // Get the current profile
  const profile = await Profile.findOne({ userId });
  if (!profile) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Profile not found for this user"
    );
  }

  // Validate that only valid hidden field names are provided
  const validHiddenFields = [
    "gender",
    "hometown",
    "workplace",
    "jobTitle",
    "school",
    "studyLevel",
    "religious",
    "drinkingStatus",
    "smokingStatus",
  ];

  const invalidFields = Object.keys(hiddenFieldsUpdate).filter(
    (field) => !validHiddenFields.includes(field)
  );

  if (invalidFields.length > 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Invalid hidden field(s): ${invalidFields.join(
        ", "
      )}. Valid fields are: ${validHiddenFields.join(", ")}`
    );
  }

  // Prepare the update object for hiddenFields
  const hiddenFieldsUpdateQuery: any = {};

  Object.keys(hiddenFieldsUpdate).forEach((field) => {
    hiddenFieldsUpdateQuery[`hiddenFields.${field}`] =
      hiddenFieldsUpdate[field];
  });

  // Update the profile with new hidden fields settings
  const updatedProfile = await Profile.findByIdAndUpdate(
    profile._id,
    { $set: hiddenFieldsUpdateQuery },
    { new: true, runValidators: true }
  ).populate({
    path: "userId",
    select: "-authentication",
  });

  if (!updatedProfile) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Failed to update hidden fields"
    );
  }

  // Clear any cached user data to ensure fresh data on next request
  await UserCacheManage.updateUserCache(userId);

  return updatedProfile;
};

//!mine - Get Persona verification URL
const getPersonaVerificationUrl = async (userId: string) => {
  // Find user
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  // Check if user is already verified
  if (user.isPersonaVerified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "User is already verified with Persona"
    );
  }

  // Check if user's email is verified first
  if (!user.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Please verify your email/phone before proceeding with identity verification"
    );
  }

  // Create inquiry and get verification URL
  const verificationUrl = await createPersonaInquiry(
    userId,
    user.email
  );

  return {
    verificationUrl,
    userId,
  };
};

//!mine - Handle Persona webhook
const handlePersonaWebhook = async (
  payload: string,
  signature: string,
  webhookData: any
) => {
  // Verify webhook signature
  const isValid = verifyPersonaWebhookSignature(payload, signature);
  
  if (!isValid) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "Invalid webhook signature"
    );
  }

  let data = webhookData.data;
  let included = webhookData.included;
  
  // Handle event-based webhooks (newer Persona webhook format)
  if (data?.type === 'event') {
    const eventName = data.attributes?.name;
    console.log(`Persona event received: ${eventName}`);
    
    // Extract the actual inquiry data from the event payload
    if (data.attributes?.payload) {
      const payload = data.attributes.payload;
      data = payload.data;
      included = payload.included || [];
      console.log(`Extracted from payload: userId=${data.attributes?.['reference-id']}, includedCount=${included.length}`);
    }
  }
  
  console.log(`Processing: type=${data?.type}, status=${data?.attributes?.status}, userId=${data?.attributes?.['reference-id']}`);
  
  // Handle inquiry.completed or inquiry.approved event
  if (
    data?.type === 'inquiry' && 
    (data.attributes?.status === 'completed' || data.attributes?.status === 'approved')
  ) {
    const userId = data.attributes['reference-id'];
    const inquiryId = data.id;

    // Check if there are verification results in the included array
    let isVerified = false;
    
    if (included && Array.isArray(included)) {
      // Find all government-id verifications
      const verifications = included.filter(
        (item: any) => item.type === 'verification/government-id'
      );
      
      console.log(`Found ${verifications.length} verification(s)`);
      
      // Check if ANY verification passed
      const hasPassedVerification = verifications.some(
        (ver: any) => ver.attributes?.status === 'passed'
      );
      
      if (hasPassedVerification) {
        isVerified = true;
        console.log(`✓ Verification passed for user ${userId}`);
      } else {
        console.log(`✗ No passed verification for user ${userId}`);
      }
    }
    
    // If inquiry is approved, set verified to true regardless of checks
    if (data.attributes.status === 'approved') {
      isVerified = true;
      console.log(`✓ Inquiry approved for user ${userId}`);
    }

    console.log(`Updating user ${userId}: isPersonaVerified=${isVerified}`);
    
    // Update user's verification status
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          isPersonaVerified: isVerified 
        } 
      },
      { new: true }
    );

    if (!user) {
      throw new AppError(
        StatusCodes.NOT_FOUND,
        `User not found with ID: ${userId}`
      );
    }

    // Clear user cache
    await UserCacheManage.updateUserCache(userId);
    await UserCacheManage.updateUserCache(`${userId}-me`);

    console.log(`✓ User ${userId} updated successfully, isPersonaVerified=${user.isPersonaVerified}`);
  }

  // Handle inquiry.failed or inquiry.declined events
  if (
    data?.type === 'inquiry' && 
    (data.attributes?.status === 'failed' || data.attributes?.status === 'declined')
  ) {
    const userId = data.attributes['reference-id'];
    
    // Set verification to false for failed/declined inquiries
    await User.findByIdAndUpdate(
      userId,
      { 
        $set: { 
          isPersonaVerified: false 
        } 
      },
      { new: true }
    );
    
    await UserCacheManage.updateUserCache(userId);
    await UserCacheManage.updateUserCache(`${userId}-me`);
    console.log(`Persona verification failed/declined for user ${userId}`);
  }

  return { success: true };
};


/**
 * Delete user
 * 
 * @author - @shaishab316
 */
const deleteUser = async (userId: string) => {
  let user = await User.findById(userId);

  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  }

  user = await User.findByIdAndDelete(userId,{new: true}).select("-authentication -fcmToken");

  //remove cache
  await UserCacheManage.updateUserCache(userId);

  return user;
};

export const UserServices = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserActivationStatus,
  updateUserRole,
  getMe,
  getNearbyUsers,
  updateUserByToken,
  changeUserStatus,
  sendOTPForLogin,
  verifyOTPAndLogin,
  resendOTP,
  addUserFields,
  addProfileFields,
  updateProfileByToken,
  deleteProfileImage,
  updateHiddenFields,
  getPersonaVerificationUrl,
  handlePersonaWebhook,
  deleteUser
};
