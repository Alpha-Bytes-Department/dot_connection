import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import UserCacheManage from "./user.cacheManage";
import type { ContactType, TCreateOrLoginUserPayload, TReturnUser, TUser } from "./user.interface";
import { emailTemplate } from "../../../mail/emailTemplate";
import { emailHelper } from "../../../mail/emailHelper";
import { jwtHelper } from "../../../helpers/jwtHelper";
import config from "../../../config";
import unlinkFile from "../../../shared/unlinkFile";
import { sendOtp } from "../../../helpers/twilioSendMessage";
import {
  createPersonaInquiry,
  verifyPersonaWebhookSignature,
} from "../../../shared/personaService";
import { Prisma, UserRole, UserStatus } from "@prisma/client";
import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

const identifyContactType = (contact: string): ContactType => {
  if (EMAIL_REGEX.test(contact)) return "email";
  if (PHONE_REGEX.test(contact)) return "phone";
  throw new AppError(
    StatusCodes.BAD_REQUEST,
    "Invalid contact format. Provide a valid email or phone number in E.164 format.",
  );
};

const buildHiddenFields = (profile: any) => ({
  gender: Boolean(profile.hiddenGender),
  hometown: Boolean(profile.hiddenHometown),
  workplace: Boolean(profile.hiddenWorkplace),
  jobTitle: Boolean(profile.hiddenJobTitle),
  school: Boolean(profile.hiddenSchool),
  studyLevel: Boolean(profile.hiddenStudyLevel),
  religious: Boolean(profile.hiddenReligious),
  drinkingStatus: Boolean(profile.hiddenDrinkingStatus),
  smokingStatus: Boolean(profile.hiddenSmokingStatus),
});

