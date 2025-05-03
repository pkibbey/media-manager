/**
 * ThumbnailMethod - Enumeration of available thumbnail generation methods
 */
export type ThumbnailMethod = 'default' | 'embedded-preview' | 'downscale-only';

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
  error?: string;
};
