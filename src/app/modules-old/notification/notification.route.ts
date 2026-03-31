import { Router } from "express";
import { NotificationController } from "./notification.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../user/user.constant";

const router = Router();

// Get all notifications for authenticated user
router.get(
  "/",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.getMyNotifications
);

// Get unread count
router.get(
  "/unread-count",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.getUnreadCount
);

// Mark specific notification as read
router.patch(
  "/:notificationId/read",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.markNotificationAsRead
);

// Mark all notifications as read
router.patch(
  "/read-all",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.markAllAsRead
);

// Delete specific notification
router.delete(
  "/:notificationId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.deleteNotification
);

// Delete all notifications
router.delete(
  "/",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.deleteAllNotifications
);

export const NotificationRoutes: Router = router;
