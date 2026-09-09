export const isRoomListLoading = (auth: boolean | null, userId: unknown) =>
  auth !== true || String(userId ?? "") === "";

type RoomActivity = {
  createdAt?: Date | string;
  updatedAt?: Date | string;
  lastMsg?: {
    createdAt?: Date | string;
    updatedAt?: Date | string;
  };
};

const getActivityTime = (room: RoomActivity) => {
  const value =
    room.lastMsg?.createdAt ??
    room.lastMsg?.updatedAt ??
    room.updatedAt ??
    room.createdAt;
  const timestamp = value ? new Date(value).getTime() : 0;
  return Number.isFinite(timestamp) ? timestamp : 0;
};

export const sortRoomsByActivity = <RoomType extends RoomActivity>(
  rooms: RoomType[]
) =>
  rooms
    .map((room, index) => ({ room, index }))
    .sort((left, right) => {
      if (Boolean(left.room.lastMsg) !== Boolean(right.room.lastMsg)) {
        return left.room.lastMsg ? -1 : 1;
      }
      return (
        getActivityTime(right.room) - getActivityTime(left.room) ||
        left.index - right.index
      );
    })
    .map(({ room }) => room);
