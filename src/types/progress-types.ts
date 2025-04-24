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
 * Progress updates during scanning
 */
export type ScanProgress = {
  status: 'processing' | 'completed' | 'error';
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