// Migration note:
// Old API responses were shaped from Mongoose docs (`_id`, nested `hiddenFields`, GeoJSON location).
// This mapper keeps that response contract stable while reading normalized Prisma columns.
const mapProfileResponse = (profile: any) => {
  if (!profile) return null;

  const locationFromJson = profile.location as any;
  const location =
    locationFromJson && typeof locationFromJson === "object"
      ? locationFromJson
      : profile.latitude != null && profile.longitude != null
        ? {
            type: "Point",
            coordinates: [profile.longitude, profile.latitude],
            address: profile.address ?? undefined,
          }
        : null;

  return {
    _id: profile.id,
    userId: profile.userId,
    bio: profile.bio,
    location: location ?? undefined,
    photos: profile.photos ?? [],
    interests: profile.interests ?? [],
    lookingFor: profile.lookingFor,
    maxDistance: profile.maxDistance,
    ageRangeMin: profile.ageRangeMin,
    ageRangeMax: profile.ageRangeMax,
    gender: profile.gender,
    interestedIn: profile.interestedIn,
    height: profile.height,
    workplace: profile.workplace,
    school: profile.school,
    hometown: profile.hometown,
    jobTitle: profile.jobTitle,
    smokingStatus: profile.smokingStatus,
    drinkingStatus: profile.drinkingStatus,
    studyLevel: profile.studyLevel,
    religious: profile.religious,
    profileViews: profile.profileViews,
    hiddenFields: buildHiddenFields(profile),
    lastActive: profile.lastActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

// Migration note:
// JWT/auth and controllers still expect `_id` + `authentication` fields.
// Prisma stores auth fields flattened (`auth*`), so we remap them here.
const mapUserResponse = (user: any) => {
  const mapped: any = {
    _id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    image: user.image,
    role: user.role,
    phoneNumber: user.phoneNumber,
    fcmToken: user.fcmToken,
    status: user.status,
    verified: user.verified,
    allProfileFieldsFilled: user.allProfileFieldsFilled,
    allUserFieldsFilled: user.allUserFieldsFilled,
    isProfileVerified: user.isProfileVerified,
    isPersonaVerified: user.isPersonaVerified,
    pushNotification: user.pushNotification,
    lastLoginAt: user.lastLoginAt,
    dateOfBirth: user.dateOfBirth,
    authentication: {
      oneTimeCode: user.authOneTimeCode,
      expireAt: user.authExpireAt,
      loginAttempts: user.authLoginAttempts,
      lastLoginAttempt: user.authLastLoginAttempt,
    },
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  if (Object.prototype.hasOwnProperty.call(user, "profile")) {
    mapped.profile = mapProfileResponse(user.profile);
  }

  return mapped as TUser;
};

const applyHiddenFieldsFilter = (user: any) => {
  if (!user?.profile?.hiddenFields) return user;
  const hiddenFields = user.profile.hiddenFields;
  const filtered = {
    ...user,
    profile: {
      ...user.profile,
    },
  };

  if (hiddenFields.gender) delete filtered.profile.gender;
  if (hiddenFields.hometown) delete filtered.profile.hometown;
  if (hiddenFields.workplace) delete filtered.profile.workplace;
  if (hiddenFields.jobTitle) delete filtered.profile.jobTitle;
  if (hiddenFields.school) delete filtered.profile.school;
  if (hiddenFields.studyLevel) delete filtered.profile.studyLevel;
  if (hiddenFields.religious) delete filtered.profile.religious;
  if (hiddenFields.drinkingStatus) delete filtered.profile.drinkingStatus;
  if (hiddenFields.smokingStatus) delete filtered.profile.smokingStatus;
  return filtered;
};

const parseDateIfPresent = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const canAttemptLogin = (user: any): boolean => {
  const maxAttempts = 5;
  const lockoutTime = 15 * 60 * 1000;
  const attempts = user.authLoginAttempts ?? 0;
  const lastAttempt = user.authLastLoginAttempt ? new Date(user.authLastLoginAttempt) : null;

  if (attempts < maxAttempts) return true;
  if (!lastAttempt) return false;
  return Date.now() - lastAttempt.getTime() > lockoutTime;
};

const findUserByContact = async (contact: string) =>
  prisma.user.findFirst({
    where: {
      OR: [{ email: contact }, { phoneNumber: contact }],
    },
    include: { profile: true },
  });

// Migration note:
// Replaces Mongoose static `generateOTP` with a Prisma update on flattened auth fields.
const generateOTP = async (contact: string) => {
  const user = await findUserByContact(contact);
  if (!user) return null;

  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expireAt = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      authOneTimeCode: otpCode,
      authExpireAt: expireAt,
    },
  });
  return otpCode;
};

const isValidOTP = async (contact: string, otp: string): Promise<boolean> => {
  if (contact === "testg@gmail.com" && otp === "123456") return true;

  const user = await findUserByContact(contact);
  if (!user || !user.authOneTimeCode || !user.authExpireAt) return false;
  const isExpired = new Date() > new Date(user.authExpireAt);
  const isMatch = user.authOneTimeCode === otp;
  return !isExpired && isMatch;
};

const getUserById = async (id: string) => {
  const cached = await UserCacheManage.getCacheSingleUser(id);
  if (cached) return applyHiddenFieldsFilter(cached);

  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  const mapped = mapUserResponse(user);
  await UserCacheManage.setCacheSingleUser(id, mapped);
  return applyHiddenFieldsFilter(mapped);
};

const getMe = async (id: string) => {
  if (!id) throw new AppError(StatusCodes.UNAUTHORIZED, "You are not authorized");
  const cacheKey = `${id}-me`;
  const cached = await UserCacheManage.getCacheSingleUser(cacheKey);
  if (cached) return cached;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { profile: true },
  });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  const mapped = mapUserResponse(user);
  await UserCacheManage.setCacheSingleUser(cacheKey, mapped);
  return mapped;
};

const updateUserActivationStatus = async (id: string, status: "active" | "delete") => {
  const user = await prisma.user.update({
    where: { id },
    data: { status: status as UserStatus },
  }).catch(() => null);

  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  await UserCacheManage.updateUserCache(id);
  return mapUserResponse(user);
};

