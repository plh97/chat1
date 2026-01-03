import type { User } from "db";
import type { IRoom } from "@/interfaces";

export interface IUser
  extends Omit<User, "friend" | "password" | "createdAt" | "username"> {
  userId: string;
  image: string;
  userName: string;
  bio: string;
  QQ: string;
  WeChat: string;
  github: string;
  permission: string;
  email: string;
  room: IRoom[] | null;
  friend: IUser[];
}
