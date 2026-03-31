import { Types } from "mongoose";
import { Chat } from "./chat.model";
import { Message } from "../message/message.model";
import { Connection } from "../match/match.model";
import { Block } from "../block/block.model";
import { TChat } from "./chat.interface";

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

const getUserChatList = async (userId: string): Promise<ChatListItem[]> => {
  // Get all user connections (mutual matches) with populated user data
  const connections = await Connection.find({
    userIds: userId,
  }).populate({
    path: "userIds",
    select: "firstName lastName image",
  });
  
  const chatList: ChatListItem[] = [];
  
  for (const connection of connections) {
    const otherUser = (connection.userIds as any[]).find(
      (user: any) => user._id.toString() !== userId
    );
    
    if (otherUser) {
      // Check if users are blocking each other
      const areBlocking = await Block.areUsersBlocking(userId, otherUser._id.toString());
      
      // Skip this chat if users are blocking each other
      if (areBlocking) {
        continue;
      }
      
      // Get last message between users
      const lastMessage = await Message.getLastMessage(userId, otherUser._id.toString());
      
      // Get unread count
      const unreadCount = await Message.getUnreadCount(
        otherUser._id.toString(),
        userId
      );
      
      // Format last message
      let lastMessageText = "";
      if (lastMessage) {
        if (lastMessage.messageType === "text") {
          lastMessageText = lastMessage.message || "";
        } else if (lastMessage.messageType === "image") {
          lastMessageText = "📷 Image";
        } else if (lastMessage.messageType === "audio") {
          lastMessageText = "🎵 Audio";
        } else if (lastMessage.messageType === "multipleImages") {
          lastMessageText = "📷 Images";
        }
        
        // Limit to 100 characters
        if (lastMessageText.length > 100) {
          lastMessageText = lastMessageText.substring(0, 100) + "...";
        }
      }
      
      chatList.push({
        _id: connection._id?.toString() || "",
        participant: {
          _id: otherUser._id.toString(),
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
  }
  
  // Sort by last message time
  chatList.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());
  
  return chatList;
};

const createChatForMutualMatch = async (
  user1Id: string,
  user2Id: string
): Promise<TChat> => {
  // Check if users have mutual connection
  const connection = await Connection.findOne({
    userIds: { $all: [user1Id, user2Id] },
  });
  
  if (!connection) {
    throw new Error("No mutual connection found between users");
  }
  
  return await Chat.createChatForUsers(user1Id, user2Id);
};

const updateChatLastMessage = async (
  chatId: string,
  messageId: string
): Promise<void> => {
  await Chat.findByIdAndUpdate(chatId, {
    lastMessage: messageId,
    lastMessageTime: new Date(),
  });
};

const getChatByParticipants = async (
  user1Id: string,
  user2Id: string
): Promise<TChat | null> => {
  return await Chat.findChatByParticipants(user1Id, user2Id);
};

export const ChatServices = {
  getUserChatList,
  createChatForMutualMatch,
  updateChatLastMessage,
  getChatByParticipants,
};
