import type { PostgrestError } from '@supabase/supabase-js';
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

export type ActionResult<T> = {
  data: T | null;
  error: PostgrestError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

export type Action<T> = Promise<ActionResult<T>>;
