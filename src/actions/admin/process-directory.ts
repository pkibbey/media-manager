'use server';

import { v4 as uuid } from 'uuid';
import { createSupabase } from '@/lib/supabase';
import type { MediaType } from '@/types/media-types';
import type { FileDetails, ScanResults } from '@/types/scan-types';

/**
 * Add a single file to the database
 */
async function addFileToDatabase(
  file: FileDetails,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createSupabase();

    // Check if the file already exists (by relative path)
    const { data: existingFile } = await supabase
      .from('media')
      .select('id')
      .eq('media_path', file.path)
      .limit(1)
      .single();

    if (existingFile) {
      return { success: false, error: 'File already exists in database' };
    }

    // Add the file to the database
    const fileId = uuid();
    const { error } = await supabase.from('media').insert({
      id: fileId,
      media_path: file.path, // Store the relative path
      media_type_id: file.mediaType.id,
      size_bytes: file.size,
      created_date: file.lastModified
        ? new Date(file.lastModified).toISOString()
        : new Date().toISOString(),
      is_hidden: false,
      is_deleted: false,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Process a batch of files and add them to the database
 */
export async function processScanResults(
  files: FileDetails[],
): Promise<ScanResults> {
  const results: ScanResults = {
    success: true,
    filesAdded: 0,
    filesSkipped: 0,
    errors: [],
    mediaTypeStats: {},
  };

  // Process each file in the batch
  for (const file of files) {
    // Update stats
    results.mediaTypeStats[file.mediaType.mime_type] =
      (results.mediaTypeStats[file.mediaType.mime_type] || 0) + 1;

    // Add file to database
    const addResult = await addFileToDatabase(file);

    if (addResult.success) {
      results.filesAdded++;
    } else {
      results.filesSkipped++;
      if (addResult.error !== 'File already exists in database') {
        results.errors.push(`Error with ${file.path}: ${addResult.error}`);
      }
    }
  }

  return results;
}

/**
 * Get all media types from the database
 */
export async function getMediaTypes(): Promise<MediaType[]> {
  try {
    const supabase = createSupabase();
    const { data, error } = await supabase
      .from('media_types')
      .select('*')
      .order('mime_type', { ascending: true });

    if (error) {
      console.error('Error fetching media types:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getMediaTypes:', error);
    return [];
  }
}
