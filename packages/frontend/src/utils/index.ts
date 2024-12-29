import { UIEvent } from "react";

export const throttle = (
  cb: (event: UIEvent<HTMLDivElement>, ...args: unknown[]) => void,
  ms = 200
) => {
  let t = 0;
  return (
    event: UIEvent<HTMLDivElement, globalThis.UIEvent>,
    ...args: any[]
  ) => {
    if (t) return;
    t = window.setTimeout(() => {
      cb.apply(this, [event, ...args]);
      t = 0;
    }, ms);
  };
};

export async function getImgFromClip(): Promise<File> {
  return new Promise((resolve) => {
    (async () => {
      const res = await navigator.clipboard.read();
      const item = res[0];
      const type = item.types[0];
      if (type === "image/png") {
        item.getType(type).then((blob) => {
          resolve(blob as File);
        });
      }
    })();
  });
}

// with cent second
export const formatTime = (_time: number) => {
  const time = Math.ceil(_time);
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
};
