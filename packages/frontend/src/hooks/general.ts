import { CSSProperties } from "react";

export const useMediaMsgStyle = (message: Partial<IMediaMessage>) => {
  const w = message.width!;
  const h = message.height!;
  const style: CSSProperties = {
    width: w,
    height: h,
    aspectRatio: `${w} / ${h}`,
  };
  if (w > h && w > 200) {
    Object.assign(style, {
      width: 200,
      height: "auto",
    });
  }
  if (h > w && h > 200) {
    Object.assign(style, {
      width: "auto",
      height: 200,
    });
  }
  return style;
};

export const useFixedSize = (
  mediaMessage?: IMediaMessage,
  maxWidth = 200,
  maxHeight = 200
) => {
  if (!mediaMessage?.width || !mediaMessage?.height) {
    return { width: 0, height: 0 };
  }
  const rate = mediaMessage.width / mediaMessage.height;
  let width = 0;
  let height = 0;
  if (mediaMessage.width > mediaMessage.height) {
    width = maxWidth;
    height = maxHeight / rate;
  } else {
    height = maxWidth;
    width = maxHeight * rate;
  }
  return {
    width,
    height,
  };
};
