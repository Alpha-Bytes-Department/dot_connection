export interface TMessage {
  id?: string;
  senderId: string;
  receiverId: string;
  message?: string | null;
  image?: string | null;
  audio?: string | null;
  images?: string[];
  messageType: "text" | "image" | "audio";
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
