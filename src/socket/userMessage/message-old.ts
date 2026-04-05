import { Types } from 'mongoose';
import { MessageServices } from '../../app/modules-old/message/message.service';
import { Connection } from '../../app/modules-old/match/match.model';
import { socketService } from '../../shared/socketService';
import { NotificationServices } from '../../app/modules-old/notification/notification.service';
import { User } from '../../app/modules-old/user/user.model';

export const handleSendMessage = async (
  data: {
    senderId: Types.ObjectId;
    receiverId: Types.ObjectId;
    message?: string;
    image?: string;
    audio?: string;
  },
  callback?: (response: any) => void,
) => {
  try {
    console.log(data);
    console.log(data.receiverId);

    // Normalize audio and image URLs to paths (remove domain if present)
    if (data.audio && data.audio.includes('http')) {
      try {
        const url = new URL(data.audio);
        data.audio = url.pathname; // Extract just the path: /audio/file.m4a
      } catch (e) {
        console.error('Failed to parse audio URL:', e);
      }
    }

    if (data.image && data.image.includes('http')) {
      try {
        const url = new URL(data.image);
        data.image = url.pathname; // Extract just the path: /images/file.jpg
      } catch (e) {
        console.error('Failed to parse image URL:', e);
      }
    }

    // Validate required fields
    if (
      !data.senderId ||
      !data.receiverId ||
      (!data.message && !data.image && !data.audio)
    ) {
      const error = {
        error:
          'Invalid message data. Required fields: senderId, receiverId, and either message, image, or audio',
      };
      console.error('Invalid message data', data);
      if (callback) callback(error);
      return;
    }

    // Check if users have mutual connection
    const connection = await Connection.findOne({
      userIds: { $all: [data.senderId, data.receiverId] },
    });

    if (!connection) {
      const error = { error: 'No mutual connection found between users' };
      console.error('No mutual connection found between users');
      if (callback) callback(error);
      return;
    }

    // Create message in database first
    const savedMessage = await MessageServices.createMessage({
      sender: new Types.ObjectId(data.senderId),
      receiver: new Types.ObjectId(data.receiverId),
      message: data.message,
      image: data.image,
      audio: data.audio,
    });

    // Check if receiver is online
    const users = socketService.getUsers();
    let isReceiverOnline = false;

    users.forEach((socketIds: string[], userId: string) => {
      if (
        userId.toString() === data.receiverId.toString() &&
        socketIds &&
        socketIds.length > 0
      ) {
        isReceiverOnline = true;
      }
    });

    // Send to receiver if they are online
    socketService.emitToUser(
      data.receiverId.toString(),
      `receiver-${data.receiverId}`,
      {
        _id: (savedMessage as any)._id,
        senderId: data.senderId,
        receiverId: data.receiverId,
        message: data.message,
        image: data.image,
        audio: data.audio,
        messageType: savedMessage.messageType,
        isRead: false,
        createdAt: savedMessage.createdAt,
      },
    );

    // If receiver is offline, send push notification (will check if blocked inside)
    if (!isReceiverOnline) {
      try {
        // Get sender's name for notification
        const sender = await User.findById(data.senderId)
          .select('firstName lastName')
          .lean();
        const senderName = sender
          ? `${sender.firstName || ''} ${sender.lastName || ''}`.trim()
          : 'Someone';

        // Determine notification body based on message type
        let notificationBody = `${senderName} sent you a message`;
        if (data.message) {
          notificationBody =
            data.message.length > 50
              ? `${senderName}: ${data.message.substring(0, 50)}...`
              : `${senderName}: ${data.message}`;
        } else if (data.image) {
          notificationBody = `${senderName} sent you an image`;
        } else if (data.audio) {
          notificationBody = `${senderName} sent you a voice message`;
        }

        // Send notification (will not send if blocked)
        await NotificationServices.sendNotificationIfNotBlocked(
          data.senderId,
          data.receiverId,
          'New Message',
          notificationBody,
          'message',
          new Types.ObjectId((savedMessage as any)._id),
          {
            senderId: data.senderId.toString(),
            messageId: (savedMessage as any)._id.toString(),
            messageType: savedMessage.messageType,
          },
        );

        console.log(
          `Push notification sent to offline user ${data.receiverId}`,
        );
      } catch (error) {
        console.error('Failed to send push notification for message:', error);
        // Don't throw error, message is still sent
      }
    }

    // Send confirmation back to sender
    socketService.emitToSender(data.senderId.toString(), `message-sent`, {
      _id: (savedMessage as any)._id,
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
      image: data.image,
      audio: data.audio,
      messageType: savedMessage.messageType,
      isRead: false,
      createdAt: savedMessage.createdAt,
      status: 'sent',
    });

    // Send success callback if provided
    if (callback) {
      callback({
        success: true,
        messageId: (savedMessage as any)._id,
        status: 'sent',
      });
    }
  } catch (error) {
    console.error('Error handling send message:', error);
    if (callback) {
      callback({
        error:
          error instanceof Error ? error.message : 'Failed to send message',
      });
    }
  }
};
