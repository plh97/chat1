export const isDev = import.meta.env.MODE.toLocaleLowerCase() === "development";

// wss://47.129.250.141:8081/ws
// //47.129.250.141:8080/ws
export const wsUrl =
  import.meta.env.VITE_WS_URL || isDev
    ? "/ws"
    : "https://47.129.250.141:8082/ws";

export const apiUrl = import.meta.env.VITE_API_URL || "/api";
