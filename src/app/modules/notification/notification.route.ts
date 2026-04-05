import { Router } from "express";
import { NotificationController } from "./notification.controller";
import auth from "../../middlewares/auth";
import { USER_ROLES } from "../user/user.constant";

const router = Router();

router.get(
  "/",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.getMyNotifications,
);

router.get(
  "/unread-count",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.getUnreadCount,
);

router.patch(
  "/:notificationId/read",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.markNotificationAsRead,
);

router.patch(
  "/read-all",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.markAllAsRead,
);

router.delete(
  "/:notificationId",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.deleteNotification,
);

router.delete(
  "/",
  auth(USER_ROLES.USER, USER_ROLES.ADMIN),
  NotificationController.deleteAllNotifications,
);

export const NotificationRoutes: Router = router;
