import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { ChatServices } from "./chat.service";

const getChatList = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?._id;
  const result = await ChatServices.getUserChatList(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chat list retrieved successfully",
    data: result,
  });
});

export const ChatController = {
  getChatList,
};
