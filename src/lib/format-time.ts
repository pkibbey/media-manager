// Helper function to format time in seconds to mm:ss format
export const formatTime = (timeInMs: number | null) => {
  if (timeInMs === null || timeInMs === undefined) return 'N/A';
  const totalSeconds = Math.floor(timeInMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
};
