export const isRoomListLoading = (auth: boolean | null, userId: unknown) =>
  auth !== true || String(userId ?? "") === "";
