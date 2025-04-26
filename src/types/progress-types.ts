/**
 * Simplified processing status type
 */
export type ProcessingStatus = 'success' | 'failure';

/**
 * Unified progress interface for all processing operations
 */
export interface UnifiedProgress {
  status: ProcessingStatus;
  message: string;
  percentComplete?: number;
  processedCount?: number;
  totalCount?: number;
  successCount?: number;
  failureCount?: number;
  averageTimeMs?: number;
  estimatedTimeMs?: number;
  mediaItemId?: string;
  timestamp?: number;
  metadata?: Record<string, any> & {
    processingType?: string;
    fileType?: string;
  };
  isBatchComplete?: boolean;
}

export interface UnifiedProgressWithoutStatus
  extends Omit<UnifiedProgress, 'status'> {
  status?: ProcessingStatus | null;
}

/**
 * Basic result interface for functions that return results
 */
export interface BasicResult {
  success: boolean;
  message: string;
  count?: number;
}
