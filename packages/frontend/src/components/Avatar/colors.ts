export const avatarColors = [
  "#1e40af",
  "#5b21b6",
  "#0f766e",
  "#9f1239",
  "#9a3412",
  "#3f6212",
  "#3730a3",
  "#86198f",
  "#0e7490",
  "#7c2d12",
] as const;

export const generateAvatarColor = (name: string) => {
  const hash = Array.from(name.trim().toLocaleLowerCase()).reduce(
    (value, character) => (value * 31 + character.codePointAt(0)!) >>> 0,
    0
  );
  return avatarColors[hash % avatarColors.length];
};
