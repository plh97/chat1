import { ImageMsg } from "./ImageMsg";
import { VideoMsg } from "./VideoMsg";
import { PdfMsg } from "./PdfMsg";
import { AudioMsg } from "./AudioMsg";
import { IMessage } from "@/interfaces/IMessage";

export const Component = ({ message }: { message: IMessage }) => {
  const mediaMsg = message.mediaMessage;
  if (!mediaMsg) {
    return <div>Invalid Media Message</div>;
  }
  const type = mediaMsg.fileType?.split("/")[0];
  switch (type) {
    case "image":
      return <ImageMsg message={mediaMsg} />;
    case "video":
      return <VideoMsg message={mediaMsg} />;
    case "audio":
      return <AudioMsg message={mediaMsg} />;
    // case "pdf":
    // case "csv":
    // case "doc":
    // case "ppt":
    // case "xls":
    // case "xml":
    //   return <PdfMsg message={mediaMsg} />;
    default:
      return <PdfMsg message={mediaMsg} />;
    // return <div>Unsupported media type: {JSON.stringify(message)}</div>;
  }
};

export const MediaMsg = (message: IMessage) => {
  const getPreview = () => {
    const type = message.mediaMessage?.fileType?.split("/")[0];
    return (
      <span className="mt-2 text-xs font-normal text-stone-400">
        {`[${type?.toUpperCase() ?? ""}]`}
      </span>
    );
  };
  return {
    preview: getPreview(),
    component: <Component message={message} />,
  };
};
