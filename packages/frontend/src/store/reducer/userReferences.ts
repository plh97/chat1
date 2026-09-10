import { createAction } from "@reduxjs/toolkit";
import type { IMessage, IRoom, IUser } from "@/interfaces";

const PROFILE_FIELDS = [
  "userName",
  "image",
  "bio",
  "QQ",
  "WeChat",
  "github",
  "permission",
  "email",
] as const;

type ProfileField = (typeof PROFILE_FIELDS)[number];

export type UserReferencePatch = Partial<Pick<IUser, ProfileField>> & {
  id?: string;
  userId?: string;
};

/**
 * Updates every already-loaded snapshot of a user. Messages and room roles
 * contain denormalized user objects, so changing only state.user.data leaves
 * the rest of the UI showing the previous name/avatar.
 */
export const updateUserReferences = createAction<UserReferencePatch>(
  "user/updateUserReferences"
);

export const getUserReferenceKey = (
  user?: Pick<IUser, "id" | "userId"> | UserReferencePatch | null
) => String(user?.id ?? user?.userId ?? "");

export const sanitizeUserReferencePatch = (patch: UserReferencePatch) => {
  const sanitized: UserReferencePatch = {};
  const id = getUserReferenceKey(patch);
  if (id) {
    sanitized.id = id;
    sanitized.userId = id;
  }
  for (const field of PROFILE_FIELDS) {
    if (patch[field] !== undefined) {
      sanitized[field] = patch[field];
    }
  }
  return sanitized;
};

export const resolveUserReference = (
  user: IUser,
  updates: Record<string, UserReferencePatch>
) => {
  const patch = updates[getUserReferenceKey(user)];
  return patch ? ({ ...user, ...patch } as IUser) : user;
};

export const resolveMessageUserReferences = (
  message: IMessage,
  updates: Record<string, UserReferencePatch>
): IMessage => ({
  ...message,
  user: resolveUserReference(message.user, updates),
  member: message.member?.map((user) => resolveUserReference(user, updates)),
  reply: message.reply
    ? resolveMessageUserReferences(message.reply, updates)
    : message.reply,
});

export const patchUserReference = (
  user: IUser | undefined,
  patch: UserReferencePatch
) => {
  const target = getUserReferenceKey(patch);
  if (!user || !target || getUserReferenceKey(user) !== target) return;

  for (const field of PROFILE_FIELDS) {
    const value = patch[field];
    if (value !== undefined) {
      user[field] = value;
    }
  }
};

export const patchMessageUserReferences = (
  message: IMessage | undefined,
  patch: UserReferencePatch
) => {
  if (!message) return;
  patchUserReference(message.user, patch);
  message.member?.forEach((user) => patchUserReference(user, patch));
  if (message.reply && message.reply !== message) {
    patchMessageUserReferences(message.reply, patch);
  }
};

export const patchRoomUserReferences = (
  room: IRoom | undefined,
  patch: UserReferencePatch
) => {
  if (!room) return;
  room.member?.forEach((user) => patchUserReference(user, patch));
  room.admin?.forEach((user) => patchUserReference(user, patch));
  patchUserReference(room.creator, patch);
  patchUserReference(room.peer, patch);
  room.message?.forEach((message) =>
    patchMessageUserReferences(message, patch)
  );
  patchMessageUserReferences(room.lastMsg, patch);
};
