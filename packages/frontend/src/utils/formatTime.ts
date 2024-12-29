// if from now less than 1 day, show 12:22 PM
export const formatTime = (t: Date): string => {
  return moment(t).format("hh:mm A");
};
