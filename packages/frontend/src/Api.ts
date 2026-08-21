import { AxiosError, AxiosRequestConfig } from "axios";
import {
  IAddMessageRequest,
  IMessage,
  MessagePageResponse,
  IRoom,
  IUser,
  MessageWindowRequest,
  MessageWindowResponse,
  MessageRequest,
} from "@/interfaces";
import { getToken } from "./utils";
import { ws } from "@/hooks/useWebsocket";
import { store } from "./store";
import { logout } from "@/store/reducer/user";

const { toast } = createStandaloneToast();

export const axios = Axios.create({
  baseURL: "/api/v1",
  timeout: 10000,
  withCredentials: true,
});

// Add request interceptor to dynamically set Authorization header
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface IResponse<T> {
  code: number;
  data?: T;
  message?: string;
}

const normalizeId = (value: unknown) =>
  value == null || value === "" ? "" : String(value);

const normalizeUser = (user: any): IUser => {
  if (!user) return user;
  return {
    ...user,
    id: normalizeId(user.id ?? user.userId),
    userId: normalizeId(user.userId ?? user.id),
    UserId: normalizeId(user.UserId ?? user.userId ?? user.id),
    room: Array.isArray(user.room) ? user.room.map(normalizeRoom) : user.room,
    friend: Array.isArray(user.friend)
      ? user.friend.map(normalizeUser)
      : user.friend,
  };
};

const normalizeMediaMessage = (mediaMessage: any) => {
  if (!mediaMessage) return mediaMessage;
  return {
    ...mediaMessage,
    url: mediaMessage.url ?? "",
    name: mediaMessage.name ?? "",
    extension: mediaMessage.extension ?? "",
    size: Number(mediaMessage.size ?? 0),
    fileType:
      mediaMessage.fileType ??
      mediaMessage.file_type ??
      mediaMessage.mimeType ??
      "",
    duration:
      mediaMessage.duration == null ? null : String(mediaMessage.duration),
  };
};

export const normalizeMessage = (message: any): IMessage => {
  if (!message) return message;
  return {
    ...message,
    id: normalizeId(message.id),
    channelId: normalizeId(message.channelId ?? message.roomId),
    roomId: normalizeId(message.roomId ?? message.channelId),
    userId: normalizeId(message.userId ?? message.user?.id),
    replyId: normalizeId(message.replyId),
    mediaMessage: message.mediaMessage
      ? normalizeMediaMessage(message.mediaMessage)
      : message.mediaMessage,
    user: message.user ? normalizeUser(message.user) : message.user,
    reply: message.reply ? normalizeMessage(message.reply) : message.reply,
  };
};

const normalizeRoom = (room: any): IRoom => {
  if (!room) return room;
  return {
    ...room,
    id: normalizeId(room.id),
    creatorId: normalizeId(room.creatorId ?? room.creator?.id),
    memberId: Array.isArray(room.memberId)
      ? room.memberId.map(normalizeId)
      : room.memberId,
    adminId: Array.isArray(room.adminId)
      ? room.adminId.map(normalizeId)
      : room.adminId,
    member: Array.isArray(room.member)
      ? room.member.map(normalizeUser)
      : room.member,
    admin: Array.isArray(room.admin)
      ? room.admin.map(normalizeUser)
      : room.admin,
    creator: room.creator ? normalizeUser(room.creator) : room.creator,
    message: Array.isArray(room.message)
      ? room.message.map(normalizeMessage)
      : room.message,
    lastMsg: room.lastMsg ? normalizeMessage(room.lastMsg) : room.lastMsg,
  };
};

const normalizeMessageWindow = (window: any): MessageWindowResponse => {
  if (!window) return window;
  return {
    ...window,
    targetId: normalizeId(window.targetId),
    message: Array.isArray(window.message)
      ? window.message.map(normalizeMessage)
      : window.message,
  };
};

axios.interceptors.response.use(
  (response) => {
    const res = response.data as IResponse<unknown>;

    // Handle business errors (code !== 0)
    if (res.code !== 0) {
      if (response.config?.fetchOptions?.alert !== false) {
        toast({
          description: res.message ?? "Backend throw unexpected error.",
          status: "error",
          position: "top",
          duration: 1000,
        });
      }
      // Reject promise for business errors so the caller can handle them
      return Promise.reject({ ...res, isBusinessError: true, response });
    }

    // Handle success (code === 0)
    if (res.message && response.config?.fetchOptions?.alert !== false) {
      toast({
        description: res.message,
        status: "success",
        position: "top",
        duration: 1000,
      });
    }

    // Return only response.data
    return response.data;
  },
  async (error: AxiosError<IResponse<unknown>>) => {
    if (error?.response?.status === 401) {
      store.dispatch(logout());
      ws?.destroy();
    }
    if (error.config?.fetchOptions?.alert !== false) {
      const errorMessage =
        error.response?.data?.message ??
        error.message ??
        "Unexpected network error.";
      toast({
        description: errorMessage,
        status: "error",
        position: "top",
        duration: 1000,
      });
    }
    return Promise.reject(error);
  }
);

