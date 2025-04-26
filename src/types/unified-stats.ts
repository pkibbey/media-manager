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
  message: string;

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
    success: number;

    /**
     * Count of items that failed processing
     */
    failed: number;
  };

  /**
   * Optional percentages calculated from counts
   */
  percentages: {
    /**
     * Completion percentage (0-100)
     */
    completed: number;

    /**
     * Error percentage (0-100)
     */
    error: number;
  };
}
