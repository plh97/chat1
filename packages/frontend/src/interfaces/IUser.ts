import type { User } from "db";
import type { IRoom } from "@/interfaces";

export interface IUser extends Omit<User, "friend" | "password" | "createdAt"> {
  id: string;
  image: string;
  username: string;
  bio: string;
  QQ: string;
  WeChat: string;
  github: string;
  permission: string;
  room: IRoom[] | null;
  friend: IUser[];
}
