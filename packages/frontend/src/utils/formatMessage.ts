import Api from "@/Api";
import { IMediaMessage, IMessage } from "@/interfaces";
import { IContentType, MediaMessage } from "db";

const uploadFile = async (file: File, params?: { [key: string]: string }) => {
  const form = new FormData();
  form.append("file", file);
  if (params) {
    Object.keys(params).forEach((key) => {
      form.append(key, params[key]);
    });
  }
  return Api.upload(form) as Promise<MediaMessage>;
};

const previewImage = (
  file: File,
  maxWidth = 200,
  maxHeight = 200,
  minWidth = 5,
  minHeight = 5
): Promise<MediaMessage> => {
  // get image thumbnail
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  return new Promise((resolve) => {
    image.onerror = async () => {
      URL.revokeObjectURL(image.src);
    };
    image.onload = async () => {
      const w = image.width;
      const h = image.height;
      let thumbnailX = 0;
      let thumbnailY = 0;
      if (w >= h && w > maxWidth) {
        thumbnailX = maxWidth;
        thumbnailY = (h / w) * maxWidth;
      } else if (h >= w && h > maxHeight) {
        thumbnailY = maxHeight;
        thumbnailX = (w / h) * maxHeight;
      } else if (w <= h && h < minHeight) {
        thumbnailY = maxHeight;
        thumbnailX = (w / h) * maxHeight;
      } else if (w >= h && w < minWidth) {
        thumbnailX = maxWidth;
        thumbnailY = (h / w) * maxWidth;
      } else {
        thumbnailX = w;
        thumbnailY = h;
      }
      canvas.width = thumbnailX;
      canvas.height = thumbnailY;
      URL.revokeObjectURL(image.src);
      ctx.drawImage(image, 0, 0, w, h, 0, 0, thumbnailX, thumbnailY);
      const base64 = ctx.canvas.toDataURL(file.type, 0.8);
      const fileInfo = await uploadFile(file);
      resolve({
        ...fileInfo,
        thumbnail: base64,
        width: w / 2,
        height: h / 2,
      });
    };
  });
};

const previewVideo = (
  file: File,
  maxWidth = 70,
  maxHeight = 70
): Promise<MediaMessage> => {
  // get image thumbnail
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const video = document.createElement("video");
  video.autoplay = true;
  video.currentTime = 0;
  video.src = URL.createObjectURL(file);
  return new Promise((resolve) => {
    video.onerror = async () => {
      URL.revokeObjectURL(video.src);
    };
    video.oncanplay = async () => {
      const w = video.videoWidth;
      const h = video.videoHeight;
      let thumbnailX = 0;
      let thumbnailY = 0;
      if (w > h) {
        thumbnailX = maxWidth;
        thumbnailY = (h / w) * maxWidth;
      } else {
        thumbnailY = maxHeight;
        thumbnailX = (w / h) * maxHeight;
      }
      canvas.width = thumbnailX;
      canvas.height = thumbnailY;
      URL.revokeObjectURL(video.src);
      ctx.drawImage(video, 0, 0, w, h, 0, 0, thumbnailX, thumbnailY);
      const base64 = ctx.canvas.toDataURL(file.type, 0.8);
      const fileInfo = await uploadFile(file);
      resolve({
        ...fileInfo,
        thumbnail: base64,
        width: w,
        height: h,
      });
    };
  });
};

const formatMediaMessage = async (
  mediaMessage?: IMediaMessage
): Promise<MediaMessage | undefined> => {
  if (!mediaMessage) return mediaMessage;
  const file = mediaMessage?.file as File;
  const fileType = file?.type;
  if (fileType.startsWith("image")) {
    return previewImage(file);
  }
  if (fileType.startsWith("video")) {
    return previewVideo(file);
  }
  if (fileType.startsWith("audio")) {
    return uploadFile(file, {
      duration: mediaMessage.duration?.toString() ?? "",
    });
  }
  return uploadFile(file);
};

export const formatMessage = async (message: Partial<IMessage>) => {
  switch (message.contentType) {
    // case IContentType.TEXT_MESSAGE:
    //   return {
    //     ...message,
    //     textMessage: {
    //       content: message.textMessage?.content,
    //     },
    //   };
    case IContentType.MEDIA_MESSAGE: {
      return {
        ...message,
        mediaMessage: await formatMediaMessage(message.mediaMessage),
      };
    }
    default:
      return message;
  }
};
