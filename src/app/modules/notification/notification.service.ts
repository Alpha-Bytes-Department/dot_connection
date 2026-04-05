import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";
import { logger } from "../../../shared/logger";
import { FCMService } from "../../../shared/fcm.service";
import { BlockServices } from "../block/block.service";
import { NotificationType } from "@prisma/client";

const createNotification = async (notification: any) => {
  return prisma.notification.create({
    data: {
      id: generateOid(),
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
      type: notification.type as NotificationType,
      relatedId: notification.relatedId ?? null,
      data: notification.data ?? {},
      isRead: false,
    },
  });
};

const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  type: "match" | "message" | "connection_request" | "general",
  relatedId?: string,
  additionalData?: Record<string, string>,
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true, pushNotification: true },
  });
  if (!user) throw new AppError(StatusCodes.NOT_FOUND, "User not found");

  const notification = await createNotification({
    userId,
    title,
    body,
    type,
    relatedId,
    data: additionalData,
  });

  if (!user.pushNotification || !user.fcmToken) {
    logger.info(`User ${userId} has push notifications disabled or no FCM token`);
    return { sent: false, notification };
  }

  const fcmData: Record<string, string> = {
    notificationId: notification.id,
    type,
    ...(relatedId ? { relatedId } : {}),
    ...(additionalData ?? {}),
  };

  const sent = await FCMService.sendNotification({
    token: user.fcmToken,
    title,
    body,
    data: fcmData,
  });

  if (sent) logger.info(`Push notification sent successfully to user ${userId}`);
  else logger.warn(`Failed to send push notification to user ${userId}`);

  return { sent, notification };
};

const sendNotificationIfNotBlocked = async (
  senderId: string,
  receiverId: string,
  title: string,
  body: string,
  type: "match" | "message" | "connection_request" | "general",
  relatedId?: string,
  additionalData?: Record<string, string>,
) => {
  const isBlocked = await BlockServices.isUserBlocked(receiverId, senderId);
  if (isBlocked) {
    logger.info(`User ${senderId} is blocked by ${receiverId}. Notification not sent.`);
    return { sent: false, blocked: true };
  }

  const result = await sendPushNotification(
    receiverId,
    title,
    body,
    type,
    relatedId,
    additionalData,
  );
  return { ...result, blocked: false };
};

const getUserNotifications = async (userId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;
  const isRead =
    query.isRead === "true" ? true : query.isRead === "false" ? false : undefined;
  const type = query.type as NotificationType | undefined;

  const where: any = { userId };
  if (isRead !== undefined) where.isRead = isRead;
  if (type) where.type = type;

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    result: notifications,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
      unreadCount,
    },
  };
};

const markAsRead = async (userId: string, notificationId: string) => {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
  });
  if (!notification) {
    throw new AppError(StatusCodes.NOT_FOUND, "Notification not found or unauthorized");
  }
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId: string): Promise<number> => {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
};

const deleteNotification = async (userId: string, notificationId: string): Promise<void> => {
  const result = await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
  if (!result.count) {
    throw new AppError(StatusCodes.NOT_FOUND, "Notification not found or unauthorized");
  }
};

const deleteAllNotifications = async (userId: string): Promise<number> => {
  const result = await prisma.notification.deleteMany({ where: { userId } });
  return result.count;
};

const getUnreadCount = async (userId: string): Promise<number> => {
  return prisma.notification.count({ where: { userId, isRead: false } });
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
