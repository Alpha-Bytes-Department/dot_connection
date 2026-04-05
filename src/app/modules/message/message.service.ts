import { TMessage } from "./message.interface";
import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";
import { MessageType } from "@prisma/client";

const inferMessageType = (payload: {
  images?: string[];
  image?: string;
  audio?: string;
}): MessageType => {
  if (payload.images?.length || payload.image) return "image";
  if (payload.audio) return "audio";
  return "text";
};

const createMessage = async (payload: {
  senderId: string;
  receiverId: string;
  message?: string;
  image?: string;
  audio?: string;
  images?: string[];
}): Promise<TMessage> => {
  return prisma.message.create({
    data: {
      id: generateOid(),
      senderId: payload.senderId,
      receiverId: payload.receiverId,
      message: payload.message,
      image: payload.image,
      audio: payload.audio,
      images: payload.images ?? [],
      messageType: inferMessageType(payload),
    },
  });
};

const createMessageWithImages = async (payload: {
  senderId: string;
  receiverId: string;
  message?: string;
  images: string[];
}): Promise<TMessage> => createMessage(payload);

const createMessageWithAudio = async (payload: {
  senderId: string;
  receiverId: string;
  audio: string;
}): Promise<TMessage> => createMessage(payload);

const getChatMessages = async (senderId: string, receiverId: string, page = 1, limit = 50) => {
  const skip = (page - 1) * limit;
  const where = {
    OR: [
      { senderId, receiverId },
      { senderId: receiverId, receiverId: senderId },
    ],
  };

  const [total, data] = await Promise.all([
    prisma.message.count({ where }),
    prisma.message.findMany({
      where,
      include: {
        sender: { select: { firstName: true, lastName: true, image: true, id: true } },
        receiver: { select: { firstName: true, lastName: true, image: true, id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

const markMessagesAsRead = async (senderId: string, receiverId: string) =>
  prisma.message.updateMany({
    where: { senderId, receiverId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });

const getUnreadMessagesCount = async (senderId: string, receiverId: string) =>
  prisma.message.count({ where: { senderId, receiverId, isRead: false } });

const getLastMessage = async (user1Id: string, user2Id: string) =>
  prisma.message.findFirst({
    where: {
      OR: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

export const MessageServices = {
  createMessage,
  createMessageWithImages,
  createMessageWithAudio,
  getChatMessages,
  markMessagesAsRead,
  getUnreadMessagesCount,
  getLastMessage,
};
