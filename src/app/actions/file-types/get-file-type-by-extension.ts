'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, FileType } from '@/types/db-types';

/**
 * Get a file type by extension
 * @param extension File extension (without the dot)
 * @returns Query result with file type data and success status
 */
export async function getFileTypeByExtension(
  extension: string,
): Action<FileType> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('file_types')
    .select('*')
    .eq('extension', extension.toLowerCase())
    .single();
}
