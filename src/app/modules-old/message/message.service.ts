import { Types } from "mongoose";
import { TMessage } from "./message.interface";
import { Message } from "./message.model";

const createMessage = async (payload: {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message?: string;
  image?: string;
  audio?: string;
  images?: string[];
}): Promise<TMessage> => {
  const result = await Message.create(payload);
  return result;
};

const createMessageWithImages = async (payload: {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message?: string;
  images: string[];
}): Promise<TMessage> => {
  const result = await Message.create(payload);
  return result;
};

const createMessageWithAudio = async (payload: {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  audio: string;
}): Promise<TMessage> => {
  const result = await Message.create(payload);
  return result;
};

const getChatMessages = async (
  senderId: string,
  receiverId: string,
  page: number = 1,
  limit: number = 50
): Promise<{
  data: TMessage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
  };
}> => {
  return await Message.findChatMessages(senderId, receiverId, page, limit);
};

const markMessagesAsRead = async (
  senderId: string,
  receiverId: string
): Promise<any> => {
  return await Message.markMessagesAsRead(senderId, receiverId);
};

const getUnreadMessagesCount = async (
  senderId: string,
  receiverId: string
): Promise<number> => {
  return await Message.getUnreadCount(senderId, receiverId);
};

const getLastMessage = async (
  user1Id: string,
  user2Id: string
): Promise<TMessage | null> => {
  return await Message.getLastMessage(user1Id, user2Id);
};

export const MessageServices = {
  createMessage,
  createMessageWithImages,
  createMessageWithAudio,
  getChatMessages,
  markMessagesAsRead,
  getUnreadMessagesCount,
  getLastMessage,
};
