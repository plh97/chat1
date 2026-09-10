import { IconButton } from "@/components/ui/chakra-compat";
import { IMediaMessage } from "@/interfaces";
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
  type?: string;
  className?: string;
}) => {
  const normalizedType = type ?? "";
  const [type1, type2] = normalizedType.split("/");
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
    <div className="box-border flex min-h-16 w-full min-w-0 max-w-[300px] items-center gap-2 overflow-hidden p-2.5">
      <FileIcon
        type={message.extension}
        className="h-10 w-10 flex-none text-5xl"
      />
      <div className="flex h-full min-w-0 flex-1 flex-col justify-between truncate whitespace-nowrap text-xs">
        <div
          style={{ lineHeight: "1em" }}
          className="overflow-hidden text-ellipsis whitespace-nowrap text-lg font-bold"
        >
          {message.name}
        </div>
        <div className="text-xs text-slate-300">
          {message.extension ?? "❓"} · {formatFileSize(message.size)}
        </div>
      </div>
      <IconButton asChild aria-label={`Open ${message.name || "attachment"}`}>
        <a href={message.url} target="_blank" rel="noopener noreferrer">
          <HiOutlineDocumentSearch className="text-2xl" />
        </a>
      </IconButton>
    </div>
  );
};
