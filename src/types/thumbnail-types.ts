/**
 * Options for thumbnail generation
 */
export interface ThumbnailGenerationOptions {
  /**
   * Skip files larger than the large file threshold
   */
  skipLargeFiles?: boolean;

  /**
   * Optional abort token to cancel the operation
   */
  abortToken?: string;
}

/**
 * Result of a thumbnail generation operation
 */
export interface ThumbnailGenerationResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;

  /**
   * Message describing the result
   */
  message: string;

  /**
   * Path to the generated thumbnail
   */
  thumbnailPath?: string;

  /**
   * Whether the file was skipped (e.g., too large)
   */
  skipped?: boolean;

  /**
   * Error message if the operation failed
   */
  error?: string;
}

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
