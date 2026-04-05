export type TMatchAction = "skip" | "love";

export type TMatch = {
  id?: string;
  fromUserId: string;
  toUserId: string;
  action: TMatchAction;
  createdAt?: Date;
};

export type TConnectionRequest = {
  id?: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
};

export type TConnection = {
  id?: string;
  userOneId: string;
  userTwoId: string;
  createdAt?: Date;
};