const updateUserRole = async (id: string, role: "USER" | "ADMIN"): Promise<Partial<TUser>> => {
  const user = await prisma.user.update({
    where: { id },
    data: { role: role as UserRole },
  }).catch(() => null);

  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  await UserCacheManage.updateUserCache(id);
  return mapUserResponse(user);
};

const changeUserStatus = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  if (user.role === UserRole.ADMIN) {
    throw new AppError(StatusCodes.BAD_REQUEST, "You can't change admin status");
  }

  const status = user.status === UserStatus.active ? UserStatus.delete : UserStatus.active;
  await prisma.user.update({ where: { id: userId }, data: { status } });
  await UserCacheManage.updateUserCache(userId);
  return mapUserResponse(user);
};

const sendOTPForLogin = async (contact: string) => {
  const contactType = identifyContactType(contact);
  const user = await findUserByContact(contact);
  if (!user) {
    throw new AppError(StatusCodes.NOT_FOUND, `User not found with this ${contactType}`);
  }

  if (!canAttemptLogin(user)) {
    throw new AppError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Too many login attempts. Please try again later.",
    );
  }

  const otp = await generateOTP(contact);
  if (!otp) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "Failed to generate OTP");
  }

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
    await sendOtp(contact, otp);
  }

  return {
    message: `Verification code sent successfully to your ${contactType}`,
    ...(contactType === "email" ? { email: contact } : { phoneNumber: contact }),
  };
};

const resendOTP = async (contact: string) => sendOTPForLogin(contact);

const verifyOTPAndLogin = async (contact: string, otp: string, fcmToken?: string) => {
  const user = await findUserByContact(contact);
  if (!user) {
    const contactType = identifyContactType(contact);
    throw new AppError(StatusCodes.NOT_FOUND, `User not found with this ${contactType}`);
  }

  if (!canAttemptLogin(user)) {
    throw new AppError(
      StatusCodes.TOO_MANY_REQUESTS,
      "Too many login attempts. Please try again later.",
    );
  }

  const valid = await isValidOTP(contact, otp);
  if (!valid) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        authLoginAttempts: { increment: 1 },
        authLastLoginAttempt: new Date(),
      },
    });
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid or expired OTP");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      authOneTimeCode: null,
      authExpireAt: null,
      authLoginAttempts: 0,
      lastLoginAt: new Date(),
      verified: true,
      ...(fcmToken ? { fcmToken } : {}),
    },
  });

  const jwtPayload = {
    _id: user.id,
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
    config.jwt.jwt_expire_in as string,
  );
  const refreshToken = jwtHelper.createToken(
    jwtPayload,
    config.jwt.jwt_refresh_secret as string,
    config.jwt.jwt_refresh_expire_in as string,
  );

  await UserCacheManage.updateUserCache(user.id);

  return {
    user: jwtPayload,
    accessToken,
    refreshToken,
  };
};

const getAllUsers = async (query: Record<string, unknown>): Promise<TReturnUser.getAllUser> => {
  const cached = await UserCacheManage.getCacheListWithQuery(query);
  if (cached) return cached;

  const page = Math.max(Number(query.page ?? 1) || 1, 1);
  const limit = Math.max(Number(query.limit ?? 10) || 10, 1);
  const skip = (page - 1) * limit;
  const sortBy = String(query.sortBy ?? "createdAt");
  const sortOrder: Prisma.SortOrder =
    String(query.sortOrder ?? "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const searchTerm = String(query.searchTerm ?? "").trim();

  const allowedSortFields = [
    "createdAt",
    "updatedAt",
    "firstName",
    "lastName",
    "email",
    "lastLoginAt",
  ];
  const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";

  const where: Prisma.UserWhereInput = {};
  if (searchTerm) {
    where.OR = [
      { firstName: { contains: searchTerm, mode: "insensitive" } },
      { lastName: { contains: searchTerm, mode: "insensitive" } },
      { email: { contains: searchTerm, mode: "insensitive" } },
      { phoneNumber: { contains: searchTerm, mode: "insensitive" } },
    ];
  }

  if (query.role) where.role = String(query.role) as UserRole;
  if (query.status) where.status = String(query.status) as UserStatus;
  if (query.verified !== undefined) where.verified = String(query.verified) === "true";

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [safeSortBy]: sortOrder },
      skip,
      take: limit,
    }),
  ]);

  const result = users.map(mapUserResponse);
  const meta = {
    page,
    limit,
    total,
    totalPage: Math.ceil(total / limit),
  };

  const payload = { result, meta };
  await UserCacheManage.setCacheListWithQuery(query, payload);
  return payload;
};

