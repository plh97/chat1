import md5 from "md5";
let nanoid: () => string;
import("nanoid").then((module) => {
  nanoid = module.nanoid;
});

export function getToken(): string {
  return localStorage.getItem("accessToken") ?? "";
}

export function generateTemplateId() {
  if (typeof window === "undefined") {
    return Math.random() + nanoid();
  }
  return Math.random() + md5(navigator.userAgent);
}
