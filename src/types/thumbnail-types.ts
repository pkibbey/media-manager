/**
 * Type for thumbnail generation errors
 */
export type ThumbnailError = {
  path: string;
  message: string;
};

/**
 * Options for thumbnail generation
 */
export type ThumbnailOptions = {
  skipLargeFiles?: boolean; // Whether to skip files over the large file threshold
  batchSize?: number; // Number of items to process in each batch
  debug?: boolean; // Whether to enable debug logging
};

/**
 * Type for thumbnail generation result
 */
export type ThumbnailResult = {
  success: boolean;
  message: string;
  processed?: number;
  successCount?: number;
  failedCount?: number;
  skippedLargeFiles?: number;
  currentFilePath?: string;
  filePath?: string;
  fileType?: string;
  errors?: ThumbnailError[];
};
