import { IRoom } from "./IMessage";

export interface USER {
  _id: string;
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
