import { AxiosError, AxiosRequestConfig } from "axios";
import {
  ADD_MESSAGE_REQUEST,
  IMessage,
  IRoom,
  IUser,
  MESSAGE_REQUEST,
} from "@/interfaces";

const { toast } = createStandaloneToast();

export const axios = Axios.create({
  baseURL: "/api",
  timeout: 10000,
  withCredentials: true,
});

export interface IResponse<T> {
  code: number;
  data?: T;
  message?: string;
}

axios.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code === 1) {
      toast({
        description: res.message ?? "Backend throw unexpected error.",
        status: "error",
        position: "top",
        duration: 1000,
      });
    } else if (res.code === 0) {
      res.message &&
        toast({
          description: res.message,
          status: "success",
          position: "top",
          duration: 1000,
        });
    }
    return res;
  },
  async (error: AxiosError) => {
    if (error?.response?.status === 401) {
      // to fix the cycle import
      const { store } = await import("@/store");
      const { logout } = await import("@/store/reducer/user");
      store.dispatch(logout());
      ws.destroy();
    }
    if (error.config?.fetchOptions?.alert !== false) {
      toast({
        description: error.message ?? "Unexpected network error.",
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
  username: string;
  password: string;
}

const Api = {
  login: (data: ILoginRequestParameters) =>
    request({
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
      url: "/userInfo",
      method: "get",
      fetchOptions: {
        alert: false,
      },
    }),
  setMyUserInfo: (user: Partial<IUser>) =>
    request<IUser>({
      url: "/userInfo",
      method: "post",
      data: user,
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
  getUserImage: (username: string) =>
    request<string>({
      url: "/userImage",
      method: "get",
      params: {
        username,
      },
    }),
  queryUser: (params: { username: string }) =>
    request<IUser[]>({
      url: "/user",
      method: "get",
      params,
    }),
  getRoom: (params: MESSAGE_REQUEST) =>
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

  sendMessage: (data: ADD_MESSAGE_REQUEST) =>
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
