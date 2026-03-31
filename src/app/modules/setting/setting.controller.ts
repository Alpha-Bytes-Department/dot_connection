import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { settingService } from "./setting.service";

const createAboutUs = catchAsync(async (req: Request, res: Response) => {
  const { aboutUs } = req.body;
  const result = await settingService.createAboutUs(aboutUs);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "About us created/updated successfully",
    data: result,
  });
});

const createPrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const { privacyPolicy } = req.body;
  const result = await settingService.createPrivacyPolicy(privacyPolicy);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Privacy policy created/updated successfully",
    data: result,
  });
});

const createTermsAndConditions = catchAsync(async (req: Request, res: Response) => {
  const { termsAndConditions } = req.body;
  const result = await settingService.createTermsAndConditions(termsAndConditions);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Terms and conditions created/updated successfully",
    data: result,
  });
});

const getSettings = catchAsync(async (req: Request, res: Response) => {
  const result = await settingService.getSettings();
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Settings retrieved successfully",
    data: result,
  });
});

export const SettingController = {
  createAboutUs,
  createPrivacyPolicy,
  createTermsAndConditions,
  getSettings,
};
