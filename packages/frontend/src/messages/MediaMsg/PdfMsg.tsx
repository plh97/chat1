import { IconButton } from "@chakra-ui/react";
import { IMediaMessage } from "@chatroom/core";
import {
  FaDownload,
  FaFileAlt,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
} from "react-icons/fa";

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

const FileIcon = ({ type, ...args }: { type: string; className?: string }) => {
  const iconMap: Record<string, JSX.Element> = {
    pdf: <FaFilePdf {...args} />,
    csv: <FaFileCsv {...args} />,
    doc: <FaFileWord {...args} />,
    xls: <FaFileExcel {...args} />,
    ppt: <FaFilePowerpoint {...args} />,
    default: <FaFileAlt {...args} />,
  };
  return iconMap[type] ?? iconMap.default;
};

export const PdfMsg = ({ message }: { message: IMediaMessage }) => {
  return (
    <div className="w-[300px] gap-2 box-content p-2.5 h-10 overflow-hidden select-none flex items-start justify-center">
      <FileIcon type={message.extension} className="h-10 flex-initial text-4xl" />
      <div className="flex-1 text-xs w-[calc(100%-100px)]">
        <div className="text-base font-blod overflow-hidden truncate">{message.name}</div>
        <div className="text-xs text-slate-300">
          {message.extension ?? "❓"} · {formatFileSize(message.size)}
        </div>
      </div>
      <IconButton
        onClick={() => open(message.url)}
        aria-label="download button"
        icon={<FaDownload />}
      />
    </div>
  );
};
