import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { MessageServices } from "./message.service";
import { Connection } from "../match/match.model";
import { Block } from "../block/block.model";
import { socketService } from "../../../shared/socketService";
import AppError from "../../errors/AppError";

const getChatMessages = catchAsync(async (req: Request, res: Response) => {
  const { userId: otherUserId } = req.params;
  const currentUserId = req.user?._id;
  const { page = "1", limit = "50" } = req.query;

  // Check if users are blocking each other
  const areBlocking = await Block.areUsersBlocking(currentUserId, otherUserId);
  if (areBlocking) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "Cannot access chat with blocked user"
    );
  }

  // Check if users have mutual connection
  const connection = await Connection.findOne({
    userIds: { $all: [currentUserId, otherUserId] },
  });
  console.log({ currentUserId, otherUserId });
  console.log(connection);
  if (!connection) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "You can only chat with connected users"
    );
  }

  const result = await MessageServices.getChatMessages(
    currentUserId,
    otherUserId,
    parseInt(page as string),
    parseInt(limit as string)
  );

  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Chat messages retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const createMessageWithImages = catchAsync(
  async (req: Request, res: Response) => {
    const messageData = JSON.parse(req.body.data);
    const images: string[] = [];

    // Handle both "image" (single) and "images" (multiple) field names
    if (req.files) {
      // Check for "images" field (multiple images)
      if ("images" in req.files) {
        const fileArray = req.files.images as any[];
        fileArray.forEach((file: any) => {
          images.push(`/images/${file.filename}`);
        });
      }
      
      // Check for "image" field (single image)
      if ("image" in req.files) {
        const fileArray = req.files.image as any[];
        fileArray.forEach((file: any) => {
          images.push(`/images/${file.filename}`);
        });
      }
    }

    if (images.length === 0) {
      return sendResponse(res, {
        statusCode: StatusCodes.BAD_REQUEST,
        success: false,
        message: "At least one image is required",
        data: null,
      });
    }

    const message = {
      sender: new Types.ObjectId(messageData.senderId),
      receiver: new Types.ObjectId(messageData.receiverId),
      message: messageData.message,
      images: images,
    };

    // Check if users are blocking each other
    const areBlocking = await Block.areUsersBlocking(
      message.sender.toString(),
      message.receiver.toString()
    );
    if (areBlocking) {
      return sendResponse(res, {
        statusCode: StatusCodes.FORBIDDEN,
        success: false,
        message: "Cannot send message to blocked user",
        data: null,
      });
    }

    // Check if users have mutual connection
    const connection = await Connection.findOne({
      userIds: { $all: [message.sender, message.receiver] },
    });

    if (!connection) {
      return sendResponse(res, {
        statusCode: StatusCodes.FORBIDDEN,
        success: false,
        message: "You can only send messages to connected users",
        data: null,
      });
    }

    const result = await MessageServices.createMessageWithImages(message);
 console.log({
        _id: (result as any)._id,
        senderId: message.sender,
        receiverId: message.receiver,
        message: message.message,
        images: message.images,
        messageType: result.messageType,
        isRead: false,
        createdAt: result.createdAt,
      });
    // Send real-time notification via socket to receiver
    socketService.emitToUser(
      message.receiver.toString(),
      `receiver-${message.receiver}`,
      {
        _id: (result as any)._id,
        senderId: message.sender,
        receiverId: message.receiver,
        message: message.message,
        images: message.images,
        messageType: result.messageType,
        isRead: false,
        createdAt: result.createdAt,
      }
    );

    // Send confirmation to sender
    socketService.emitToSender(message.sender.toString(), `message-sent`, {
      _id: (result as any)._id,
      senderId: message.sender,
      receiverId: message.receiver,
      message: message.message,
      images: message.images,
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
  }
);

const createMessageWithAudio = catchAsync(
  async (req: Request, res: Response) => {
    const messageData = JSON.parse(req.body.data);
    console.log(messageData);
    let audio = null;

    if (req.files && "audio" in req.files && (req.files.audio as any)[0]) {
      audio = `/audio/${(req.files.audio as any)[0].filename}`;
    }
console.log(audio);
    if (!audio) {
      return sendResponse(res, {
        statusCode: StatusCodes.BAD_REQUEST,
        success: false,
        message: "Audio file is required",
        data: null,
      });
    }

    const message = {
      sender: new Types.ObjectId(messageData.senderId),
      receiver: new Types.ObjectId(messageData.receiverId),
      audio: audio,
    };

    // Check if users are blocking each other
    const areBlocking = await Block.areUsersBlocking(
      message.sender.toString(),
      message.receiver.toString()
    );
    if (areBlocking) {
      return sendResponse(res, {
        statusCode: StatusCodes.FORBIDDEN,
        success: false,
        message: "Cannot send message to blocked user",
        data: null,
      });
    }

    // Check if users have mutual connection
    const connection = await Connection.findOne({
      userIds: { $all: [message.sender, message.receiver] },
    });

    if (!connection) {
      return sendResponse(res, {
        statusCode: StatusCodes.FORBIDDEN,
        success: false,
        message: "You can only send messages to connected users",
        data: null,
      });
    }

    const result = await MessageServices.createMessageWithAudio(message);

    // Send real-time notification via socket to receiver
    socketService.emitToUser(
      message.receiver.toString(),
      `receiver-${message.receiver}`,
      {
        _id: (result as any)._id,
        senderId: message.sender,
        receiverId: message.receiver,
        audio: message.audio,
        messageType: result.messageType,
        isRead: false,
        createdAt: result.createdAt,
      }
    );

    // Send confirmation to sender
    socketService.emitToSender(message.sender.toString(), `message-sent`, {
      _id: (result as any)._id,
      senderId: message.sender,
      receiverId: message.receiver,
      audio: message.audio,
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
  }
);

const markMessagesAsRead = catchAsync(async (req: Request, res: Response) => {
  const { senderId, receiverId } = req.body;

  await MessageServices.markMessagesAsRead(senderId, receiverId);

  // Notify the sender that messages have been read via socket
  socketService.emitToUser(senderId, `messages-read`, {
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