const createUser = async (
  payload: TCreateOrLoginUserPayload,
): Promise<{
  message: string;
  email?: string | null;
  phoneNumber?: string | null;
  accessToken?: string;
  refreshToken?: string;
  user?: any;
}> => {
  const contact = payload.email || payload.phoneNumber;
  if (!contact) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Either email or phone number must be provided",
    );
  }
  const contactType = identifyContactType(contact);

  // Keep legacy bypass behavior exactly as modules-old implementation.
  if (payload.email === "test@gmail.com") {
    const existingUser = await prisma.user.findUnique({
      where: { email: payload.email },
    });
    if (!existingUser || !existingUser.verified) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found or not verified");
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: {
        ...(payload.fcmToken ? { fcmToken: payload.fcmToken } : {}),
        lastLoginAt: new Date(),
      },
    });

    const jwtPayload = {
      _id: existingUser.id,
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
      config.jwt.jwt_expire_in as string,
    );
    const refreshToken = jwtHelper.createToken(
      jwtPayload,
      config.jwt.jwt_refresh_secret as string,
      config.jwt.jwt_refresh_expire_in as string,
    );

    await UserCacheManage.updateUserCache(existingUser.id);
    return {
      message: "Test login successful",
      email: existingUser.email,
      user: jwtPayload,
      accessToken,
      refreshToken,
    };
  }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        ...(payload.email ? [{ email: payload.email }] : []),
        ...(payload.phoneNumber ? [{ phoneNumber: payload.phoneNumber }] : []),
      ],
    },
  });

  if (existingUser) {
    if (existingUser.verified) {
      if (payload.fcmToken) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { fcmToken: payload.fcmToken },
        });
      }

      const userContact = existingUser.email || existingUser.phoneNumber;
      if (!userContact) {
        throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "User contact information missing");
      }
      await sendOTPForLogin(userContact);
      return {
        message: `Verification code sent successfully to your ${contactType}`,
        ...(existingUser.email ? { email: existingUser.email } : {}),
        ...(existingUser.phoneNumber ? { phoneNumber: existingUser.phoneNumber } : {}),
      };
    }

    await prisma.$transaction([
      prisma.profile.deleteMany({ where: { userId: existingUser.id } }),
      prisma.user.delete({ where: { id: existingUser.id } }),
    ]);
  }

  const newUser = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        // IDs are explicit because current Prisma schema uses `id String @id` without default().
        id: generateOid(),
        ...(payload.email ? { email: payload.email } : {}),
        ...(payload.phoneNumber ? { phoneNumber: payload.phoneNumber } : {}),
        ...(payload.fcmToken ? { fcmToken: payload.fcmToken } : {}),
      },
    });

    // Keep profile bootstrapping during signup so downstream profile reads never fail.
    await tx.profile.create({
      data: {
        id: generateOid(),
        userId: createdUser.id,
      },
    });

    return createdUser;
  });

  const newUserContact = newUser.email || newUser.phoneNumber;
  if (!newUserContact) {
    throw new AppError(StatusCodes.INTERNAL_SERVER_ERROR, "User contact information missing");
  }
  await sendOTPForLogin(newUserContact);
  await UserCacheManage.updateUserCache(newUser.id);

  return {
    message: `User created successfully. Verification code sent to your ${contactType}`,
    ...(newUser.email ? { email: newUser.email } : {}),
    ...(newUser.phoneNumber ? { phoneNumber: newUser.phoneNumber } : {}),
  };
};

