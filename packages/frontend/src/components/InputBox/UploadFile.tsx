import { IconButton } from "@chakra-ui/react";
import { FiUpload } from "react-icons/fi";

interface IProps {
  onUpload: (file: File) => void;
}

export const UploadFile = ({ onUpload }: IProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onUpload(file);
          }
        }}
        ref={inputRef}
        className="hidden"
        type="file"
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
