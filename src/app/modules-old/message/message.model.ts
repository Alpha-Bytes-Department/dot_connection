import { Schema, model } from "mongoose";
import { TMessage, MessageModel } from "./message.interface";

const messageSchema = new Schema<TMessage, MessageModel>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    message: {
      type: String,
      trim: true,
      maxlength: [1000, "Message cannot exceed 1000 characters"],
    },
    image: {
      type: String,
      trim: true,
    },
    audio: {
      type: String,
      trim: true,
    },
    images: [{
      type: String,
      trim: true,
    }],
    messageType: {
      type: String,
      enum: ["text", "image", "audio"],
      required: true,
      default: "text",
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for better performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ sender: 1, receiver: 1, isRead: 1 });
messageSchema.index({ createdAt: -1 });

// Static methods
messageSchema.statics.findChatMessages = async function (
  senderId: string,
  receiverId: string,
  page: number = 1,
  limit: number = 50
) {
  const skip = (page - 1) * limit;
  
  const query = {
    $or: [
      { sender: senderId, receiver: receiverId },
      { sender: receiverId, receiver: senderId },
    ],
  };
  
  // Get total count for pagination
  const total = await this.countDocuments(query);
  const totalPage = Math.ceil(total / limit);
  
  // Get paginated messages
  const messages = await this.find(query)
    .populate("sender", "firstName lastName image")
    .populate("receiver", "firstName lastName image")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
  
  return {
    data: messages,
    meta: {
      page,
      limit,
      total,
      totalPage,
    },
  };
};

messageSchema.statics.markMessagesAsRead = async function (
  senderId: string,
  receiverId: string
) {
  return await this.updateMany(
    { 
      sender: senderId, 
      receiver: receiverId, 
      isRead: false 
    },
    { 
      $set: { 
        isRead: true, 
        readAt: new Date() 
      } 
    }
  );
};

messageSchema.statics.getUnreadCount = async function (
  senderId: string,
  receiverId: string
) {
  return await this.countDocuments({
    sender: senderId,
    receiver: receiverId,
    isRead: false,
  });
};

messageSchema.statics.getLastMessage = async function (
  user1Id: string,
  user2Id: string
) {
  return await this.findOne({
    $or: [
      { sender: user1Id, receiver: user2Id },
      { sender: user2Id, receiver: user1Id },
    ],
  })
    .sort({ createdAt: -1 })
    .lean();
};

// Pre-save middleware to set messageType based on content
messageSchema.pre('save', function() {
  if (this.images && this.images.length > 0) {
    this.messageType = 'image';
  } else if (this.image) {
    this.messageType = 'image';
  } else if (this.audio) {
    this.messageType = 'audio';
  } else {
    this.messageType = 'text';
  }
});

export const Message = model<TMessage, MessageModel>("Message", messageSchema);
