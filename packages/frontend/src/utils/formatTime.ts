// if from now less than 1 day, show 12:22 PM
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: true,
});

export const formatTime = (t: Date): string => {
  return timeFormatter.format(new Date(t));
};
