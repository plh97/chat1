import { avatarColors, generateAvatarColor } from "./colors";

const relativeLuminance = (hex: string) => {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045
        ? channel / 12.92
        : Math.pow((channel + 0.055) / 1.055, 2.4)
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
};

describe("Avatar colors", () => {
  it("uses stable colors regardless of username casing", () => {
    expect(generateAvatarColor("dev")).toBe(generateAvatarColor("DEV"));
  });

  it("keeps every fallback color readable against white text", () => {
    avatarColors.forEach((color) => {
      const contrastRatio = 1.05 / (relativeLuminance(color) + 0.05);
      expect(contrastRatio).toBeGreaterThanOrEqual(4.5);
    });
  });
});
