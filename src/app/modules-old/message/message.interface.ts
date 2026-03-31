import { Document, Model, Types } from "mongoose";

export interface TMessage {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message?: string;
  image?: string;
  audio?: string;
  images?: string[];
  messageType: "text" | "image" | "audio";
  isRead: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MessageModel extends Model<TMessage> {
  findChatMessages(senderId: string, receiverId: string, page?: number, limit?: number): Promise<{
    data: TMessage[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPage: number;
    };
  }>;
  markMessagesAsRead(senderId: string, receiverId: string): Promise<any>;
  getUnreadCount(senderId: string, receiverId: string): Promise<number>;
  getLastMessage(user1Id: string, user2Id: string): Promise<TMessage | null>;
}

export interface TMessageDocument extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message?: string;
  image?: string;
  audio?: string;
  images?: string[];
  messageType: "text" | "image" | "audio";
  isRead: boolean;
  readAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}
