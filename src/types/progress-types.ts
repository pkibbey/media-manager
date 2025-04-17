/**
 * Type for generic batch operation progress
 */
export type BatchProgress = {
  status: 'processing' | 'completed' | 'error';
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
 * Types for scan progress reporting
 */
export type ScanProgress = {
  status: 'started' | 'scanning' | 'completed' | 'refresh' | 'error';
  message: string;
  folderPath?: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  newFilesAdded?: number;
  newFileTypes?: string[];
  error?: string;
  filesSkipped?: number; // Files skipped because they're unchanged
  ignoredFilesSkipped?: number; // Files skipped due to ignored extensions
  smallFilesSkipped?: number; // Files skipped because they're too small
};

/**
 * Options for the scan operation
 */
export type ScanOptions = {
  ignoreSmallFiles?: boolean; // Whether to ignore files under 10kb
};
