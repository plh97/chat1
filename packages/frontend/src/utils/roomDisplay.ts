import type { IRoom, IUser } from "@/interfaces";

export interface RoomDisplay {
  image: string;
  name: string;
  profile?: IUser;
}

export const getPrivateRoomPeer = (room: IRoom, myId: string) => {
  if (room.channelType !== "PRIVATE") return undefined;
  if (room.peer && String(room.peer.id) !== String(myId)) {
    return room.peer;
  }
  return room.member?.find((user) => String(user.id) !== String(myId));
};

export const getRoomDisplay = (room: IRoom, myId: string): RoomDisplay => {
  const peer = getPrivateRoomPeer(room, myId);
  if (peer) {
    return {
      name: peer.userName,
      image: peer.image || "",
      profile: peer,
    };
  }

  return {
    name: room.name,
    image: room.image || "",
  };
};
