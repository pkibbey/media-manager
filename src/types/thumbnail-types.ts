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

// Common processing state status values
export type ProcessingStatus =
  | 'pending' // Not yet processed
  | 'success' // Successfully processed
  | 'skipped' // Skipped processing (e.g., large file)
  | 'error' // Failed to process with error
  | 'unsupported' // File type is not supported for this operation
  | 'outdated'; // Was processed but needs to be reprocessed

// Structured processing state for media items
export interface ProcessingState {
  // EXIF data extraction
  exif?: {
    status: ProcessingStatus;
    processedAt?: string; // ISO timestamp
    error?: string;
    method?: string; // Extraction method used
  };

  // Thumbnail generation
  thumbnail?: {
    status: ProcessingStatus;
    processedAt?: string; // ISO timestamp
    error?: string;
    path?: string; // Path to the thumbnail if successful
  };

  // Face detection/recognition
  faces?: {
    status: ProcessingStatus;
    processedAt?: string;
    error?: string;
    count?: number; // Number of faces detected
  };

  // Date/timestamp correction
  dateCorrection?: {
    status: ProcessingStatus;
    processedAt?: string;
    error?: string;
    source?: string; // Where the date came from (exif, filename, etc.)
  };

  // Add other processing types here as needed
}

// Helper to ensure type safety when checking processing state
export function hasBeenProcessedFor(
  state: ProcessingState | null | undefined,
  process: keyof ProcessingState,
): boolean {
  if (!state || !state[process]) return false;
  const status = state[process]?.status;
  return (
    status === 'success' || status === 'skipped' || status === 'unsupported'
  );
}

// Helper to check if process needs to be run/rerun
export function needsProcessing(
  state: ProcessingState | null | undefined,
  process: keyof ProcessingState,
): boolean {
  if (!state || !state[process]) return true;
  const status = state[process]?.status;
  return status === 'pending' || status === 'error' || status === 'outdated';
}
