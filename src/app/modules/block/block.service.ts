import AppError from "../../errors/AppError";
import { StatusCodes } from "http-status-codes";
import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";

const blockUser = async (blockerId: string, blockedId: string) => {
  const [blocker, blocked] = await Promise.all([
    prisma.user.findUnique({ where: { id: blockerId } }),
    prisma.user.findUnique({ where: { id: blockedId } }),
  ]);
  if (!blocker) throw new AppError(StatusCodes.NOT_FOUND, "Blocker user not found");
  if (!blocked) throw new AppError(StatusCodes.NOT_FOUND, "User to block not found");
  if (blockerId === blockedId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Users cannot block themselves");
  }

  const existing = await prisma.block.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId,
        blockedId,
      },
    },
  });
  if (existing) throw new AppError(StatusCodes.BAD_REQUEST, "User is already blocked");

  return prisma.block.create({
    data: {
      id: generateOid(),
      blockerId,
      blockedId,
    },
  });
};

const unblockUser = async (blockerId: string, blockedId: string) => {
  const deleted = await prisma.block.deleteMany({
    where: { blockerId, blockedId },
  });
  if (!deleted.count) {
    throw new AppError(
      StatusCodes.NOT_FOUND,
      "User was not blocked or block relationship not found",
    );
  }
  return { success: true, message: "User unblocked successfully" };
};

const getBlockedUsers = async (userId: string) => {
  const blocked = await prisma.block.findMany({
    where: { blockerId: userId },
    include: { blocked: true },
    orderBy: { createdAt: "desc" },
  });
  return blocked.map((item) => ({
    _id: item.id,
    userId: item.blocked.id,
    firstName: item.blocked.firstName || "",
    lastName: item.blocked.lastName || "",
    image: item.blocked.image || "",
    createdAt: item.createdAt,
  }));
};

const isUserBlocked = async (blockerId: string, blockedId: string): Promise<boolean> => {
  const item = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId, blockedId } },
  });
  return Boolean(item);
};

const areUsersBlocking = async (user1Id: string, user2Id: string): Promise<boolean> => {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { blockerId: user1Id, blockedId: user2Id },
        { blockerId: user2Id, blockedId: user1Id },
      ],
    },
  });
  return Boolean(block);
};

export const BlockServices = {
  blockUser,
  unblockUser,
  getBlockedUsers,
  isUserBlocked,
  areUsersBlocking,
};
