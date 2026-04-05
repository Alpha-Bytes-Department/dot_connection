import { model, Schema } from "mongoose";
import {
  TMatch,
  TConnectionRequest,
  TConnection,
  MatchModal,
  ConnectionRequestModal,
  ConnectionModal,
} from "./match.interface";

// Match Schema - stores all user interactions (skip, love, map view)
const matchSchema = new Schema<TMatch, MatchModal>(
  {
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    action: {
      type: String,
      enum: ["skip", "love", "map"],
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
matchSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
matchSchema.index({ fromUserId: 1 });
matchSchema.index({ fromUserId: 1, action: 1 });
matchSchema.index({ toUserId: 1, action: 1 });
matchSchema.index({ createdAt: -1 });
matchSchema.index({ fromUserId: 1, createdAt: -1 });
matchSchema.index({ fromUserId: 1, toUserId: 1, action: 1 });
// Static methods
matchSchema.statics.findUserMatches = async function (userId: string) {
  return await this.find({ fromUserId: userId }).populate(
    "toUserId",
    "firstName lastName image"
  );
};

matchSchema.statics.checkMutualLove = async function (
  user1Id: string,
  user2Id: string
) {
  const mutualMatches = await this.find({
    $or: [
      { fromUserId: user1Id, toUserId: user2Id, action: "love" },
      { fromUserId: user2Id, toUserId: user1Id, action: "love" },
    ],
  });

  return mutualMatches.length === 2;
};

// Connection Request Schema - stores love requests that need acceptance
const connectionRequestSchema = new Schema<
  TConnectionRequest,
  ConnectionRequestModal
>(
  {
    fromUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    toUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 }, { unique: true });
connectionRequestSchema.index({ toUserId: 1, status: 1 });
connectionRequestSchema.index({ fromUserId: 1, status: 1 });
connectionRequestSchema.index({ createdAt: -1 });

// Static methods
connectionRequestSchema.statics.findPendingRequests = async function (
  userId: string
) {
  return await this.find({
    toUserId: userId,
    status: "pending",
  }).populate("fromUserId", "firstName lastName image");
};

connectionRequestSchema.statics.findSentRequests = async function (
  userId: string
) {
  return await this.find({
    fromUserId: userId,
  }).populate("toUserId", "firstName lastName image");
};

// Connection Schema - stores accepted connections (matches)
const connectionSchema = new Schema<TConnection, ConnectionModal>(
  {
    userIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
connectionSchema.index({ userIds: 1 });
connectionSchema.index({ createdAt: -1 });

// Static methods
connectionSchema.statics.findUserConnections = async function (userId: string) {
  return await this.find({
    userIds: userId,
  }).populate("userIds", "firstName lastName image verified");
};

export const Match = model<TMatch, MatchModal>("Match", matchSchema, "matches");
export const ConnectionRequest = model<
  TConnectionRequest,
  ConnectionRequestModal
>("ConnectionRequest", connectionRequestSchema, "connectionrequests");
export const Connection = model<TConnection, ConnectionModal>(
  "Connection",
  connectionSchema,
  "connections"
);
