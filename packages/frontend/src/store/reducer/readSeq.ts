export const mergeReadSeqForward = (
  current: Record<string, number>,
  incoming: Record<string, number>
) => {
  for (const [userId, sequence] of Object.entries(incoming)) {
    const nextSequence = Number(sequence ?? 0);
    const currentSequence = Number(current[userId] ?? 0);
    if (nextSequence > currentSequence) {
      current[userId] = nextSequence;
    }
  }
};