const addUserFields = async (userId: string, fields: Partial<TUser>) => {
  const requiredUserFields: Array<keyof TUser> = ["firstName", "lastName", "dateOfBirth"];
  const allFieldsFilled = requiredUserFields.every((field) => {
    const value = fields[field];
    return value !== null && value !== undefined && String(value).trim().length > 0;
  });

  if (!allFieldsFilled) {
    throw new AppError(StatusCodes.BAD_REQUEST, "All user fields must be filled");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: fields.firstName,
      lastName: fields.lastName,
      dateOfBirth: parseDateIfPresent(fields.dateOfBirth),
      ...(fields.pushNotification !== undefined
        ? { pushNotification: Boolean(fields.pushNotification) }
        : {}),
      allUserFieldsFilled: true,
    },
  }).catch(() => null);

  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);
  return mapUserResponse(user);
};

const buildProfileWriteData = (fields: any) => {
  const data: Prisma.ProfileUncheckedCreateInput = {
    id: generateOid(),
    userId: "",
  };

  // Migration note:
  // Converts old nested payloads (`location`, `hiddenFields`) into Prisma flat columns
  // while still persisting full JSON location for backward compatibility.
  const mutable: any = {};

  if (fields.bio !== undefined) mutable.bio = fields.bio;
  if (fields.photos !== undefined) mutable.photos = fields.photos;
  if (fields.interests !== undefined) mutable.interests = fields.interests;
  if (fields.lookingFor !== undefined) mutable.lookingFor = fields.lookingFor;
  if (fields.maxDistance !== undefined) mutable.maxDistance = fields.maxDistance;
  if (fields.ageRangeMin !== undefined) mutable.ageRangeMin = fields.ageRangeMin;
  if (fields.ageRangeMax !== undefined) mutable.ageRangeMax = fields.ageRangeMax;
  if (fields.gender !== undefined) mutable.gender = fields.gender;
  if (fields.interestedIn !== undefined) mutable.interestedIn = fields.interestedIn;
  if (fields.height !== undefined) mutable.height = fields.height;
  if (fields.workplace !== undefined) mutable.workplace = fields.workplace;
  if (fields.school !== undefined) mutable.school = fields.school;
  if (fields.hometown !== undefined) mutable.hometown = fields.hometown;
  if (fields.jobTitle !== undefined) mutable.jobTitle = fields.jobTitle;
  if (fields.smokingStatus !== undefined) mutable.smokingStatus = fields.smokingStatus;
  if (fields.drinkingStatus !== undefined) mutable.drinkingStatus = fields.drinkingStatus;
  if (fields.studyLevel !== undefined) mutable.studyLevel = fields.studyLevel;
  if (fields.religious !== undefined) mutable.religious = fields.religious;

  if (fields.location !== undefined) {
    const location = fields.location;
    mutable.location = location as Prisma.InputJsonValue;
    if (location?.address) mutable.address = location.address;
    if (Array.isArray(location?.coordinates) && location.coordinates.length === 2) {
      mutable.longitude = Number(location.coordinates[0]);
      mutable.latitude = Number(location.coordinates[1]);
    }
  }

  if (fields.hiddenFields && typeof fields.hiddenFields === "object") {
    const hidden = fields.hiddenFields;
    if (hidden.gender !== undefined) mutable.hiddenGender = Boolean(hidden.gender);
    if (hidden.hometown !== undefined) mutable.hiddenHometown = Boolean(hidden.hometown);
    if (hidden.workplace !== undefined) mutable.hiddenWorkplace = Boolean(hidden.workplace);
    if (hidden.jobTitle !== undefined) mutable.hiddenJobTitle = Boolean(hidden.jobTitle);
    if (hidden.school !== undefined) mutable.hiddenSchool = Boolean(hidden.school);
    if (hidden.studyLevel !== undefined) mutable.hiddenStudyLevel = Boolean(hidden.studyLevel);
    if (hidden.religious !== undefined) mutable.hiddenReligious = Boolean(hidden.religious);
    if (hidden.drinkingStatus !== undefined) {
      mutable.hiddenDrinkingStatus = Boolean(hidden.drinkingStatus);
    }
    if (hidden.smokingStatus !== undefined) {
      mutable.hiddenSmokingStatus = Boolean(hidden.smokingStatus);
    }
  }

  return { data, mutable };
};

