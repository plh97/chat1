import Api from "@/Api";

export interface UploadFileOptions {
  file: File;
  upload_scene?: number;
}

export const SUPPORTED_MEDIA_TYPES = {
  image: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ],
  audio: [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/webm",
    "audio/aac",
    "audio/flac",
  ],
  video: [
    "video/mp4",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
  ],
};

export const isValidFileType = (mimeType: string): boolean => {
  const allTypes = [
    ...SUPPORTED_MEDIA_TYPES.image,
    ...SUPPORTED_MEDIA_TYPES.audio,
    ...SUPPORTED_MEDIA_TYPES.video,
  ];
  return allTypes.includes(mimeType);
};

export const getUploadScene = (mimeType: string): number => {
  if (SUPPORTED_MEDIA_TYPES.image.includes(mimeType)) return 1;
  if (SUPPORTED_MEDIA_TYPES.audio.includes(mimeType)) return 2;
  if (SUPPORTED_MEDIA_TYPES.video.includes(mimeType)) return 3;
  return 1; // default
};

/**
 * Core upload logic: Get pre-signed URL and upload file
 */
export const uploadFileWithPresignedUrl = async (
  file: File,
  upload_scene: number
): Promise<string> => {
  const { pre_signed_url, endpoint_url } = await Api.getPreSignUrl({
    file_ext: file.type,
    upload_scene,
  });

  await fetch(pre_signed_url, {
    method: "PUT",
    body: file,
  });

  return endpoint_url;
};

export const uploadFile = async ({
  file,
  upload_scene,
}: UploadFileOptions): Promise<string> => {
  if (!isValidFileType(file.type)) {
    throw new Error(`Unsupported file type: ${file.type}`);
  }

  const scene = upload_scene || getUploadScene(file.type);
  return uploadFileWithPresignedUrl(file, scene);
};
