import type { FileType, MediaItem } from '@/types/db-types';
import type { MediaFilters } from '@/types/media-types';
import type {
  ProcessingStatus,
  UnifiedProgress,
} from '../types/progress-types';
import { createServerSupabaseClient } from './supabase';

export function createProcessingStateFilter({
  type,
  statuses,
}: {
  type: string;
  statuses: string[];
}) {
  const supabase = createServerSupabaseClient();
  return supabase
    .from('processing_states')
    .select('media_item_id, status')
    .eq('type', type)
    .in('status', statuses);
}

/**
 * Get a media item by ID with file type information and optional fields
 * @param id Media item ID
 * @returns Query result with media item data
 */
export async function getMediaItemById(id: string): Promise<{
  data: MediaItem | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('media_items')
    .select('*, file_types!inner(*)')
    .eq('id', id)
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false)
    .single();
}

/**
 * Get media items with pagination and filtering
 * @param filters Media filters to apply
 * @param page Current page number (1-based)
 * @param pageSize Number of items per page
 * @returns Query result with media items and count
 */
export async function getMediaItems(
  filters: MediaFilters,
  page = 1,
  pageSize = 20,
): Promise<{
  data: MediaItem[] | null;
  count: number | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  // Calculate pagination range
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Start building the query
  let query = supabase
    .from('media_items')
    .select('*, file_types!inner(*), processing_states!inner(*)', {
      count: 'exact',
    })
    .in('file_types.category', ['image', 'video'])
    .eq('file_types.ignore', false);

  // Apply text search
  if (filters.search) {
    query = query.ilike('file_name', `%${filters.search}%`);
  }

  // Apply media type filter
  if (filters.type && filters.type !== 'all') {
    query = query.eq('file_types.category', filters.type);
  }

  // Apply date range filters
  if (filters.dateFrom) {
    query = query.gte('media_date', filters.dateFrom.toISOString());
  }

  if (filters.dateTo) {
    // Add one day to include the end date fully
    const endDate = new Date(filters.dateTo);
    endDate.setDate(endDate.getDate() + 1);
    query = query.lt('media_date', endDate.toISOString());
  }

  // Apply file size filters (convert MB to bytes)
  if (filters.minSize > 0) {
    query = query.gte('size_bytes', filters.minSize * 1024 * 1024);
  }

  if (filters.maxSize < Number.MAX_SAFE_INTEGER) {
    query = query.lte('size_bytes', filters.maxSize * 1024 * 1024);
  }

  // Apply processing status filter
  if (filters.processed && filters.processed !== 'all') {
    const hasExif = filters.processed === 'yes';

    if (hasExif) {
      query = query.not('exif_data', 'is', null);
    } else {
      query = query.is('exif_data', null);
    }
  }

  // Apply camera filter
  if (filters.camera && filters.camera !== 'all' && filters.camera !== '') {
    query = query.contains('exif_data', { Image: { Model: filters.camera } });
  }

  // Apply thumbnail filter
  if (filters.hasThumbnail && filters.hasThumbnail !== 'all') {
    if (filters.hasThumbnail === 'yes') {
      query = query.not('thumbnail_path', 'is', null);
    } else {
      query = query.is('thumbnail_path', null);
    }
  }

  // Apply location filter
  if (filters.hasLocation && filters.hasLocation !== 'all') {
    if (filters.hasLocation === 'yes') {
      query = query.not('exif_data->GPS', 'is', null);
    } else {
      query = query.or('exif_data->GPS.is.null, exif_data.is.null');
    }
  }

  // Apply sorting
  let sortColumn: string;
  switch (filters.sortBy) {
    case 'name':
      sortColumn = 'file_name';
      break;
    case 'size':
      sortColumn = 'size_bytes';
      break;
    case 'type':
      sortColumn = 'file_types.category';
      break;
    default:
      sortColumn = 'media_date';
      break;
  }

  query = query.order(sortColumn, {
    ascending: filters.sortOrder === 'asc',
    nullsFirst: filters.sortOrder === 'asc',
  });

  // Add secondary sort by file name to ensure consistent ordering
  if (filters.sortBy !== 'name') {
    query = query.order('file_name', { ascending: true });
  }

  // Apply pagination
  query = query.range(from, to);

  // Execute the query
  return await query;
}

/**
 * Get random media items that have thumbnails
 * @param limit Number of random items to fetch
 * @returns Query result with media items
 */
