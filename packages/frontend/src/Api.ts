import { AxiosError, AxiosRequestConfig } from "axios";
import {
  IAddMessageRequest,
  IMessage,
  IRoom,
  IUser,
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
    }),
  setMyUserInfo: (user: Partial<IUser>) =>
    request<IUser>({
      url: "/profile",
      method: "put",
      data: user,
    }),
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
  queryUser: (params: { userName: string }) =>
    request<IUser[]>({
      url: "/user",
      method: "get",
      params,
    }),
  getRoom: (params: MessageRequest) =>
    request<IRoom>({
      url: "/room",
      method: "get",
      params,
    }),
  addRoom: (data: Partial<IRoom>) =>
    request<IRoom>({
      url: "/room",
      method: "post",
      data,
    }),
  deleteRoom: (id: string) =>
    request({
      url: "/room/" + id,
      method: "delete",
    }),
  updateRoom: (data: Partial<IRoom>) =>
    request<IRoom>({
      url: "/room",
      method: "patch",
      data,
    }),
  joinRoom: (data: { name?: string; member?: string[] }) =>
    request<IRoom>({
      url: "/joinRoom",
      method: "post",
      data,
    }),

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
    }),
  deleteFriend: () =>
    request({
      url: "/friend",
      method: "delete",
    }),
};

export default Api;
