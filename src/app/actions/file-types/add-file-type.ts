'use server';

import { fileTypeCache } from '@/lib/file-type-cache';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, FileType } from '@/types/db-types';

/**
 * Add a new file type
 * @param fileType File type data
 * @returns Query result with the new file type data
 */
export async function addFileType(
  fileType: Omit<FileType, 'id'>,
): Action<FileType> {
  const supabase = createServerSupabaseClient();

  const response = await supabase
    .from('file_types')
    .insert(fileType)
    .select('*')
    .single();

  // Clear the file type cache to ensure fresh data
  if (!response.error) {
    fileTypeCache.clearCache();
  }

  return response;
}
