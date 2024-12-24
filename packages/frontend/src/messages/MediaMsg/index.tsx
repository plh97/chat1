import { ImageMsg } from "./ImageMsg";
import { VideoMsg } from "./VideoMsg";
import { DocsMsg } from "./DocsMsg";
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
    default:
      return <DocsMsg message={mediaMsg} />;
  }
};

export const MediaMsg = (message: IMessage) => {
  return {
    Preview: () => {
      const type = message.mediaMessage?.fileType?.split("/")[0];
      return <>{`[${type ?? "Unknown Media"}]`}</>;
    },
    Component: () => <Component message={message} />,
  };
};
