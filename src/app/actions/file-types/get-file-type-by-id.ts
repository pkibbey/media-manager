'use server';

import { createServerSupabaseClient } from '@/lib/supabase';
import type { FileType } from '@/types/db-types';

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
