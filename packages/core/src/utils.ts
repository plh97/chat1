import md5 from "md5";
// import { nanoid } from 'nanoid'

export function parseCookie() {
  const cookie = document.cookie;
  return cookie.split(";").reduce<Record<string, string>>((acc, item) => {
    const [key, value] = item.split("=");
    acc[key.trim()] = value;
    return acc;
  }, {});
}

export function getToken(): string | undefined {
  const json = parseCookie();
  return json.token;
}

export function generateTemplateId() {
  return Math.random() + md5(navigator.userAgent);
}
