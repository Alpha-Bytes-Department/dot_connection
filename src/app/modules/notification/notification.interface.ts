export type TNotification = {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: "match" | "message" | "connection_request" | "general";
  relatedId?: string | null;
  isRead: boolean;
  data?: Record<string, string>;
  createdAt?: Date;
  updatedAt?: Date;
};
