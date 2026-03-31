import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { UserServices } from "./user.service";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { logger } from "../../../shared/logger";

const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await UserServices.createUser(req.body);

  if (result.accessToken && result.refreshToken) {
    res.cookie("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    sendResponse(res, {
      statusCode: StatusCodes.OK,
      success: true,
      message: result.message,
      data: {
        user: result.user,
        accessToken: result.accessToken,
      },
    });
    return;
  }

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: result.message,
    data: { email: result.email, phoneNumber: result.phoneNumber },
  });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const usersRes = await UserServices.getAllUsers(req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Users retrieved successfully",
    data: usersRes.result,
    meta: usersRes.meta,
  });
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await UserServices.getUserById(req.params.id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

const getMe = catchAsync(async (req: Request, res: Response) => {
  logger.info(`GetMe called by user ID: ${req.user._id}`);
  const user = await UserServices.getMe(req.user._id);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

const getNearbyUsers = catchAsync(async (req: Request, res: Response) => {
  const {
    radius = "25",
    latitude,
    longitude,
    gender,
    interests,
    interestedIn,
    lookingFor,
    religious,
    studyLevel,
  } = req.query as {
    radius?: string;
    latitude?: string;
    longitude?: string;
    gender?: string;
    interests?: string;
    interestedIn?: string;
    lookingFor?: string;
    religious?: string;
    studyLevel?: string;
  };

  const currentUserId = req.user._id;
  const searchRadius = parseFloat(radius);
  const parsedLatitude = latitude ? parseFloat(latitude) : undefined;
  const parsedLongitude = longitude ? parseFloat(longitude) : undefined;
  const parsedInterests = interests
    ? interests.split(",").map((i) => i.trim())
    : undefined;

  const filters = {
    radius: searchRadius,
    latitude: parsedLatitude,
    longitude: parsedLongitude,
    gender,
    interests: parsedInterests,
    interestedIn,
    lookingFor,
    religious,
    studyLevel,
  };

  const result = await UserServices.getNearbyUsers(currentUserId, filters);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Nearby users retrieved successfully",
    data: result,
  });
});

const updateUserByToken = catchAsync(async (req: Request, res: Response) => {
  const userdata = JSON.parse(req.body.data);
  let image = null;
  if (req.files && "image" in req.files && req.files.image[0]) {
    image = req.files.image[0].path.replace("/app/uploads", "");
  }
  const user = { ...userdata, image };
  if (user.image === null) delete user.image;

  const id = req.user._id;
  const result = await UserServices.updateUserByToken(id, user);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User updated successfully",
    data: result,
  });
});

const updateUserActivationStatus = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.body;
  const user = await UserServices.updateUserActivationStatus(req.params.id, status);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `User ${status === "active" ? "activated" : "deleted"} successfully`,
    data: user,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { role } = req.body;
  const user = await UserServices.updateUserRole(req.params.id, role);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User role updated successfully",
    data: user,
  });
});

const verifyOTPAndLogin = catchAsync(async (req: Request, res: Response) => {
  const { email, phoneNumber, otp, fcmToken } = req.body;
  const contact = email || phoneNumber;
  const result = await UserServices.verifyOTPAndLogin(contact, otp, fcmToken);

  res.cookie("refreshToken", result.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Login successful",
    data: { user: result.user, accessToken: result.accessToken },
  });
});

const changeUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const user = await UserServices.changeUserStatus(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User status changed successfully",
    data: user,
  });
});

const addUserFields = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const result = await UserServices.addUserFields(userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User fields added successfully",
    data: result,
  });
});

const addProfileFields = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const result = await UserServices.addProfileFields(userId, req.body);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile fields added successfully",
    data: result,
  });
});

const updateProfileByToken = catchAsync(async (req: Request, res: Response) => {
  const profileData = JSON.parse(req.body.data);
  let newImages: string[] = [];

  if (req.files && "image" in req.files && Array.isArray(req.files.image)) {
    newImages = req.files.image.map((file: any) =>
      file.path.replace("/app/uploads", ""),
    );
  }

  const profile = { ...profileData, newPhotos: newImages };
  const userId = req.user._id;
  const result = await UserServices.updateProfileByToken(userId, profile);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const deleteProfileImage = catchAsync(async (req: Request, res: Response) => {
  const { imageIndex } = req.params;
  const userId = req.user._id;
  const result = await UserServices.deleteProfileImage(userId, parseInt(imageIndex, 10));
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Image deleted successfully",
    data: result,
  });
});

const updateHiddenFields = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { hiddenFields } = req.body;
  const result = await UserServices.updateHiddenFields(userId, hiddenFields);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Hidden fields updated successfully",
    data: result,
  });
});

const getPersonaVerificationUrl = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const result = await UserServices.getPersonaVerificationUrl(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Persona verification URL generated successfully",
    data: result,
  });
});

const personaWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["persona-signature"] as string;
  const rawBody = (req as any).rawBody || JSON.stringify(req.body);
  await UserServices.handlePersonaWebhook(rawBody, signature, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Webhook processed successfully",
    data: null,
  });
});

const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const user = await UserServices.deleteUser(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "User status changed successfully",
    data: user,
  });
});

export const UserController = {
  createUser,
  getAllUsers,
  getUserById,
  updateUserActivationStatus,
  updateUserRole,
  getMe,
  getNearbyUsers,
  updateUserByToken,
  changeUserStatus,
  verifyOTPAndLogin,
  addUserFields,
  addProfileFields,
  updateProfileByToken,
  deleteProfileImage,
  updateHiddenFields,
  getPersonaVerificationUrl,
  personaWebhook,
  deleteUser,
};
