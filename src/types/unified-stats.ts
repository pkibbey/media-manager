import type { ExtractionMethod } from './exif';
import type { ThumbnailMethod } from './thumbnail-types';

/**
 * Simplified processing status type
 */
export type StatsStatus = 'processing' | 'success' | 'error';

/**
 * UnifiedStats - A standardized stats type for all stats-related functions across the application
 * This provides a consistent structure for stats reporting similar to UnifiedProgress for progress reporting
 */
export interface UnifiedStats {
  /**
   * The overall status of the resource or process being reported on
   */
  status: StatsStatus;

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

    /**
     * Current batch number when processing in batches
     */
    currentBatch?: number;
  };
}

export type Method = ThumbnailMethod | ExtractionMethod;