const addProfileFields = async (userId: string, fields: any) => {
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
    const value = fields[field];
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && String(value).trim().length > 0;
  });
  if (!allFieldsFilled) {
    throw new AppError(StatusCodes.BAD_REQUEST, "All profile fields must be filled");
  }

  const { mutable } = buildProfileWriteData(fields);
  await prisma.profile.upsert({
    where: { userId },
    update: mutable,
    create: {
      id: generateOid(),
      userId,
      ...mutable,
    },
  });

  const user = await prisma.user.update({
    where: { id: userId },
    data: { allProfileFieldsFilled: true },
    include: { profile: true },
  }).catch(() => null);

  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);
  return mapUserResponse(user);
};

const updateUserByToken = async (id: string, updateData: Partial<TUser>): Promise<Partial<TUser>> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  if (updateData.image && user.image) unlinkFile(user.image);

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      ...(updateData.firstName !== undefined ? { firstName: updateData.firstName } : {}),
      ...(updateData.lastName !== undefined ? { lastName: updateData.lastName } : {}),
      ...(updateData.image !== undefined ? { image: updateData.image } : {}),
      ...(updateData.phoneNumber !== undefined ? { phoneNumber: updateData.phoneNumber } : {}),
      ...(updateData.fcmToken !== undefined ? { fcmToken: updateData.fcmToken } : {}),
      ...(updateData.pushNotification !== undefined
        ? { pushNotification: Boolean(updateData.pushNotification) }
        : {}),
      ...(updateData.dateOfBirth !== undefined
        ? { dateOfBirth: parseDateIfPresent(updateData.dateOfBirth) }
        : {}),
    },
  });

  await UserCacheManage.updateUserCache(id);
  await UserCacheManage.updateUserCache(`${id}-me`);
  return mapUserResponse(updatedUser);
};

const updateProfileByToken = async (
  userId: string,
  updateData: Partial<{ newPhotos?: string[]; photos?: string[] } & Record<string, unknown>>,
) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Profile not found for this user");
  }

  const input = { ...updateData };
  if (input.newPhotos && input.newPhotos.length > 0) {
    input.photos = [...(profile.photos || []), ...input.newPhotos];
  }
  delete input.newPhotos;

  const { mutable } = buildProfileWriteData(input);
  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: mutable,
  });

  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);
  return mapProfileResponse(updatedProfile);
};

const deleteProfileImage = async (userId: string, imageIndex: number) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(StatusCodes.NOT_FOUND, "Profile not found for this user");
  if (!Array.isArray(profile.photos)) {
    throw new AppError(StatusCodes.BAD_REQUEST, "No photos found in profile");
  }
  if (imageIndex < 0 || imageIndex >= profile.photos.length) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Invalid image index");
  }

  const removedPath = profile.photos[imageIndex];
  const updatedPhotos = profile.photos.filter((_, index) => index !== imageIndex);
  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data: { photos: updatedPhotos },
  });

  if (removedPath) unlinkFile(removedPath);
  await UserCacheManage.updateUserCache(userId);
  await UserCacheManage.updateUserCache(`${userId}-me`);
  return mapProfileResponse(updatedProfile);
};

