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
  organized: 'all' | 'yes' | 'no';
  camera: string;
  hasLocation: 'all' | 'yes' | 'no';
  hasThumbnail: 'all' | 'yes' | 'no';
}

/**
 * Statistics about media items in the system
 */
export interface MediaStats {
  totalMediaItems: number;
  totalSizeBytes: number;
  itemsByCategory: {
    [category: string]: number;
  };
  itemsByExtension: {
    [extension: string]: number;
  };
  processedCount: number;
  unprocessedCount: number;
  organizedCount: number;
  unorganizedCount: number;
  ignoredCount: number; // Count of files with ignored file types
}
