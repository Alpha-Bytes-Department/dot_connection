import { Document, Model, Types } from "mongoose";

export interface TChat {
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  lastMessageTime?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ChatModel extends Model<TChat> {
  findUserChats(userId: string): Promise<any[]>;
  findChatByParticipants(user1Id: string, user2Id: string): Promise<TChat | null>;
  createChatForUsers(user1Id: string, user2Id: string): Promise<TChat>;
}

export interface TChatDocument extends Document<Types.ObjectId>, TChat {}
