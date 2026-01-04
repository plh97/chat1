import { useEffect } from "react";
import { uploadImageThunk } from "@/store/reducer/user";
import { getFileFromClipboardEvent, SUPPORTED_MEDIA_TYPES } from "@/utils";
import { getUploadScene } from "@/utils/uploadFile";

interface UseUploadFileOptions {
  upload_scene?: number;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
  targetElement?: HTMLElement | null;
  allowedTypes?: string[];
}

const isValidFileType = (mimeType: string): boolean => {
  const allTypes = [
    ...SUPPORTED_MEDIA_TYPES.image,
    ...SUPPORTED_MEDIA_TYPES.audio,
    ...SUPPORTED_MEDIA_TYPES.video,
  ];
  return allTypes.includes(mimeType);
};

export const useUploadFile = ({
  upload_scene,
  onSuccess,
  onError,
  targetElement,
  allowedTypes,
}: UseUploadFileOptions = {}) => {
  const dispatch = useAppDispatch();

  const handlePaste = async (event: ClipboardEvent) => {
    const file = await getFileFromClipboardEvent(event, allowedTypes);
    if (file && isValidFileType(file.type)) {
      event.preventDefault();
      try {
        const scene = upload_scene || getUploadScene(file.type);
        const result = await dispatch(
          uploadImageThunk({
            file,
            upload_scene: scene,
            updateUserImage: false,
          })
        ).unwrap();
        onSuccess?.(result);
      } catch (error) {
        onError?.(error as Error);
      }
    }
  };

  useEffect(() => {
    const element = targetElement || window;
    const pasteListener = (event: Event) => {
      handlePaste(event as ClipboardEvent);
    };
    element.addEventListener("paste", pasteListener);
    return () => {
      element.removeEventListener("paste", pasteListener);
    };
  }, [upload_scene, onSuccess, onError, targetElement, allowedTypes]);

  return { handlePaste };
};
