import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MessageServices } from "./message.service";
import { BlockServices } from "../block/block.service";
import { socketService } from "../../../shared/socketService";
import AppError from "../../errors/AppError";
import { prisma } from "../../../DB/prisma";

const isConnected = async (a: string, b: string) => {
  const [userOneId, userTwoId] = a < b ? [a, b] : [b, a];
  const connection = await prisma.connection.findUnique({
    where: { userOneId_userTwoId: { userOneId, userTwoId } },
  });
  return Boolean(connection);
};

const getChatMessages = catchAsync(async (req: Request, res: Response) => {
  const { userId: otherUserId } = req.params;
  const currentUserId = req.user?._id;
  const { page = "1", limit = "50" } = req.query;

  const areBlocking = await BlockServices.areUsersBlocking(currentUserId, otherUserId);
  if (areBlocking) {
    throw new AppError(StatusCodes.FORBIDDEN, "Cannot access chat with blocked user");
  }
  if (!(await isConnected(currentUserId, otherUserId))) {
    throw new AppError(StatusCodes.FORBIDDEN, "You can only chat with connected users");
  }

  const result = await MessageServices.getChatMessages(
    currentUserId,
    otherUserId,
    parseInt(page as string, 10),
    parseInt(limit as string, 10),
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chat messages retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createMessageWithImages = catchAsync(async (req: Request, res: Response) => {
  const messageData = JSON.parse(req.body.data);
  const images: string[] = [];

  if (req.files) {
    if ("images" in req.files) {
      (req.files.images as any[]).forEach((file: any) => images.push(`/images/${file.filename}`));
    }
    if ("image" in req.files) {
      (req.files.image as any[]).forEach((file: any) => images.push(`/images/${file.filename}`));
    }
  }

  if (!images.length) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: "At least one image is required",
      data: null,
    });
  }

  const senderId = messageData.senderId;
  const receiverId = messageData.receiverId;

  const areBlocking = await BlockServices.areUsersBlocking(senderId, receiverId);
  if (areBlocking) {
    return sendResponse(res, {
      statusCode: StatusCodes.FORBIDDEN,
      success: false,
      message: "Cannot send message to blocked user",
      data: null,
    });
  }
  if (!(await isConnected(senderId, receiverId))) {
    return sendResponse(res, {
      statusCode: StatusCodes.FORBIDDEN,
      success: false,
      message: "You can only send messages to connected users",
      data: null,
    });
  }

  const result = await MessageServices.createMessageWithImages({
    senderId,
    receiverId,
    message: messageData.message,
    images,
  });

  socketService.emitToUser(receiverId, `receiver-${receiverId}`, {
    _id: (result as any).id,
    senderId,
    receiverId,
    message: messageData.message,
    images,
    messageType: result.messageType,
    isRead: false,
    createdAt: result.createdAt,
  });

  socketService.emitToSender(senderId, "message-sent", {
    _id: (result as any).id,
    senderId,
    receiverId,
    message: messageData.message,
    images,
    messageType: result.messageType,
    isRead: false,
    createdAt: result.createdAt,
    status: "sent",
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Image message created successfully",
    data: result,
  });
});

const createMessageWithAudio = catchAsync(async (req: Request, res: Response) => {
  const messageData = JSON.parse(req.body.data);
  const audioFile = req.files && "audio" in req.files ? (req.files.audio as any)[0] : null;
  const audio = audioFile ? `/audio/${audioFile.filename}` : null;

  if (!audio) {
    return sendResponse(res, {
      statusCode: StatusCodes.BAD_REQUEST,
      success: false,
      message: "Audio file is required",
      data: null,
    });
  }

  const senderId = messageData.senderId;
  const receiverId = messageData.receiverId;

  const areBlocking = await BlockServices.areUsersBlocking(senderId, receiverId);
  if (areBlocking) {
    return sendResponse(res, {
      statusCode: StatusCodes.FORBIDDEN,
      success: false,
      message: "Cannot send message to blocked user",
      data: null,
    });
  }
  if (!(await isConnected(senderId, receiverId))) {
    return sendResponse(res, {
      statusCode: StatusCodes.FORBIDDEN,
      success: false,
      message: "You can only send messages to connected users",
      data: null,
    });
  }

  const result = await MessageServices.createMessageWithAudio({ senderId, receiverId, audio });

  socketService.emitToUser(receiverId, `receiver-${receiverId}`, {
    _id: (result as any).id,
    senderId,
    receiverId,
    audio,
    messageType: result.messageType,
    isRead: false,
    createdAt: result.createdAt,
  });

  socketService.emitToSender(senderId, "message-sent", {
    _id: (result as any).id,
    senderId,
    receiverId,
    audio,
    messageType: result.messageType,
    isRead: false,
    createdAt: result.createdAt,
    status: "sent",
  });

  sendResponse(res, {
    statusCode: StatusCodes.CREATED,
    success: true,
    message: "Audio message created successfully",
    data: result,
  });
});

const markMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
  const { senderId, receiverId } = req.body;
  await MessageServices.markMessagesAsRead(senderId, receiverId);

  socketService.emitToUser(senderId, "messages-read", {
    senderId,
    receiverId,
    isRead: true,
  });

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Messages marked as read",
    data: null,
  });
});

export const MessageController = {
  getChatMessages,
  createMessageWithImages,
  createMessageWithAudio,
  markMessagesAsRead,
};
