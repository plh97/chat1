import { isSafari } from "@/config";
import {
  getFileExtension,
  getNormalizedMimeType,
  uploadFileWithPresignedUrl,
} from "./uploadFile";

export const videoMaxWidth = 70;
export const videoMaxHeight = 70;

export const previewImage = (
  file: File,
  maxWidth = 200,
  maxHeight = 200,
  minWidth = 5,
  minHeight = 5
): Promise<MediaMessage> => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const image = document.createElement("img");
  image.src = URL.createObjectURL(file);
  const cleanUp = () => {
    URL.revokeObjectURL(image.src);
    image.remove();
    canvas.remove();
  };
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
      ctx.drawImage(image, 0, 0, w, h, 0, 0, thumbnailX, thumbnailY);
      const mimeType = getNormalizedMimeType(file);
      const base64 = ctx.canvas.toDataURL(mimeType, 0.8);
      const endpoint_url = await uploadFileWithPresignedUrl(file, 1);
      const fileExt = getFileExtension(file);

      resolve({
        url: endpoint_url,
        extension: fileExt,
        name: file.name,
        size: file.size,
        thumbnail: base64,
        width: w / 2,
        height: h / 2,
        fileType: mimeType,
        duration: null,
      });
      cleanUp();
    };
  });
};

export const captureVideo = (video: HTMLVideoElement, fileType: string) => {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  const w = video.videoWidth;
  const h = video.videoHeight;
  let thumbnailX = 0;
  let thumbnailY = 0;
  if (w > h) {
    thumbnailX = videoMaxWidth;
    thumbnailY = (h / w) * videoMaxWidth;
  } else {
    thumbnailY = videoMaxHeight;
    thumbnailX = (w / h) * videoMaxHeight;
  }
  canvas.width = thumbnailX;
  canvas.height = thumbnailY;
  ctx.drawImage(video, 0, 0, w, h, 0, 0, thumbnailX, thumbnailY);
  const base64 = ctx.canvas.toDataURL(fileType, 0.8);
  canvas.remove();
  return { base64, w, h };
};

export const previewVideo = (file: File): Promise<MediaMessage> => {
  if (isSafari) {
    return previewImage(file, videoMaxWidth, videoMaxHeight);
  }
  const video = document.createElement("video");
  video.autoplay = true;
  video.muted = true;
  video.src = URL.createObjectURL(file);
  const cleanUp = () => {
    video.pause();
    video.remove();
    URL.revokeObjectURL(video.src);
  };
  return new Promise((resolve) => {
    video.onerror = cleanUp;
    video.oncanplaythrough = async () => {
      const mimeType = getNormalizedMimeType(file);
      const { base64, w, h } = captureVideo(video, mimeType);
      const endpoint_url = await uploadFileWithPresignedUrl(file, 3);
      const duration = !isNaN(video.duration)
        ? Math.ceil(video.duration)
        : null;
      const fileExt = getFileExtension(file);

      resolve({
        url: endpoint_url,
        extension: fileExt,
        name: file.name,
        size: file.size,
        thumbnail: base64,
        width: w,
        height: h,
        fileType: mimeType,
        duration: duration?.toString() || null,
      });
      cleanUp();
    };
  });
};

export const previewAudio = (
  file: File,
  duration: null | number
): Promise<MediaMessage> => {
  const audio = document.createElement("audio");
  audio.src = URL.createObjectURL(file);
  const cleanUp = () => {
    audio.pause();
    audio.remove();
    URL.revokeObjectURL(audio.src);
  };
  return new Promise((resolve) => {
    audio.onerror = cleanUp;
    audio.oncanplaythrough = async () => {
      const mimeType = getNormalizedMimeType(file);
      const endpoint_url = await uploadFileWithPresignedUrl(file, 2);
      const fileExt = getFileExtension(file);
      const audioDuration =
        duration || (!isNaN(audio.duration) ? Math.ceil(audio.duration) : null);

      resolve({
        url: endpoint_url,
        extension: fileExt,
        name: file.name,
        size: file.size,
        thumbnail: null,
        width: null,
        height: null,
        fileType: mimeType,
        duration: audioDuration?.toString() || null,
      });
      cleanUp();
    };
  });
};

export const previewDocument = async (file: File): Promise<MediaMessage> => {
  const mimeType = getNormalizedMimeType(file);
  const endpoint_url = await uploadFileWithPresignedUrl(file, 3);

  return {
    url: endpoint_url,
    extension: getFileExtension(file),
    name: file.name,
    size: file.size,
    thumbnail: null,
    width: null,
    height: null,
    fileType: mimeType,
    duration: null,
  };
};