export async function request<RESPONSE>(
  config: AxiosRequestConfig
): Promise<RESPONSE> {
  const res = await axios.request<RESPONSE>(config);
  return res.data;
}

interface ILoginRequestParameters {
  email: string;
  password: string;
}

const Api = {
  login: (data: ILoginRequestParameters) =>
    request<{ accessToken: string }>({
      url: "/login",
      method: "post",
      data,
    }),
  register: (data: ILoginRequestParameters) =>
    request({
      url: "/register",
      method: "post",
      data,
    }),
  logout: () =>
    request({
      url: "/logout",
      method: "post",
    }),
  getMyUserInfo: () =>
    request<IUser>({
      url: "/profile",
      method: "get",
      fetchOptions: {
        alert: false,
      },
    }).then(normalizeUser),
  setMyUserInfo: (user: Partial<IUser>) =>
    request<IUser>({
      url: "/profile",
      method: "put",
      data: user,
    }).then(normalizeUser),
  updateProfile: (data: {
    userName?: string;
    email?: string;
    bio?: string;
    github?: string;
    qq?: string;
    wechat?: string;
    permission?: string;
    image?: string;
  }) =>
    request({
      url: "/profile",
      method: "put",
      data,
    }),
  upload: (data: FormData) =>
    request<{ url: string; extension: string; name: string; size: number }>({
      url: "/upload",
      method: "post",
      data,
    }),
  uploadFile: (file: File, params?: { [key: string]: string }) => {
    const form = new FormData();
    form.append("file", file);
    if (params) {
      Object.keys(params).forEach((key) => {
        form.append(key, params[key]);
      });
    }
    return Api.upload(form) as Promise<MediaMessage>;
  },
  getPreSignUrl: (data: { file_ext: string; upload_scene: number }) =>
    request<{ endpoint_url: string; pre_signed_url: string }>({
      url: "/upload",
      method: "post",
      data,
    }),
  getUserImage: (username: string) =>
    request<string>({
      url: "/userImage",
      method: "get",
      params: {
        username,
      },
      fetchOptions: {
        alert: false,
      },
    }),
  queryUser: (params: {
    userName?: string;
    channelId?: string;
    role?: "member" | "admin" | "creator";
    pageSize?: number;
    start?: number;
  }) =>
    request<IUser[]>({
      url: "/user",
      method: "get",
      params,
    }).then((users) => users.map(normalizeUser)),
  getRoom: (params: {
    id: string;
    memberPageSize?: number;
    memberStart?: number;
    adminPageSize?: number;
    adminStart?: number;
  }) =>
    request<IRoom>({
      url: "/room",
      method: "get",
      params,
    }).then(normalizeRoom),
  getRoomMessages: (params: MessageRequest) =>
    request<MessagePageResponse>({
      url: "/room/messages",
      method: "get",
      params,
    }).then((data) => ({
      ...data,
      message: Array.isArray(data.message)
        ? data.message.map(normalizeMessage)
        : data.message,
    })),
  getRoomUsers: (params: {
    id: string;
    role?: "member" | "admin";
    pageSize?: number;
    start?: number;
  }) =>
    request<{ role: string; users: IUser[]; totalCount: number }>({
      url: "/room/member",
      method: "get",
      params,
    }).then((data) => ({
      ...data,
      users: Array.isArray(data.users)
        ? data.users.map(normalizeUser)
        : data.users,
    })),
  getRoomMessageWindow: (params: MessageWindowRequest) =>
    request<MessageWindowResponse>({
      url: "/room/message",
      method: "get",
      params,
    }).then(normalizeMessageWindow),
  addRoom: (data: Partial<IRoom>) =>
    request<IRoom>({
      url: "/room",
      method: "post",
      data,
    }).then(normalizeRoom),
  deleteRoom: (id: string) =>
    request({
      url: "/room",
      method: "delete",
      params: { id },
    }),
  updateRoom: (data: Partial<IRoom>) =>
    request<IRoom>({
      url: "/room",
      method: "patch",
      data,
    }).then(normalizeRoom),
  joinRoom: (data: { id?: string }) =>
    request<IRoom>({
      url: "/joinRoom",
      method: "post",
      data,
    }).then(normalizeRoom),

  sendMessage: (data: IAddMessageRequest) =>
    request<IMessage>({
      url: "/room/message",
      method: "post",
      data,
    }),
  deleteMessage: () =>
    request({
      url: "/room/message",
      method: "delete",
    }),
  addFriend: (data: { id: string }) =>
    request<IRoom>({
      url: "/friend",
      method: "post",
      data,
    }).then(normalizeRoom),
  deleteFriend: () =>
    request({
      url: "/friend",
      method: "delete",
    }),
};

export default Api;
