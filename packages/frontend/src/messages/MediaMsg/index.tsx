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
  const type = mediaMsg.fileType?.split("/")?.[0] ?? "";
  let media: React.ReactNode;
  switch (type) {
    case "image":
      media = <ImageMsg message={mediaMsg} />;
      break;
    case "video":
      media = <VideoMsg message={mediaMsg} />;
      break;
    case "audio":
      media = <AudioMsg message={mediaMsg} messageId={String(message.id)} />;
      break;
    default:
      media = <DocsMsg message={mediaMsg} />;
  }
  const caption = message.textMessage?.text?.trim();

  return (
    <div className="flex flex-col">
      {media}
      {caption ? (
        <div className="px-2.5 pb-2.5 break-words whitespace-pre-wrap">
          {caption}
        </div>
      ) : null}
    </div>
  );
};

export const MediaMsg = (message: IMessage) => {
  return {
    Preview: () => {
      const type = message.mediaMessage?.fileType?.split("/")?.[0];
      return <>{message.textMessage?.text || `[${type ?? "Unknown Media"}]`}</>;
    },
    Component: () => <Component message={message} />,
  };
};
