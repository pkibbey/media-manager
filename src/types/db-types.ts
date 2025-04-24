import type { Database } from './supabase';

/**
 * MediaItem represents a media item stored in the database
 */
export type MediaItem = Database['public']['Tables']['media_items']['Row'];

/**
 * FileType represents a file type/extension configuration stored in the database
 */
export type FileType = Database['public']['Tables']['file_types']['Row'];

/**
 * ScanFolder represents a folder that is scanned for media files
 */
export type ScanFolder = Database['public']['Tables']['scan_folders']['Row'];

/**
 * ProcessingState represents the state of a media item being processed
 */
export type ProcessingState =
  Database['public']['Tables']['processing_states']['Row'];

/**
 * ExifStatsResult represents statistics about EXIF extraction processing
 */
export interface ExifStatsResult {
  with_exif: number; // Files with successfully extracted EXIF data
  with_errors: number; // Files processed with errors
  skipped: number; // Files intentionally skipped during processing
  total: number; // Total number of media items
}