const haversineDistanceKm = (
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
) => {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(latitude2 - latitude1);
  const dLon = toRadians(longitude2 - longitude1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(latitude1)) *
      Math.cos(toRadians(latitude2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const extractLatLng = (profile: any): { latitude: number; longitude: number } | null => {
  if (profile.latitude != null && profile.longitude != null) {
    return { latitude: Number(profile.latitude), longitude: Number(profile.longitude) };
  }
  const location = profile.location as any;
  if (location && Array.isArray(location.coordinates) && location.coordinates.length === 2) {
    return { longitude: Number(location.coordinates[0]), latitude: Number(location.coordinates[1]) };
  }
  return null;
};

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
  } = {},
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

  const hasLatitude = queryLatitude !== undefined;
  const hasLongitude = queryLongitude !== undefined;
  if (hasLatitude !== hasLongitude) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Both latitude and longitude must be provided together, or neither should be provided.",
    );
  }

  let latitude: number;
  let longitude: number;

  if (hasLatitude && hasLongitude) {
    latitude = Number(queryLatitude);
    longitude = Number(queryLongitude);
  } else {
    const currentProfile = await prisma.profile.findUnique({ where: { userId: currentUserId } });
    if (!currentProfile) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User location not found. Please provide both latitude and longitude or update your profile location.",
      );
    }
    const coords = extractLatLng(currentProfile);
    if (!coords) {
      throw new AppError(
        StatusCodes.BAD_REQUEST,
        "User location not found. Please provide both latitude and longitude or update your profile location.",
      );
    }
    latitude = coords.latitude;
    longitude = coords.longitude;
  }

  // Migration note:
  // Mongo used `$geoNear`; current Prisma/Postgres path does DB prefilter + app-side Haversine distance.
  // This keeps behavior close until PostGIS/native geospatial queries are introduced.
  const where: Prisma.ProfileWhereInput = {
    userId: { not: currentUserId },
    latitude: { not: null },
    longitude: { not: null },
    user: {
      status: UserStatus.active,
      verified: true,
      allProfileFieldsFilled: true,
      allUserFieldsFilled: true,
    },
    ...(gender ? { gender: gender as any } : {}),
    ...(interestedIn ? { interestedIn: interestedIn as any } : {}),
    ...(lookingFor ? { lookingFor: lookingFor as any } : {}),
    ...(religious ? { religious: religious as any } : {}),
    ...(studyLevel ? { studyLevel: studyLevel as any } : {}),
    ...(interests?.length ? { interests: { hasSome: interests } } : {}),
  };

  const nearbyProfiles = await prisma.profile.findMany({
    where,
    include: { user: true },
  });

  const rows = await Promise.all(
    nearbyProfiles.map(async (profile) => {
      if (profile.latitude == null || profile.longitude == null) return null;

      const distanceKm = haversineDistanceKm(
        latitude,
        longitude,
        Number(profile.latitude),
        Number(profile.longitude),
      );
      if (distanceKm > radius) return null;

      const connection = await prisma.connection.findFirst({
        where: {
          OR: [
            { userOneId: currentUserId, userTwoId: profile.userId },
            { userOneId: profile.userId, userTwoId: currentUserId },
          ],
        },
      });

      const age = profile.user.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(profile.user.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : null;

      return {
        userId: profile.userId,
        distance: Math.round(distanceKm * 1000),
        distanceKm: Math.round(distanceKm * 100) / 100,
        location: {
          latitude: Number(profile.latitude),
          longitude: Number(profile.longitude),
        },
        name: `${profile.user.firstName ?? ""} ${profile.user.lastName ?? ""}`.trim(),
        age,
        gender: profile.gender,
        interests: profile.interests,
        interestedIn: profile.interestedIn,
        lookingFor: profile.lookingFor,
        religious: profile.religious,
        studyLevel: profile.studyLevel,
        bio: profile.bio,
        profilePicture: profile.user.image ?? null,
        photos: profile.photos,
        height: profile.height,
        workplace: profile.workplace,
        school: profile.school,
        isConnected: Boolean(connection),
      };
    }),
  );

  return rows
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .sort((a, b) => a.distance - b.distance);
};

