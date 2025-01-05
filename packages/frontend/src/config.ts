export const isDev = import.meta.env.MODE.toLocaleLowerCase() === "development";
export const wsUrl = import.meta.env.VITE_WS_URL || "/ws";
export const apiUrl = import.meta.env.VITE_API_URL || "/api";

export const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent
);
