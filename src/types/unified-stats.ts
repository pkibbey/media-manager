/**
 * UnifiedStats - A standardized stats type for all stats-related functions across the application
 * This provides a consistent structure for stats reporting similar to UnifiedProgress for progress reporting
 */
export interface UnifiedStats {
  /**
   * The overall status of the resource or process being reported on
   */
  status: 'processing' | 'success' | 'error';

  /**
   * A human-readable message describing the current stats
   */
  message?: string;

  /**
   * An optional error message if status is 'error'
   */
  error?: string;

  /**
   * Common count metrics that are likely to be shared across different stats types
   */
  counts: {
    /**
     * Total count of items in this category
     */
    total: number;

    /**
     * Count of items successfully processed
     */
    success?: number;

    /**
     * Count of items that failed processing
     */
    failed?: number;

    /**
     * Count of items that were skipped
     */
    skipped?: number;

    /**
     * Count of items ignored (e.g., due to file type)
     */
    ignored?: number;
  };

  /**
   * Optional percentages calculated from counts
   */
  percentages?: {
    /**
     * Completion percentage (0-100)
     */
    completed?: number;

    /**
     * Error percentage (0-100)
     */
    error?: number;
  };
}

/**
 * Helper function to calculate percentages from counts
 */
export function calculatePercentages(
  counts: UnifiedStats['counts'],
): UnifiedStats['percentages'] {
  const total = counts.total || 0;
  if (total === 0) return {};

  const percentages: UnifiedStats['percentages'] = {};

  // Calculate completed percentage
  if (counts.success !== undefined) {
    percentages.completed = Math.round((counts.success / total) * 100);
  }

  // Calculate error percentage
  if (counts.failed !== undefined) {
    percentages.error = Math.round((counts.failed / total) * 100);
  }

  return percentages;
}

/**
 * Generic success response with stats
 */
export interface StatsResponse<T extends UnifiedStats = UnifiedStats> {
  /**
   * Whether the request was successful
   */
  success: boolean;

  /**
   * The stats data
   */
  data?: T;

  /**
   * An optional error message
   */
  error?: string;
}
