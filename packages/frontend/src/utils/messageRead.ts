type EntityId = string | number | null | undefined;

type UserIdentity = {
  id?: EntityId;
  userId?: EntityId;
};

type MessageIdentity = {
  userId?: EntityId;
  user?: UserIdentity;
};

type ReadableMessage = MessageIdentity & {
  seq: number;
};

type RoomParticipants = {
  member?: UserIdentity[] | null;
  admin?: UserIdentity[] | null;
  creator?: UserIdentity | null;
  memberTotalCount?: number;
  adminTotalCount?: number;
  participantTotalCount?: number;
};

const normalizeEntityId = (value: EntityId) => String(value ?? "");

const getUserId = (user?: UserIdentity) =>
  normalizeEntityId(user?.id || user?.userId);

const getMessageAuthorId = (message?: MessageIdentity) =>
  normalizeEntityId(
    message?.userId || message?.user?.id || message?.user?.userId
  );

export const isOwnMessage = (
  message?: MessageIdentity,
  currentUser?: UserIdentity
) => {
  const authorId = getMessageAuthorId(message);
  const currentUserId = getUserId(currentUser);
  return Boolean(authorId && currentUserId && authorId === currentUserId);
};

export const getMessageReadProgress = (
  message: ReadableMessage,
  members: UserIdentity[],
  readSeq: Record<string, number>,
  totalParticipantCount?: number
) => {
  const authorId = getMessageAuthorId(message);
  const knownRecipientIds = Array.from(
    new Set(
      members
        .map(getUserId)
        .filter((memberId) => memberId && memberId !== authorId)
    )
  );
  const recipientCount =
    totalParticipantCount == null
      ? knownRecipientIds.length
      : Math.max(0, Number(totalParticipantCount) - 1);
  const readCount = Math.min(
    recipientCount,
    Object.entries(readSeq).filter(
      ([userId, sequence]) =>
        normalizeEntityId(userId) !== authorId &&
        Number(sequence ?? 0) >= message.seq
    ).length
  );

  return {
    recipientCount,
    readCount,
    percentage: recipientCount ? (readCount / recipientCount) * 100 : 0,
  };
};

export const getMessageReaders = <UserType extends UserIdentity>(
  message: ReadableMessage,
  participants: UserType[],
  readSeq: Record<string, number>
) => {
  const authorId = getMessageAuthorId(message);
  const readers = new Map<string, UserType>();
  for (const participant of participants) {
    const participantId = getUserId(participant);
    if (
      participantId &&
      participantId !== authorId &&
      Number(readSeq[participantId] ?? 0) >= message.seq
    ) {
      readers.set(participantId, participant);
    }
  }
  return Array.from(readers.values());
};

export const getRoomParticipantCount = (room: RoomParticipants) => {
  const knownParticipantIds = new Set(
    [...(room.member ?? []), ...(room.admin ?? []), room.creator]
      .filter((user): user is UserIdentity => Boolean(user))
      .map(getUserId)
      .filter(Boolean)
  );
  const memberTotalCount = Math.max(0, Number(room.memberTotalCount ?? 0));
  const adminTotalCount = Math.max(0, Number(room.adminTotalCount ?? 0));
  const participantTotalCount = Math.max(
    0,
    Number(room.participantTotalCount ?? 0)
  );
  if (room.participantTotalCount != null) {
    return participantTotalCount;
  }
  const creatorIncludedTwice =
    room.creator && memberTotalCount && adminTotalCount;
  const reportedParticipantCount =
    memberTotalCount + adminTotalCount - (creatorIncludedTwice ? 1 : 0);

  return Math.max(knownParticipantIds.size, reportedParticipantCount);
};
