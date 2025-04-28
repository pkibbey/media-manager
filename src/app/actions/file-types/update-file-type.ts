'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, FileType } from '@/types/db-types';

/**
 * Update a file type
 * @param id File type ID
 * @param updates Object containing fields to update
 * @returns Query result with success status and error message if applicable
 */
export async function updateFileType(
  id: number,
  updates: Partial<FileType>,
): Action<Partial<FileType>> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('file_types').update(updates).eq('id', id);
}
