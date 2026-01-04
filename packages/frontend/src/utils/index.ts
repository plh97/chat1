import { UIEvent } from "react";
import { SUPPORTED_MEDIA_TYPES } from "./uploadFile";

export * from "./formatTime";
export * from "./utils";
export * from "./uploadFile";

export const throttle = (
  cb: (event: UIEvent<HTMLDivElement>, ...args: unknown[]) => void,
  ms = 200
) => {
  let t = 0;
  return (
    event: UIEvent<HTMLDivElement, globalThis.UIEvent>,
    ...args: any[]
  ) => {
    if (t) return;
    t = window.setTimeout(() => {
      cb.apply(this, [event, ...args]);
      t = 0;
    }, ms);
  };
};

export async function getFileFromClip(
  allowedTypes: string[] = [
    ...SUPPORTED_MEDIA_TYPES.image,
    ...SUPPORTED_MEDIA_TYPES.audio,
    ...SUPPORTED_MEDIA_TYPES.video,
  ]
): Promise<File | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (allowedTypes.includes(type)) {
          const blob = await item.getType(type);
          return blob as File;
        }
      }
    }
  } catch (error) {
    console.error("Failed to read from clipboard:", error);
  }
  return null;
}

/**
 * Get file from clipboard via DataTransfer (works better for drag-drop and paste events)
 */
export async function getFileFromClipboardEvent(
  event: ClipboardEvent | DragEvent,
  allowedTypes: string[] = [
    ...SUPPORTED_MEDIA_TYPES.image,
    ...SUPPORTED_MEDIA_TYPES.audio,
    ...SUPPORTED_MEDIA_TYPES.video,
  ]
): Promise<File | null> {
  try {
    const dataTransfer =
      (event as ClipboardEvent).clipboardData ||
      (event as DragEvent).dataTransfer;
    if (!dataTransfer) return null;

    for (const file of Array.from(dataTransfer.files)) {
      if (allowedTypes.includes(file.type)) {
        return file;
      }
    }
  } catch (error) {
    console.error("Failed to get file from clipboard event:", error);
  }
  return null;
}

export async function getImgFromClip(): Promise<File | null> {
  return getFileFromClip(SUPPORTED_MEDIA_TYPES.image);
}

export async function getVideoFromClip(): Promise<File | null> {
  return getFileFromClip(SUPPORTED_MEDIA_TYPES.video);
}

export async function getAudioFromClip(): Promise<File | null> {
  return getFileFromClip(SUPPORTED_MEDIA_TYPES.audio);
}

// with cent second
export const formatTime = (_time: number) => {
  const time = Math.ceil(_time);
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
};
