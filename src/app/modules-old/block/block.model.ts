import { Schema, model } from "mongoose";
import { TBlock, BlockModel } from "./block.interface";

const blockSchema = new Schema<TBlock, BlockModel>(
  {
    blocker: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    blocked: {
      type: Schema.Types.ObjectId,
      ref: "User", 
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better performance
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
blockSchema.index({ blocker: 1 });
blockSchema.index({ blocked: 1 });

// Prevent self-blocking
blockSchema.pre('save', function() {
  if (this.blocker.toString() === this.blocked.toString()) {
    throw new Error('Users cannot block themselves');
  }
});

// Static methods
blockSchema.statics.isUserBlocked = async function (
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const block = await this.findOne({
    blocker: blockerId,
    blocked: blockedId,
  });
  return !!block;
};

blockSchema.statics.getBlockedUsers = async function (userId: string) {
  return await this.find({ blocker: userId })
    .populate({
      path: "blocked",
      select: "firstName lastName image",
    })
    .sort({ createdAt: -1 })
    .lean();
};

blockSchema.statics.getBlockedByUsers = async function (userId: string) {
  return await this.find({ blocked: userId })
    .populate({
      path: "blocker", 
      select: "firstName lastName image",
    })
    .sort({ createdAt: -1 })
    .lean();
};

blockSchema.statics.blockUser = async function (
  blockerId: string,
  blockedId: string
) {
  // Check if already blocked
  const existingBlock = await this.findOne({
    blocker: blockerId,
    blocked: blockedId,
  });
  
  if (existingBlock) {
    throw new Error('User is already blocked');
  }
  
  // Prevent self-blocking
  if (blockerId === blockedId) {
    throw new Error('Users cannot block themselves');
  }
  
  return await this.create({
    blocker: blockerId,
    blocked: blockedId,
  });
};

blockSchema.statics.unblockUser = async function (
  blockerId: string,
  blockedId: string
): Promise<boolean> {
  const result = await this.deleteOne({
    blocker: blockerId,
    blocked: blockedId,
  });
  
  return result.deletedCount > 0;
};

// Check if either user has blocked the other
blockSchema.statics.areUsersBlocking = async function (
  user1Id: string,
  user2Id: string
): Promise<boolean> {
  const block = await this.findOne({
    $or: [
      { blocker: user1Id, blocked: user2Id },
      { blocker: user2Id, blocked: user1Id },
    ],
  });
  
  return !!block;
};

export const Block = model<TBlock, BlockModel>("Block", blockSchema);
