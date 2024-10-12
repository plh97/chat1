import { IRoom } from "./";
import { User } from "db";

export interface IUser extends Omit<User, "friend" | "password" | "createdAt"> {
  id: string;
  image: string;
  username: string;
  bio: string;
  qq: string;
  wechat: string;
  github: string;
  permission: string;
  room: IRoom[] | null;
  friend: IUser[];
}

export interface USER extends Omit<User, "friend" | "password" | "createdAt"> {
  id: string;
  image: string;
  username: string;
  bio: string;
  qq: string;
  wechat: string;
  github: string;
  permission: string;
  room: IRoom[] | null;
  friend: IUser[];
}
