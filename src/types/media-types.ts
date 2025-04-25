/**
 * Media filtering options for browsing and searching media items
 */
export interface MediaFilters {
  search?: string;
  type: 'all' | 'image' | 'video' | 'data';
  dateFrom: Date | null;
  dateTo: Date | null;
  minSize: number;
  maxSize: number;
  sortBy: 'date' | 'name' | 'size' | 'type';
  sortOrder: 'asc' | 'desc';
  processed: 'all' | 'yes' | 'no';
  camera: string;
  hasLocation: 'all' | 'yes' | 'no';
  hasThumbnail: 'all' | 'yes' | 'no';
}

/**
 * Statistics about media items in the system
 */
export type MediaStats = {
  totalMediaItems: number;
  totalSizeBytes: number;
  processedCount: number;
  erroredCount: number;
  ignoredCount: number;
  skippedCount: number;
  needsTimestampCorrectionCount: number;
};

export type DetailedMediaStats = {
  itemsByCategory: Record<string, number>;
  itemsByExtension: Record<string, number>;
};

export interface MediaItemsFilter {
  search?: string;
  type?: 'all' | 'image' | 'video' | 'data';
  sortBy?: 'date' | 'name' | 'size' | 'type';
  sortOrder?: 'asc' | 'desc';
  hasThumbnail?: 'all' | 'yes' | 'no';
}

export type FailedFile = {
  id: string;
  file_name: string;
  file_path: string;
  error: string | null;
  extension: string;
  size_bytes?: number;
};

export type ErrorCategory = {
  type: string;
  count: number;
  examples: FailedFile[];
};
