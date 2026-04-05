import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { NotificationServices } from "./notification.service";

// Get all notifications for authenticated user
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

// Mark a notification as read
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

// Mark all notifications as read
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

// Delete a notification
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

// Delete all notifications
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

// Get unread count
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
