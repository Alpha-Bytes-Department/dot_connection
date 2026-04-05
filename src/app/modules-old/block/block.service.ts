import { Block } from "./block.model";
import { TReturnBlock } from "./block.interface";
import { User } from "../user/user.model";

const blockUser = async (
  blockerId: string,
  blockedId: string
): Promise<TReturnBlock.BlockUser> => {
  // Verify both users exist
  const blocker = await User.isExistUserById(blockerId);
  const blocked = await User.isExistUserById(blockedId);
  
  if (!blocker) {
    throw new Error("Blocker user not found");
  }
  
  if (!blocked) {
    throw new Error("User to block not found");
  }
  
  return await Block.blockUser(blockerId, blockedId);
};

const unblockUser = async (
  blockerId: string,
  blockedId: string
): Promise<TReturnBlock.UnblockUser> => {
  const success = await Block.unblockUser(blockerId, blockedId);
  
  if (!success) {
    throw new Error("User was not blocked or block relationship not found");
  }
  
  return {
    success: true,
    message: "User unblocked successfully",
  };
};

const getBlockedUsers = async (
  userId: string
): Promise<TReturnBlock.GetBlockedUsers> => {
  const blockedUsers = await Block.getBlockedUsers(userId);
  
  return blockedUsers.map((block: any) => ({
    _id: block._id.toString(),
    userId: block.blocked._id.toString(),
    firstName: block.blocked.firstName || "",
    lastName: block.blocked.lastName || "",
    image: block.blocked.image || "",
    createdAt: block.createdAt,
  }));
};

const isUserBlocked = async (
  blockerId: string,
  blockedId: string
): Promise<boolean> => {
  return await Block.isUserBlocked(blockerId, blockedId);
};

const areUsersBlocking = async (
  user1Id: string,
  user2Id: string
): Promise<boolean> => {
  return await Block.areUsersBlocking(user1Id, user2Id);
};

export const BlockServices = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  areUsersBlocking,
};
