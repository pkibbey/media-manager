'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { Action, FileType } from '@/types/db-types';

/**
 * Get all file types from the database
 * @returns Query result with file types data
 */
export async function getFileTypes(): Action<FileType[]> {
  const supabase = createServerSupabaseClient();

  return await supabase.from('file_types').select('*').order('extension');
}
