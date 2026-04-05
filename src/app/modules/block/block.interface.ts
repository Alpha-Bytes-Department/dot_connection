export interface TBlock {
  id?: string;
  blockerId: string;
  blockedId: string;
  createdAt?: Date;
  updatedAt?: Date;
}
