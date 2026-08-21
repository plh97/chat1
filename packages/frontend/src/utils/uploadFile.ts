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
  document: [
    "application/pdf",
    "text/plain",
    "text/csv",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/json",
    "application/zip",
    "application/x-zip-compressed",
  ],
};

const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
  txt: "text/plain",
  csv: "text/csv",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  json: "application/json",
  zip: "application/zip",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "audio/webm",
  aac: "audio/aac",
  flac: "audio/flac",
  m4a: "audio/mp4",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

export const getMimeTypeFromName = (name?: string): string => {
  const extension = name?.split(".").pop()?.toLowerCase();
  if (!extension) {
    return "application/octet-stream";
  }
  return MIME_TYPE_BY_EXTENSION[extension] || "application/octet-stream";
};

export const getNormalizedMimeType = (file: Pick<File, "type" | "name">) => {
  const cleanType = file.type?.split(";")?.[0]?.trim()?.toLowerCase();
  if (cleanType) {
    return cleanType;
  }
  return getMimeTypeFromName(file.name);
};

export const getFileExtension = (file: Pick<File, "type" | "name">) => {
  const nameExtension = file.name?.split(".").pop()?.toLowerCase();
  if (nameExtension) {
    return nameExtension;
  }
  const mimeType = getNormalizedMimeType(file);
  return mimeType.split("/").pop() || "bin";
};

export const getUploadAccept = () =>
  [
    ...SUPPORTED_MEDIA_TYPES.image,
    ...SUPPORTED_MEDIA_TYPES.audio,
    ...SUPPORTED_MEDIA_TYPES.video,
    ...SUPPORTED_MEDIA_TYPES.document,
  ].join(",");

export const isValidFileType = (mimeType: string): boolean => {
  const allTypes = [
    ...SUPPORTED_MEDIA_TYPES.image,
    ...SUPPORTED_MEDIA_TYPES.audio,
    ...SUPPORTED_MEDIA_TYPES.video,
    ...SUPPORTED_MEDIA_TYPES.document,
  ];
  return allTypes.includes(mimeType);
};

export const getUploadScene = (mimeType: string): number => {
  if (SUPPORTED_MEDIA_TYPES.image.includes(mimeType)) return 1;
  if (SUPPORTED_MEDIA_TYPES.audio.includes(mimeType)) return 2;
  if (SUPPORTED_MEDIA_TYPES.video.includes(mimeType)) return 3;
  return 3;
};

/**
 * Core upload logic: Get pre-signed URL and upload file
 */
export const uploadFileWithPresignedUrl = async (
  file: File,
  upload_scene: number
): Promise<string> => {
  const mimeType = getNormalizedMimeType(file);
  const { pre_signed_url, endpoint_url } = await Api.getPreSignUrl({
    file_ext: mimeType,
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
  const mimeType = getNormalizedMimeType(file);
  if (!isValidFileType(mimeType)) {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }

  const scene = upload_scene || getUploadScene(mimeType);
  return uploadFileWithPresignedUrl(file, scene);
};
