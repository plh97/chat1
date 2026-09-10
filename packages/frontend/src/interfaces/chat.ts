export type ChannelType = "PRIVATE" | "PUBLIC";

export type ContentType =
  | "TEXT_MESSAGE"
  | "MEDIA_MESSAGE"
  | "SYSTEM_MESSAGE"
  | "CALL_MESSAGE"
  | "READ_MESSAGE"
  | "RECALL_MESSAGE";

export type SystemActionType =
  | "ADD_MEMBER"
  | "REMOVE_MEMBER"
  | "ADD_ADMIN"
  | "REMOVE_ADMIN"
  | "CREATE_ROOM"
  | "REMOVE_ROOM"
  | "ADD_FRIEND"
  | "REMOVE_FRIEND"
  | "CHANGE_ROOM"
  | "UPDATE_ROOM"
  | "TRANSFER_OWNER";

export interface TextMessage {
  text: string;
  mention: string[];
}

export interface ReadMessage {
  operator: string;
  lastReadSeq: number;
  readSeq: Record<string, number>;
}

export interface MediaMessage {
  url: string;
  width: number | null;
  height: number | null;
  thumbnail: string | null;
  extension: string;
  name: string;
  size: number;
  fileType: string;
  duration: string | null;
}

export interface RecallMessage {
  operator: string;
  recallMsgId: string;
}

export interface SystemMessage {
  actionType: SystemActionType;
  content: string | null;
}

export interface User {
  id: string;
  createdAt: Date;
  username: string;
  password: string;
  bio: string | null;
  QQ: string | null;
  WeChat: string | null;
  github: string | null;
  permission: string | null;
  image: string;
  friendId: string[];
  UserId: string[];
}

export interface Room {
  id: string;
  name: string;
  image: string | null;
  channelType: ChannelType;
  createdAt: Date;
  updatedAt: Date;
  readSeq: Record<string, number>;
  unreadCount?: number;
  memberId: string[];
  adminId: string[];
  creatorId: string;
}

export interface Message {
  id: string;
  createdAt: Date;
  updatedAt?: Date;
  seq: number;
  contentType: ContentType;
  channelId: string;
  textMessage: TextMessage | null;
  mediaMessage: MediaMessage | null;
  readMessage: ReadMessage | null;
  recallMessage: RecallMessage | null;
  systemMessage: SystemMessage | null;
  userId: string;
  roomId: string;
  replyId: string | null;
  isRecalled?: boolean;
}
