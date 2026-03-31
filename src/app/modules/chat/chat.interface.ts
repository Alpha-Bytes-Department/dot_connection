export interface TChat {
  id?: string;
  userOneId: string;
  userTwoId: string;
  lastMessageId?: string | null;
  lastMessageTime?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
