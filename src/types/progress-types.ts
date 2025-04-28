/**
 * Basic result interface for functions that return results
 */
export interface BasicResult {
  success: boolean;
  message: string;
  count?: number;
}

/**
 * Valid status values for processing states
 */
export type ProgressStatus = 'processing' | 'complete' | 'failure' | null;

export type ProgressType = 'exif' | 'thumbnail' | 'scan';

/**
 * Standard interface for progress updates
 */
export interface UnifiedProgress {
  // Status information
  status?: string;
  message?: string;

  // Count information
  totalCount?: number;
  processedCount?: number;
  successCount?: number;
  failureCount?: number;
  skippedCount?: number;

  // Progress calculation
  progressType: ProgressType;
  percentComplete?: number;

  // Performance metrics
  estimatedTimeRemaining?: number;
  processingRate?: number;

  // Batch information
  currentBatch?: number;
  totalBatches?: number;
  isBatchComplete?: boolean;
  isFinalBatch?: boolean;

  // Timing information
  timestamp?: number;

  // Any additional metadata in key-value pairs
  metadata?: {
    method?: string;
    fileType?: string;
  };
}
