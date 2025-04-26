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
  extractionMethod?: ExtractionMethod; // A/B testing method
  batchSize?: number; // Size of batches for processing files
};

/**
 * Type for EXIF progress updates
 */
export type ExifProgress = {
  status: 'processing' | 'success' | 'error';
  message: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  totalFiles?: number;
  successCount?: number;
  failureCount?: number;
  error?: string;
  currentFilePath?: string;
  // New property to track error details
  errorDetails?: Array<{
    filePath: string;
    error: string;
    fileType?: string;
  }>;
  method?: ExtractionMethod;
};
