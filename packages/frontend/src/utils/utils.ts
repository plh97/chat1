export function getToken() {
  return localStorage.getItem("accessToken") ?? "";
}

export function setToken(token: string) {
  return localStorage.setItem("accessToken", token);
}
