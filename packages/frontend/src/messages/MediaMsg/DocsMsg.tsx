import { IconButton } from "@chakra-ui/react";
import { IMediaMessage } from "core";
import { HiOutlineDocumentSearch } from "react-icons/hi";
import {
  FaFileAlt,
  FaFileAudio,
  FaFileCsv,
  FaFileExcel,
  FaFileImage,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileVideo,
  FaFileWord,
} from "react-icons/fa";
import { JSX } from "react";

export function formatFileSize(size?: number) {
  if (!size) return "0 Byte";
  if (size > 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(0)} MB`;
  }
  if (size > 1024) {
    return `${(size / 1024).toFixed(0)} KB`;
  }
  return `${size.toFixed(0)} Byte`;
}

export const FileIcon = ({
  type,
  ...args
}: {
  type: string;
  className?: string;
}) => {
  const [type1, type2] = type.split("/");
  const iconMap: Record<string, JSX.Element | null> = {
    pdf: <FaFilePdf {...args} />,
    csv: <FaFileCsv {...args} />,
    doc: <FaFileWord {...args} />,
    xls: <FaFileExcel {...args} />,
    ppt: <FaFilePowerpoint {...args} />,
    audio: <FaFileAudio {...args} />,
    image: <FaFileImage {...args} />,
    video: <FaFileVideo {...args} />,
    default: <FaFileAlt {...args} />,
  };
  return iconMap[type1] ?? iconMap[type2] ?? iconMap.default;
};

export const DocsMsg = ({ message }: { message: IMediaMessage }) => {
  return (
    <div
      style={{ width: "300px" }}
      className="w-[300px] gap-2 box-content p-2.5 h-10 overflow-hidden select-none flex items-start justify-center"
    >
      <FileIcon
        type={message.extension}
        className="h-10 w-10 flex-initial text-5xl"
      />
      <div
        className="h-full flex flex-col text-nowrap justify-between flex-1 text-xs truncate"
        style={{ width: "calc(100% - 100px)", textWrap: "nowrap" }}
      >
        <div
          style={{ lineHeight: "1em" }}
          className="text-lg font-bold overflow-hidden text-nowrap text-ellipsis"
        >
          {message.name}
        </div>
        <div className="text-xs text-slate-300">
          {message.extension ?? "❓"} · {formatFileSize(message.size)}
        </div>
      </div>
      <IconButton
        onClick={() => open(message.url)}
        aria-label="download button"
        icon={<HiOutlineDocumentSearch className="text-2xl" />}
      />
    </div>
  );
};
