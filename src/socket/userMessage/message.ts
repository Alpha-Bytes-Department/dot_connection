import { MessageServices } from '../../app/modules/message/message.service';
import { socketService } from '../../shared/socketService';
import { NotificationServices } from '../../app/modules/notification/notification.service';
import { prisma } from '../../DB/prisma';

export const handleSendMessage = async (
  data: {
    senderId: string;
    receiverId: string;
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
    const [userOneId, userTwoId] =
      data.senderId < data.receiverId
        ? [data.senderId, data.receiverId]
        : [data.receiverId, data.senderId];
    const connection = await prisma.connection.findUnique({
      where: { userOneId_userTwoId: { userOneId, userTwoId } },
    });

    if (!connection) {
      const error = { error: 'No mutual connection found between users' };
      console.error('No mutual connection found between users');
      if (callback) callback(error);
      return;
    }

    // Create message in database first
    const savedMessage = await MessageServices.createMessage({
      senderId: data.senderId,
      receiverId: data.receiverId,
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
        _id: (savedMessage as any).id,
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
        const sender = await prisma.user.findUnique({
          where: { id: data.senderId },
          select: { firstName: true, lastName: true },
        });
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
          (savedMessage as any).id,
          {
            senderId: data.senderId.toString(),
            messageId: (savedMessage as any).id.toString(),
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
      _id: (savedMessage as any).id,
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
        messageId: (savedMessage as any).id,
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
