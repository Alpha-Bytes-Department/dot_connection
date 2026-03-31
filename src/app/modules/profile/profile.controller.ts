import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ProfileServices } from "./profile.service";

const getAllProfiles = catchAsync(async (req: Request, res: Response) => {
  const profilesRes = await ProfileServices.getAllProfiles(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profiles retrieved successfully",
    data: profilesRes.result,
    meta: profilesRes.meta,
  });
});

const getProfileByUserId = catchAsync(async (req: Request, res: Response) => {
  const profile = await ProfileServices.getProfileByUserId(req.params.userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: profile,
  });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const profile = await ProfileServices.getMyProfile(userId);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profile retrieved successfully",
    data: profile,
  });
});

const searchProfiles = catchAsync(async (req: Request, res: Response) => {
  const profilesRes = await ProfileServices.searchProfiles(req.query);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Profiles found successfully",
    data: profilesRes.result,
    meta: profilesRes.meta,
  });
});

const updatePreferences = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const profile = await ProfileServices.updatePreferences(userId, req.body);

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Preferences updated successfully",
    data: profile,
  });
});

export const ProfileController = {
  getAllProfiles,
  getProfileByUserId,
  getMyProfile,
  searchProfiles,
  updatePreferences,
};
