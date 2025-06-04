/**
 * Utility functions for queue-related formatting and operations
 */

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms === 0 || !ms || !Number.isFinite(ms)) return 'N/A';

  const fixedSeconds = (ms / 1000).toFixed(2);
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${fixedSeconds}s`;
}

/**
 * Format processing rate to human-readable string
 */
export function formatRate(rate: number): string {
  if (rate === 0) return '0';
  if (rate < 0.1) return `${(rate * 60).toFixed(1)}/min`;
  return `${rate.toFixed(2)}/sec`;
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
