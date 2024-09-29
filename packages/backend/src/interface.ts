import { Message, Room, User } from "db";
// import { Types } from "mongoose";

export interface IUser extends User {
  // id: Types.ObjectId;
  // image: string;
  // username: string;
  // password: string;
  // bio: string;
  // qq: string;
  // wechat: string;
  // github: string;
  // permission: string;
  // friend: IUser[];
}

export interface IMessage extends Message {
  // user: IUser;
}

export interface IRoom extends Room {}
