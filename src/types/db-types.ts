import type { Tables } from './supabase';

/**
 * MediaItem represents a media item stored in the database
 */
export interface MediaItem extends Tables<'media_items'> {}

/**
 * FileType represents a file type/extension configuration stored in the database
 */
export interface FileType extends Tables<'file_types'> {}

/**
 * ScanFolder represents a folder that is scanned for media files
 */
export interface ScanFolder extends Tables<'scan_folders'> {}

/**
 * ProcessingState represents the state of a media item being processed
 */
export interface ProcessingState extends Tables<'processing_states'> {}
