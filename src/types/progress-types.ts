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
  newFilesAdded?: number;
  ignoredFilesSkipped?: number;
  smallFilesSkipped?: number;
  newFileTypes?: string[];
  error?: string;
};

/**
 * Options for the scan operation
 */
export type ScanOptions = {
  /**
   * Whether to ignore files under 10kb
   * Small files are often configuration files, metadata or thumbnails and not actual media
   */
  ignoreSmallFiles?: boolean;

  /**
   * Optional ID of a specific folder to scan
   * If not provided, all folders will be scanned
   */
  folderId?: number;

  /**
   * Token to abort the scan operation
   */
  abortToken?: string;
};
