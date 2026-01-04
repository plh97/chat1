import type { MediaMessage } from "db";
import { IMediaMessage, IMessage } from "@/interfaces";
import { previewImage, previewVideo, previewAudio } from "./capture";

const formatMediaMessage = async (
  mediaMessage?: IMediaMessage
): Promise<MediaMessage | undefined> => {
  if (!mediaMessage) return;
  const file = mediaMessage?.file;
  const fileType = file?.type;
  if (fileType.startsWith("image")) {
    return previewImage(file);
  }
  if (fileType.startsWith("video")) {
    return previewVideo(file);
  }
  if (fileType.startsWith("audio")) {
    return previewAudio(file, +mediaMessage?.duration!);
  }
  // Fallback for other file types
  throw new Error(`Unsupported file type: ${fileType}`);
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
