/**
 * Type for EXIF extraction method
 */
export type ExtractionMethod =
  | 'default'
  | 'sharp-only'
  | 'direct-only'
  | 'marker-only';

/**
 * Type for EXIF processing options
 */
export type ExifProcessingOptions = {
  skipLargeFiles?: boolean; // Whether to skip files over the large file threshold
  abortToken?: string; // Token to check for abort operations
  extractionMethod?: ExtractionMethod; // A/B testing method
  batchSize?: number; // Size of batches for processing files
};

/**
 * Type for EXIF progress updates
 */
export type ExifProgress = {
  status: 'started' | 'generating' | 'processing' | 'completed' | 'error';
  message: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  successCount?: number;
  failedCount?: number;
  error?: string;
  currentFilePath?: string;
  // New property to track error details
  errorDetails?: Array<{
    filePath: string;
    error: string;
    fileType?: string;
  }>;
  largeFilesSkipped?: number; // New property to track large files skipped
  method?: ExtractionMethod; // New property to track the method used
};
