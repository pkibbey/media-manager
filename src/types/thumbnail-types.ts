/**
 * Options for thumbnail generation
 */
export type ThumbnailGenerationOptions = {
  /**
   * Maximum number of thumbnails to generate in a single batch
   * Default is 100
   */
  batchSize?: number;
};

/**
 * Response from thumbnail generation operations
 */
export type ThumbnailGenerationResponse = {
  success: boolean;
  message: string;
  filePath?: string;
  fileName?: string;
  fileType?: string;
  skipped?: boolean;
  error?: string;
};

/**
 * Type for tracking progress during thumbnail generation
 */
export type ThumbnailProgress = {
  status: 'processing' | 'success' | 'error';
  message: string;
  totalItems?: number;
  processed?: number;
  successCount?: number;
  failedCount?: number;
  skippedLargeFiles?: number;
  currentFilePath?: string;
  currentFileName?: string;
  fileType?: string;
  error?: string;
  isBatchComplete?: boolean;
};

/**
 * Statistics about thumbnail generation
 */
export interface ThumbnailStats {
  /**
   * Total number of files that can have thumbnails
   */
  totalCompatibleFiles: number;

  /**
   * Number of files that have thumbnails
   */
  filesWithThumbnails: number;

  /**
   * Number of files waiting to be processed
   */
  filesPending: number;

  /**
   * Number of large files that were skipped
   */
  skippedLargeFiles: number;
}
