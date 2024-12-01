export const isDev = import.meta.env.MODE.toLocaleLowerCase() === "development";

// wss://3.0.58.48:8081/ws
// //3.0.58.48:8080/ws
export const wsUrl =
  import.meta.env.VITE_WS_URL || isDev ? "/ws" : "https://3.0.58.48:8082/ws";

export const apiUrl = import.meta.env.VITE_API_URL || "/api";
