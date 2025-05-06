/**
 * Media filtering options for browsing and searching media items
 */
export interface MediaFilters {
  search: string;
  type: 'all' | 'image' | 'video' | 'data';
  dateFrom: Date | null;
  dateTo: Date | null;
  minSize: number;
  maxSize: number;
  sortBy: 'created_date' | 'file_name' | 'size_bytes';
  sortOrder: 'asc' | 'desc';
  hasExif: 'all' | 'yes' | 'no';
  hasLocation: 'all' | 'yes' | 'no';
  hasThumbnail: 'all' | 'yes' | 'no';
  hasAnalysis: 'all' | 'yes' | 'no';
  includeHidden: boolean;
  includeDeleted: boolean;
}

/**
 * Statistics about media items in the system
 */
export type AllMediaStats = {
  totalCount: number;
  failureCount: number;
  totalSizeBytes: number;
};
