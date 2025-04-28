'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Get file type by extension
 * @param extension File extension
 * @returns Query result with file type ID and success status
 */
export async function getFileTypeIdByExtension(
  extension: string,
): Action<{ id: number }> {
  const supabase = createServerSupabaseClient();

  return await supabase
    .from('file_types')
    .select('id')
    .eq('extension', extension)
    .single();
}
