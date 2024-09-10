import { AxiosRequestConfig } from "axios";
import { useRef } from "react";
import { request } from "@/Api";

export default function useRequest() {
  const loading = useRef<boolean>(false);
  async function run<RES>(config: AxiosRequestConfig) {
    loading.current = true;
    try {
      return await request<RES>(config);
    } finally {
      loading.current = false;
    }
  }
  return {
    loading,
    run,
  };
}
