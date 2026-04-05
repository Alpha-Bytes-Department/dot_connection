import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationServices } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const result = await NotificationServices.getUserNotifications(userId, req.query);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notifications retrieved successfully",
    data: result.result,
    meta: result.meta,
  });
});

const markNotificationAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { notificationId } = req.params;
  const notification = await NotificationServices.markAsRead(userId, notificationId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification marked as read",
    data: notification,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const count = await NotificationServices.markAllAsRead(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${count} notification(s) marked as read`,
    data: { modifiedCount: count },
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const { notificationId } = req.params;
  await NotificationServices.deleteNotification(userId, notificationId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Notification deleted successfully",
    data: null,
  });
});

const deleteAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const count = await NotificationServices.deleteAllNotifications(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: `${count} notification(s) deleted`,
    data: { deletedCount: count },
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id;
  const count = await NotificationServices.getUnreadCount(userId);
  sendResponse(res, {
    statusCode: StatusCodes.OK,
    success: true,
    message: "Unread count retrieved successfully",
    data: { unreadCount: count },
  });
});

export const NotificationController = {
  getMyNotifications,
  markNotificationAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
};
