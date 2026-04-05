import AppError from "../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";
import { TChat } from "./chat.interface";
import { BlockServices } from "../block/block.service";

interface ChatListItem {
  _id: string;
  participant: {
    _id: string;
    firstName: string;
    lastName: string;
    image: string;
  };
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isRead: boolean;
}

const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

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

const getUnreadCount = async (senderId: string, receiverId: string) =>
  prisma.message.count({
    where: { senderId, receiverId, isRead: false },
  });

const getUserChatList = async (userId: string): Promise<ChatListItem[]> => {
  const connections = await prisma.connection.findMany({
    where: {
      OR: [{ userOneId: userId }, { userTwoId: userId }],
    },
    include: {
      userOne: true,
      userTwo: true,
    },
  });

  const chatList: ChatListItem[] = [];
  for (const connection of connections) {
    const otherUser = connection.userOneId === userId ? connection.userTwo : connection.userOne;
    const areBlocking = await BlockServices.areUsersBlocking(userId, otherUser.id);
    if (areBlocking) continue;

    const lastMessage = await getLastMessage(userId, otherUser.id);
    const unreadCount = await getUnreadCount(otherUser.id, userId);

    let lastMessageText = "";
    if (lastMessage) {
      if (lastMessage.messageType === "text") lastMessageText = lastMessage.message || "";
      else if (lastMessage.messageType === "image") lastMessageText = "📷 Image";
      else if (lastMessage.messageType === "audio") lastMessageText = "🎵 Audio";
      if (lastMessageText.length > 100) lastMessageText = `${lastMessageText.substring(0, 100)}...`;
    }

    chatList.push({
      _id: connection.id,
      participant: {
        _id: otherUser.id,
        firstName: otherUser.firstName || "",
        lastName: otherUser.lastName || "",
        image: otherUser.image || "",
      },
      lastMessage: lastMessageText,
      lastMessageTime: lastMessage?.createdAt || connection.createdAt || new Date(),
      unreadCount,
      isRead: unreadCount === 0,
    });
  }

  chatList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  return chatList;
};

const createChatForMutualMatch = async (user1Id: string, user2Id: string): Promise<TChat> => {
  const [a, b] = pair(user1Id, user2Id);
  const connection = await prisma.connection.findUnique({
    where: { userOneId_userTwoId: { userOneId: a, userTwoId: b } },
  });
  if (!connection) throw new AppError(StatusCodes.BAD_REQUEST, "No mutual connection found between users");

  const existing = await prisma.chat.findUnique({
    where: { userOneId_userTwoId: { userOneId: a, userTwoId: b } },
  });
  if (existing) return existing;

  return prisma.chat.create({
    data: { id: generateOid(), userOneId: a, userTwoId: b },
  });
};

const updateChatLastMessage = async (chatId: string, messageId: string): Promise<void> => {
  await prisma.chat.update({
    where: { id: chatId },
    data: { lastMessageId: messageId, lastMessageTime: new Date() },
  });
};

const getChatByParticipants = async (user1Id: string, user2Id: string): Promise<TChat | null> => {
  const [a, b] = pair(user1Id, user2Id);
  return prisma.chat.findUnique({
    where: { userOneId_userTwoId: { userOneId: a, userTwoId: b } },
  });
};

export const ChatServices = {
  getUserChatList,
  createChatForMutualMatch,
  updateChatLastMessage,
  getChatByParticipants,
};
