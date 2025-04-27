/**
 * Unified status type for all processing operations
 * This matches the status values we're using in our stream processors
 */
export type ProgressStatus =
  | 'processing'
  | 'batch_complete'
  | 'complete'
  | 'failure';

/**
 * Unified progress interface for all processing operations
 */
export interface UnifiedProgress {
  /**
   * Current status of the processing operation
   * - 'processing': Operation is in progress
   * - 'batch_complete': A batch has been completed but more batches remain
   * - 'complete': All processing is finished successfully
   * - 'failure': Processing encountered an error
   * - 'success': Used for individual item success notifications
   * - null: Status unchanged (for intermediate updates)
   */
  status: ProgressStatus;

  /**
   * Human-readable message about the current progress
   */
  message: string;

  /**
   * Percentage of completion (0-100)
   */
  percentComplete?: number;

  /**
   * Number of items processed so far
   */
  processedCount?: number;

  /**
   * Total number of items to process
   */
  totalCount?: number;

  /**
   * Number of items successfully processed
   */
  successCount?: number;

  /**
   * Number of items that failed processing
   */
  failureCount?: number;

  /**
   * ID of the current media item being processed
   */
  mediaItemId?: string;

  /**
   * Timestamp when this progress update was created
   */
  timestamp?: number;

  /**
   * Additional metadata about the processing operation
   */
  metadata?: Record<string, any> & {
    processingType?: string;
    fileType?: string;
  };

  isBatchComplete?: boolean;
  isFinalBatch?: boolean;
  currentBatch?: number;
  batchSize?: number;
}

/**
 * Basic result interface for functions that return results
 */
export interface BasicResult {
  success: boolean;
  message: string;
  count?: number;
}
