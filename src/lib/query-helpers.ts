import type { FileType } from '@/types/db-types';

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
