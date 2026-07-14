import type { MediaMessage } from "db";
import { IMediaMessage, IMessage } from "@/interfaces";
import {
  previewAudio,
  previewDocument,
  previewImage,
  previewVideo,
} from "./capture";
import { getNormalizedMimeType, isValidFileType } from "./uploadFile";

const formatMediaMessage = async (
  mediaMessage?: IMediaMessage
): Promise<MediaMessage | undefined> => {
  if (!mediaMessage) return;
  const file = mediaMessage?.file;
  if (!file) return mediaMessage;
  const fileType = getNormalizedMimeType(file);
  if (!isValidFileType(fileType)) {
    throw new Error(`Unsupported file type: ${fileType}`);
  }
  if (fileType.startsWith("image")) {
    return previewImage(file);
  }
  if (fileType.startsWith("video")) {
    return previewVideo(file);
  }
  if (fileType.startsWith("audio")) {
    return previewAudio(file, +mediaMessage?.duration!);
  }
  return previewDocument(file);
};

export const formatMessage = async (message: Partial<IMessage>) => {
  if (message.contentType === "MEDIA_MESSAGE") {
    return {
      ...message,
      mediaMessage: await formatMediaMessage(message.mediaMessage),
    };
  }
  return message;
};