export async function getRandomImages(limit = 5): Promise<{
  data: MediaItem[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  // First, retrieve media_item IDs with successful thumbnail processing
  const { data: thumbData, error: thumbError } = await supabase
    .from('processing_states')
    .select('media_item_id, status, type')
    .eq('type', 'thumbnail')
    .eq('status', 'success');

  if (thumbError || !thumbData) {
    return { data: null, error: thumbError };
  }

  const thumbnailMediaIds = thumbData
    .map((item) => item.media_item_id || '')
    .filter(Boolean);

  // Query media_items using the retrieved IDs
  return supabase
    .from('media_items')
    .select('*, file_types!inner(*)')
    .in('file_types.category', ['image'])
    .eq('file_types.ignore', false)
    .in('id', thumbnailMediaIds)
    .gte('size_bytes', Math.floor(Math.random() * 50000 + 10000))
    .order('size_bytes', { ascending: false })
    .limit(limit);
}

/**
 * Count media items with specific conditions
 * @param options Filter options for the count
 * @returns Count result
 */
export async function countMediaItems(
  options: {
    category?: string;
    fileTypeId?: number;
    hasExif?: boolean;
    hasThumbnail?: boolean;
    includeIgnored?: boolean;
  } = {},
): Promise<{
  count: number | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  let query = supabase
    .from('media_items')
    .select('*, file_types!inner(*)', { count: 'exact', head: true });

  // Filter by category if specified
  if (options.category) {
    query = query.eq('file_types.category', options.category);
  }

  // Filter by file type ID if specified
  if (options.fileTypeId) {
    query = query.eq('file_type_id', options.fileTypeId);
  }

  // Filter by EXIF presence if specified
  if (options.hasExif !== undefined) {
    if (options.hasExif) {
      query = query.not('exif_data', 'is', null);
    } else {
      query = query.is('exif_data', null);
    }
  }

  // Filter by thumbnail presence if specified
  if (options.hasThumbnail !== undefined) {
    if (options.hasThumbnail) {
      query = query.not('thumbnail_path', 'is', null);
    } else {
      query = query.is('thumbnail_path', null);
    }
  }

  return query;
}

/**
 * Update processing state for a media item
 * @param processingState The processing state to update
 * @returns Update result
 */
export async function updateProcessingState(processingState: {
  media_item_id: string;
  status: ProcessingStatus;
  type: string;
  error_message?: string;
}): Promise<{
  error: any | null;
}> {
  const { media_item_id, status, type, error_message } = processingState;
  const supabase = createServerSupabaseClient();

  return supabase.from('processing_states').upsert(
    {
      media_item_id,
      type,
      status,
      processed_at: new Date().toISOString(),
      error_message: error_message,
    },
    {
      onConflict: 'media_item_id,type',
      ignoreDuplicates: false,
    },
  );
}

/**
 * Get all file types with optional filtering
 * @param options Query options for filtering file types
 * @returns Query result with file types data
 */
export async function getAllFileTypes() {
  const supabase = createServerSupabaseClient();

  try {
    // Apply filters
    let query = supabase.from('file_types').select('*');

    // Always sort by extension for consistent results
    query = query.order('extension');

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching file types:', error);
      return { data: null, error };
    }

    // Execute the query
    return {
      data: data || null,
      error: null,
    };
  } catch (err) {
    console.error('Error in getAllFileTypes:', err);
    return {
      data: null,
      error:
        err instanceof Error
          ? err
          : new Error('Unknown error in getAllFileTypes'),
    };
  }
}

/**
 * Get a file type by ID
 * @param id File type ID
 * @returns Query result with file type data
 */
export async function getFileTypeById(id: number): Promise<{
  data: FileType | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('file_types').select('*').eq('id', id).single();
}

/**
 * Get a file type by extension
 * @param extension File extension (without the dot)
 * @returns Query result with file type data
 */
export async function getFileTypeByExtension(extension: string): Promise<{
  data: FileType | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('file_types')
    .select('*')
    .eq('extension', extension.toLowerCase())
    .single();
}

/**
 * Update a file type
 * @param id File type ID
 * @param updates Object containing fields to update
 * @returns Update result
 */
export async function updateFileType(
  id: number,
  updates: Partial<FileType>,
): Promise<{
  success: boolean;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('file_types')
      .update(updates)
      .eq('id', id);

    return {
      success: !error,
      error,
    };
  } catch (error) {
    console.error(`Error updating file type ${id}:`, error);
    return {
      success: false,
      error,
    };
  }
}

/**
 * Insert a new file type
 * @param fileType File type data to insert
 * @returns Insert result
 */
export async function insertFileType(
  fileType: Omit<FileType, 'id'> & { id?: number },
): Promise<{
  data: FileType | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('file_types').insert(fileType).select().single();
}

/**
 * Delete all media items from the database
 * @returns Delete operation result
 */
