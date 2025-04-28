'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action } from '@/types/db-types';

/**
 * Delete a file type by ID
 * @param id File type ID
 * @returns Operation result
 */
export async function deleteFileType(id: number): Action<null> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('file_types').delete().eq('id', id);
}