const updateHiddenFields = async (
  userId: string,
  hiddenFieldsUpdate: { [key: string]: boolean },
) => {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) {
    throw new AppError(StatusCodes.NOT_FOUND, "Profile not found for this user");
  }

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
    (field) => !validHiddenFields.includes(field),
  );
  if (invalidFields.length > 0) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      `Invalid hidden field(s): ${invalidFields.join(", ")}. Valid fields are: ${validHiddenFields.join(", ")}`,
    );
  }

  const data: Prisma.ProfileUpdateInput = {};
  if (hiddenFieldsUpdate.gender !== undefined) data.hiddenGender = hiddenFieldsUpdate.gender;
  if (hiddenFieldsUpdate.hometown !== undefined) data.hiddenHometown = hiddenFieldsUpdate.hometown;
  if (hiddenFieldsUpdate.workplace !== undefined) {
    data.hiddenWorkplace = hiddenFieldsUpdate.workplace;
  }
  if (hiddenFieldsUpdate.jobTitle !== undefined) data.hiddenJobTitle = hiddenFieldsUpdate.jobTitle;
  if (hiddenFieldsUpdate.school !== undefined) data.hiddenSchool = hiddenFieldsUpdate.school;
  if (hiddenFieldsUpdate.studyLevel !== undefined) {
    data.hiddenStudyLevel = hiddenFieldsUpdate.studyLevel;
  }
  if (hiddenFieldsUpdate.religious !== undefined) data.hiddenReligious = hiddenFieldsUpdate.religious;
  if (hiddenFieldsUpdate.drinkingStatus !== undefined) {
    data.hiddenDrinkingStatus = hiddenFieldsUpdate.drinkingStatus;
  }
  if (hiddenFieldsUpdate.smokingStatus !== undefined) {
    data.hiddenSmokingStatus = hiddenFieldsUpdate.smokingStatus;
  }

  const updatedProfile = await prisma.profile.update({
    where: { userId },
    data,
  });

  await UserCacheManage.updateUserCache(userId);
  return mapProfileResponse(updatedProfile);
};

const getPersonaVerificationUrl = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");
  if (user.isPersonaVerified) {
    throw new AppError(StatusCodes.BAD_REQUEST, "User is already verified with Persona");
  }
  if (!user.verified) {
    throw new AppError(
      StatusCodes.BAD_REQUEST,
      "Please verify your email/phone before proceeding with identity verification",
    );
  }

  const verificationUrl = await createPersonaInquiry(userId, user.email ?? undefined);
  return { verificationUrl, userId };
};

const handlePersonaWebhook = async (payload: string, signature: string, webhookData: any) => {
  const isValid = verifyPersonaWebhookSignature(payload, signature);
  if (!isValid) throw new AppError(StatusCodes.UNAUTHORIZED, "Invalid webhook signature");

  let data = webhookData.data;
  let included = webhookData.included;

  if (data?.type === "event") {
    if (data.attributes?.payload) {
      const eventPayload = data.attributes.payload;
      data = eventPayload.data;
      included = eventPayload.included || [];
    }
  }

  if (
    data?.type === "inquiry" &&
    (data.attributes?.status === "completed" || data.attributes?.status === "approved")
  ) {
    const userId = data.attributes["reference-id"];
    let isVerified = false;
    if (Array.isArray(included)) {
      const verifications = included.filter(
        (item: any) => item.type === "verification/government-id",
      );
      isVerified = verifications.some((ver: any) => ver.attributes?.status === "passed");
    }
    if (data.attributes.status === "approved") isVerified = true;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isPersonaVerified: isVerified },
    }).catch(() => null);
    if (!user) throw new AppError(StatusCodes.NOT_FOUND, `User not found with ID: ${userId}`);

    await UserCacheManage.updateUserCache(userId);
    await UserCacheManage.updateUserCache(`${userId}-me`);
  }

  if (
    data?.type === "inquiry" &&
    (data.attributes?.status === "failed" || data.attributes?.status === "declined")
  ) {
    const userId = data.attributes["reference-id"];
    await prisma.user.update({
      where: { id: userId },
      data: { isPersonaVerified: false },
    }).catch(() => null);

    await UserCacheManage.updateUserCache(userId);
    await UserCacheManage.updateUserCache(`${userId}-me`);
  }

  return { success: true };
};

const deleteUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  const deleted = await prisma.user.delete({ where: { id: userId } });
  await UserCacheManage.updateUserCache(userId);

  const mapped = mapUserResponse(deleted);
  delete (mapped as any).authentication;
  delete (mapped as any).fcmToken;
  return mapped;
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
  deleteUser,
};
