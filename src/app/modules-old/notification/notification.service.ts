import { StatusCodes } from "http-status-codes";
import { Types } from "mongoose";
import AppError from "../../errors/AppError";
import { Notification } from "./notification.model";
import { TNotification, TReturnNotification } from "./notification.interfae";
import { User } from "../user/user.model";
import { logger } from "../../../shared/logger";
import { Block } from "../block/block.model";
import { FCMService } from "../../../shared/fcm.service";

// Create and save notification to database
const createNotification = async (
  notification: Partial<TNotification>
): Promise<TNotification> => {
  const newNotification = await Notification.create(notification);
  return newNotification;
};

// Send push notification via FCM and save to database
const sendPushNotification = async (
  userId: string | Types.ObjectId,
  title: string,
  body: string,
  type: 'match' | 'message' | 'connection_request' | 'general',
  relatedId?: Types.ObjectId,
  additionalData?: Record<string, string>
): Promise<{ sent: boolean; notification: TNotification }> => {
  try {
    // Get user's FCM token
    const user = await User.findById(userId).select('fcmToken pushNotification').lean();
    
    if (!user) {
      throw new AppError(StatusCodes.NOT_FOUND, "User not found");
    }

    // Save notification to database
    const notification = await createNotification({
      userId: new Types.ObjectId(userId),
      title,
      body,
      type,
      relatedId,
      data: additionalData,
      isRead: false,
    });

    // Check if user has push notifications enabled and has FCM token
    if (!user.pushNotification || !user.fcmToken) {
      logger.info(`User ${userId} has push notifications disabled or no FCM token`);
      return { sent: false, notification };
    }

    // Send FCM notification
    const fcmData: Record<string, string> = {
      notificationId: notification._id!.toString(),
      type,
      ...(relatedId && { relatedId: relatedId.toString() }),
      ...additionalData,
    };

    const sent = await FCMService.sendNotification({
      token: user.fcmToken,
      title,
      body,
      data: fcmData,
    });

    if (sent) {
      logger.info(`Push notification sent successfully to user ${userId}`);
    } else {
      logger.warn(`Failed to send push notification to user ${userId}`);
    }

    return { sent, notification };
  } catch (error) {
    logger.error(`Error sending push notification:`, error);
    throw error;
  }
};

// Send notification only if sender is not blocked by receiver
const sendNotificationIfNotBlocked = async (
  senderId: string | Types.ObjectId,
  receiverId: string | Types.ObjectId,
  title: string,
  body: string,
  type: 'match' | 'message' | 'connection_request' | 'general',
  relatedId?: Types.ObjectId,
  additionalData?: Record<string, string>
): Promise<{ sent: boolean; notification?: TNotification; blocked?: boolean }> => {
  try {
    // Check if receiver has blocked sender
    const isBlocked = await Block.isUserBlocked(receiverId.toString(), senderId.toString());
    
    if (isBlocked) {
      logger.info(`User ${senderId} is blocked by ${receiverId}. Notification not sent.`);
      return { sent: false, blocked: true };
    }

    // Send notification
    const result = await sendPushNotification(
      receiverId,
      title,
      body,
      type,
      relatedId,
      additionalData
    );

    return { ...result, blocked: false };
  } catch (error) {
    logger.error(`Error in sendNotificationIfNotBlocked:`, error);
    throw error;
  }
};

// Get all notifications for a user with pagination
const getUserNotifications = async (
  userId: string,
  query: Record<string, unknown>
): Promise<TReturnNotification.getAllNotifications> => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  const isRead = query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined;
  const type = query.type as string | undefined;

  // Build filter
  const filter: any = { userId: new Types.ObjectId(userId) };
  if (isRead !== undefined) {
    filter.isRead = isRead;
  }
  if (type) {
    filter.type = type;
  }

  // Execute queries in parallel
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ userId: new Types.ObjectId(userId), isRead: false }),
  ]);

  const totalPage = Math.ceil(total / limit);

  return {
    result: notifications,
    meta: {
      page,
      limit,
      total,
      totalPage,
      unreadCount,
    },
  };
};

// Mark notification as read
const markAsRead = async (
  userId: string,
  notificationId: string
): Promise<TNotification> => {
  const notification = await Notification.findOneAndUpdate(
    {
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Notification not found or unauthorized"
    );
  }

  return notification;
};

// Mark all notifications as read for a user
const markAllAsRead = async (userId: string): Promise<number> => {
  const result = await Notification.updateMany(
    { userId: new Types.ObjectId(userId), isRead: false },
    { isRead: true }
  );

  return result.modifiedCount;
};

// Delete a notification
const deleteNotification = async (
  userId: string,
  notificationId: string
): Promise<void> => {
  const result = await Notification.findOneAndDelete({
    _id: new Types.ObjectId(notificationId),
    userId: new Types.ObjectId(userId),
  });

  if (!result) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "Notification not found or unauthorized"
    );
  }
};

// Delete all notifications for a user
const deleteAllNotifications = async (userId: string): Promise<number> => {
  const result = await Notification.deleteMany({
    userId: new Types.ObjectId(userId),
  });

  return result.deletedCount;
};

// Get unread count for a user
const getUnreadCount = async (userId: string): Promise<number> => {
  const count = await Notification.countDocuments({
    userId: new Types.ObjectId(userId),
    isRead: false,
  });

  return count;
};

export const NotificationServices = {
  createNotification,
  sendPushNotification,
  sendNotificationIfNotBlocked,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadCount,
};
