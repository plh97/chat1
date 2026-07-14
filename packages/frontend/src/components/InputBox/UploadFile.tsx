import { IconButton } from "@chakra-ui/react";
import { FiUpload } from "react-icons/fi";
import { getUploadAccept } from "@/utils/uploadFile";

interface IProps {
  onUpload: (file: File) => void;
}

export const UploadFile = ({ onUpload }: IProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={inputRef}
        className="hidden"
        type="file"
        accept={getUploadAccept()}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUpload(file);
            inputRef.current!.value = "";
          }
        }}
      />
      <IconButton
        size="lg"
        onClick={() => inputRef.current?.click()}
        variant="solid"
        rounded="full"
        aria-label="upload"
        icon={<FiUpload className="text-xl" />}
      />
    </>
  );
};
