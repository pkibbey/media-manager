/**
 * Type for generic batch operation progress
 */

export type BatchProgress = {
  status: 'processing' | 'success' | 'error';
  message: string;
  processedCount?: number;
  totalCount?: number;
  currentItem?: string;
  error?: string;
};

/**
 * Type for batch operation request
 */
export type BatchOperationResponse = {
  success: boolean;
  message: string;
  processedCount?: number;
  failedCount?: number;
  error?: string;
};

/**
 * Progress updates during scanning
 */
export type ScanProgress = {
  status: 'processing' | 'success' | 'error';
  message: string;
  folderPath?: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  filesSkipped?: number;
  newFilesAdded?: number;
  newFileTypes?: string[];
  error?: string;
};

/**
 * Options for the scan operation
 */
export type ScanOptions = {
  /**
   * Optional ID of a specific folder to scan
   * If not provided, all folders will be scanned
   */
  folderId?: number;

  /**
   * Whether to skip folders that have already been scanned
   * If true, folders with last_scanned set will be skipped
   * Default is false (scan all folders)
   */
  skipScanned?: boolean;
};

/**
 * Unified progress type for all processing operations
 * This provides a consistent structure for progress reporting across different features
 */
export type UnifiedProgress = {
  /**
   * Current status of the operation
   */
  status: 'processing' | 'success' | 'error' | 'aborted' | 'skipped' | 'failed';

  /**
   * Human-readable message about current progress
   */
  message: string;

  /**
   * Error message if status is 'error'
   */
  error?: string;

  /**
   * Total number of items to be processed
   */
  totalCount?: number;

  /**
   * Number of items processed so far
   */
  processedCount?: number;

  /**
   * Number of items successfully processed
   */
  successCount?: number;

  /**
   * Number of items that failed processing
   */
  failedCount?: number;

  /**
   * Number of items that were skipped
   */
  skippedCount?: number;

  /**
   * Path, name or ID of the current item being processed
   */
  currentItem?: string;

  /**
   * Calculated completion percentage (0-100)
   */
  percentComplete?: number;

  /**
   * Optional additional context-specific data
   * This should include:
   * - processingType: The type of processing being performed (e.g., 'exif', 'thumbnail', etc.)
   */
  metadata?: Record<string, any> & {
    processingType?: string;
    fileType?: string;
  };

  /**
   * Whether this progress update marks the completion of a batch
   * (useful for multi-batch operations)
   */
  isBatchComplete?: boolean;
};
