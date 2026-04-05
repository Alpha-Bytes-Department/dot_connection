import { Document, Model, Types } from "mongoose";

export interface TBlock {
  blocker: Types.ObjectId; // User who is blocking
  blocked: Types.ObjectId; // User who is being blocked
  createdAt?: Date;
  updatedAt?: Date;
}

export interface BlockModel extends Model<TBlock> {
  isUserBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  getBlockedUsers(userId: string): Promise<TBlock[]>;
  getBlockedByUsers(userId: string): Promise<TBlock[]>;
  blockUser(blockerId: string, blockedId: string): Promise<TBlock>;
  unblockUser(blockerId: string, blockedId: string): Promise<boolean>;
  areUsersBlocking(user1Id: string, user2Id: string): Promise<boolean>;
}

export interface TBlockDocument extends Document<Types.ObjectId>, TBlock {}

export namespace TReturnBlock {
  export type BlockUser = TBlock;
  export type UnblockUser = {
    success: boolean;
    message: string;
  };
  export type GetBlockedUsers = {
    _id: string;
    userId: string;
    firstName: string;
    lastName: string;
    image: string;
    createdAt: Date;
  }[];
}
