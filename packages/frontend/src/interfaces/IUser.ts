import { IRoom } from "./IMessage";
import { User } from "db";

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
  friend: USER[];
}
