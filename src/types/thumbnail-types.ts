/**
 * Options for thumbnail generation
 */
export type ThumbnailOptions = {
  batchSize?: number;
  skipLargeFiles?: boolean;
  abortToken?: string;
};

/**
 * Type for thumbnail generation result
 */
export interface ThumbnailResult {
  success: boolean;
  message: string;
  processed?: number;
  successCount?: number;
  failedCount?: number;
  skippedLargeFiles?: number;
  currentFilePath?: string;
  fileType?: string;
  filePath?: string;
  errors?: Array<{ path: string; message: string }>;
}
