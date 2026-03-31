import { Model, Types } from "mongoose";

export type TMatchAction = "skip" | "love";

export type TMatch = {
  _id?: string;
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  action: TMatchAction;
  createdAt?: Date;
};

export type TConnectionRequest = {
  _id?: string;
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  status: "pending" | "accepted" | "rejected";
  createdAt?: Date;
  updatedAt?: Date;
};

export type TConnection = {
  _id?: string;
  userIds: Types.ObjectId[];
  createdAt?: Date;
};

export type MatchModal = {
  findUserMatches(userId: string): Promise<TMatch[]>;
  checkMutualLove(user1Id: string, user2Id: string): Promise<boolean>;
} & Model<TMatch>;

export type ConnectionRequestModal = {
  findPendingRequests(userId: string): Promise<TConnectionRequest[]>;
  findSentRequests(userId: string): Promise<TConnectionRequest[]>;
} & Model<TConnectionRequest>;

export type ConnectionModal = {
  findUserConnections(userId: string): Promise<TConnection[]>;
} & Model<TConnection>;

export namespace TReturnMatch {
  export type Meta = {
    page: number;
    limit: number;
    totalPage: number;
    total: number;
  };

  export type getAllMatches = {
    result: TMatch[];
    meta?: Meta;
  };

  export type getPotentialMatches = {
    result: any[];
    meta?: Meta;
  };

  export type getConnectionRequests = {
    result: TConnectionRequest[];
    meta?: Meta;
  };

  export type getConnections = {
    result: TConnection[];
    meta?: Meta;
  };
}
