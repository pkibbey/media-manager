/**
 * Types for media content detection and analysis
 */

/**
 * Type for detection method to use
 */
export type DetectionMethod =
  | 'default'
  | 'local-model'
  | 'cloud-api'
  | 'hybrid';

/**
 * Type for detection processing options
 */
export type DetectionProcessingOptions = {
  skipProcessedFiles?: boolean; // Skip files that already have detection data
  minConfidence?: number; // Minimum confidence score (0-100) for detected objects/keywords
  targetFileTypes?: string[]; // File extensions to process (if empty, process all image types)
  abortToken?: string; // Token to check for abort operations
  detectionMethod?: DetectionMethod; // Method to use for detection
};

/**
 * Type for detection progress updates
 */
export type DetectionProgress = {
  status: 'started' | 'processing' | 'completed' | 'error';
  message: string;
  filesDiscovered?: number;
  filesProcessed?: number;
  successCount?: number;
  failedCount?: number;
  error?: string;
  currentFilePath?: string;
  // Details of failures
  errorDetails?: Array<{
    filePath: string;
    error: string;
    fileType?: string;
  }>;
  skippedFiles?: number; // Files skipped (already processed or unsupported)
  method?: DetectionMethod; // Method being used
};

/**
 * Type for a detected item within an image
 */
export type DetectedItem = {
  label: string; // What was detected (e.g., "person", "car", "mountain")
  confidence: number; // Confidence score from 0-100
  boundingBox?: {
    // Optional location data
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

/**
 * Type for detection results stored in the database
 */
export type DetectionResult = {
  mediaId: string; // ID of the media item
  detectedItems: DetectedItem[];
  detectionDate: Date; // When the detection was performed
  detectionMethod: DetectionMethod; // Method used for detection
};
