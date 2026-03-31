import { Schema, model } from "mongoose";
import { TChat, ChatModel } from "./chat.interface";

const chatSchema = new Schema<TChat, ChatModel>(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }],
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },
    lastMessageTime: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);


// Indexes
chatSchema.index({ lastMessageTime: -1 });

// Ensure only 2 participants and unique combinations
chatSchema.pre('save', function() {
  if (this.participants.length !== 2) {
    throw new Error('Chat must have exactly 2 participants');
  }
  // Sort participants to ensure consistent ordering
  this.participants.sort((a, b) => a.toString().localeCompare(b.toString()));
});

// Unique index for participant combinations (single definition)
chatSchema.index({ participants: 1 }, { unique: true });

// Static methods
chatSchema.statics.findUserChats = async function (userId: string) {
  return await this.find({
    participants: userId,
  })
    .populate({
      path: "participants",
      match: { _id: { $ne: userId } },
      select: "firstName lastName image",
    })
    .populate({
      path: "lastMessage",
      select: "message image audio images messageType createdAt isRead",
    })
    .sort({ lastMessageTime: -1 })
    .lean();
};

chatSchema.statics.findChatByParticipants = async function (
  user1Id: string,
  user2Id: string
) {
  const participants = [user1Id, user2Id].sort();
  return await this.findOne({
    participants: { $all: participants },
  }).lean();
};

chatSchema.statics.createChatForUsers = async function (
  user1Id: string,
  user2Id: string
) {
  const participants = [user1Id, user2Id].sort();
  
  // Check if chat already exists
  const existingChat = await this.findOne({
    participants: { $all: participants },
  });
  
  if (existingChat) {
    return existingChat;
  }
  
  return await this.create({
    participants,
  });
};

export const Chat = model<TChat, ChatModel>("Chat", chatSchema);
