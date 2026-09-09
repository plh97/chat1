import Api from "@/Api";
import type { IUser } from "@/interfaces";

const READER_PAGE_SIZE = 50;
const readerCache = new Map<
  string,
  Promise<{ users: IUser[]; totalCount: number }>
>();

export const loadMessageReaders = (
  roomId: string,
  messageId: string,
  readCount: number
) => {
  const cacheKey = `${roomId}:${messageId}:${readCount}`;
  const cached = readerCache.get(cacheKey);
  if (cached) return cached;

  const request = Api.getMessageReaders({
    roomId,
    id: messageId,
    pageSize: READER_PAGE_SIZE,
    start: 0,
  }).catch((error) => {
    readerCache.delete(cacheKey);
    throw error;
  });
  readerCache.set(cacheKey, request);
  return request;
};
