import { StatusCodes } from "http-status-codes";
import AppError from "../../errors/AppError";
import { prisma } from "../../../DB/prisma";
import generateOid from "../../../util/generateOid";
import { TMatchAction } from "./match.interface";
import { NotificationServices } from "../notification/notification.service";
import { UserStatus } from "@prisma/client";

const pair = (a: string, b: string) => (a < b ? [a, b] : [b, a]);

const getPotentialMatches = async (userId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const currentUserProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { gender: true, interestedIn: true },
  });
  if (!currentUserProfile) {
    throw new AppError(StatusCodes.NOT_FOUND, "User profile not found");
  }

  const interactedUsers = await prisma.match.findMany({
    where: { fromUserId: userId },
    select: { toUserId: true },
  });
  const excluded = new Set(interactedUsers.map((m) => m.toUserId));
  excluded.add(userId);

  const users = await prisma.user.findMany({
    where: {
      id: { notIn: Array.from(excluded) },
      verified: true,
      allProfileFieldsFilled: true,
      allUserFieldsFilled: true,
      status: UserStatus.active,
      dateOfBirth: { not: null },
      profile: { isNot: null },
    },
    include: { profile: true },
    orderBy: { lastLoginAt: "desc" },
  });

  const filtered = users
    .filter((u) => {
      const p = u.profile!;
      const currentInterestedIn = currentUserProfile.interestedIn;
      const otherInterestedIn = p.interestedIn;

      const passesCurrentPreference =
        currentInterestedIn === "everyone" || p.gender === currentInterestedIn;
      const passesMutualPreference =
        otherInterestedIn === "everyone" || otherInterestedIn === currentUserProfile.gender;
      return passesCurrentPreference && passesMutualPreference;
    })
    .map((u) => {
      const age = u.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(u.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
          )
        : null;

      const profile: any = { ...u.profile };
      if (profile.hiddenGender) delete profile.gender;
      if (profile.hiddenJobTitle) delete profile.jobTitle;
      if (profile.hiddenReligious) delete profile.religious;
      if (profile.hiddenDrinkingStatus) delete profile.drinkingStatus;
      if (profile.hiddenSmokingStatus) delete profile.smokingStatus;
      if (profile.hiddenWorkplace) delete profile.workplace;
      if (profile.hiddenHometown) delete profile.hometown;
      if (profile.hiddenSchool) delete profile.school;
      if (profile.hiddenStudyLevel) delete profile.studyLevel;

      return {
        _id: u.id,
        email: u.email,
        image: u.image,
        phoneNumber: u.phoneNumber,
        dateOfBirth: u.dateOfBirth,
        firstName: u.firstName,
        lastName: u.lastName,
        isPersonaVerified: u.isPersonaVerified || false,
        lastLoginAt: u.lastLoginAt,
        age,
        profile,
      };
    });

  const total = filtered.length;
  const result = filtered.slice(skip, skip + limit);
  return {
    result,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const performAction = async (fromUserId: string, toUserId: string, action: TMatchAction) => {
  const targetUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (
    !targetUser ||
    !targetUser.verified ||
    !targetUser.allUserFieldsFilled ||
    !targetUser.allProfileFieldsFilled ||
    targetUser.status !== UserStatus.active
  ) {
    throw new AppError(StatusCodes.NOT_FOUND, "User not found or not available for matching");
  }
  if (fromUserId === toUserId) {
    throw new AppError(StatusCodes.BAD_REQUEST, "Cannot perform action on yourself");
  }

  const existing = await prisma.match.findUnique({
    where: { fromUserId_toUserId: { fromUserId, toUserId } },
  });
  if (existing) {
    throw new AppError(StatusCodes.BAD_REQUEST, "You have already interacted with this user");
  }

  await prisma.match.create({
    data: {
      id: generateOid(),
      fromUserId,
      toUserId,
      action,
    },
  });

  const responseData: any = { message: `Action '${action}' performed successfully` };

  if (action === "love") {
    const mutual = await prisma.match.count({
      where: {
        OR: [
          { fromUserId, toUserId, action: "love" },
          { fromUserId: toUserId, toUserId: fromUserId, action: "love" },
        ],
      },
    });

    if (mutual === 2) {
      const [userOneId, userTwoId] = pair(fromUserId, toUserId);
      const connection = await prisma.connection.upsert({
        where: { userOneId_userTwoId: { userOneId, userTwoId } },
        create: { id: generateOid(), userOneId, userTwoId },
        update: {},
      });

      await prisma.connectionRequest.updateMany({
        where: { fromUserId: toUserId, toUserId: fromUserId, status: "pending" },
        data: { status: "accepted" },
      });

      responseData.isMatch = true;
      responseData.connection = connection;
      responseData.message = "It's a match! 🎉 Connection created automatically";

      try {
        const fromUser = await prisma.user.findUnique({
          where: { id: fromUserId },
          select: { firstName: true, lastName: true },
        });
        const senderName = fromUser
          ? `${fromUser.firstName || ""} ${fromUser.lastName || ""}`.trim()
          : "Someone";
        await NotificationServices.sendNotificationIfNotBlocked(
          fromUserId,
          toUserId,
          "It's a Match! 🎉",
          `You and ${senderName} liked each other!`,
          "match",
          connection.id,
          {
            matchedUserId: fromUserId,
            connectionId: connection.id,
          },
        );
      } catch {
        // ignore notification errors
      }
    } else {
      const request = await prisma.connectionRequest.create({
        data: {
          id: generateOid(),
          fromUserId,
          toUserId,
          status: "pending",
        },
      });

      responseData.connectionRequest = request;
      responseData.message = "Love sent! Waiting for their response ❤️";

      try {
        const fromUser = await prisma.user.findUnique({
          where: { id: fromUserId },
          select: { firstName: true, lastName: true },
        });
        const senderName = fromUser
          ? `${fromUser.firstName || ""} ${fromUser.lastName || ""}`.trim()
          : "Someone";
        await NotificationServices.sendNotificationIfNotBlocked(
          fromUserId,
          toUserId,
          "New Connection Request ❤️",
          `${senderName} likes you!`,
          "connection_request",
          request.id,
          {
            requesterId: fromUserId,
            requestId: request.id,
          },
        );
      } catch {
        // ignore notification errors
      }
    }
  }

  return responseData;
};

const getConnectionRequests = async (userId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, result] = await Promise.all([
    prisma.connectionRequest.count({ where: { toUserId: userId, status: "pending" } }),
    prisma.connectionRequest.findMany({
      where: { toUserId: userId, status: "pending" },
      include: {
        fromUser: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const withProfile = await Promise.all(
    result.map(async (r) => {
      const profile = await prisma.profile.findUnique({
        where: { userId: r.fromUserId },
      });
      const age = r.fromUser.dateOfBirth
        ? Math.floor(
            (Date.now() - new Date(r.fromUser.dateOfBirth).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          )
        : null;
      return { ...r, profile, age, distance: null };
    }),
  );

  return {
    result: withProfile,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const respondToConnectionRequest = async (
  requestId: string,
  userId: string,
  action: "accept" | "reject",
) => {
  const request = await prisma.connectionRequest.findUnique({ where: { id: requestId } });
  if (!request) throw new AppError(StatusCodes.NOT_FOUND, "Connection request not found");
  if (request.toUserId !== userId) {
    throw new AppError(StatusCodes.FORBIDDEN, "You can only respond to your own requests");
  }
  if (request.status !== "pending") {
    throw new AppError(StatusCodes.BAD_REQUEST, "Request has already been responded to");
  }

  await prisma.connectionRequest.update({
    where: { id: requestId },
    data: { status: action === "accept" ? "accepted" : "rejected" },
  });

  const responseData: any = {
    message: action === "accept" ? "Connection request accepted! 🎉" : "Connection request rejected",
  };

  if (action === "accept") {
    const [userOneId, userTwoId] = pair(request.fromUserId, request.toUserId);
    const connection = await prisma.connection.upsert({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
      create: { id: generateOid(), userOneId, userTwoId },
      update: {},
    });
    responseData.connection = connection;
  }

  return responseData;
};

const getConnections = async (userId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;
  const where = {
    OR: [{ userOneId: userId }, { userTwoId: userId }],
  };

  const [total, result] = await Promise.all([
    prisma.connection.count({ where }),
    prisma.connection.findMany({
      where,
      include: { userOne: true, userTwo: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    result,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

const getSentRequests = async (userId: string, query: Record<string, unknown>) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const [total, result] = await Promise.all([
    prisma.connectionRequest.count({ where: { fromUserId: userId } }),
    prisma.connectionRequest.findMany({
      where: { fromUserId: userId },
      include: { toUser: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    result,
    meta: { page, limit, total, totalPage: Math.ceil(total / limit) },
  };
};

export const MatchServices = {
  getPotentialMatches,
  performAction,
  getConnectionRequests,
  respondToConnectionRequest,
  getConnections,
  getSentRequests,
};
