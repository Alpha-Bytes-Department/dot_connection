import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { BlockServices } from "./block.service";

const blockUser = catchAsync(async (req: Request, res: Response) => {
  const blockerId = req.user?._id;
  const { userId: blockedId } = req.params;
  
  const result = await BlockServices.blockUser(blockerId, blockedId);
  
  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "User blocked successfully",
    data: result,
  });
});

const unblockUser = catchAsync(async (req: Request, res: Response) => {
  const blockerId = req.user?._id;
  const { userId: blockedId } = req.params;
  
  const result = await BlockServices.unblockUser(blockerId, blockedId);
  
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: result.message,
    data: result,
  });
});

const getBlockedUsers = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  
  const result = await BlockServices.getBlockedUsers(userId);
  
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Blocked users retrieved successfully",
    data: result,
  });
});

const checkBlockStatus = catchAsync(async (req: Request, res: Response) => {
  const currentUserId = req.user?._id;
  const { userId: otherUserId } = req.params;
  
  const areBlocking = await BlockServices.areUsersBlocking(currentUserId, otherUserId);
  
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Block status retrieved successfully",
    data: {
      isBlocked: areBlocking,
    },
  });
});

export const BlockController = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  checkBlockStatus,
};
