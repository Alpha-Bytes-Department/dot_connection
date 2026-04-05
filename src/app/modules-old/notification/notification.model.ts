import { Schema, model } from "mongoose";
import { TNotification, NotificationModel } from "./notification.interfae";

const notificationSchema = new Schema<TNotification, NotificationModel>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, "Body cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: ['match', 'message', 'connection_request', 'general'],
      required: true,
      index: true,
    },
    relatedId: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Compound indexes for efficient queries
notificationSchema.index({ userId: 1, isRead: 1 });
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, isRead: 1 });

// Auto-delete notifications older than 30 days (optional)
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Notification = model<TNotification, NotificationModel>(
  "Notification",
  notificationSchema
);
