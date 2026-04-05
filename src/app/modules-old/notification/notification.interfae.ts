import { Model, Types } from "mongoose";

export type TNotification = {
  _id?: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  body: string;
  type: 'match' | 'message' | 'connection_request' | 'general';
  relatedId?: Types.ObjectId; // ID of related entity (match, message, etc.)
  isRead: boolean;
  data?: Record<string, string>; // Additional data for the notification
  createdAt?: Date;
  updatedAt?: Date;
};

export type NotificationModel = Model<TNotification>;

export namespace TReturnNotification {
  export type Meta = {
    page: number;
    limit: number;
    totalPage: number;
    total: number;
    unreadCount: number;
  };

  export type getAllNotifications = {
    result: TNotification[];
    meta: Meta;
  };
}
