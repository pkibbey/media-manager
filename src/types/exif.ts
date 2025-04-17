export type ExtractionMethod =
  | 'default'
  | 'sharp-only'
  | 'direct-only'
  | 'marker-only';

export type ExifProcessingOptions = {
  skipLargeFiles?: boolean; // Whether to skip files over the large file threshold
  abortToken?: string; // Token to check for abort operations
  extractionMethod: 'default' | 'sharp-only' | 'direct-only' | 'marker-only'; // A/B testing method
};

export type ExifProgress = {
  status: 'started' | 'processing' | 'completed' | 'error';
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
  method?: string; // New property to track the method used
};