export async function deleteAllMediaItems(): Promise<{
  success: boolean;
  count?: number;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    // Then delete all media items
    const { error: deleteError, count } = await supabase
      .from('media_items')
      .delete({ count: 'exact' })
      .not('id', 'is', null);

    if (deleteError) {
      console.error('Error deleting media items:', deleteError);
      return { success: false, error: deleteError.message };
    }

    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error('Error deleting media items:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete all processing states from the database
 * @returns Delete operation result
 */
export async function deleteAllProcessingStates(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('processing_states')
      .delete()
      .neq('id', 0);

    if (error) {
      console.error('Error deleting processing states:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting processing states:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete all file types from the database
 * @returns Delete operation result
 */
export async function deleteAllFileTypes(): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase.from('file_types').delete().neq('id', 0);

    if (error) {
      console.error('Error deleting file types:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting file types:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Add a new scan folder to the database
 * @param folderPath Path to the folder to scan
 * @param includeSubfolders Whether to include subfolders in the scan
 * @returns Operation result with created folder data
 */
export async function addScanFolder(
  folderPath: string,
  includeSubfolders = true,
): Promise<{
  data: any | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('scan_folders')
    .insert({
      path: folderPath,
      include_subfolders: includeSubfolders,
    })
    .select()
    .single();
}

/**
 * Remove a scan folder from the database
 * @param folderId ID of the scan folder to remove
 * @returns Operation result
 */
export async function removeScanFolder(folderId: number): Promise<{
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('scan_folders').delete().eq('id', folderId);
}

/**
 * Scan-related database operations
 */

/**
 * Get folders to scan from the database
 * @param folderId Optional specific folder ID to retrieve
 * @returns Query result with scan folders data
 */
export async function getFoldersToScan(folderId?: number): Promise<{
  data: any[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return folderId
    ? supabase.from('scan_folders').select('*').eq('id', folderId).order('path')
    : supabase.from('scan_folders').select('*').order('path');
}

/**
 * Get all file types for scanning
 * @returns Query result with file types data (extension and category)
 */
export async function getScanFileTypes(): Promise<{
  data: { id: string; category: string }[] | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('file_types').select('id, category');
}

/**
 * Check if a file exists in the database
 * @param filePath Path to the file to check
 * @returns Query result with file data if it exists
 */
export async function checkFileExists(filePath: string): Promise<{
  data: { id: string; modified_date: string; size_bytes: number } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('media_items')
    .select('id, modified_date, size_bytes')
    .eq('file_path', filePath)
    .maybeSingle();
}

/**
 * Get file type by extension
 * @param extension File extension
 * @returns Query result with file type ID
 */
export async function getFileTypeIdByExtension(extension: string): Promise<{
  data: { id: number } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('file_types')
    .select('id')
    .eq('extension', extension)
    .single();
}

/**
 * Add or update a file type
 * @param extension File extension
 * @param category File category
 * @param mimeType File MIME type
 * @returns Query result with the new file type ID
 */
export async function upsertFileType(
  extension: string,
  category: string,
  mimeType: string,
): Promise<{
  data: { id: number } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('file_types')
    .upsert(
      {
        extension,
        category,
        mime_type: mimeType,
      },
      {
        onConflict: 'extension',
        ignoreDuplicates: false,
      },
    )
    .select('id')
    .single();
}

/**
 * Insert a new media item
 * @param fileData Media item data
 * @returns Query result with inserted media item ID
 */
export async function insertMediaItem(fileData: {
  file_name: string;
  file_path: string;
  created_date: string;
  modified_date: string;
  size_bytes: number;
  file_type_id: number;
  folder_path: string;
}): Promise<{
  data: { id: string } | null;
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('media_items').insert(fileData).select('id').single();
}

/**
 * Update an existing media item
 * @param id Media item ID
 * @param fileData Media item data
 * @returns Query result
 */
export async function updateMediaItem(
  id: string,
  mediaItem: Partial<MediaItem>,
): Promise<{
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase.from('media_items').update(mediaItem).eq('id', id);
}

/**
 * Update the last scanned timestamp for a folder
 * @param folderId Folder ID
 * @returns Query result
 */
export async function updateFolderLastScanned(folderId: number): Promise<{
  error: any | null;
}> {
  const supabase = createServerSupabaseClient();

  return supabase
    .from('scan_folders')
    .update({ last_scanned: new Date().toISOString() })
    .eq('id', folderId);
}

/**
 * Update the scan status of a folder
 * @param folderId ID of the folder to update
 * @param resetStatus If true, sets last_scanned to null to mark folder for rescanning
 * @returns Operation result
 */
export async function updateFolderScanStatus(
  folderId: number,
  resetStatus: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = createServerSupabaseClient();

  try {
    const { error } = await supabase
      .from('scan_folders')
      .update({
        last_scanned: resetStatus ? null : new Date().toISOString(),
      })
      .eq('id', folderId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}

/**
 * Sends a progress update through a stream writer using the UnifiedProgress type.
 * Calculates percentComplete automatically if totalCount and processedCount are provided.
 */
export async function sendProgress(
  encoder: TextEncoder,
  writer: WritableStreamDefaultWriter,
  progress: Omit<Partial<UnifiedProgress>, 'status'> & {
    status: ProcessingStatus | null;
  },
) {
  // Calculate percentComplete if not provided but we have the necessary data
  if (
    progress.totalCount &&
    progress.processedCount &&
    progress.percentComplete === undefined
  ) {
    progress.percentComplete = Math.min(
      100,
      Math.round(
        (progress.processedCount / Math.max(1, progress.totalCount)) * 100,
      ),
    );
  }

  await writer.write(encoder.encode(`data: ${JSON.stringify(progress)}\\n\\n`));
}
