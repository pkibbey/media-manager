import type { Tables } from './supabase';
import type { ProcessingState } from './thumbnail-types';

/**
 * MediaItem represents a media file stored in the database
 */
export interface MediaItem {
  id: string;
  created_at: string;
  file_path: string;
  file_name: string;
  extension: string | null;
  folder_path: string | null;
  size_bytes: number | null;
  modified_date: string | null;
  created_date: string | null;
  media_date: string | null;
  processed: boolean;
  has_exif: boolean;
  exif_data: Record<string, any> | null;
  error: string | null;
  thumbnail_path: string | null;
  organized: boolean;
  // Update the processing_state to use our typed interface
  processing_state: ProcessingState | null;
}

/**
 * FileType represents a file type/extension configuration stored in the database
 */
export interface FileType extends Tables<'file_types'> {}

/**
 * ScanFolder represents a folder that is scanned for media files
 */
export interface ScanFolder extends Tables<'scan_folders'> {}
