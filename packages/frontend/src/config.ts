export const isDev = import.meta.env.MODE.toLocaleLowerCase() === "development";

export const wsUrl =
  import.meta.env.VITE_WS_URL || isDev ? "/ws" : "wss://3.0.58.48/ws";

export const apiUrl = import.meta.env.VITE_API_URL || "/api";
